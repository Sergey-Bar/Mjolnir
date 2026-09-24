import { describe, it, expect } from "vitest";
import {
  computeVerificationIntelligence,
  renderCIIntegrityReport,
  detectCIWorkflows,
  checkWorkflowContainsScan,
} from "../src/engine/verification-intelligence.js";
import {
  getPlaywrightMaturity,
  getPlaywrightMaturityReport,
  getFrameworkMaturity,
  getAllFrameworkMaturity,
  renderPlaywrightMaturityReport,
} from "../src/engine/framework-maturity.js";
import {
  computeSuppressionGovernanceGate,
  enforceSuppressionPolicy,
  renderSuppressionGovernanceResult,
  DEFAULT_SUPPRESSION_POLICY,
} from "../src/engine/suppression-governance.js";

describe("M4: Verification Intelligence for CI Workflow Integrity", () => {
  it("should detect CI workflows in the repository", () => {
    const workflows = detectCIWorkflows(".");
    expect(Array.isArray(workflows)).toBe(true);
  });

  it("should compute verification intelligence report", () => {
    const report = computeVerificationIntelligence(".");
    expect(report.overallStatus).toBeDefined();
    expect(report.checks).toBeInstanceOf(Array);
    expect(report.passed).toBeGreaterThanOrEqual(0);
    expect(report.failed).toBeGreaterThanOrEqual(0);
    expect(report.warned).toBeGreaterThanOrEqual(0);
  });

  it("should render CI integrity report as string", () => {
    const report = computeVerificationIntelligence(".");
    const rendered = renderCIIntegrityReport(report);
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
  });

  it("should handle empty suppressions", () => {
    const report = computeVerificationIntelligence(".", [], []);
    expect(report.overallStatus).toBeDefined();
  });

  it("accepts real bare-CLI scan invocations", () => {
    const workflows = [
      "npx mjolnir-qa . --json",
      "mjolnir packages/app",
      "env CI=1 mjolnir .",
      "node dist/cli.mjs . --format json",
    ];
    for (const command of workflows) {
      expect(
        checkWorkflowContainsScan(
          `name: ci\njobs:\n  test:\n    steps:\n      - run: ${JSON.stringify(command)}\n`,
          "ci.yml",
        ),
      ).toBe(true);
    }
  });

  it("rejects non-gating lookalikes and disabled invocations", () => {
    const workflows = [
      "echo 'mjolnir .'",
      "curl https://example.test/mjolnir",
      "npm install mjolnir",
      "mjolnir . --blocking none",
      "mjolnir . || true",
    ];
    for (const command of workflows) {
      expect(
        checkWorkflowContainsScan(
          `name: ci\njobs:\n  test:\n    steps:\n      - run: ${JSON.stringify(command)}\n`,
          "ci.yml",
        ),
        command,
      ).toBe(false);
    }
    expect(
      checkWorkflowContainsScan(
        'name: ci\njobs:\n  test:\n    steps:\n      - run: "npx mjolnir scan"\n',
        "ci.yml",
      ),
    ).toBe(true);
  });

  it("accounts for step and job continue-on-error", () => {
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    continue-on-error: true\n    steps:\n      - run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(false);
    expect(
      checkWorkflowContainsScan(
        "name: ci\njobs:\n  test:\n    continue-on-error: true\n    steps:\n      - continue-on-error: false\n        run: mjolnir .\n",
        "ci.yml",
      ),
    ).toBe(true);
  });
});

describe("M5: Framework Maturity Tracking for Playwright", () => {
  it("should get Playwright maturity progress", () => {
    const progress = getPlaywrightMaturity();
    expect(progress.frameworkId).toBe("playwright");
    expect(progress.currentMaturity).toBeDefined();
    expect(progress.targetMaturity).toBe("F5");
    expect(progress.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(progress.progressPercentage).toBeLessThanOrEqual(100);
  });

  it("should get Playwright maturity report with recommendations", () => {
    const report = getPlaywrightMaturityReport();
    expect(report.frameworkId).toBe("playwright");
    expect(report.recommendations).toBeInstanceOf(Array);
    expect(report.scorecardEntries).toBeInstanceOf(Array);
    expect(report.scorecardEntries.length).toBeGreaterThan(0);
  });

  it("should get framework maturity for any framework", () => {
    const progress = getFrameworkMaturity("playwright");
    expect(progress).toBeDefined();
    expect(progress?.frameworkId).toBe("playwright");
  });

  it("should return undefined for unknown framework", () => {
    const progress = getFrameworkMaturity("nonexistent-framework");
    expect(progress).toBeUndefined();
  });

  it("should get all framework maturity", () => {
    const all = getAllFrameworkMaturity();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((m) => m.frameworkId === "playwright")).toBe(true);
  });

  it("should render Playwright maturity report as string", () => {
    const report = getPlaywrightMaturityReport();
    const rendered = renderPlaywrightMaturityReport(report);
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toContain("Playwright");
  });

  it("should calculate maturity score within valid range", () => {
    const progress = getPlaywrightMaturity();
    expect(progress.maturityScore).toBeGreaterThanOrEqual(0);
    expect(progress.maturityScore).toBeLessThanOrEqual(100);
  });
});

describe("M6: Suppression Policy Governance Gate", () => {
  it("should pass with empty suppressions", () => {
    const result = computeSuppressionGovernanceGate([], []);
    expect(result.passed).toBe(true);
    expect(result.policyViolations).toHaveLength(0);
  });

  it("should detect mass suppression violation", () => {
    const suppressions = Array.from({ length: 60 }, (_, i) => ({
      ruleId: `QA-TEST-${String(i).padStart(3, "0")}`,
      files: [`file${i}.ts`],
      reason: "test suppression",
    }));
    const findings = [
      ...suppressions.map((suppression) => ({
        ruleId: suppression.ruleId,
        file: suppression.files?.[0] ?? "",
      })),
      ...Array.from({ length: 40 }, (_, i) => ({
        ruleId: "OTHER",
        file: `other-${i}.ts`,
      })),
    ];
    const result = computeSuppressionGovernanceGate(suppressions, findings);
    expect(result.massSuppression.isMassSuppression).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("should enforce suppression policy", () => {
    const suppressions = [
      { ruleId: "QA-TEST-001", files: ["file1.ts"], reason: "test" },
    ];
    const knownRuleIds = new Set(["QA-TEST-001"]);
    const result = enforceSuppressionPolicy(
      suppressions,
      [
        { ruleId: "QA-TEST-001", file: "file1.ts" },
        ...Array.from({ length: 9 }, (_, i) => ({
          ruleId: "OTHER",
          file: `other-${i}.ts`,
        })),
      ],
      DEFAULT_SUPPRESSION_POLICY,
      knownRuleIds,
    );
    expect(result.allowed.length).toBe(1);
    expect(result.blocked.length).toBe(0);
  });

  it("should block unknown rule suppressions when policy requires", () => {
    const suppressions = [
      { ruleId: "UNKNOWN-RULE", files: ["file1.ts"], reason: "test" },
    ];
    const knownRuleIds = new Set(["QA-TEST-001"]);
    const result = enforceSuppressionPolicy(
      suppressions,
      [
        { ruleId: "QA-TEST-001", file: "file1.ts" },
        ...Array.from({ length: 9 }, (_, i) => ({
          ruleId: "OTHER",
          file: `other-${i}.ts`,
        })),
      ],
      DEFAULT_SUPPRESSION_POLICY,
      knownRuleIds,
    );
    expect(result.blocked).toHaveLength(1);
  });

  it("should render governance result as string", () => {
    const result = computeSuppressionGovernanceGate([], []);
    const rendered = renderSuppressionGovernanceResult(result);
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toContain("Suppression Policy Governance Gate");
  });

  it("should compute fingerprint for suppression set", () => {
    const suppressions = [
      { ruleId: "QA-TEST-001", files: ["file1.ts"], reason: "test" },
    ];
    const result = computeSuppressionGovernanceGate(suppressions, [
      { ruleId: "QA-TEST-001", file: "file1.ts" },
    ]);
    expect(result.fingerprint).toBeDefined();
    expect(typeof result.fingerprint).toBe("string");
    expect(result.fingerprint.length).toBeGreaterThan(0);
  });

  it("should respect custom policy configuration", () => {
    const policy = {
      ...DEFAULT_SUPPRESSION_POLICY,
      maxMassSuppressionRatio: 0.1,
    };
    const suppressions = Array.from({ length: 20 }, (_, i) => ({
      ruleId: `QA-TEST-${String(i).padStart(3, "0")}`,
      files: [`file${i}.ts`],
      reason: "test",
    }));
    const findings = [
      ...suppressions.map((suppression) => ({
        ruleId: suppression.ruleId,
        file: suppression.files?.[0] ?? "",
      })),
      ...Array.from({ length: 80 }, (_, i) => ({
        ruleId: "OTHER",
        file: `other-${i}.ts`,
      })),
    ];
    const result = computeSuppressionGovernanceGate(
      suppressions,
      findings,
      policy,
    );
    expect(result.passed).toBe(false);
    expect(result.policyViolations.length).toBeGreaterThan(0);
  });
});
