/* eslint-disable */
import { describe, it, expect } from "vitest";
import type { TrustSummary } from "../src/types.js";
import {
  computeTrustSnapshot,
  analyzeTrustTrends,
  renderTrustTrend,
} from "../src/engine/historical-trust.js";
import { buildRunIdentity } from "../src/engine/run-identity.js";

describe("Milestone 12 — Historical Trust and Trend Analysis", () => {
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

    const snapshot = computeTrustSnapshot(result, runIdentity, trustSummary);
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
      computeTrustSnapshot(makeResult(80, 5), runIdentity, trustSummary),
      computeTrustSnapshot(makeResult(90, 3), runIdentity, trustSummary),
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
      computeTrustSnapshot(makeResult(90, 2, 0), runIdentity, trustSummary),
      computeTrustSnapshot(makeResult(70, 5, 2), runIdentity, trustSummary),
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

    const snapshot = computeTrustSnapshot(result, runIdentity, trustSummary);
    const trend = analyzeTrustTrends([snapshot]);
    expect(trend.overallDirection).toBe("insufficient-data");
  });
});
