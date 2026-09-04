/**
 * Direct unit tests for src/scorer/scorer.ts's exported functions
 * (Master-Stabilization-Plan Sprint 3 coverage gap — stampEvidenceLevels,
 * deductionFor, and advisoryFindings were only ever exercised indirectly
 * through full-scan integration tests, leaving several branches
 * uncovered: the valid-vs-invalid override string check, the E0/E1/E2
 * deduction tiers, and the idempotency guarantee the doc comment claims
 * but nothing verified).
 */

import { describe, expect, it } from "vitest";
import {
  advisoryFindings,
  deductionFor,
  stampEvidenceLevels,
} from "../../../src/scorer/scorer.js";
import type { Finding } from "../../../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...over,
  };
}

describe("stampEvidenceLevels", () => {
  it("derives from findingType+confidence when no evidenceLevel is set", () => {
    const findings = [finding({ findingType: "observation" })];
    stampEvidenceLevels(findings);
    expect(findings[0]?.evidenceLevel).toBe("E0");
  });

  it("applies a valid rule-declared override (E0/E1/E2) over the derivation", () => {
    const findings = [finding({ ruleId: "QA-TEST-001" })];
    const overrides = new Map<string, unknown>([["QA-TEST-001", "E0"]]);
    stampEvidenceLevels(findings, overrides);
    expect(findings[0]?.evidenceLevel).toBe("E0");
  });

  it("ignores an override value that is not a valid EvidenceLevel string", () => {
    const findings = [finding({ ruleId: "QA-TEST-001" })];
    const overrides = new Map<string, unknown>([["QA-TEST-001", "E9"]]);
    stampEvidenceLevels(findings, overrides);
    // Falls through to the honest derivation instead of accepting garbage.
    expect(findings[0]?.evidenceLevel).toBe("E2");
  });

  it("ignores a non-string override value", () => {
    const findings = [finding({ ruleId: "QA-TEST-001" })];
    const overrides = new Map<string, unknown>([["QA-TEST-001", 42]]);
    stampEvidenceLevels(findings, overrides);
    expect(findings[0]?.evidenceLevel).toBe("E2");
  });

  it("does nothing for a rule ID with no entry in the overrides map", () => {
    const findings = [finding({ ruleId: "QA-TEST-999" })];
    const overrides = new Map<string, unknown>([["QA-TEST-001", "E0"]]);
    stampEvidenceLevels(findings, overrides);
    expect(findings[0]?.evidenceLevel).toBe("E2");
  });

  it("is idempotent — calling it twice does not change an already-stamped level", () => {
    const findings = [finding({ evidenceLevel: "E1" })];
    stampEvidenceLevels(findings);
    stampEvidenceLevels(findings);
    expect(findings[0]?.evidenceLevel).toBe("E1");
  });

  it("works with no overrides argument at all", () => {
    const findings = [finding()];
    expect(() => stampEvidenceLevels(findings)).not.toThrow();
    expect(findings[0]?.evidenceLevel).toBe("E2");
  });
});

describe("deductionFor", () => {
  it("E2 costs the full severity deduction", () => {
    expect(
      deductionFor(finding({ severity: "error", evidenceLevel: "E2" })),
    ).toBe(8);
    expect(
      deductionFor(finding({ severity: "warning", evidenceLevel: "E2" })),
    ).toBe(3);
    expect(
      deductionFor(finding({ severity: "info", evidenceLevel: "E2" })),
    ).toBe(1);
  });

  it("E1 costs half the severity deduction, rounded down", () => {
    expect(
      deductionFor(finding({ severity: "error", evidenceLevel: "E1" })),
    ).toBe(4);
    expect(
      deductionFor(finding({ severity: "warning", evidenceLevel: "E1" })),
    ).toBe(1); // floor(3/2) = 1
    expect(
      deductionFor(finding({ severity: "info", evidenceLevel: "E1" })),
    ).toBe(0); // floor(1/2) = 0
  });

  it("E0 always costs zero, regardless of severity", () => {
    expect(
      deductionFor(finding({ severity: "error", evidenceLevel: "E0" })),
    ).toBe(0);
  });

  it("falls back to the honest derivation when evidenceLevel is unset", () => {
    const f = finding({ findingType: "observation" });
    delete (f as { evidenceLevel?: string }).evidenceLevel;
    expect(deductionFor(f)).toBe(0); // observation derives to E0
  });
});

describe("advisoryFindings", () => {
  it("returns only E0 (observation-derived) findings", () => {
    const e0 = finding({ ruleId: "A", findingType: "observation" });
    const e1 = finding({ ruleId: "B", findingType: "heuristic-risk" });
    const e2 = finding({
      ruleId: "C",
      findingType: "deterministic-defect",
      confidence: "high",
    });
    expect(advisoryFindings([e0, e1, e2]).map((f) => f.ruleId)).toEqual(["A"]);
  });

  it("returns an empty array when nothing is advisory", () => {
    expect(
      advisoryFindings([finding({ findingType: "deterministic-defect" })]),
    ).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(advisoryFindings([])).toEqual([]);
  });
});
