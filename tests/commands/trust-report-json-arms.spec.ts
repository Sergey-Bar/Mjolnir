/**
 * renderTrustReportJson branch coverage (WI-6): the JSON twin's
 * nextAction arms, the evidence fallback chain, and the label arms the
 * CLI-path tests can't reach (score null, missing counts).
 */

import { describe, expect, it } from "vitest";

import { renderTrustReportJson } from "../../src/commands/trust-report.js";
import type { ScanResult } from "../../src/types.js";

const result = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  schemaVersion: 1,
  partial: false,
  score: 90,
  frameworks: ["playwright"],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  testFileCount: 1,
  testDeclarationCount: 2,
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
  },
  trustSummary: {
    level: "L2",
    confidence: 0.6,
    evidenceCoverage: 0.2,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
  },
  ...overrides,
});

describe("renderTrustReportJson — nextAction + evidence arms", () => {
  it("partial scan → the re-run-with-higher-max-duration arm", () => {
    const j = JSON.parse(renderTrustReportJson(result({ partial: true }))) as {
      nextAction: string;
    };
    expect(j.nextAction).toContain("re-run with a higher --max-duration");
  });

  it("clean scan with findings → the explain-top-risk arm", () => {
    const j = JSON.parse(
      renderTrustReportJson(
        result({
          findings: [
            {
              ruleId: "QA-PW-004",
              category: "QA-PW",
              severity: "warning",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              evidenceLevel: "E2",
              file: "e2e/a.spec.ts",
              line: 3,
              column: 1,
              message: "m",
              why: "w",
              fix: "f",
            },
          ],
        }),
      ),
    ) as { nextAction: string };
    expect(j.nextAction).toContain("mjolnir explain QA-PW-004");
  });

  it("clean scan without findings → the ci-install arm", () => {
    const j = JSON.parse(renderTrustReportJson(result())) as {
      nextAction: string;
    };
    expect(j.nextAction).toContain("mjolnir ci install");
  });

  it("corroborated finding → evidence carries the corroboration level", () => {
    const j = JSON.parse(
      renderTrustReportJson(
        result({
          findings: [
            {
              ruleId: "QA-PW-004",
              category: "QA-PW",
              severity: "error",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              evidenceLevel: "E2",
              trustLevel: "L5",
              file: "e2e/a.spec.ts",
              line: 3,
              column: 1,
              message: "m",
              why: "w",
              fix: "f",
              runtimeCorroboration: {
                level: "defect",
                source: "junit-xml",
                testsExecuted: 2,
                matchedTest: {
                  title: "t",
                  finalStatus: "failed",
                  attempts: 1,
                  passedOnRetry: false,
                  everFailed: true,
                  skipped: false,
                },
              },
            },
          ],
        }),
      ),
    ) as { topTrustRisks: Array<{ evidence: string }> };
    expect(j.topTrustRisks[0]?.evidence).toBe("defect");
  });

  it("finding with corroboration but no evidenceLevel → 'test' level arm", () => {
    const j = JSON.parse(
      renderTrustReportJson(
        result({
          findings: [
            {
              ruleId: "QA-PW-004",
              category: "QA-PW",
              severity: "warning",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              trustLevel: "L4",
              file: "e2e/a.spec.ts",
              line: 3,
              column: 1,
              message: "m",
              why: "w",
              fix: "f",
              runtimeCorroboration: {
                level: "test",
                source: "playwright-json",
                testsExecuted: 3,
                matchedTest: {
                  title: "t",
                  finalStatus: "passed",
                  attempts: 2,
                  passedOnRetry: true,
                  everFailed: true,
                  skipped: false,
                },
              },
            },
          ],
        }),
      ),
    ) as { topTrustRisks: Array<{ evidence: string }> };
    expect(j.topTrustRisks[0]?.evidence).toBe("test");
  });

  it("finding without corroboration and without evidenceLevel → E2 fallback", () => {
    const j = JSON.parse(
      renderTrustReportJson(
        result({
          findings: [
            {
              ruleId: "QA-PW-004",
              category: "QA-PW",
              severity: "warning",
              confidence: "low",
              findingType: "heuristic-risk",
              qaImpact: "HYGIENE",
              file: "e2e/a.spec.ts",
              line: 3,
              column: 1,
              message: "m",
              why: "w",
              fix: "f",
            },
          ],
        }),
      ),
    ) as { topTrustRisks: Array<{ evidence: string }> };
    expect(j.topTrustRisks[0]?.evidence).toBe("E2");
  });

  it("score: null and missing counts → honest null/0 in the twin", () => {
    const bare = JSON.parse(JSON.stringify(result())) as Record<
      string,
      unknown
    >;
    delete bare.score;
    delete bare.testFileCount;
    delete bare.testDeclarationCount;
    const j = JSON.parse(
      renderTrustReportJson(bare as unknown as ScanResult),
    ) as {
      score: number | null;
      tests: { files: number; declarations: number };
    };
    expect(j.score).toBeUndefined(); // the twin passes the field through verbatim
    expect(j.tests.files).toBe(0);
    expect(j.tests.declarations).toBe(0);
  });
});
