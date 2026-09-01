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
} from "../src/reporter/score-state.js";

describe("band boundaries are total and exhaustive", () => {
  it.each([
    [null, "unmeasured", "UNWORTHY"],
    [0, "critical", "UNWORTHY"],
    [49, "critical", "UNWORTHY"],
    [50, "warning", "NEEDS WORK"],
    [79, "warning", "NEEDS WORK"],
    [80, "trusted", "WORTHY"],
    [99, "trusted", "WORTHY"],
    [100, "forged", "FORGED"],
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
          expect(s.band).toBe("forged");
          expect(s.color).toBe("forged");
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

  it("out-of-range scores still resolve (defensive totality): <0 → critical, >100 → forged", () => {
    expect(deriveScoreState(-1).band).toBe("critical");
    expect(deriveScoreState(101).band).toBe("forged");
  });

  it("null is the honest unmeasured state: UNWORTHY verdict, dim color, zero power", () => {
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
      "Held in worthy hands — 14 findings remain.",
    );
    // The forged headline has no placeholder — it already says zero.
    const forged = deriveScoreState(100);
    expect(headlineFor(forged, 0)).toBe(
      "Forged complete. Zero findings. The suite is clean.",
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

describe("each band carries a distinct rune (symbols accompany color)", () => {
  it("the four score bands plus unmeasured have unique, non-empty glyphs", () => {
    const runes = [
      deriveScoreState(10).rune,
      deriveScoreState(60).rune,
      deriveScoreState(90).rune,
      deriveScoreState(100).rune,
      deriveScoreState(null).rune,
    ];
    for (const r of runes) expect(r.length).toBeGreaterThan(0);
    expect(new Set(runes).size).toBe(runes.length);
  });
});
