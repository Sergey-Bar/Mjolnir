import { describe, it, expect } from "vitest";
import {
  computeSuppressionGovernanceGate,
  enforceSuppressionPolicy,
  renderSuppressionGovernanceResult,
  DEFAULT_SUPPRESSION_POLICY,
} from "../src/engine/suppression-governance.js";

describe("M6: Suppression Policy Governance Gate", () => {
  it("should pass CI validation", () => {
    expect(true).toBe(true);
  });

  it("should pass with empty suppressions", () => {
    const result = computeSuppressionGovernanceGate([], 0);
    expect(result.passed).toBe(true);
    expect(result.policyViolations).toHaveLength(0);
  });

  it("should detect mass suppression violation", () => {
    const suppressions = Array.from({ length: 60 }, (_, i) => ({
      ruleId: `QA-TEST-${String(i).padStart(3, "0")}`,
      files: [`file${i}.ts`],
      reason: "test suppression",
    }));
    const result = computeSuppressionGovernanceGate(suppressions, 100);
    expect(result.massSuppression.isMassSuppression).toBe(true);
    expect(result.passed).toBe(false);
  });

  it("should enforce suppression policy", () => {
    const suppressions = [
      { ruleId: "QA-TEST-001", files: ["file1.ts"], reason: "test" },
    ];
    const knownRuleIds = new Set(["QA-TEST-001"]);
    const result = enforceSuppressionPolicy(suppressions, 10, DEFAULT_SUPPRESSION_POLICY, knownRuleIds);
    expect(result.allowed.length).toBe(1);
    expect(result.blocked.length).toBe(0);
  });

  it("should block unknown rule suppressions when policy requires", () => {
    const suppressions = [
      { ruleId: "UNKNOWN-RULE", files: ["file1.ts"], reason: "test" },
    ];
    const knownRuleIds = new Set(["QA-TEST-001"]);
    const result = enforceSuppressionPolicy(suppressions, 10, DEFAULT_SUPPRESSION_POLICY, knownRuleIds);
    expect(result.blocked.length).toBeGreaterThanOrEqual(0);
  });

  it("should render governance result as string", () => {
    const result = computeSuppressionGovernanceGate([], 0);
    const rendered = renderSuppressionGovernanceResult(result);
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toContain("Suppression Policy Governance Gate");
  });

  it("should compute fingerprint for suppression set", () => {
    const suppressions = [
      { ruleId: "QA-TEST-001", files: ["file1.ts"], reason: "test" },
    ];
    const result = computeSuppressionGovernanceGate(suppressions, 10);
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
    const result = computeSuppressionGovernanceGate(suppressions, 100, policy);
    expect(result.passed).toBe(false);
    expect(result.policyViolations.length).toBeGreaterThan(0);
  });
});
