/**
 * Correlation: CONVERGENT must mean one thing, not one rule.
 *
 * `groupByRootCause` fell back to `ruleId`, and nothing in the tree assigns
 * `rootCauseId` — the machine contract reports it `null` on every finding. So
 * the key for every group was the rule, and N independent defects from one rule
 * across N files rendered as "CONVERGENT — N findings share root cause QA-PW-002".
 * That is the inverse of convergence: the conclusion claimed several findings
 * are one thing, and the key that produced it said only "same rule".
 */

import { describe, expect, it } from "vitest";

import { correlateFindings } from "../../src/engine/correlation-engine.js";
import type { Finding } from "../../src/types.js";

function finding(over: Partial<Finding>): Finding {
  return {
    ruleId: "QA-PW-002",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    evidenceLevel: "E2",
    detectorRevision: 1,
    file: "e2e/a.spec.ts",
    line: 4,
    column: 3,
    message: "Hard sleep detected",
    why: "why",
    fix: "fix",
    ...over,
  };
}

describe("ruleId is not a root cause", () => {
  it("does not call two QA-PW-002 findings in different files CONVERGENT", () => {
    const conclusions = correlateFindings([
      finding({ file: "e2e/a.spec.ts", line: 4 }),
      finding({ file: "e2e/b.spec.ts", line: 9 }),
    ]);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    // The defect: one CONVERGENT reading "2 findings share root cause
    // QA-PW-002", which asserts a shared cause for two unrelated files.
    expect(convergent).toEqual([]);
  });

  it("lists distinct identities for the findings it does report", () => {
    const conclusions = correlateFindings([
      finding({ file: "e2e/a.spec.ts", line: 4 }),
      finding({ file: "e2e/b.spec.ts", line: 9 }),
    ]);
    for (const c of conclusions) {
      // The old fallback made a group of N list the same id N times, so a
      // consumer could not tell the members apart at all.
      expect(new Set(c.findingIds).size).toBe(c.findingIds.length);
    }
  });

  it("still reports convergence when a root cause IS declared", () => {
    // The field is honoured the moment anything populates it — the fallback
    // exists for its absence, not to override it.
    const conclusions = correlateFindings([
      finding({ file: "e2e/a.spec.ts", rootCauseId: "RC-SHARED" }),
      finding({ file: "e2e/b.spec.ts", rootCauseId: "RC-SHARED" }),
    ]);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent).toHaveLength(1);
    expect(convergent[0]?.corroboration).toContain("RC-SHARED");
  });

  it("reports the same-file amplification the rule was always for", () => {
    // Two findings in ONE file with different messages are genuinely
    // amplified, and the file grouping is a separate pass — this must not
    // regress when the root-cause key changes.
    const conclusions = correlateFindings([
      finding({
        file: "e2e/a.spec.ts",
        line: 4,
        message: "Hard sleep detected",
      }),
      finding({
        file: "e2e/a.spec.ts",
        line: 9,
        message: "Fixed sleep detected",
      }),
    ]);
    const amplified = conclusions.filter(
      (c) => c.conclusionType === "AMPLIFIED",
    );
    expect(amplified).toHaveLength(1);
    expect(amplified[0]?.sourceCount).toBe(2);
  });

  it("honours a populated findingId as the listed identity", () => {
    const conclusions = correlateFindings([
      finding({
        file: "e2e/a.spec.ts",
        findingId: "F-1",
        rootCauseId: "RC",
      }),
      finding({
        file: "e2e/b.spec.ts",
        findingId: "F-2",
        rootCauseId: "RC",
      }),
    ]);
    const convergent = conclusions.find(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent?.findingIds).toEqual(["F-1", "F-2"]);
  });
});
