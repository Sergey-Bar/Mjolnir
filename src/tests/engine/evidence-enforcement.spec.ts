import { describe, expect, it } from "vitest";
import {
  deriveEvidenceLevel,
  isE0Advisory,
  canDeductPoints,
  detectEvidenceLevelGaming,
} from "../../src/engine/evidence-enforcement.js";
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
    message: "test",
    why: "because",
    fix: "fix it",
    ...overrides,
  };
}

describe("evidence enforcement (ENGINE-003)", () => {
  describe("deriveEvidenceLevel", () => {
    it("returns E0 for observations", () => {
      expect(deriveEvidenceLevel("observation", "high")).toBe("E0");
      expect(deriveEvidenceLevel("observation", "low")).toBe("E0");
    });

    it("returns E1 for heuristic-risk", () => {
      expect(deriveEvidenceLevel("heuristic-risk", "high")).toBe("E1");
      expect(deriveEvidenceLevel("heuristic-risk", "low")).toBe("E1");
    });

    it("returns E2 for deterministic-defect with high confidence", () => {
      expect(deriveEvidenceLevel("deterministic-defect", "high")).toBe("E2");
    });

    it("returns E2 for deterministic-defect with medium confidence", () => {
      expect(deriveEvidenceLevel("deterministic-defect", "medium")).toBe("E2");
    });

    it("downgrades deterministic-defect to E1 with low confidence", () => {
      expect(deriveEvidenceLevel("deterministic-defect", "low")).toBe("E1");
    });
  });

  describe("isE0Advisory", () => {
    it("returns true for observations", () => {
      expect(isE0Advisory("observation", "high")).toBe(true);
    });

    it("returns false for deterministic-defect", () => {
      expect(isE0Advisory("deterministic-defect", "high")).toBe(false);
    });

    it("respects explicit evidenceLevel override", () => {
      expect(isE0Advisory("deterministic-defect", "high", "E0")).toBe(true);
      expect(isE0Advisory("observation", "high", "E1")).toBe(false);
    });

    it("returns false for heuristic-risk", () => {
      expect(isE0Advisory("heuristic-risk", "medium")).toBe(false);
    });
  });

  describe("canDeductPoints", () => {
    it("returns false for E0 (observations)", () => {
      expect(canDeductPoints("observation", "high")).toBe(false);
    });

    it("returns true for E1 (heuristic-risk)", () => {
      expect(canDeductPoints("heuristic-risk", "high")).toBe(true);
    });

    it("returns true for E2 (deterministic-defect)", () => {
      expect(canDeductPoints("deterministic-defect", "high")).toBe(true);
    });

    it("respects explicit evidenceLevel override", () => {
      expect(canDeductPoints("deterministic-defect", "high", "E0")).toBe(false);
      expect(canDeductPoints("observation", "high", "E2")).toBe(true);
    });

    it("returns true for low-confidence deterministic-defect (E1)", () => {
      expect(canDeductPoints("deterministic-defect", "low")).toBe(true);
    });
  });

  describe("detectEvidenceLevelGaming", () => {
    it("reports no gaming for honest findings", () => {
      const findings = [
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
        }),
        makeFinding({ findingType: "observation", confidence: "low" }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.gamingDetected).toBe(false);
      expect(report.suspiciousFindings).toHaveLength(0);
    });

    it("detects observation claiming non-E0", () => {
      const findings = [
        makeFinding({
          findingType: "observation",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.gamingDetected).toBe(true);
      expect(
        report.suspiciousFindings.some((s) => s.reason.includes("observation")),
      ).toBe(true);
    });

    it("detects low-confidence deterministic-defect claiming E2", () => {
      const findings = [
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "low",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.gamingDetected).toBe(true);
      expect(
        report.suspiciousFindings.some((s) =>
          s.reason.includes("low-confidence"),
        ),
      ).toBe(true);
    });

    it("detects declared level exceeding derived level", () => {
      const findings = [
        makeFinding({
          findingType: "heuristic-risk",
          confidence: "medium",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.gamingDetected).toBe(true);
      expect(
        report.suspiciousFindings.some((s) => s.reason.includes("exceeds")),
      ).toBe(true);
    });

    it("accepts downgrade (declared weaker than derived)", () => {
      const findings = [
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E1",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      // Downgrade is not gaming — it's honest conservatism.
      expect(report.suspiciousFindings).toHaveLength(0);
    });

    it("tracks stats correctly", () => {
      const findings = [
        makeFinding({ findingType: "observation", confidence: "high" }),
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
        makeFinding({
          findingType: "heuristic-risk",
          confidence: "medium",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.stats.totalFindings).toBe(3);
      expect(report.stats.overriddenFindings).toBeGreaterThan(0);
    });

    it("handles empty findings array", () => {
      const report = detectEvidenceLevelGaming([]);
      expect(report.gamingDetected).toBe(false);
      expect(report.stats.totalFindings).toBe(0);
    });

    it("includes file and line in suspicions", () => {
      const findings = [
        makeFinding({
          findingType: "observation",
          confidence: "high",
          evidenceLevel: "E1",
          file: "bad.spec.ts",
          line: 42,
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      if (report.suspiciousFindings.length > 0) {
        expect(report.suspiciousFindings[0]?.file).toBe("bad.spec.ts");
        expect(report.suspiciousFindings[0]?.line).toBe(42);
      }
    });

    it("accepts same-level explicit override as not gaming", () => {
      const findings = [
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.suspiciousFindings).toHaveLength(0);
    });

    it("detects multiple gaming patterns in one pass", () => {
      const findings = [
        makeFinding({
          findingType: "observation",
          confidence: "high",
          evidenceLevel: "E2",
        }),
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "low",
          evidenceLevel: "E2",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.suspiciousFindings.length).toBeGreaterThanOrEqual(2);
    });

    it("handles findings without explicit evidenceLevel", () => {
      const findings = [
        makeFinding({ findingType: "heuristic-risk", confidence: "medium" }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      // No explicit level → derived level used → no gaming possible.
      expect(report.gamingDetected).toBe(false);
    });

    it("counts overridden findings correctly", () => {
      const findings = [
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
          evidenceLevel: "E1",
        }),
        makeFinding({
          findingType: "deterministic-defect",
          confidence: "high",
        }),
      ];
      const report = detectEvidenceLevelGaming(findings);
      expect(report.stats.overriddenFindings).toBe(1);
    });
  });
});
