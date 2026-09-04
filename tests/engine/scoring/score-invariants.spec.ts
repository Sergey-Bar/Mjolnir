/**
 * Scoring invariants (Test Hardening Plan — the score is the single
 * number the whole product's trust rests on; it deserves property-style
 * coverage, not just the couple of fixed examples elsewhere in the
 * suite).
 *
 * Invariants that must hold for ANY finding set, not just hand-picked
 * ones:
 *   - score is always in [0, 100]
 *   - score is never NaN
 *   - more/worse findings never INCREASE the score (monotonicity)
 *   - an empty finding set always scores 100
 */

import { describe, expect, it } from "vitest";
import { computeDimensions, computeTotal } from "../../../src/scorer/scorer.js";
import type { Finding, RuleCategory, Severity } from "../../../src/types.js";

const CATEGORIES: RuleCategory[] = ["QA-TEST", "QA-TQUAL", "QA-PW", "QA-CI"];
const SEVERITIES: Severity[] = ["error", "warning", "info"];

function randomFinding(seed: number): Finding {
  const category = CATEGORIES[seed % CATEGORIES.length] as RuleCategory;
  const severity = SEVERITIES[(seed * 7) % SEVERITIES.length] as Severity;
  return {
    ruleId: `QA-TEST-${seed}`,
    category,
    severity,
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: `f${seed}.spec.ts`,
    line: 1,
    column: 1,
    message: "synthetic",
    why: "synthetic",
    fix: "synthetic",
  };
}

// Deterministic pseudo-random finding sets of varying size — reproducible
// (no real randomness) so a failure is always reproducible from the seed.
function randomFindingSet(count: number, seedBase: number): Finding[] {
  return Array.from({ length: count }, (_, i) =>
    randomFinding(seedBase * 1000 + i),
  );
}

describe("score invariants hold across many synthetic finding sets", () => {
  it("empty findings always score exactly 100", () => {
    expect(computeTotal(computeDimensions([]), [])).toBe(100);
  });

  const sizes = [0, 1, 3, 10, 25, 100, 500];
  for (const size of sizes) {
    for (let trial = 0; trial < 5; trial++) {
      it(`score stays in [0,100] for ${size} findings (trial ${trial})`, () => {
        const findings = randomFindingSet(size, size * 10 + trial);
        const dims = computeDimensions(findings);
        const score = computeTotal(dims, findings);

        expect(Number.isNaN(score)).toBe(false);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);

        for (const dim of dims) {
          expect(Number.isNaN(dim.score)).toBe(false);
          expect(dim.score).toBeGreaterThanOrEqual(0);
          expect(dim.score).toBeLessThanOrEqual(100);
        }
      });
    }
  }

  it("adding more findings never increases the score (monotonicity)", () => {
    let prevScore = 100;
    let findings: Finding[] = [];
    for (let i = 0; i < 50; i++) {
      findings = [...findings, randomFinding(i)];
      const score = computeTotal(computeDimensions(findings), findings);
      expect(
        score,
        `score went UP from ${prevScore} to ${score} after adding a ` +
          `finding — a scan that finds MORE problems should never score ` +
          `better than one that found fewer.`,
      ).toBeLessThanOrEqual(prevScore);
      prevScore = score;
    }
  });

  it("a single info-severity finding never drops score to 0 (deduction floor sanity)", () => {
    const findings = [randomFinding(0)];
    const first = findings[0];
    if (!first) throw new Error("finding missing");
    first.severity = "info";
    const score = computeTotal(computeDimensions(findings), findings);
    expect(score).toBeGreaterThan(0);
  });

  it("an enormous finding set floors at exactly 0, not negative", () => {
    const findings = randomFindingSet(10_000, 999);
    const score = computeTotal(computeDimensions(findings), findings);
    expect(score).toBe(0);
    for (const dim of computeDimensions(findings)) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
    }
  });
});
