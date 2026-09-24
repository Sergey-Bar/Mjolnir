import { describe, it, expect } from "vitest";
import {
  computeSuppressionGovernanceGate,
  enforceSuppressionPolicy,
  renderSuppressionGovernanceResult,
  DEFAULT_SUPPRESSION_POLICY,
} from "../src/engine/suppression-governance.js";

describe("M6: Suppression Policy Governance Gate", () => {
  it("should pass with empty suppressions", () => {
    const result = computeSuppressionGovernanceGate([], []);
    expect(result.passed).toBe(true);
    expect(result.policyViolations).toHaveLength(0);
  });

  it("rejects permanent suppressions when expiration is required", () => {
    const suppressions = [
      { ruleId: "QA-TEST-001", files: ["file1.ts"], reason: "test" },
    ];
    const result = computeSuppressionGovernanceGate(
      suppressions,
      [{ ruleId: "QA-TEST-001", file: "file1.ts" }],
      { ...DEFAULT_SUPPRESSION_POLICY, requireExpiration: true },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );

    expect(result.passed).toBe(false);
    expect(result.policyViolations).toContain(
      "Suppressions without an expiration: 1",
    );
  });

  it("rejects unknown rules when the known rule set is supplied", () => {
    const suppressions = [
      { ruleId: "UNKNOWN", files: ["file1.ts"], reason: "test" },
    ];
    const result = computeSuppressionGovernanceGate(
      suppressions,
      [],
      DEFAULT_SUPPRESSION_POLICY,
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );

    expect(result.passed).toBe(false);
    expect(result.unknownRuleCount).toBe(1);
    expect(result.policyViolations).toContain(
      "Unknown rule suppressions: UNKNOWN",
    );
  });

  it("covers default, allowlist, count, and expiry policy branches", () => {
    expect(computeSuppressionGovernanceGate([], [])).toMatchObject({
      passed: true,
    });

    const unknown = [{ ruleId: "UNKNOWN", reason: "fixture" }];
    const zeroLimit = computeSuppressionGovernanceGate(
      unknown,
      [],
      { ...DEFAULT_SUPPRESSION_POLICY, maxTotalSuppressions: 0 },
      new Set(["UNKNOWN"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(zeroLimit.passed).toBe(false);

    expect(
      computeSuppressionGovernanceGate(
        unknown,
        [],
        { ...DEFAULT_SUPPRESSION_POLICY, maxTotalSuppressions: 1 },
        new Set(["UNKNOWN"]),
        new Date("2026-09-23T00:00:00.000Z"),
      ),
    ).toMatchObject({ passed: true, unknownRuleCount: 0 });

    expect(
      computeSuppressionGovernanceGate(
        [...unknown, { ruleId: "OTHER", reason: "fixture" }],
        [],
        { ...DEFAULT_SUPPRESSION_POLICY, maxTotalSuppressions: 1 },
        new Set(["UNKNOWN", "OTHER"]),
        new Date("2026-09-23T00:00:00.000Z"),
      ),
    ).toMatchObject({ passed: false });

    const expired = enforceSuppressionPolicy(
      [
        {
          ruleId: "UNKNOWN",
          reason: "fixture",
          expires: "2026-09-22",
        },
      ],
      [],
      {
        ...DEFAULT_SUPPRESSION_POLICY,
        allowedRuleIds: ["UNKNOWN"],
        requireExpiration: true,
        maxExpiredSuppressions: 0,
      },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(expired.allowed).toHaveLength(0);
    expect(expired.blocked).toHaveLength(1);
  });

  it("covers enforcement defaults and rendering of policy failures", () => {
    expect(enforceSuppressionPolicy([], [])).toEqual({
      allowed: [],
      blocked: [],
      violations: [],
    });

    const valid = [
      { ruleId: "R-1", reason: "fixture" },
      { ruleId: "R-2", reason: "fixture" },
    ];
    const limited = enforceSuppressionPolicy(
      valid,
      [],
      { ...DEFAULT_SUPPRESSION_POLICY, maxTotalSuppressions: 1 },
      new Set(["R-1", "R-2"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(limited.allowed).toHaveLength(1);
    expect(limited.blocked).toHaveLength(1);

    const failed = computeSuppressionGovernanceGate(
      [{ ruleId: "R-1", reason: "fixture", expires: "2020-01-01" }],
      [],
      {
        ...DEFAULT_SUPPRESSION_POLICY,
        requireExpiration: true,
        maxExpiredSuppressions: 0,
      },
      new Set(["R-1"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    const rendered = renderSuppressionGovernanceResult(failed);
    expect(rendered).toContain("Policy Violations:");
    expect(rendered).toContain("Expired: 1");
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

  it("uses active suppressions for mass while auditing expiry across all entries", () => {
    const expired = Array.from({ length: 9 }, (_, index) => ({
      ruleId: "QA-TEST-001",
      files: [`old-${index}.ts`],
      reason: "expired",
      expires: "2020-01-01",
    }));
    const active = {
      ruleId: "QA-TEST-001",
      files: ["current.ts"],
      reason: "active",
      expires: "2099-01-01",
    };
    const result = computeSuppressionGovernanceGate(
      [...expired, active],
      [
        { ruleId: "QA-TEST-001", file: "current.ts" },
        ...expired.map((suppression) => ({
          ruleId: suppression.ruleId,
          file: suppression.files?.[0] ?? "",
        })),
      ],
      {
        ...DEFAULT_SUPPRESSION_POLICY,
        requireExpiration: true,
        maxExpiredSuppressions: 9,
      },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(result.totalSuppressions).toBe(10);
    expect(result.expiredCount).toBe(9);
    expect(result.massSuppression.suppressedCount).toBe(1);
    expect(result.massSuppression.totalFindings).toBe(10);
    expect(result.massSuppression.ratio).toBe(0.1);
    expect(result.passed).toBe(true);
  });
  it("blocks mass-suppression entries instead of applying them", () => {
    const suppressions = [
      {
        ruleId: "QA-TEST-001",
        files: ["file1.ts", "file2.ts"],
        reason: "test",
      },
    ];
    const result = enforceSuppressionPolicy(
      suppressions,
      [
        { ruleId: "QA-TEST-001", file: "file1.ts" },
        { ruleId: "QA-TEST-001", file: "file2.ts" },
        { ruleId: "OTHER", file: "other.ts" },
      ],
      DEFAULT_SUPPRESSION_POLICY,
      new Set(["QA-TEST-001", "OTHER"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );

    expect(result.allowed).toHaveLength(0);
    expect(result.blocked).toHaveLength(1);
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

  it("blocks permanent suppressions when expiration is required", () => {
    const result = enforceSuppressionPolicy(
      [{ ruleId: "QA-TEST-001", reason: "test" }],
      [],
      { ...DEFAULT_SUPPRESSION_POLICY, requireExpiration: true },
      new Set(["QA-TEST-001"]),
      new Date("2026-09-23T00:00:00.000Z"),
    );

    expect(result.allowed).toHaveLength(0);
    expect(result.blocked).toHaveLength(1);
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
