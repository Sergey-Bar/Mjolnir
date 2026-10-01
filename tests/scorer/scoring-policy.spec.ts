/**
 * `--policy` is the surface a reader trusts to describe the score.
 *
 * It used to print
 *
 *   score = 100 · (1 − deductions / (findings + NORMALIZATION_K))
 *
 * which contradicted `scorer.ts` on four counts at once. The point of these
 * checks is not that one string is gone — it is that the renderer cannot
 * reintroduce a hand-written formula in a module whose own header says every
 * number in it is imported.
 */

import { describe, expect, it } from "vitest";

import {
  renderScoringPolicy,
  scoringPolicy,
} from "../../src/scorer/scoring-policy.js";
import {
  DEDUCTION_MASS_CEILINGS,
  ERROR_SEVERITY_CEILING,
  NORMALIZATION_K,
  SMOOTHING_C,
  SUITE_INVALIDATED_CEILING,
} from "../../src/scorer/scorer.js";

describe("the printed policy cannot restate the formula", () => {
  it("prints no score formula at all", () => {
    const text = renderScoringPolicy();
    // Any `score =` / `score(` line is a hand-written restatement of
    // scorer.ts, and a restatement is what was wrong. The scorer's own source
    // comment carries the formula; the table points at it.
    expect(text).not.toMatch(/score\s*=/i);
    expect(text).not.toMatch(/100\s*·/);
  });

  it("names the authority instead", () => {
    const text = renderScoringPolicy();
    expect(text).toContain("docs/SCORING.md");
    expect(text).toContain("src/scorer/scorer.ts");
  });
});

describe("every number printed is the imported one", () => {
  it("prints the scorer's constants", () => {
    const p = scoringPolicy();
    expect(p.normalizationK).toBe(NORMALIZATION_K);
    expect(p.smoothingC).toBe(SMOOTHING_C);
    expect(p.suiteInvalidatedCeiling).toBe(SUITE_INVALIDATED_CEILING);
    expect(p.errorSeverityCeiling).toBe(ERROR_SEVERITY_CEILING);
  });

  it("renders each constant value into the output", () => {
    const text = renderScoringPolicy();
    const p = scoringPolicy();
    // If a constant stops being rendered, this fails — which is the property
    // that matters. The formula line was the one line here NOT derived from an
    // import, and it was the one that was wrong.
    expect(text).toContain(String(p.normalizationK));
    expect(text).toContain(String(p.smoothingC));
    expect(text).toContain(String(p.suiteInvalidatedCeiling));
    expect(text).toContain(String(p.errorSeverityCeiling));
    for (const c of p.deductionMassCeilings) {
      expect(text).toContain(String(c.ceiling));
    }
  });

  it("carries every deduction-mass ceiling the scorer declares", () => {
    // A ceiling the scorer enforces but the policy omits is a ceiling a reader
    // cannot check, which is the gap the module exists to close.
    expect(scoringPolicy().deductionMassCeilings).toHaveLength(
      DEDUCTION_MASS_CEILINGS.length,
    );
  });

  it("still says NORMALIZATION_K is unfitted", () => {
    // The one adjective that stops a declared default reading as a
    // measurement. Losing it would be a silent over-claim.
    expect(renderScoringPolicy()).toMatch(/DECLARED, not fitted/);
  });
});
