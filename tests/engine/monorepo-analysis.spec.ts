import { describe, expect, it } from "vitest";
import { analyzeMonorepo } from "../../src/engine/monorepo-analysis.js";
import type { Finding } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "test.spec.ts",
    line: 1,
    column: 1,
    message: "test finding",
    why: "because",
    fix: "fix it",
    ...overrides,
  };
}

describe("monorepo-analysis (ECO-003)", () => {
  describe("analyzeMonorepo", () => {
    it("returns fail for empty package list", () => {
      const result = analyzeMonorepo([], {
        weightingStrategy: "average",
      });
      expect(result.overallVerdict).toBe("fail");
      expect(result.overallScore).toBeNull();
    });

    it("passes when all packages pass", () => {
      const result = analyzeMonorepo(
        [
          {
            packageName: "pkg-a",
            path: "packages/a",
            findings: [],
            score: 95,
          },
          {
            packageName: "pkg-b",
            path: "packages/b",
            findings: [],
            score: 90,
          },
        ],
        { weightingStrategy: "average" },
      );
      expect(result.overallVerdict).toBe("pass");
      expect(result.overallScore).toBe(93);
    });

    it("propagates worst-package blocker regardless of strategy", () => {
      const result = analyzeMonorepo(
        [
          {
            packageName: "good",
            path: "packages/good",
            findings: [],
            score: 95,
          },
          {
            packageName: "bad",
            path: "packages/bad",
            findings: [makeFinding({ severity: "error" })],
            score: 40,
          },
        ],
        { weightingStrategy: "average" },
      );
      expect(result.overallVerdict).toBe("fail");
      expect(result.blockerPackage).toBe("bad");
    });

    it("worst-package strategy picks lowest score", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 90 },
          { packageName: "b", path: "b", findings: [], score: 70 },
          { packageName: "c", path: "c", findings: [], score: 85 },
        ],
        { weightingStrategy: "worst-package" },
      );
      expect(result.overallScore).toBe(70);
      expect(result.overallVerdict).toBe("warn");
    });

    it("average strategy computes mean", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 80 },
          { packageName: "b", path: "b", findings: [], score: 100 },
        ],
        { weightingStrategy: "average" },
      );
      expect(result.overallScore).toBe(90);
      expect(result.overallVerdict).toBe("pass");
    });

    it("configurable strategy uses package weights", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 60 },
          { packageName: "b", path: "b", findings: [], score: 100 },
        ],
        {
          weightingStrategy: "configurable",
          packageWeights: { a: 3, b: 1 },
        },
      );
      // weighted: (60*3 + 100*1) / 4 = 280/4 = 70
      expect(result.overallScore).toBe(70);
      expect(result.overallVerdict).toBe("warn");
    });

    it("configurable strategy uses weight 1 for unweighted packages", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 80 },
          { packageName: "b", path: "b", findings: [], score: 100 },
        ],
        { weightingStrategy: "configurable" },
      );
      expect(result.overallScore).toBe(90);
    });

    it("fails when any package has null score", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 90 },
          { packageName: "b", path: "b", findings: [], score: null },
        ],
        { weightingStrategy: "worst-package" },
      );
      expect(result.overallVerdict).toBe("fail");
      expect(result.blockerPackage).toBe("b");
    });

    it("returns per-package verdicts", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 95 },
          { packageName: "b", path: "b", findings: [], score: 60 },
          { packageName: "c", path: "c", findings: [], score: 30 },
        ],
        { weightingStrategy: "average" },
      );
      expect(result.packages[0]?.verdict).toBe("pass");
      expect(result.packages[1]?.verdict).toBe("warn");
      expect(result.packages[2]?.verdict).toBe("fail");
    });
  });
});
