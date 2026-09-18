/**
 * ScoreState model (score-state.ts) — the single source of truth for
 * score-derived presentation. Locks the band boundaries, verdict
 * mapping, determinism, powerLevel passthrough and the {n} headline
 * substitution that every surface consumes.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  deriveScoreState,
  headlineFor,
  type ScoreState,
} from "../../src/reporter/score-state.js";

describe("band boundaries are total and exhaustive", () => {
  it.each([
    [null, "unmeasured", "CRITICAL"],
    [0, "critical", "CRITICAL"],
    [49, "critical", "CRITICAL"],
    [50, "warning", "NEEDS ATTENTION"],
    [79, "warning", "NEEDS ATTENTION"],
    [80, "trusted", "HEALTHY"],
    [99, "trusted", "HEALTHY"],
    [100, "excellent", "EXCELLENT"],
  ] as const)(
    "deriveScoreState(%p) → band %s / verdict %s",
    (score, band, verdict) => {
      const state = deriveScoreState(score);
      expect(state.band).toBe(band);
      expect(state.verdict).toBe(verdict);
    },
  );

  it("every integer in [0,100] lands in exactly one band with matching color", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (score) => {
        const s = deriveScoreState(score);
        if (score >= 100) {
          expect(s.band).toBe("excellent");
          expect(s.color).toBe("excellent");
        } else if (score >= 80) {
          expect(s.band).toBe("trusted");
          expect(s.color).toBe("trusted");
        } else if (score >= 50) {
          expect(s.band).toBe("warning");
          expect(s.color).toBe("warning");
        } else {
          expect(s.band).toBe("critical");
          expect(s.color).toBe("error");
        }
        expect(s.powerLevel).toBe(score);
      }),
      { numRuns: 101 },
    );
  });

  it("out-of-range scores still resolve (defensive totality): <0 → critical, >100 → excellent", () => {
    expect(deriveScoreState(-1).band).toBe("critical");
    expect(deriveScoreState(101).band).toBe("excellent");
  });

  it("null is the honest unmeasured state: CRITICAL verdict, dim color, zero power", () => {
    const s = deriveScoreState(null);
    expect(s.band).toBe("unmeasured");
    expect(s.color).toBe("dim");
    expect(s.powerLevel).toBe(0);
    expect(s.headline).not.toContain("{n}");
  });
});

describe("headline templates are deterministic and self-consistent", () => {
  const scores = [null, 0, 35, 50, 72, 91, 100];

  it("same input → same output (pure function)", () => {
    for (const score of scores) {
      const a: ScoreState = deriveScoreState(score);
      const b = deriveScoreState(score);
      expect(a).toEqual(b);
    }
  });

  it("every headline is a non-empty one-line template within terminal budget", () => {
    for (const score of scores) {
      const s = deriveScoreState(score);
      expect(s.headline.length).toBeGreaterThan(0);
      expect(s.headline).not.toMatch(/\n/);
      // The renderer substitutes {n}; with any realistic finding count the
      // final line stays inside the 70-col screenshot budget.
      const rendered = headlineFor(s, 9999);
      expect(rendered.length).toBeLessThanOrEqual(70);
    }
  });

  it("{n} is substituted exactly once by headlineFor", () => {
    const trusted = deriveScoreState(85);
    expect(trusted.headline).toContain("{n}");
    expect(headlineFor(trusted, 14)).toBe(
      "Healthy test health: 14 findings remain.",
    );
    // The excellent headline has no placeholder — it already says zero.
    const excellent = deriveScoreState(100);
    expect(headlineFor(excellent, 0)).toBe(
      "Excellent test health. Zero findings. The suite is clean.",
    );
  });
});

describe("powerLevel is the mechanical score passthrough", () => {
  it("carries the score verbatim and 0 for null", () => {
    expect(deriveScoreState(0).powerLevel).toBe(0);
    expect(deriveScoreState(49).powerLevel).toBe(49);
    expect(deriveScoreState(72).powerLevel).toBe(72);
    expect(deriveScoreState(100).powerLevel).toBe(100);
    expect(deriveScoreState(null).powerLevel).toBe(0);
  });
});

describe("each band carries a distinct indicator (symbols accompany color)", () => {
  it("the four score bands plus unmeasured have unique, non-empty glyphs", () => {
    const indicators = [
      deriveScoreState(10).indicator,
      deriveScoreState(60).indicator,
      deriveScoreState(90).indicator,
      deriveScoreState(100).indicator,
      deriveScoreState(null).indicator,
    ];
    for (const indicator of indicators)
      expect(indicator.length).toBeGreaterThan(0);
    expect(new Set(indicators).size).toBe(indicators.length);
  });
});
