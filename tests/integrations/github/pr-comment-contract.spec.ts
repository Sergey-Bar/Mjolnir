/**
 * PR Comment Data Contract (PRUX-001) — test suite.
 *
 * Validates the PrCommentModelV1 interface shape and the
 * verdict-completeness state matrix (§51.2).
 */

import { describe, expect, it } from "vitest";

import {
  validatePrCommentModel,
  type PrCommentModelV1,
  type AnalysisCompleteness,
  type PrCommentVerdict,
} from "../../../src/integrations/github/pr-comment-contract.js";

function validModel(
  overrides: Partial<PrCommentModelV1> = {},
): PrCommentModelV1 {
  return {
    schemaVersion: 1,
    scanId: "scan-001",
    repository: "org/repo",
    pullRequest: { number: 42, headSha: "abc123", baseRef: "main" },
    scope: { type: "changed", description: "Changed files in PR" },
    verdict: "WORTHY",
    score: 85,
    scoreAvailability: "available",
    analysisCompleteness: "COMPLETE",
    trustModelVersion: "1.0",
    scoringModelVersion: "1.0",
    testsAnalyzed: 100,
    ciIntegritySummary: { passed: true, details: "All checks passed" },
    runtimeCorroborationSummary: {
      testsExecuted: 50,
      corroboratedFindings: 3,
      details: "Runtime corroboration complete",
    },
    changedFileCount: 10,
    analyzedFileCount: 10,
    partialFileCount: 0,
    analysisErrors: 0,
    frameworkSupportSummary: {
      detected: ["playwright"],
      unknown: false,
      details: "Playwright detected",
    },
    blockingFindings: [],
    importantFindings: [],
    corroboratedConclusions: [],
    suppressionSummary: { suppressedCount: 0, details: "" },
    evidenceSummary: {
      evidenceLevel: "E2",
      trustLevel: "L2",
      details: "Deterministic evidence",
    },
    reportArtifactReference: {
      url: "https://example.com/report",
      format: "json",
    },
    generatedBy: { tool: "qa-doctor-cli", version: "1.0.10" },
    ...overrides,
  };
}

describe("validatePrCommentModel", () => {
  it("accepts a valid COMPLETE/WORTHY model", () => {
    const model = validModel();
    expect(validatePrCommentModel(model)).toEqual([]);
  });

  it("accepts COMPLETE/NEEDS_WORK", () => {
    const model = validModel({ verdict: "NEEDS_WORK" });
    expect(validatePrCommentModel(model)).toEqual([]);
  });

  it("accepts COMPLETE/UNWORTHY", () => {
    const model = validModel({ verdict: "UNWORTHY" });
    expect(validatePrCommentModel(model)).toEqual([]);
  });

  it("accepts PARTIAL/INCOMPLETE", () => {
    const model = validModel({
      analysisCompleteness: "PARTIAL",
      verdict: "INCOMPLETE",
    });
    expect(validatePrCommentModel(model)).toEqual([]);
  });

  it("accepts ERROR/ANALYSIS_ERROR", () => {
    const model = validModel({
      analysisCompleteness: "ERROR",
      verdict: "ANALYSIS_ERROR",
    });
    expect(validatePrCommentModel(model)).toEqual([]);
  });

  it("rejects PARTIAL/WORTHY", () => {
    const model = validModel({
      analysisCompleteness: "PARTIAL",
      verdict: "WORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.field).toBe("verdict");
  });

  it("rejects PARTIAL/NEEDS_WORK", () => {
    const model = validModel({
      analysisCompleteness: "PARTIAL",
      verdict: "NEEDS_WORK",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects PARTIAL/UNWORTHY", () => {
    const model = validModel({
      analysisCompleteness: "PARTIAL",
      verdict: "UNWORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects ERROR/WORTHY", () => {
    const model = validModel({
      analysisCompleteness: "ERROR",
      verdict: "WORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects COMPLETE/INCOMPLETE", () => {
    const model = validModel({
      analysisCompleteness: "COMPLETE",
      verdict: "INCOMPLETE",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects COMPLETE/ANALYSIS_ERROR", () => {
    const model = validModel({
      analysisCompleteness: "COMPLETE",
      verdict: "ANALYSIS_ERROR",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects ERROR/WORTHY", () => {
    const model = validModel({
      analysisCompleteness: "ERROR",
      verdict: "WORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects ERROR/NEEDS_WORK", () => {
    const model = validModel({
      analysisCompleteness: "ERROR",
      verdict: "NEEDS_WORK",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects ERROR/UNWORTHY", () => {
    const model = validModel({
      analysisCompleteness: "ERROR",
      verdict: "UNWORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects wrong schemaVersion", () => {
    const model = validModel({ schemaVersion: 2 as 1 });
    const errors = validatePrCommentModel(model);
    expect(errors.some((e) => e.field === "schemaVersion")).toBe(true);
  });

  it("rejects out-of-range score", () => {
    const model = validModel({ score: 150 });
    const errors = validatePrCommentModel(model);
    expect(errors.some((e) => e.field === "score")).toBe(true);
  });

  it("rejects negative score", () => {
    const model = validModel({ score: -1 });
    const errors = validatePrCommentModel(model);
    expect(errors.some((e) => e.field === "score")).toBe(true);
  });

  it("accepts null score", () => {
    const model = validModel({ score: null });
    const errors = validatePrCommentModel(model);
    expect(errors.filter((e) => e.field === "score")).toEqual([]);
  });

  it("returns multiple errors for multiple problems", () => {
    const model = validModel({
      schemaVersion: 2 as 1,
      analysisCompleteness: "PARTIAL",
      verdict: "WORTHY",
    });
    const errors = validatePrCommentModel(model);
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  describe("full state matrix coverage", () => {
    const completenessValues: AnalysisCompleteness[] = [
      "COMPLETE",
      "PARTIAL",
      "ERROR",
    ];
    const verdictValues: PrCommentVerdict[] = [
      "WORTHY",
      "NEEDS_WORK",
      "UNWORTHY",
      "INCOMPLETE",
      "ANALYSIS_ERROR",
    ];

    const validCombinations: Array<[AnalysisCompleteness, PrCommentVerdict]> = [
      ["COMPLETE", "WORTHY"],
      ["COMPLETE", "NEEDS_WORK"],
      ["COMPLETE", "UNWORTHY"],
      ["PARTIAL", "INCOMPLETE"],
      ["ERROR", "ANALYSIS_ERROR"],
    ];

    for (const completeness of completenessValues) {
      for (const verdict of verdictValues) {
        const isValid = validCombinations.some(
          ([c, v]) => c === completeness && v === verdict,
        );
        it(`${completeness}/${verdict} → ${isValid ? "valid" : "invalid"}`, () => {
          const model = validModel({
            analysisCompleteness: completeness,
            verdict,
          });
          const errors = validatePrCommentModel(model);
          const verdictErrors = errors.filter((e) => e.field === "verdict");
          if (isValid) {
            expect(verdictErrors).toEqual([]);
          } else {
            expect(verdictErrors.length).toBeGreaterThan(0);
          }
        });
      }
    }
  });
});
