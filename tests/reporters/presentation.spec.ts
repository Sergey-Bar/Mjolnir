/**
 * `src/reporter/presentation.ts` — the decisions-only contract.
 *
 * BITTERSWEET `BW-030a`. This module exists because four score-band sets,
 * two evidence descriptors and one score bar were written down separately
 * and every one of them drifted. `score-state.ts` and `evidence-tag.ts`
 * were both absorbed and deleted; the four files that used to disagree
 * (`dashboard.ts`, `handover.ts`, `mermaid.ts`, `monorepo-analysis.ts`)
 * now read the band from here.
 *
 * The tests below are the lock: pure, small, and failing the moment a
 * second definition site reappears.
 *
 * (This file was `score-state.spec.ts` until the module it tested was
 * renamed. The property-based band tests that were its original purpose
 * are unchanged.)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  countOrNull,
  countOrUnknown,
  deriveScoreState,
  evidenceLevelOf,
  evidenceTag,
  headlineFor,
  SCORE_THRESHOLDS,
  testsAnalyzedCell,
  trustRungLabel,
  UNMEASURED,
  verdictFor,
  type ScoreState,
} from "../../src/reporter/presentation.js";
import type { Finding } from "../../src/types.js";

const ROOT = join(import.meta.dirname, "..", "..");

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-PW-001",
    category: "QA-PW",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    detectorRevision: 1,
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...overrides,
  };
}

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
      "Static score 100 — no findings on the analyzed surface.",
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

describe("the boundaries are nameable, not just literal", () => {
  it("SCORE_THRESHOLDS agrees with the model it names", () => {
    // A named threshold that disagrees with the branch is worse than a
    // literal, because a consumer will read the name and trust it.
    expect(SCORE_THRESHOLDS.criticalBelow).toBe(50);
    expect(SCORE_THRESHOLDS.trustedAtOrAbove).toBe(80);
    expect(SCORE_THRESHOLDS.forgedAt).toBe(100);
    expect(deriveScoreState(SCORE_THRESHOLDS.criticalBelow - 1).band).toBe(
      "critical",
    );
    expect(deriveScoreState(SCORE_THRESHOLDS.trustedAtOrAbove).band).toBe(
      "trusted",
    );
  });
});

describe("the three-band public contract is a projection, not a bug", () => {
  it("verdictFor collapses FORGED to WORTHY while the model keeps both", () => {
    // `terminal.ts:159` documented this deliberately: a consumer reading
    // the verdict word must not be able to tell a 100 from a 99, because
    // the 100 carries no runtime evidence and the score never earned it.
    expect(verdictFor(100)).toBe("WORTHY");
    expect(verdictFor(99)).toBe("WORTHY");
    expect(verdictFor(80)).toBe("WORTHY");
    expect(verdictFor(79)).toBe("NEEDS WORK");
    expect(verdictFor(49)).toBe("UNWORTHY");
    // The model still knows the difference — the projection is one-way.
    expect(deriveScoreState(100).verdict).toBe("FORGED");
  });
});

describe("the evidence descriptor is one descriptor (BW-102)", () => {
  it("names the level, its meaning, and every piece of evidence present", () => {
    const tag = evidenceTag(
      finding({
        evidenceLevel: "E2",
        measuredFpRate: 0.08,
        measuredFpN: 14,
        trustLevel: "L3",
        runtimeCorroboration: {
          level: "file",
          source: "junit-xml",
          testsExecuted: 3,
        },
      }),
    );
    expect(tag).toBe(
      "[E2 · deterministic · measured FP 8% · n=14 · trust L3 · runtime: file executed]",
    );
  });

  it("omits every clause the finding does not carry", () => {
    // The point of the promotion: nothing is ever defaulted into existence.
    const tag = evidenceTag(finding({ evidenceLevel: "E0" }));
    expect(tag).toBe("[E0 · observation]");
    expect(tag).not.toContain("FP");
    expect(tag).not.toContain("runtime");
  });

  it("derives a missing level rather than claiming the strongest one (BW-101)", () => {
    // The deleted `evidence-tag.ts` defaulted this to E2 — the strongest
    // claim the product can make — for a finding nobody measured.
    expect(evidenceLevelOf(finding({ findingType: "heuristic-risk" }))).toBe(
      "E1",
    );
    expect(evidenceTag(finding({ findingType: "heuristic-risk" }))).toContain(
      "E1 · heuristic",
    );
  });

  it("reads the trust rung from the brand marks, so a rung is never invented", () => {
    expect(trustRungLabel("L3")).toMatch(/^L3 — /);
    expect(trustRungLabel("L9")).toBeNull();
  });
});

describe("an absent measurement is not a zero (BW-103)", () => {
  it("says so for a human surface and uses null for a machine one", () => {
    expect(countOrUnknown(undefined)).toBe(UNMEASURED);
    expect(countOrUnknown(0)).toBe("0");
    expect(countOrNull(undefined)).toBeNull();
    expect(countOrNull(0)).toBe(0);
  });

  it("reports each missing half of the tests cell independently", () => {
    expect(testsAnalyzedCell(undefined, undefined)).toBe(UNMEASURED);
    expect(testsAnalyzedCell(12, undefined)).toBe("12 in unknown files");
    expect(testsAnalyzedCell(12, 1)).toBe("12 in 1 file");
    expect(testsAnalyzedCell(12, 3)).toBe("12 in 3 files");
  });
});

describe("the module holds to its one rule", () => {
  const source = readFileSync(
    join(ROOT, "src", "reporter", "presentation.ts"),
    "utf8",
  );

  it("imports no I/O and touches no clock", () => {
    // "Decisions, never data and never I/O." A presentation decision that
    // reads a clock is a value that changes between two runs of the same
    // scan, which is indistinguishable from a fabricated one.
    for (const forbidden of [
      "node:fs",
      "node:path",
      "node:child_process",
      "Date.now",
      "new Date",
      "Math.random",
      "process.env",
    ]) {
      expect(source, forbidden).not.toContain(forbidden);
    }
  });

  it("has no dependency on the palette, so no cycle can form", () => {
    // theme.ts reads this module for the band; if this module read theme.ts
    // for the colour, the two would import each other. The gauge keeps the
    // colour; this module keeps the decision.
    expect(source).not.toContain("theme.js");
  });
});
