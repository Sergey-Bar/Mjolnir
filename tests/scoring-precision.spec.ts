/**
 * Phase 2 — Precision & accuracy exact-value tests.
 *
 * Every number the scorer prints is verified against docs/SCORING.md
 * benchmarks (verified against src/scorer/scorer.ts — code is truth):
 * deductions 8/3/1; evidence E2 full / E1 half floor / E0 zero;
 * honesty cap 99; error ceiling 95; suite-invalidating ceiling 49;
 * rate = deductions / (declarations + SMOOTHING_C), K = 5; verdict
 * bands 80/50; null for empty repos.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  computeTotal,
  deductionFor,
  ERROR_SEVERITY_CEILING,
  NORMALIZATION_K,
  SMOOTHING_C,
  SUITE_INVALIDATED_CEILING,
} from "../src/scorer/scorer.js";
import { verdictFor } from "../src/reporter/terminal.js";
import type { DimensionScore, Finding } from "../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FALSE-GREEN",
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    evidenceLevel: "E2",
    ...over,
  };
}

const dims: DimensionScore[] = [];

describe("constants match the documented benchmark", () => {
  it("NORMALIZATION_K = 5, SMOOTHING_C = 1", () => {
    expect(NORMALIZATION_K).toBe(5);
    expect(SMOOTHING_C).toBe(1);
  });

  it("ceilings: 95 error, 49 suite-invalidating", () => {
    expect(ERROR_SEVERITY_CEILING).toBe(95);
    expect(SUITE_INVALIDATED_CEILING).toBe(49);
  });
});

describe("deductionFor exact values", () => {
  it.each([
    ["error", "E2", 8],
    ["warning", "E2", 3],
    ["info", "E2", 1],
  ] as const)("%s at E2 costs exactly %i", (severity, level, expected) => {
    expect(deductionFor(finding({ severity, evidenceLevel: level }))).toBe(
      expected,
    );
  });

  it.each([
    ["error", "E1", 4],
    ["warning", "E1", 1],
    ["info", "E1", 0],
  ] as const)(
    "%s at E1 costs floor(%i/2) = %i",
    (severity, level, expected) => {
      expect(deductionFor(finding({ severity, evidenceLevel: level }))).toBe(
        expected,
      );
    },
  );

  it.each(["error", "warning", "info"] as const)(
    "%s at E0 costs zero",
    (severity) => {
      expect(deductionFor(finding({ severity, evidenceLevel: "E0" }))).toBe(0);
    },
  );
});

describe("computeTotal exact-value table", () => {
  it("an empty finding list is exactly 100 regardless of declarations", () => {
    expect(computeTotal(dims, [], 0)).toBe(100);
    expect(computeTotal(dims, [], 10_000)).toBe(100);
  });

  it("an E0-only repo stays exactly 100 (observations are not defects)", () => {
    const score = computeTotal(
      dims,
      [finding({ severity: "error", evidenceLevel: "E0" })],
      { testDeclarations: 1, testFileCount: 1 },
    );
    expect(score).toBe(100);
  });

  it("one E2 warning, 0 declarations: 100 − min(100, 3/1×5) = 85", () => {
    expect(
      computeTotal(dims, [finding()], {
        testDeclarations: 0,
        testFileCount: 0,
      }),
    ).toBe(85);
  });

  it("one E2 error, 0 declarations: 100 − 40 = 60, floored to 95 → 60", () => {
    // The rate hits the 100-min clamp before the error ceiling matters.
    expect(
      computeTotal(dims, [finding({ severity: "error" })], {
        testDeclarations: 0,
        testFileCount: 0,
      }),
    ).toBe(60);
  });

  it("one E2 error, huge denominator: raw rate rounds to 100 but the error ceiling forces 95", () => {
    const score = computeTotal(dims, [finding({ severity: "error" })], {
      testDeclarations: 10_000,
      testFileCount: 100,
    });
    expect(score).toBe(ERROR_SEVERITY_CEILING);
  });

  it("one E2 warning, huge denominator: honesty cap forces 99, not 100", () => {
    // 3 / 10001 × 5 rounds to 100 — the honesty guard must cap it.
    const score = computeTotal(dims, [finding()], {
      testDeclarations: 10_000,
      testFileCount: 100,
    });
    expect(score).toBe(99);
  });

  it("boundary: 80↔75 (WORTHY vs NEEDS WORK) at 0 declarations", () => {
    // declarations=0 → score = 100 − 5·d. d=4 → 80 WORTHY, d=5 → 75.
    const exposure = { testDeclarations: 0, testFileCount: 0 };
    const info = (ruleId: string, line: number) =>
      finding({ severity: "info", ruleId, line, file: "a.spec.ts" });
    expect(
      computeTotal(
        dims,
        [info("R2", 2), info("R3", 3), info("R4", 4), info("R5", 5)],
        exposure,
      ),
    ).toBe(80);
    expect(
      computeTotal(
        dims,
        [
          info("R2", 2),
          info("R3", 3),
          info("R4", 4),
          info("R5", 5),
          info("R6", 6),
        ],
        exposure,
      ),
    ).toBe(75);
  });

  it("boundary: 49↔50 via suite-invalidating override", () => {
    // 1 warning in a 5-declaration repo: 3/6×5 = 2.5 → 98; voided → 49.
    const score = computeTotal(dims, [finding({ ruleId: "QA-TEST-001" })], {
      testDeclarations: 5,
      testFileCount: 1,
      suiteInvalidatingRuleIds: new Set(["QA-TEST-001"]),
    });
    expect(score).toBe(SUITE_INVALIDATED_CEILING);
  });

  it("94↔95: an error finding below the ceiling stays at the raw rate", () => {
    // 1 E2 error, declarations = 0 with object exposure: rate = 8/1×5 = 40
    // → 60 (below ceiling, no clamping).
    const below = computeTotal(dims, [finding({ severity: "error" })], {
      testDeclarations: 0,
      testFileCount: 0,
    });
    expect(below).toBeLessThan(ERROR_SEVERITY_CEILING);
    // 1 E2 error, 49 declarations: 8/50×5 = 0.8 → 99, clamped to 95.
    const at = computeTotal(dims, [finding({ severity: "error" })], {
      testDeclarations: 49,
      testFileCount: 1,
    });
    expect(at).toBe(ERROR_SEVERITY_CEILING);
    // 1 E2 error, 50 declarations: 8/51×5 = 0.78 → 99, still 95.
    const justBelow = computeTotal(dims, [finding({ severity: "error" })], {
      testDeclarations: 50,
      testFileCount: 1,
    });
    expect(justBelow).toBe(ERROR_SEVERITY_CEILING);
  });

  it("E1 half-deduction floor: warning at E1 in a 0-declaration repo costs 1", () => {
    // floor(3/2) = 1 → 100 − 5 = 95.
    expect(
      computeTotal(dims, [finding({ evidenceLevel: "E1" })], {
        testDeclarations: 0,
        testFileCount: 0,
      }),
    ).toBe(95);
  });

  it("the suite-invalidating override beats the error ceiling", () => {
    const score = computeTotal(
      dims,
      [finding({ severity: "error", ruleId: "QA-TEST-940" })],
      {
        testDeclarations: 100,
        testFileCount: 10,
        suiteInvalidatingRuleIds: new Set(["QA-TEST-940"]),
      },
    );
    expect(score).toBe(SUITE_INVALIDATED_CEILING);
  });

  it("a suite-invalidating INFO finding still voids the suite (categorical, not severity-based)", () => {
    const score = computeTotal(
      dims,
      [
        finding({
          severity: "info",
          evidenceLevel: "E2",
          ruleId: "QA-TEST-940",
        }),
      ],
      {
        testDeclarations: 100,
        testFileCount: 10,
        suiteInvalidatingRuleIds: new Set(["QA-TEST-940"]),
      },
    );
    // info E2 costs 1 → rate rounds to 100 → honesty 99 → voided caps 49.
    expect(score).toBe(SUITE_INVALIDATED_CEILING);
  });
});

describe("verdict bands are total and exhaustive", () => {
  it.each([
    [100, "WORTHY"],
    [80, "WORTHY"],
    [79, "NEEDS WORK"],
    [50, "NEEDS WORK"],
    [49, "UNWORTHY"],
    [0, "UNWORTHY"],
  ] as const)("verdictFor(%i) = %s", (score, expected) => {
    expect(verdictFor(score)).toBe(expected);
  });

  it("every score in [0,100] lands in exactly one band", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const v = verdictFor(score);
        expect(["WORTHY", "NEEDS WORK", "UNWORTHY"]).toContain(v);
        if (score >= 80) expect(v).toBe("WORTHY");
        else if (score >= 50) expect(v).toBe("NEEDS WORK");
        else expect(v).toBe("UNWORTHY");
      }),
      { numRuns: 101 },
    );
  });
});

describe("scoring property invariants (fast-check, >=1000 iterations)", () => {
  interface ScoredItem {
    finding: Finding;
    declarations: number;
    invalidating: Set<string>;
  }
  const arbScored: fc.Arbitrary<ScoredItem> = fc
    .record({
      severity: fc.constantFrom<"error" | "warning" | "info">(
        "error",
        "warning",
        "info",
      ),
      level: fc.constantFrom<"E0" | "E1" | "E2">("E0", "E1", "E2"),
      ruleId: fc.constantFrom("QA-TEST-001", "QA-TEST-002", "QA-PW-100"),
      declarations: fc.integer({ min: 0, max: 500 }),
      voids: fc.boolean(),
    })
    .map(({ severity, level, ruleId, declarations, voids }) => ({
      finding: finding({ severity, evidenceLevel: level, ruleId }),
      declarations,
      invalidating: (voids
        ? new Set([ruleId])
        : new Set<string>()),
    }));

  it("score is within [0,100] for arbitrary findings", () => {
    fc.assert(
      fc.property(fc.array(arbScored, { maxLength: 20 }), (items) => {
        const findings = items.map((i) => i.finding);
        const declarations = Math.max(
          ...items.map((i) => i.declarations).concat([0]),
        );
        const invalidating = new Set<string>();
        for (const i of items)
          for (const r of i.invalidating) invalidating.add(r);
        const score = computeTotal(
          dims,
          findings,
          declarations > 0 || invalidating.size > 0
            ? {
                testDeclarations: declarations,
                testFileCount: 1,
                suiteInvalidatingRuleIds: invalidating,
              }
            : undefined,
        );
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 1_000 },
    );
  });

  it("adding a finding never raises the score", () => {
    fc.assert(
      fc.property(
        fc.array(arbScored, { maxLength: 12 }),
        arbScored,
        (items, extra) => {
          const findings = items.map((i) => i.finding);
          const declarations = Math.max(
            ...items.map((i) => i.declarations).concat([0]),
          );
          const exposure =
            declarations > 0
              ? {
                  testDeclarations: declarations,
                  testFileCount: 1,
                  suiteInvalidatingRuleIds: new Set<string>(),
                }
              : undefined;
          const before = computeTotal(dims, findings, exposure);
          const after = computeTotal(
            dims,
            [...findings, extra.finding],
            exposure,
          );
          expect(after).toBeLessThanOrEqual(before);
        },
      ),
      { numRuns: 1_000 },
    );
  });

  it("scoring is symmetric in the findings array (order irrelevant to total)", () => {
    fc.assert(
      fc.property(
        fc.array(arbScored, { maxLength: 10 }),
        fc.integer({ min: 0, max: 200 }),
        (items, declarations) => {
          const findings = items.map((i) => i.finding);
          const exposure = {
            testDeclarations: declarations,
            testFileCount: 1,
          };
          const forward = computeTotal(dims, findings, exposure);
          const reversed = computeTotal(
            dims,
            [...findings].reverse(),
            exposure,
          );
          expect(forward).toBe(reversed);
        },
      ),
      { numRuns: 1_000 },
    );
  });
});
