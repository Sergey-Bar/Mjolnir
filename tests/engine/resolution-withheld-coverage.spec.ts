/**
 * R1: a rule that was WITHHELD from a scan cannot have fixed anything.
 *
 * §15's invariant is that a finding disappearing from a subsequent scan must
 * not automatically be read as "fixed". That invariant had a hole exactly the
 * size of the quarantine filter: a quarantined rule's finding vanished from
 * every non-`--strict` scan because the DETECTOR never ran, and the scan
 * reported a smaller rule set with nothing naming the difference. The count
 * was known (`rulesWithheld`) and could not be used — resolution decides one
 * finding at a time and needs to know which rules.
 */

import { describe, expect, it } from "vitest";

import {
  renderResolution,
  resolve,
  type BaselineEntry,
} from "../../src/engine/resolution.js";
import type { ScanResult } from "../../src/types.js";

const RULE = "QA-CI-007";
const FILE = "e2e/a.spec.ts";

const entry: BaselineEntry = {
  ruleId: RULE,
  file: FILE,
  message: "Hard sleep detected",
  severity: "warning",
  detectorRevision: 3,
};

function scan(
  findings: Array<{ ruleId: string; file: string; message: string }>,
  analysisStatusOverrides: Partial<ScanResult["analysisStatus"]> = {},
): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: findings.map((f, i) => ({
      ruleId: f.ruleId,
      category: "QA-PW",
      severity: "warning" as const,
      confidence: "high" as const,
      findingType: "deterministic-defect" as const,
      qaImpact: "FLAKY-RISK" as const,
      evidenceLevel: "E2" as const,
      detectorRevision: 3,
      file: f.file,
      line: 4 + i,
      column: 3,
      message: f.message,
      why: "why",
      fix: "fix",
    })),
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 10,
      ...analysisStatusOverrides,
    },
  };
}

const registryRevisions = new Map([[RULE, 3]]);

describe("resolution vs withheld rules", () => {
  it("refuses to call a quarantined rule's disappearance a fix", () => {
    const current = scan([], {
      coverageState: "PARTIAL",
      rulesApplied: 45,
      rulesWithheld: 34,
      withheldRuleIds: ["QA-CI-001", RULE, "QA-SE-010"],
      reasons: ["coverage:quarantine:34"],
    });
    const r = resolve({
      entry,
      baseline: { findings: [entry] },
      current,
      registryRevisions,
    });
    expect(r.status).toBe("INCONCLUSIVE");
    expect(r.cause).toBe("rule-withheld");
  });

  it("still resolves it when the scan was strict and the rule ran", () => {
    // `--strict` withholds nothing, so the same disappearance IS a fix. If
    // this arm regressed the other way the fix would be worthless; if the
    // fix were over-broad the product would be unable to prove anything.
    const current = scan([], {
      coverageState: "COMPLETE",
      rulesApplied: 79,
      rulesWithheld: 0,
    });
    const r = resolve({
      entry,
      baseline: { findings: [entry] },
      current,
      registryRevisions,
    });
    expect(r.status).toBe("VERIFIED-RESOLVED");
  });

  it("does not withhold a rule that was actually applied", () => {
    // Coverage was PARTIAL for a DIFFERENT rule. This finding's rule ran.
    const current = scan(
      [{ ruleId: RULE, file: FILE, message: entry.message }],
      {
        coverageState: "PARTIAL",
        rulesApplied: 78,
        rulesWithheld: 1,
        withheldRuleIds: ["QA-CI-001"],
      },
    );
    const r = resolve({
      entry,
      baseline: { findings: [entry] },
      current,
      registryRevisions,
    });
    expect(r.status).toBe("STILL-PRESENT");
  });

  it("does not treat an absent withheldRuleIds as 'nothing was withheld'", () => {
    // A producer that predates the field reports neither it nor the count.
    // Absence must not manufacture a resolution the evidence cannot support
    // — and must not invent a new failure either. This is the legacy arm.
    const current = scan([]);
    const r = resolve({
      entry,
      baseline: { findings: [entry] },
      current,
      registryRevisions,
    });
    expect(r.status).toBe("VERIFIED-RESOLVED");
  });

  it("prefers a crash over withheld when both are true", () => {
    // Ordering matters: `crash` names the more specific failure and is the
    // first match the ordered algorithm already documented.
    const current = scan([], {
      coverageState: "PARTIAL",
      rulesWithheld: 1,
      withheldRuleIds: [RULE],
    });
    const r = resolve({
      entry,
      baseline: { findings: [entry] },
      current,
      registryRevisions,
      crashedRuleIds: new Set([RULE]),
    });
    expect(r.cause).toBe("crash");
  });

  it("never renders a fix claim as verified by the whole scan", () => {
    // The old text asserted the SCAN was complete and same-revision. It was
    // false for every withheld scan, and it is the sentence a reader skims.
    const text = renderResolution({
      status: "VERIFIED-RESOLVED",
      comparedAgainst: "abc123",
    });
    expect(text).not.toMatch(/complete same-revision scan/i);
    expect(text).toMatch(/^FIXED SINCE BASELINE/);
  });
});
