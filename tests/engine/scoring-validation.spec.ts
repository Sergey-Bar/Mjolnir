import { describe, expect, it } from "vitest";
import {
  SCORING_MODEL_VERSION,
  validateScoringModel,
  generateStageAReport,
} from "../../src/scorer/scoring-validation.js";
import type { Finding } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "BLOCKS-RELEASE",
    file: "test.spec.ts",
    line: 1,
    column: 1,
    message: "test finding",
    why: "because",
    fix: "fix it",
    ...overrides,
  };
}

describe("scoring validation (ENGINE-001)", () => {
  describe("SCORING_MODEL_VERSION", () => {
    it("is a non-empty string", () => {
      expect(typeof SCORING_MODEL_VERSION).toBe("string");
      expect(SCORING_MODEL_VERSION.length).toBeGreaterThan(0);
    });
  });

  describe("validateScoringModel", () => {
    it("validates a clean scoring with no findings → null score", () => {
      const result = validateScoringModel([], null);
      expect(result.valid).toBe(true);
      expect(result.score).toBeNull();
    });

    it("validates a scoring with findings and valid score", () => {
      const findings = [makeFinding()];
      const result = validateScoringModel(findings, 92);
      expect(result.valid).toBe(true);
      expect(result.score).toBe(92);
    });

    it("rejects score outside [0, 100]", () => {
      const findings = [makeFinding()];
      expect(validateScoringModel(findings, -1).valid).toBe(false);
      expect(validateScoringModel(findings, 101).valid).toBe(false);
    });

    it("rejects non-null score with zero findings", () => {
      const result = validateScoringModel([], 100);
      expect(result.valid).toBe(false);
    });

    it("accepts score of 0 with findings", () => {
      const findings = Array.from({ length: 20 }, () =>
        makeFinding({ severity: "error" }),
      );
      const result = validateScoringModel(findings, 0);
      expect(result.valid).toBe(true);
      expect(result.stats.effectiveFloor).toBe(true);
    });

    it("counts E0 findings correctly", () => {
      const findings = [
        makeFinding({ findingType: "observation", confidence: "high" }),
        makeFinding({ findingType: "observation", confidence: "low" }),
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
        }),
      ];
      const result = validateScoringModel(findings, 90);
      expect(result.stats.e0Findings).toBe(2);
      expect(result.stats.e1Findings).toBe(0);
      expect(result.stats.e2Findings).toBe(1);
    });

    it("counts E1 and E2 findings correctly", () => {
      const findings = [
        makeFinding({ findingType: "heuristic-risk", confidence: "high" }),
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
        }),
      ];
      const result = validateScoringModel(findings, 85);
      expect(result.stats.e1Findings).toBe(1);
      expect(result.stats.e2Findings).toBe(1);
    });

    it("computes total deductions from all findings", () => {
      const findings = [
        makeFinding({ severity: "error" }),
        makeFinding({ severity: "warning" }),
      ];
      const result = validateScoringModel(findings, 89);
      expect(result.stats.totalDeductions).toBe(11); // 8 + 3
    });

    it("includes modelVersion in result", () => {
      const result = validateScoringModel([], null);
      expect(result.modelVersion).toBe(SCORING_MODEL_VERSION);
    });
  });

  describe("generateStageAReport", () => {
    it("generates a summary string", () => {
      const validation = validateScoringModel([], null);
      const report = generateStageAReport(validation);
      expect(typeof report.summary).toBe("string");
      expect(report.summary).toContain(SCORING_MODEL_VERSION);
    });

    it("reports VALID for passing validation", () => {
      const validation = validateScoringModel([], null);
      const report = generateStageAReport(validation);
      expect(report.validated).toBe(true);
      expect(report.summary).toContain("VALID");
    });

    it("reports INVALID for failing validation", () => {
      const validation = validateScoringModel([], 100);
      const report = generateStageAReport(validation);
      expect(report.validated).toBe(false);
      expect(report.summary).toContain("INVALID");
    });

    it("includes stats from validation", () => {
      const findings = [makeFinding()];
      const validation = validateScoringModel(findings, 92);
      const report = generateStageAReport(validation);
      expect(report.stats.totalFindings).toBe(1);
    });

    it("preserves score in report", () => {
      const findings = [makeFinding()];
      const validation = validateScoringModel(findings, 85);
      const report = generateStageAReport(validation);
      expect(report.score).toBe(85);
    });

    it("includes violations in report", () => {
      const validation = validateScoringModel([], 100);
      const report = generateStageAReport(validation);
      expect(report.violations.length).toBeGreaterThan(0);
    });

    it("preserves model version", () => {
      const validation = validateScoringModel([], null);
      const report = generateStageAReport(validation);
      expect(report.modelVersion).toBe(SCORING_MODEL_VERSION);
    });

    it("includes violation messages in summary", () => {
      const validation = validateScoringModel([], 100);
      const report = generateStageAReport(validation);
      expect(report.summary).toContain("violation");
    });

    it("handles null score in summary", () => {
      const validation = validateScoringModel([], null);
      const report = generateStageAReport(validation);
      expect(report.summary).toContain("null");
    });
  });
});
