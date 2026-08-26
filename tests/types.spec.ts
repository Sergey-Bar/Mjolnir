import { describe, expect, it } from "vitest";
import { compareFindings, SCHEMA_VERSION, type Finding } from "../src/types.js";
import { computeDimensions, computeTotal } from "../src/scorer/scorer.js";

function f(partial: Partial<Finding>): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...partial,
  };
}

describe("JSON contract", () => {
  it("pins schemaVersion 1", () => {
    expect(SCHEMA_VERSION).toBe(1);
  });
});

describe("deterministic ordering (S3)", () => {
  it("sorts by file → line → column → ruleId", () => {
    const input = [
      f({ file: "b.ts", line: 1, ruleId: "QA-TEST-002" }),
      f({ file: "a.ts", line: 5, ruleId: "QA-TEST-002" }),
      f({ file: "a.ts", line: 1, column: 9, ruleId: "QA-TEST-002" }),
      f({ file: "a.ts", line: 1, column: 1, ruleId: "QA-TQUAL-009" }),
      f({ file: "a.ts", line: 1, column: 1, ruleId: "QA-TEST-001" }),
    ];
    const sorted = [...input].sort(compareFindings);
    expect(
      sorted.map((x) => `${x.file}:${x.line}:${x.column}:${x.ruleId}`),
    ).toEqual([
      "a.ts:1:1:QA-TEST-001",
      "a.ts:1:1:QA-TQUAL-009",
      "a.ts:1:9:QA-TEST-002",
      "a.ts:5:1:QA-TEST-002",
      "b.ts:1:1:QA-TEST-002",
    ]);
  });
});

describe("scorer (§8)", () => {
  it("applies public deduction constants", () => {
    const findings = [
      f({ severity: "error" }),
      f({ severity: "warning" }),
      f({ severity: "info" }),
    ];
    // 100 − 8 − 3 − 1 = 88
    expect(computeTotal(computeDimensions(findings), findings)).toBe(88);
  });

  it("floors at zero", () => {
    const findings = Array.from({ length: 20 }, (_, i) => f({ line: i + 1 }));
    expect(computeTotal(computeDimensions(findings), findings)).toBe(0);
  });

  it("rolls up per-category dimensions", () => {
    const dims = computeDimensions([
      f({ category: "QA-CI", severity: "error" }),
      f({ category: "QA-TEST", severity: "warning" }),
    ]);
    expect(dims).toHaveLength(2);
    const ci = dims.find((d) => d.category === "QA-CI");
    expect(ci?.score).toBe(92);
  });
});
