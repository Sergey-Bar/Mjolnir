/* eslint-disable */
import { describe, it, expect, vi } from "vitest";
import type { TrustSummary } from "../src/types.js";
import {
  computeTrustSnapshot,
  analyzeTrustTrends,
  renderTrustTrend,
  type TrustSnapshot,
} from "../src/engine/historical-trust.js";
import { buildRunIdentity } from "../src/engine/run-identity.js";

describe("Milestone 12 — Historical Trust and Trend Analysis", () => {
  it("uses the supplied scan timestamp deterministically", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-09-23T10:00:00.000Z"));
      const runIdentity = buildRunIdentity({
        files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
        rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
        config: null,
        engineVersion: "2.0.0",
      });
      const trustSummary: TrustSummary = {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1,
        inconclusiveRate: 0,
        provisionalRuleIds: [],
        ceilingReasons: [],
      };
      const result = {
        schemaVersion: 1,
        score: 85,
        partial: false,
        frameworks: [],
        frameworkDetectionUnknown: false,
        analysisStatus: {
          discovery: "complete",
          rules: "complete",
          skippedFiles: 0,
          durationMs: 1000,
        },
        findings: [],
        dimensions: [],
      } as any;

      const first = computeTrustSnapshot(
        result,
        runIdentity,
        trustSummary,
        "2026-09-22T09:30:00.000Z",
      );
      vi.setSystemTime(new Date("2026-09-23T11:00:00.000Z"));
      const second = computeTrustSnapshot(
        result,
        runIdentity,
        trustSummary,
        "2026-09-22T09:30:00.000Z",
      );

      expect(first.timestamp).toBe("2026-09-22T09:30:00.000Z");
      expect(second).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it("should compute a trust snapshot from a scan result", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const trustSummary: TrustSummary = {
      level: "L2",
      confidence: 0.8,
      evidenceCoverage: 1.0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [
        {
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test uses .only",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        },
      ],
      dimensions: { testFiles: 1 },
      trustSummary,
    } as any;

    const snapshot = computeTrustSnapshot(
      result,
      runIdentity,
      trustSummary,
      "2026-09-23T00:00:00.000Z",
    );
    expect(snapshot.score).toBe(85);
    expect(snapshot.trustLevel).toBe("L2");
    expect(snapshot.findings).toBe(1);
  });

  it("should analyze trust trends across snapshots", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const trustSummary: TrustSummary = {
      level: "L2",
      confidence: 0.8,
      evidenceCoverage: 1.0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const makeResult = (score: number | null, findings: number) =>
      ({
        score,
        partial: false,
        analysisStatus: {
          discovery: "complete" as const,
          rules: "complete" as const,
          skippedFiles: 0,
          rulesCrashed: 0,
          truncationReasons: [],
          frameworkDetectionUnknown: false,
          durationMs: 1000,
        },
        findings: Array(findings).fill({
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        }),
        dimensions: { testFiles: 1 },
        trustSummary,
      }) as any;

    const snapshots = [
      computeTrustSnapshot(
        makeResult(80, 5),
        runIdentity,
        trustSummary,
        "2026-09-22T00:00:00.000Z",
      ),
      computeTrustSnapshot(
        makeResult(90, 3),
        runIdentity,
        trustSummary,
        "2026-09-23T00:00:00.000Z",
      ),
    ];

    const trend = analyzeTrustTrends(snapshots);
    expect(trend.overallDirection).toBe("improving");
    expect(trend.scoreDelta).toBe(10);
    expect(trend.findingDelta).toBe(-2);
  });

  it("should detect regressions", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const trustSummary: TrustSummary = {
      level: "L2",
      confidence: 0.8,
      evidenceCoverage: 1.0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const makeResult = (
      score: number | null,
      findings: number,
      errors: number,
    ) =>
      ({
        score,
        partial: false,
        analysisStatus: {
          discovery: "complete" as const,
          rules: "complete" as const,
          skippedFiles: 0,
          rulesCrashed: 0,
          truncationReasons: [],
          frameworkDetectionUnknown: false,
          durationMs: 1000,
        },
        findings: Array(findings).fill({
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: errors > 0 ? ("error" as const) : ("warning" as const),
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        }),
        dimensions: { testFiles: 1 },
        trustSummary,
      }) as any;

    const snapshots = [
      computeTrustSnapshot(
        makeResult(90, 2, 0),
        runIdentity,
        trustSummary,
        "2026-09-22T00:00:00.000Z",
      ),
      computeTrustSnapshot(
        makeResult(70, 5, 2),
        runIdentity,
        trustSummary,
        "2026-09-23T00:00:00.000Z",
      ),
    ];

    const trend = analyzeTrustTrends(snapshots);
    expect(trend.regressions.length).toBeGreaterThan(0);
    expect(trend.overallDirection).toBe("degrading");
  });

  it("should render trust trend report", () => {
    const trend = {
      snapshots: [],
      overallDirection: "stable" as const,
      scoreDelta: 0,
      findingDelta: 0,
      confidenceDelta: 0,
      regressions: [],
      improvements: [],
      categorizedDebt: [],
    };
    const rendered = renderTrustTrend(trend);
    expect(rendered).toContain("Historical Trust Trend Analysis");
  });

  it("should return insufficient-data for single snapshot", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const trustSummary: TrustSummary = {
      level: "L0",
      confidence: 1,
      evidenceCoverage: 0,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const result = {
      score: null,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 0,
      },
      findings: [],
      dimensions: { testFiles: 0 },
      trustSummary,
    } as any;

    const snapshot = computeTrustSnapshot(
      result,
      runIdentity,
      trustSummary,
      "2026-09-23T00:00:00.000Z",
    );
    const trend = analyzeTrustTrends([snapshot]);
    expect(trend.overallDirection).toBe("insufficient-data");
  });

  it("handles stable null scores and confidence-only regressions", () => {
    const base: TrustSnapshot = {
      scanId: "base",
      timestamp: "2026-09-22T00:00:00.000Z",
      score: null,
      findings: 0,
      errors: 0,
      warnings: 0,
      infos: 0,
      advisory: 0,
      trustLevel: "L1",
      confidence: 0.8,
      evidenceCoverage: 1,
      inconclusiveRate: 0,
      partial: false,
      frameworkCount: 0,
      ruleCount: 0,
    };

    const stable = analyzeTrustTrends([
      base,
      { ...base, scanId: "stable", timestamp: "2026-09-23T00:00:00.000Z" },
    ]);
    const regressed = analyzeTrustTrends([
      base,
      {
        ...base,
        scanId: "regressed",
        timestamp: "2026-09-24T00:00:00.000Z",
        confidence: 0.5,
      },
    ]);

    expect(stable.overallDirection).toBe("stable");
    expect(stable.scoreDelta).toBe(0);
    expect(
      regressed.regressions.map((regression) => regression.type),
    ).toContain("confidence-drop");

    const lower = {
      ...base,
      scanId: "lower",
      score: 60,
      findings: 4,
      confidence: 0.5,
    };
    const higher = {
      ...base,
      scanId: "higher",
      score: 80,
      findings: 1,
      confidence: 0.9,
    };
    const mixed = analyzeTrustTrends([lower, higher]);
    const mixedRendered = renderTrustTrend(mixed);
    const inverse = analyzeTrustTrends([higher, lower]);
    const inverseRendered = renderTrustTrend(inverse);
    const mediumDebt = analyzeTrustTrends([
      base,
      {
        ...base,
        scanId: "medium-debt",
        timestamp: "2026-09-24T00:00:00.000Z",
        advisory: 1,
        inconclusiveRate: 0.1,
      },
    ]);

    expect(
      mixed.improvements.some(
        (item) =>
          item.type === "score-increase" || item.type === "finding-decrease",
      ),
    ).toBe(true);
    expect(mixedRendered).toContain("Improvements:");
    expect(
      inverse.regressions.some(
        (item) =>
          item.type === "score-drop" || item.type === "finding-increase",
      ),
    ).toBe(true);
    expect(inverseRendered).toContain("Regressions:");
    expect(
      mediumDebt.categorizedDebt.find((item) => item.category === "suppression")
        ?.severity,
    ).toBe("medium");
  });

  it("records an unknown framework count honestly", () => {
    const result = {
      schemaVersion: 1,
      score: 80,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: true,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
      findings: [],
      dimensions: [],
    } as any;
    const snapshot = computeTrustSnapshot(
      result,
      buildRunIdentity({
        files: [{ path: "test.spec.ts", size: 1, hash: "a" }],
        rules: [],
        config: null,
        engineVersion: "2.0.0",
      }),
      {
        level: "L1",
        confidence: 0.5,
        evidenceCoverage: 1,
        inconclusiveRate: 0,
        provisionalRuleIds: [],
        ceilingReasons: [],
      },
      "2026-09-23T00:00:00.000Z",
    );

    expect(snapshot.frameworkCount).toBe(0);
  });

  it("categorizes and renders every current trust-debt class", () => {
    const first: TrustSnapshot = {
      scanId: "first",
      timestamp: "2026-09-22T00:00:00.000Z",
      score: 90,
      findings: 2,
      errors: 1,
      warnings: 1,
      infos: 0,
      advisory: 0,
      trustLevel: "L2",
      confidence: 0.9,
      evidenceCoverage: 1,
      inconclusiveRate: 0,
      partial: false,
      frameworkCount: 1,
      ruleCount: 1,
    };
    const latest: TrustSnapshot = {
      ...first,
      scanId: "latest",
      timestamp: "2026-09-23T00:00:00.000Z",
      advisory: 12,
      inconclusiveRate: 0.5,
      partial: true,
      warnings: 4,
    };

    const trend = analyzeTrustTrends([first, latest]);
    const rendered = renderTrustTrend(trend);

    expect(trend.categorizedDebt.map((debt) => debt.category)).toEqual([
      "suppression",
      "evidence",
      "framework",
      "weak-assertion",
    ]);
    expect(rendered).toContain("Trust Debt");
  });
});
