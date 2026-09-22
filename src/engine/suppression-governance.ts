/**
 * M6 — Suppression Policy Governance Gate.
 *
 * Provides functions to enforce suppression policy governance,
 * detecting abuse, expired entries, unknown rules, and computing
 * a full governance gate result.
 */

import {
  computeSuppressionIntegrity,
  type SuppressionEntry,
  type SuppressionIntegrityReport,
  type MassSuppressionResult,
} from "./suppression-integrity.js";

export interface SuppressionPolicyConfig {
  maxMassSuppressionRatio: number;
  requireExpiration: boolean;
  allowedRuleIds: string[];
  maxTotalSuppressions: number;
  maxExpiredSuppressions: number;
}

export const DEFAULT_SUPPRESSION_POLICY: SuppressionPolicyConfig = {
  maxMassSuppressionRatio: 0.5,
  requireExpiration: false,
  allowedRuleIds: [],
  maxTotalSuppressions: 100,
  maxExpiredSuppressions: 10,
};

export interface SuppressionGovernanceResult {
  passed: boolean;
  integrityReport: SuppressionIntegrityReport;
  policyViolations: string[];
  massSuppression: MassSuppressionResult;
  expiredCount: number;
  unknownRuleCount: number;
  totalSuppressions: number;
  fingerprint: string;
}

export function computeSuppressionGovernanceGate(
  suppressions: SuppressionEntry[],
  totalFindings: number,
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
): SuppressionGovernanceResult {
  const integrityReport = computeSuppressionIntegrity(
    suppressions,
    totalFindings,
    knownRuleIds ?? new Set<string>(),
  );

  const policyViolations: string[] = [];

  if (integrityReport.massSuppression.ratio > policy.maxMassSuppressionRatio) {
    policyViolations.push(
      `Mass suppression ratio ${integrityReport.massSuppression.ratio.toFixed(2)} exceeds policy maximum ${policy.maxMassSuppressionRatio}`,
    );
  }

  if (policy.requireExpiration) {
    const expired = integrityReport.expiredSuppressions;
    if (expired.length > policy.maxExpiredSuppressions) {
      policyViolations.push(
        `Expired suppressions (${expired.length}) exceed policy maximum ${policy.maxExpiredSuppressions}`,
      );
    }
  }

  if (
    policy.maxTotalSuppressions > 0 &&
    suppressions.length > policy.maxTotalSuppressions
  ) {
    policyViolations.push(
      `Total suppressions (${suppressions.length}) exceed policy maximum ${policy.maxTotalSuppressions}`,
    );
  }

  if (
    policy.allowedRuleIds.length > 0 &&
    integrityReport.unknownRuleSuppressions.length > 0
  ) {
    const disallowedUnknown = integrityReport.unknownRuleSuppressions.filter(
      (ruleId) => !policy.allowedRuleIds.includes(ruleId),
    );
    if (disallowedUnknown.length > 0) {
      policyViolations.push(
        `Unknown rule suppressions not in allowed list: ${disallowedUnknown.join(", ")}`,
      );
    }
  }

  const expiredCount = integrityReport.expiredSuppressions.length;
  const unknownRuleCount = integrityReport.unknownRuleSuppressions.length;

  return {
    passed: policyViolations.length === 0,
    integrityReport,
    policyViolations,
    massSuppression: integrityReport.massSuppression,
    expiredCount,
    unknownRuleCount,
    totalSuppressions: suppressions.length,
    fingerprint: integrityReport.fingerprint,
  };
}

export function enforceSuppressionPolicy(
  suppressions: SuppressionEntry[],
  totalFindings: number,
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
): {
  allowed: SuppressionEntry[];
  blocked: SuppressionEntry[];
  violations: string[];
} {
  const result = computeSuppressionGovernanceGate(
    suppressions,
    totalFindings,
    policy,
    knownRuleIds,
  );

  if (result.passed) {
    return { allowed: suppressions, blocked: [], violations: [] };
  }

  const blocked: SuppressionEntry[] = [];
  const allowed: SuppressionEntry[] = [];

  for (const s of suppressions) {
    const isExpired =
      s.expires !== undefined && new Date(s.expires) <= new Date();
    const isUnknown = knownRuleIds !== undefined && !knownRuleIds.has(s.ruleId);

    if (isExpired || isUnknown) {
      blocked.push(s);
    } else {
      allowed.push(s);
    }
  }

  return {
    allowed,
    blocked,
    violations: result.policyViolations,
  };
}

export function renderSuppressionGovernanceResult(
  result: SuppressionGovernanceResult,
): string {
  const lines: string[] = [];
  lines.push(`Suppression Policy Governance Gate`);
  lines.push(`Result: ${result.passed ? "PASSED" : "FAILED"}`);
  lines.push(`Total Suppressions: ${result.totalSuppressions}`);
  lines.push(
    `Mass Suppression Ratio: ${result.massSuppression.ratio.toFixed(2)} (threshold: ${result.massSuppression.threshold})`,
  );
  lines.push(
    `Expired: ${result.expiredCount}, Unknown Rules: ${result.unknownRuleCount}`,
  );
  lines.push(`Fingerprint: ${result.fingerprint}`);
  lines.push("");

  if (result.policyViolations.length > 0) {
    lines.push("Policy Violations:");
    for (const v of result.policyViolations) {
      lines.push(`  ✗ ${v}`);
    }
  } else {
    lines.push("All suppression policy checks passed.");
  }

  return lines.join("\n").trimEnd();
}
