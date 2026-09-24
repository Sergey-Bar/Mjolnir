/**
 * PR Comment Renderer (PRUX-002) — test suite.
 *
 * TI-018: same model → byte-identical output (determinism).
 * All verdicts render with correct vocabulary.
 */

import { describe, expect, it } from "vitest";

import { renderPrComment } from "../../../src/integrations/github/pr-comment-renderer.js";
import type {
  PrCommentModelV1,
  PrCommentVerdict,
} from "../../../src/integrations/github/pr-comment-contract.js";

function baseModel(
  overrides: Partial<PrCommentModelV1> = {},
): PrCommentModelV1 {
  return {
    schemaVersion: 1,
    scanId: "scan-abc",
    repository: "my-org/my-repo",
    pullRequest: { number: 100, headSha: "deadbeef", baseRef: "main" },
    scope: { type: "changed", description: "Changed files in PR" },
    verdict: "WORTHY",
    score: 92,
    scoreAvailability: "available",
    analysisCompleteness: "COMPLETE",
    trustModelVersion: "1.0",
    scoringModelVersion: "1.0",
    testsAnalyzed: 50,
    ciIntegritySummary: { passed: true, details: "All checks passed" },
    runtimeCorroborationSummary: {
      testsExecuted: 30,
      corroboratedFindings: 2,
      details: "Runtime evidence complete",
    },
    changedFileCount: 5,
    analyzedFileCount: 5,
    partialFileCount: 0,
    analysisErrors: 0,
    frameworkSupportSummary: {
      detected: ["playwright"],
      unknown: false,
      details: "",
    },
    blockingFindings: [],
    importantFindings: [],
    corroboratedConclusions: [],
    suppressionSummary: { suppressedCount: 0, details: "" },
    evidenceSummary: {
      evidenceLevel: "E2",
      trustLevel: "L2",
      details: "Deterministic static evidence",
    },
    reportArtifactReference: {
      url: "https://ci.example.com/report",
      format: "json",
    },
    generatedBy: { tool: "mjolnir-qa", version: "1.0.10" },
    ...overrides,
  };
}

describe("renderPrComment", () => {
  describe("TI-018: deterministic output", () => {
    it("produces byte-identical output for the same model (run 1 vs run 2)", () => {
      const model = baseModel();
      const first = renderPrComment(model);
      const second = renderPrComment(model);
      expect(first).toBe(second);
    });

    it("produces byte-identical output across 100 iterations", () => {
      const model = baseModel();
      const outputs = Array.from({ length: 100 }, () => renderPrComment(model));
      for (let i = 1; i < outputs.length; i++) {
        expect(outputs[i]).toBe(outputs[0]);
      }
    });
  });

  describe("verdict vocabulary (§51.3)", () => {
    const verdicts: Array<{
      verdict: PrCommentVerdict;
      icon: string;
      label: string;
    }> = [
      { verdict: "WORTHY", icon: "✅", label: "WORTHY" },
      { verdict: "NEEDS_WORK", icon: "⚠️", label: "NEEDS_WORK" },
      { verdict: "UNWORTHY", icon: "❌", label: "UNWORTHY" },
      { verdict: "INCOMPLETE", icon: "◐", label: "INCOMPLETE" },
      { verdict: "ANALYSIS_ERROR", icon: "◐", label: "ANALYSIS_ERROR" },
    ];

    for (const { verdict, icon, label } of verdicts) {
      it(`renders ${verdict} with correct icon and label`, () => {
        const model = baseModel({
          verdict,
          analysisCompleteness:
            verdict === "INCOMPLETE"
              ? "PARTIAL"
              : verdict === "ANALYSIS_ERROR"
                ? "ERROR"
                : "COMPLETE",
        });
        const output = renderPrComment(model);
        expect(output).toContain(`${icon} ${label}`);
      });
    }
  });

  describe("information architecture", () => {
    it("includes header with repository and PR number", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("<!-- mjolnir-pr-comment -->");
      expect(output).toContain("my-org/my-repo");
      expect(output).toContain("PR #100");
    });

    it("includes score when available", () => {
      const output = renderPrComment(baseModel({ score: 92 }));
      expect(output).toContain("92/100");
    });

    it("shows N/A when score unavailable", () => {
      const output = renderPrComment(
        baseModel({ scoreAvailability: "unavailable", score: null }),
      );
      expect(output).toContain("N/A");
    });

    it("includes scope description", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("Changed files in PR");
    });

    it("includes evidence section", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("Evidence");
    });

    it("includes details section", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("Details");
      expect(output).toContain("Files changed: 5");
      expect(output).toContain("Files analyzed: 5");
      expect(output).toContain("Tests analyzed: 50");
    });

    it("includes footer with generated-by info", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("mjolnir-qa");
      expect(output).toContain("v1.0.10");
    });

    it("includes report artifact reference", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("https://ci.example.com/report");
    });
  });

  describe("blockers section", () => {
    it("omits blockers section when no blocking findings", () => {
      const output = renderPrComment(baseModel());
      expect(output).not.toContain("Blocking Findings");
    });

    it("renders blocking findings table when present", () => {
      const model = baseModel({
        blockingFindings: [
          {
            ruleId: "QA-TEST-001",
            severity: "error",
            message: "focused test committed",
            file: "tests/login.spec.ts",
            line: 10,
          },
        ],
      });
      const output = renderPrComment(model);
      expect(output).toContain("Blocking Findings");
      expect(output).toContain("QA-TEST-001");
      expect(output).toContain("focused test committed");
    });
  });

  describe("completeness warnings", () => {
    it("shows partial analysis warning", () => {
      const model = baseModel({
        analysisCompleteness: "PARTIAL",
        verdict: "INCOMPLETE",
        partialFileCount: 3,
      });
      const output = renderPrComment(model);
      expect(output).toContain("Partial Analysis");
      expect(output).toContain("3 file(s) were only partially analyzed");
    });

    it("shows analysis error warning", () => {
      const model = baseModel({
        analysisCompleteness: "ERROR",
        verdict: "ANALYSIS_ERROR",
      });
      const output = renderPrComment(model);
      expect(output).toContain("Analysis Error");
    });

    it("no action section for complete analysis", () => {
      const output = renderPrComment(baseModel());
      expect(output).not.toContain("Action Required");
    });
  });

  describe("corroborated conclusions", () => {
    it("renders corroborated conclusions when present", () => {
      const model = baseModel({
        corroboratedConclusions: [
          {
            conclusion: "Retry abuse confirmed by flaky test evidence",
            strength: "STRONG",
            sourceCount: 3,
          },
        ],
      });
      const output = renderPrComment(model);
      expect(output).toContain("Corroborated conclusions");
      expect(output).toContain("Retry abuse confirmed");
      expect(output).toContain("STRONG");
    });
  });

  describe("frameworks section", () => {
    it("renders detected frameworks", () => {
      const output = renderPrComment(baseModel());
      expect(output).toContain("playwright");
    });

    it("warns when framework detection is unknown", () => {
      const model = baseModel({
        frameworkSupportSummary: {
          detected: [],
          unknown: true,
          details: "Could not identify frameworks",
        },
      });
      const output = renderPrComment(model);
      expect(output).toContain("Framework detection uncertain");
    });
  });

  describe("sanitization in renderer", () => {
    it("escapes HTML in repository name", () => {
      const model = baseModel({ repository: "org/<script>alert(1)</script>" });
      const output = renderPrComment(model);
      expect(output).not.toContain("<script>");
    });

    it("escapes markdown special chars in messages", () => {
      const model = baseModel({
        importantFindings: [
          {
            ruleId: "QA-PW-101",
            severity: "warning",
            message: "page.waitForTimeout() [used]",
            file: "test.spec.ts",
            line: 5,
          },
        ],
      });
      const output = renderPrComment(model);
      expect(output).toContain("\\[used\\]");
    });
  });

  it("renders collapsed, suppressed, and error detail branches", () => {
    const output = renderPrComment(
      baseModel({
        importantFindings: Array.from({ length: 8 }, (_, index) => ({
          ruleId: `QA-TEST-${index}`,
          severity: "warning" as const,
          message: "finding",
          file: "test.spec.ts",
          line: index + 1,
        })),
        frameworkSupportSummary: {
          detected: [],
          unknown: false,
          details: "",
        },
        analysisErrors: 2,
        suppressionSummary: { suppressedCount: 1, details: "one" },
      }),
    );
    expect(output).toContain("collapsed");
    expect(output).toContain("Suppressed: 1");
    expect(output).toContain("Analysis errors: 2");
    expect(output).not.toContain("Frameworks");
  });

  it("returns no optional sections for a minimal complete model", () => {
    const output = renderPrComment(
      baseModel({
        reportArtifactReference: { url: "", format: "json" },
        analysisCompleteness: "COMPLETE",
        frameworkSupportSummary: {
          detected: [],
          unknown: false,
          details: "",
        },
        evidenceSummary: {
          evidenceLevel: "E0",
          trustLevel: "L0",
          details: "",
        },
        ciIntegritySummary: { passed: false, details: "failed" },
      }),
    );
    expect(output).not.toContain("Full report");
  });
});
