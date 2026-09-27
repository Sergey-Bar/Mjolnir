import { describe, expect, it } from "vitest";

import type { ForensicsReport } from "../../src/forensics/types.js";
import {
  buildRuntimeEvidenceGraph,
  queryRuntimeEvidence,
  queryRuntimeEvidenceByFile,
  replayRuntimeEvidenceGraph,
  serializeRuntimeEvidenceGraph,
  type RuntimeEvidenceArtifactInput,
} from "../../src/engine/runtime-evidence-graph.js";

const repository = "repo@example/qa-doctor";
const commit = "commit-a";
const scanId = "scan-a";
const now = "2026-09-25T00:00:00.000Z";
const acquiredAt = "2026-09-24T23:59:00.000Z";

function artifact(
  overrides: Partial<RuntimeEvidenceArtifactInput> = {},
): RuntimeEvidenceArtifactInput {
  return {
    source: "playwright-json",
    path: "reports/playwright.json",
    producer: "playwright",
    acquiredAt,
    repositoryIdentity: repository,
    commit,
    scanId,
    ...overrides,
  };
}

function playwrightContent(status: "passed" | "failed" = "passed"): string {
  return JSON.stringify({
    suites: [
      {
        specs: [
          {
            title: "checkout works",
            file: "e2e/shop.spec.ts",
            location: { line: 4, column: 0 },
            tests: [{ results: [{ status, duration: 7 }] }],
          },
        ],
      },
    ],
  });
}

describe("buildRuntimeEvidenceGraph", () => {
  it("ingests Playwright records with stable graph identities and provenance", () => {
    const result = buildRuntimeEvidenceGraph({
      artifacts: [artifact({ content: playwrightContent() })],
      context: {
        repositoryIdentity: repository,
        commit,
        scanId,
        now,
        maxAgeMs: 120_000,
      },
    });

    expect(result.runtimeArtifacts).toHaveLength(1);
    expect(result.runtimeRecords).toHaveLength(1);
    expect(result.runtimeRecords[0]?.file).toBe("e2e/shop.spec.ts");
    expect(result.runtimeRecords[0]?.line).toBe(5);
    expect(result.runtimeArtifacts[0]?.freshness.state).toBe("FRESH");
    expect(result.partial).toBe(false);
    expect(result.trustPromotion).toBe("NOT_CLAIMED");
    expect(result.nodes.every((node) => node.id.length > 0)).toBe(true);
    expect(
      result.edges.every((edge) => "id" in edge && edge.id.length > 0),
    ).toBe(true);
    expect(result.edges.some((edge) => edge.type === "OBSERVED_IN")).toBe(true);
  });

  it("ingests JUnit-style records and keeps the source in provenance", () => {
    const result = buildRuntimeEvidenceGraph({
      artifacts: [
        artifact({
          source: "junit-xml",
          path: "reports/junit.xml",
          content:
            '<testsuite name="checkout"><testcase classname="e2e/shop.spec.ts" name="checkout works" time="0.01" /></testsuite>',
        }),
      ],
      context: {
        repositoryIdentity: repository,
        commit,
        scanId,
        now,
        maxAgeMs: 120_000,
      },
    });

    expect(result.runtimeRecords[0]?.source).toBe("junit-xml");
    expect(result.runtimeRecords[0]?.title).toBe("checkout works");
    expect(result.runtimeArtifacts[0]?.provenance.source).toBe("junit-xml");
  });

  it("accepts the existing ForensicsReport contract directly", () => {
    const report: ForensicsReport = {
      forensicsSchemaVersion: 1,
      source: "playwright-json",
      totalTests: 1,
      failed: 0,
      skipped: 0,
      retriedTests: 0,
      flakyTests: 0,
      totalDurationMs: 1,
      verdicts: [
        {
          file: "e2e/shop.spec.ts",
          title: "checkout works",
          attempts: 1,
          finalStatus: "passed",
          totalDurationMs: 1,
          passedOnRetry: false,
          everFailed: false,
          skipped: false,
        },
      ],
      analysisComplete: true,
      skippedReports: 0,
      incompleteReasons: [],
    };
    const result = buildRuntimeEvidenceGraph(report);
    expect(result.runtimeRecords[0]?.title).toBe("checkout works");
    expect(result.runtimeArtifacts[0]?.malformed).toBe(false);
  });

  it("deduplicates identical artifacts and replays deterministically", () => {
    const first = artifact({ content: playwrightContent() });
    const second = artifact({
      content: playwrightContent(),
      path: "reports/copy.json",
    });
    const left = buildRuntimeEvidenceGraph({
      artifacts: [first, second],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });
    const right = replayRuntimeEvidenceGraph({
      artifacts: [second, first],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });

    expect(left.runtimeArtifacts).toHaveLength(1);
    expect(left.runtimeArtifacts[0]?.duplicateCount).toBe(1);
    expect(left.runtimeArtifacts[0]?.paths).toEqual([
      "reports/copy.json",
      "reports/playwright.json",
    ]);
    expect(serializeRuntimeEvidenceGraph(left)).toBe(
      serializeRuntimeEvidenceGraph(right),
    );
    expect(new Set(left.nodes.map((node) => node.id)).size).toBe(
      left.nodes.length,
    );
    expect(new Set(left.edges.map((edge) => edge.id)).size).toBe(
      left.edges.length,
    );
  });

  it("marks age-expired and foreign artifacts without a trust claim", () => {
    const stale = buildRuntimeEvidenceGraph({
      artifacts: [artifact({ content: playwrightContent() })],
      context: {
        repositoryIdentity: repository,
        commit,
        scanId,
        now: "2026-09-26T00:00:00.000Z",
        maxAgeMs: 1_000,
      },
    });
    const foreign = buildRuntimeEvidenceGraph({
      artifacts: [
        artifact({ content: playwrightContent(), commit: "commit-b" }),
      ],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });

    expect(stale.runtimeArtifacts[0]?.freshness.state).toBe("STALE");
    expect(foreign.runtimeArtifacts[0]?.freshness.state).toBe("FOREIGN");
    expect(stale.trustPromotion).toBe("NOT_CLAIMED");
    expect(foreign.trustPromotion).toBe("NOT_CLAIMED");
    expect(stale.partial).toBe(true);
    expect(foreign.partial).toBe(true);
    expect(queryRuntimeEvidence(stale, { freshness: "FRESH" })).toHaveLength(0);
  });

  it("keeps truncated records but exposes partial state", () => {
    const result = buildRuntimeEvidenceGraph({
      artifacts: [artifact({ content: playwrightContent(), truncated: true })],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });

    expect(result.runtimeRecords).toHaveLength(1);
    expect(result.runtimeArtifacts[0]?.partial).toBe(true);
    expect(result.runtimeArtifacts[0]?.freshness.state).toBe("PARTIAL");
    expect(result.partial).toBe(true);
  });

  it("rejects malformed payloads and malformed records without throwing", () => {
    const malformed = buildRuntimeEvidenceGraph({
      artifacts: [artifact({ content: "{not-json" })],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });
    const badRecord = buildRuntimeEvidenceGraph({
      artifacts: [
        artifact({
          records: [{ title: "missing file", finalStatus: "passed" }],
        }),
      ],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });

    expect(malformed.runtimeArtifacts[0]?.freshness.state).toBe("MALFORMED");
    expect(malformed.runtimeRecords).toHaveLength(0);
    expect(badRecord.runtimeArtifacts[0]?.freshness.state).toBe("MALFORMED");
    expect(badRecord.runtimeRecords).toHaveLength(0);
  });

  it("retains conflicting outcomes as contradictions and a contradiction edge", () => {
    const result = buildRuntimeEvidenceGraph({
      artifacts: [
        artifact({
          content: playwrightContent("passed"),
          path: "reports/one.json",
        }),
        artifact({
          content: playwrightContent("failed"),
          path: "reports/two.json",
        }),
      ],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });

    expect(result.runtimeContradictions).toHaveLength(1);
    expect(result.runtimeContradictions[0]?.statuses).toEqual([
      "failed",
      "passed",
    ]);
    expect(result.edges.some((edge) => edge.type === "CONTRADICTS")).toBe(true);
    expect(result.freshness.state).toBe("CONTRADICTORY");
    expect(result.partial).toBe(true);
  });

  it("supports bounded file queries and provenance traces", () => {
    const result = buildRuntimeEvidenceGraph({
      artifacts: [artifact({ content: playwrightContent() })],
      context: { repositoryIdentity: repository, commit, scanId, now },
    });
    const record = result.runtimeRecords[0];
    expect(record).toBeDefined();
    if (record === undefined) return;
    expect(queryRuntimeEvidenceByFile(result, "e2e/shop.spec.ts")).toHaveLength(
      1,
    );
    expect(queryRuntimeEvidence(result, { source: "junit-xml" })).toHaveLength(
      0,
    );
    const trace = result.edges.filter(
      (edge) => edge.source === record.id || edge.target === record.id,
    );
    expect(trace.length).toBeGreaterThan(0);
  });

  it("contains malformed fuzz-style inputs and preserves deterministic ordering", () => {
    const values: unknown[] = [
      null,
      42,
      "not-a-report",
      [],
      { suites: "wrong" },
      { suites: [{ specs: [{ title: "x" }] }] },
      { records: [{ file: "x", title: "x", finalStatus: "unknown" }] },
    ];
    for (const value of values) {
      const content = typeof value === "string" ? value : JSON.stringify(value);
      const result = buildRuntimeEvidenceGraph({
        artifacts: [artifact({ content })],
        context: { repositoryIdentity: repository, commit, scanId, now },
      });
      expect(result.trustPromotion).toBe("NOT_CLAIMED");
      expect(result.nodes.map((node) => node.id)).toEqual(
        [...result.nodes.map((node) => node.id)].sort(),
      );
      expect(result.edges.map((edge) => edge.id)).toEqual(
        [...result.edges.map((edge) => edge.id)].sort(),
      );
    }
  });
});
