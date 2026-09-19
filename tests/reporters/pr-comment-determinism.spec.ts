/**
 * TI-018 — Same PrCommentModelV1 → byte-identical rendered Markdown.
 *
 * Deterministic rendering: given the same PrCommentModelV1 input,
 * the renderer MUST produce byte-identical Markdown output on every
 * invocation and across platforms.
 */

import { describe, expect, it } from "vitest";

import { renderPrComment } from "../../src/integrations/github/pr-comment-renderer.js";
import type { PrCommentModelV1 } from "../../src/integrations/github/pr-comment-contract.js";

function makeModel(
  overrides: Partial<PrCommentModelV1> = {},
): PrCommentModelV1 {
  return {
    schemaVersion: 1,
    scanId: "abc123",
    repository: "org/repo",
    pullRequest: { number: 42, headSha: "abc123def456", baseRef: "main" },
    verdict: "HEALTHY",
    score: 85,
    scoreAvailability: "available",
    analysisCompleteness: "COMPLETE",
    scope: { type: "full", description: "Full scan" },
    trustModelVersion: "1",
    scoringModelVersion: "1",
    testsAnalyzed: 10,
    ciIntegritySummary: { passed: true, details: "All checks passed" },
    runtimeCorroborationSummary: {
      testsExecuted: 10,
      corroboratedFindings: 0,
      details: "No runtime report",
    },
    changedFileCount: 0,
    analyzedFileCount: 5,
    partialFileCount: 0,
    analysisErrors: 0,
    frameworkSupportSummary: {
      detected: ["playwright"],
      unknown: false,
      details: "Playwright F4",
    },
    blockingFindings: [],
    importantFindings: [],
    corroboratedConclusions: [],
    suppressionSummary: { suppressedCount: 0, details: "No suppressions" },
    evidenceSummary: {
      evidenceLevel: "E2",
      trustLevel: "L2",
      details: "Strong static evidence",
    },
    reportArtifactReference: { url: "", format: "json" },
    generatedBy: { tool: "qa-doctor", version: "1.1.1" },
    producedAt: "2026-09-16T00:00:00Z",
    ...overrides,
  } as PrCommentModelV1;
}

describe("TI-018: PR comment rendering determinism", () => {
  it("same model produces byte-identical output", () => {
    const model = makeModel();
    const a = renderPrComment(model);
    const b = renderPrComment(model);
    expect(a).toBe(b);
  });

  it("soak: 50 renders produce identical output", () => {
    const model = makeModel();
    const first = renderPrComment(model);
    for (let i = 0; i < 50; i++) {
      expect(renderPrComment(model)).toBe(first);
    }
  });

  it("different models produce different output", () => {
    const a = renderPrComment(makeModel({ verdict: "HEALTHY" }));
    const b = renderPrComment(makeModel({ verdict: "CRITICAL" }));
    expect(a).not.toBe(b);
  });

  it("output contains expected structural markers", () => {
    const output = renderPrComment(makeModel());
    expect(output).toContain("<!-- qa-doctor-pr-comment -->");
    expect(output).toContain("QA Doctor Verification Trust Report");
    expect(output).toContain("HEALTHY");
  });

  it("different scores produce different output", () => {
    const a = renderPrComment(makeModel({ score: 100 }));
    const b = renderPrComment(makeModel({ score: 0 }));
    expect(a).not.toBe(b);
  });
});
