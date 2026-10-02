/**
 * M12 historical trust: a trend report must not invent numbers.
 *
 * Four separate false-greens lived in this module, all of the same shape —
 * a missing input silently became a plausible one:
 *
 *  1. `score` is `number | null`, because the scorer returns null for a repo
 *     with no tests. `(last ?? 0) - (first ?? 0)` turned "no score" into "0"
 *     and reported a fabricated ±100 on a null↔number transition.
 *  2. `overallDirection` compared the NUMBER of regression entries against the
 *     number of improvements, so one 50-point drop lost to three 1-point
 *     gains and the trend rendered "improving".
 *  3. `frameworkCount` was 1 when detection was known and 0 when it was not,
 *     so four detected frameworks and one rendered identically.
 *  4. `warnings > errors * 2` degenerated to `warnings > 0` at zero errors,
 *     reporting "weak assertions" for every repo with warnings and no errors.
 */

import { describe, expect, it } from "vitest";

import {
  analyzeTrustTrends,
  computeTrustSnapshot,
  renderTrustTrend,
  type TrustSnapshot,
} from "../../src/engine/historical-trust.js";
import type { ScanResult, TrustSummary } from "../../src/types.js";

function snap(overrides: Partial<TrustSnapshot> = {}): TrustSnapshot {
  return {
    scanId: "scan-1",
    timestamp: "2026-01-01T00:00:00Z",
    score: 90,
    findings: 10,
    errors: 2,
    warnings: 4,
    infos: 4,
    advisory: 0,
    trustLevel: "high",
    confidence: 0.8,
    evidenceCoverage: 0.9,
    inconclusiveRate: 0.1,
    partial: false,
    frameworkCount: 1,
    ruleCount: 5,
    ...overrides,
  };
}

describe("score delta is not fabricated", () => {
  it("reports no numeric delta when the repo gained its first score", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", score: null }),
      snap({ scanId: "b", score: 100 }),
    ]);
    // The defect: `+100`. A repo with no tests does not improve by 100
    // points; it starts being scored at all.
    expect(trend.scoreDelta).toBeNull();
    expect(
      trend.improvements.filter((i) => i.type === "score-increase"),
    ).toEqual([]);
    expect(trend.regressions.filter((r) => r.type === "score-drop")).toEqual(
      [],
    );
  });

  it("reports no numeric delta when the repo lost its score", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", score: 100 }),
      snap({ scanId: "b", score: null }),
    ]);
    expect(trend.scoreDelta).toBeNull();
  });

  it("still computes a real delta between two real scores", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", score: 90 }),
      snap({ scanId: "b", score: 95 }),
    ]);
    expect(trend.scoreDelta).toBe(5);
    expect(trend.improvements.some((i) => i.type === "score-increase")).toBe(
      true,
    );
  });

  it("says so in the rendering rather than printing a number", () => {
    const text = renderTrustTrend(
      analyzeTrustTrends([
        snap({ scanId: "a", score: null }),
        snap({ scanId: "b", score: 100 }),
      ]),
    );
    expect(text).toMatch(/Score Delta: not comparable/);
    expect(text).not.toMatch(/\+100/);
  });
});

describe("direction is decided by magnitude", () => {
  it("a 50-point drop outweighs three 1-point improvements", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", score: 100, findings: 10, confidence: 0.7 }),
      snap({ scanId: "b", score: 50, findings: 10, confidence: 0.7 }),
    ]);
    // Force three small improvements alongside the drop.
    const withImprovements = analyzeTrustTrends([
      { ...snap({ scanId: "a", score: 100, confidence: 0.7 }) },
      {
        ...snap({
          scanId: "b",
          score: 50,
          findings: 7,
          confidence: 0.73,
        }),
      },
    ]);
    expect(trend.regressions.some((r) => r.type === "score-drop")).toBe(true);
    // The defect reported "improving": 3 improvement entries beat 1
    // regression entry, so a halving of the score read as progress.
    expect(withImprovements.regressions.length).toBeGreaterThanOrEqual(1);
    expect(withImprovements.improvements.length).toBeGreaterThanOrEqual(2);
    expect(withImprovements.overallDirection).toBe("degrading");
  });

  it("genuine net improvement still reads as improving", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", score: 50, findings: 20, confidence: 0.5 }),
      snap({ scanId: "b", score: 90, findings: 10, confidence: 0.9 }),
    ]);
    expect(trend.overallDirection).toBe("improving");
  });

  it("no movement at all is stable", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a" }),
      snap({ scanId: "b" }),
    ]);
    expect(trend.overallDirection).toBe("stable");
  });
});

describe("snapshot counts what it counted", () => {
  // `level` is a TrustLevel (L0..L5), not a word. The old literal said
  // `"high"` and the `as TrustSummary` cast is what let it through: the test
  // was asserting against a value the product can never produce, and the
  // cast hid both that and the two fields it had stopped providing.
  const trustSummary: TrustSummary = {
    level: "L3",
    confidence: 0.8,
    evidenceCoverage: 0.9,
    inconclusiveRate: 0.1,
    provisionalRuleIds: [],
    ceilingReasons: [],
  };

  function scanWith(frameworks: string[], unknown = false): ScanResult {
    return {
      schemaVersion: 1,
      score: 90,
      partial: false,
      frameworks,
      frameworkDetectionUnknown: unknown,
      dimensions: [],
      findings: [],
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    } as unknown as ScanResult;
  }

  const identity = { scanId: "s", inputFingerprint: "i" } as never;

  it("counts frameworks instead of reporting a 0/1 flag", () => {
    const four = computeTrustSnapshot(
      scanWith(["playwright", "vitest", "jest", "cypress"]),
      identity,
      trustSummary,
      "2026-01-01T00:00:00Z",
    );
    const one = computeTrustSnapshot(
      scanWith(["playwright"]),
      identity,
      trustSummary,
      "2026-01-01T00:00:00Z",
    );
    // The defect: both were 1.
    expect(four.frameworkCount).toBe(4);
    expect(one.frameworkCount).toBe(1);
  });

  it("still reports 0 when detection genuinely failed", () => {
    const unknown = computeTrustSnapshot(
      scanWith([], true),
      identity,
      trustSummary,
      "2026-01-01T00:00:00Z",
    );
    // "Unknown" and "none" stay distinguishable from each other and from
    // a real count, which is the whole reason this is not just `.length`.
    expect(unknown.frameworkCount).toBe(0);
  });
});

describe("the warning-to-error ratio needs a denominator", () => {
  it("does not report weak assertions for every warning when there are no errors", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", warnings: 50, errors: 0 }),
      snap({ scanId: "b", warnings: 50, errors: 0 }),
    ]);
    // The defect: `50 > 0 * 2` is true, so a repo with 50 warnings and zero
    // errors was told its assertions were weak — on a ratio with no
    // denominator.
    expect(
      trend.categorizedDebt.filter((d) => d.category === "weak-assertion"),
    ).toEqual([]);
  });

  it("still reports weak assertions when the ratio has a denominator", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", warnings: 50, errors: 2 }),
      snap({ scanId: "b", warnings: 50, errors: 2 }),
    ]);
    expect(
      trend.categorizedDebt.some((d) => d.category === "weak-assertion"),
    ).toBe(true);
  });

  it("stays quiet when warnings are proportionate to errors", () => {
    const trend = analyzeTrustTrends([
      snap({ scanId: "a", warnings: 2, errors: 4 }),
      snap({ scanId: "b", warnings: 2, errors: 4 }),
    ]);
    expect(
      trend.categorizedDebt.filter((d) => d.category === "weak-assertion"),
    ).toEqual([]);
  });
});
