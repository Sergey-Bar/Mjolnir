/**
 * Deduction-mass ceilings (product-gap-remediation master plan P2,
 * plan 1788853205786 — structural anti-dilution, decision 4).
 *
 * The Goodhart vector these tests lock shut: under formula v1 a fixed
 * deduction mass ÷ padded denominator read 99 — "one minor issue" over a
 * suite carrying 26+ warning-grade defects. The ceiling's input is the
 * deduction mass alone, so PADDING CANNOT MOVE IT. Every case here
 * pairs the mass with a large denominator to prove density alone can no
 * longer rescue a score out of its band.
 */

import { describe, expect, it } from "vitest";
import {
  computeTotal,
  massCeiling,
  DEDUCTION_MASS_CEILINGS,
  ERROR_SEVERITY_CEILING,
} from "../../../src/scorer/scorer.js";
import type { Finding } from "../../../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-004",
    category: "QA-PW",
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
    evidenceLevel: "E2",
    ...over,
  };
}

const BIG_DENOMINATOR = 10_000;

describe("deduction-mass ceilings (structural anti-dilution)", () => {
  it("THE attack scenario: 80 warning-pts in a 10k-declaration suite — was 99, now ≤ 75", () => {
    // 27 warnings × 3 = 81 pts; v1 scored 100 − (81/10001)×5 ≈ 96 → 96
    // (and 8 pts of warnings landed 99 under smaller masses). The
    // absolute ceiling must hold regardless.
    const findings = Array.from({ length: 27 }, (_, i) =>
      finding({ line: i + 1 }),
    );
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBeLessThanOrEqual(75);
  });

  it("10 errors (80 pts) in a 10k suite: ≤ 75 — the error floor generalizes to mass", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding({ severity: "error", line: i + 1 }),
    );
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBeLessThanOrEqual(75);
  });

  it.each([
    [1, 99], // honesty-guard band: any deduction → ≤ 99
    [7, 99], // below the ≥ 8 band: only the honesty guard applies
    [8, 95], // ≥ 8 band begins (1 error ≥ 8 pts)
    [39, 95],
    [40, 85], // ≥ 40 band
    [79, 85],
    [80, 75], // ≥ 80 band
    [159, 75],
    [160, 65], // ≥ 160 band
    [1000, 65],
  ])("mass %i caps at %i even over a 10k denominator", (mass, ceiling) => {
    // warnings carry 3 pts; mix severities to hit the exact mass.
    const errors = Math.floor(mass / 8);
    const rest = mass - errors * 8;
    const warnings = Math.floor(rest / 3);
    const rest2 = rest - warnings * 3;
    const infos = rest2;
    const findings: Finding[] = [
      ...Array.from({ length: errors }, (_, i) =>
        finding({ severity: "error", line: i + 1 }),
      ),
      ...Array.from({ length: warnings }, (_, i) => finding({ line: 100 + i })),
      ...Array.from({ length: infos }, (_, i) =>
        finding({ severity: "info", line: 200 + i }),
      ),
    ];
    const charged = findings.reduce(
      (s, f) =>
        s + (f.severity === "error" ? 8 : f.severity === "warning" ? 3 : 1),
      0,
    );
    expect(charged).toBe(mass);
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBeLessThanOrEqual(ceiling);
  });

  it("the ceiling never RAISES a score: small masses stay density-driven", () => {
    // Lone warning in a 10k suite: v1 ≈ 99.99 → 99. The ≥ 8 band does
    // not bind; density remains the differentiator (P2's preserved intent).
    const findings = [finding()];
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBe(99);
    // And a small suite with the same lone warning is denser → lower:
    const small = computeTotal([], [finding()], {
      testDeclarations: 4,
      testFileCount: 1,
    });
    expect(small).toBeLessThan(score);
  });

  it("massCeiling: 0 and sub-band masses have no ceiling; bands bind at their boundary", () => {
    expect(massCeiling(0)).toBeNull();
    expect(massCeiling(7)).toBeNull();
    expect(massCeiling(8)).toBe(95);
    expect(massCeiling(40)).toBe(85);
    expect(massCeiling(80)).toBe(75);
    expect(massCeiling(160)).toBe(65);
    // Bands are ordered most-severe first — the first match wins.
    expect(DEDUCTION_MASS_CEILINGS[0]?.minMass).toBe(160);
  });

  it("zero deductions → 100 untouched; the ceiling cannot invent a cap", () => {
    const score = computeTotal([], [], {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBe(100);
  });

  it("the categorical override still applies LAST (suite-invalidating wins over every ceiling)", () => {
    // 160+ pts (ceiling 65) plus a committed .only → 49 wins.
    const findings = [
      ...Array.from({ length: 20 }, (_, i) =>
        finding({ severity: "error", line: i + 1 }),
      ),
      finding({
        severity: "error",
        ruleId: "QA-TEST-001",
        line: 999,
      }),
    ];
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
      suiteInvalidatingRuleIds: new Set(["QA-TEST-001"]),
    });
    expect(score).toBe(49);
  });

  it("the error-severity floor cannot raise a score past its mass band", () => {
    // 5 errors = 40 pts → ≥ 40 band (85). The error floor (95) is looser
    // than the band — the score must respect the BAND, not 95.
    const findings = Array.from({ length: 5 }, (_, i) =>
      finding({ severity: "error", line: i + 1 }),
    );
    const score = computeTotal([], findings, {
      testDeclarations: BIG_DENOMINATOR,
      testFileCount: 500,
    });
    expect(score).toBeLessThanOrEqual(85);
    expect(score).toBeLessThanOrEqual(ERROR_SEVERITY_CEILING);
  });
});
