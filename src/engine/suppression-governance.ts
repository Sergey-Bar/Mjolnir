/**
 * M6 — Suppression Policy Governance Gate.
 *
 * Provides functions to enforce suppression policy governance,
 * detecting abuse, expired entries, unknown rules, and computing
 * a full governance gate result.
 */

import { isSuppressionActive } from "../config/config.js";
import {
  computeSuppressionIntegrity,
  detectMassSuppression,
  type SuppressionEntry,
  type SuppressionIntegrityReport,
  type MassSuppressionResult,
  type SuppressionFinding,
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
  findings: readonly SuppressionFinding[],
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
  now: Date = new Date(),
): SuppressionGovernanceResult {
  const allIntegrityReport = computeSuppressionIntegrity(
    suppressions,
    findings,
    knownRuleIds ?? new Set<string>(),
    now,
  );
  const activeSuppressions = suppressions.filter((suppression) =>
    isSuppressionActive(suppression, now),
  );
  const integrityReport: SuppressionIntegrityReport = {
    ...allIntegrityReport,
    massSuppression: detectMassSuppression(activeSuppressions, findings),
  };

  const policyViolations: string[] = [];

  if (integrityReport.massSuppression.ratio > policy.maxMassSuppressionRatio) {
    policyViolations.push(
      `Mass suppression ratio ${integrityReport.massSuppression.ratio.toFixed(2)} exceeds policy maximum ${policy.maxMassSuppressionRatio}`,
    );
  }

  if (policy.requireExpiration) {
    const permanentCount = suppressions.filter(
      (suppression) => suppression.expires === undefined,
    ).length;
    if (permanentCount > 0) {
      policyViolations.push(
        `Suppressions without an expiration: ${permanentCount}`,
      );
    }
    const expired = integrityReport.expiredSuppressions;
    if (expired.length > policy.maxExpiredSuppressions) {
      policyViolations.push(
        `Expired suppressions (${expired.length}) exceed policy maximum ${policy.maxExpiredSuppressions}`,
      );
    }
  }

  if (suppressions.length > policy.maxTotalSuppressions) {
    policyViolations.push(
      `Total suppressions (${suppressions.length}) exceed policy maximum ${policy.maxTotalSuppressions}`,
    );
  }

  if (
    knownRuleIds !== undefined &&
    integrityReport.unknownRuleSuppressions.length > 0
  ) {
    const disallowedUnknown =
      policy.allowedRuleIds.length > 0
        ? integrityReport.unknownRuleSuppressions.filter(
            (ruleId) => !policy.allowedRuleIds.includes(ruleId),
          )
        : integrityReport.unknownRuleSuppressions;
    if (disallowedUnknown.length > 0) {
      policyViolations.push(
        `Unknown rule suppressions: ${disallowedUnknown.join(", ")}`,
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
  findings: readonly SuppressionFinding[],
  policy: SuppressionPolicyConfig = DEFAULT_SUPPRESSION_POLICY,
  knownRuleIds?: ReadonlySet<string>,
  now: Date = new Date(),
): {
  allowed: SuppressionEntry[];
  blocked: SuppressionEntry[];
  violations: string[];
} {
  const result = computeSuppressionGovernanceGate(
    suppressions,
    findings,
    policy,
    knownRuleIds,
    now,
  );

  if (result.passed) {
    return { allowed: suppressions, blocked: [], violations: [] };
  }

  if (result.massSuppression.ratio > policy.maxMassSuppressionRatio) {
    return {
      allowed: [],
      blocked: [...suppressions],
      violations: result.policyViolations,
    };
  }

  const blocked: SuppressionEntry[] = [];
  const valid: SuppressionEntry[] = [];

  for (const suppression of suppressions) {
    const isExpired = !isSuppressionActive(suppression, now);
    const isUnknown =
      knownRuleIds !== undefined &&
      !knownRuleIds.has(suppression.ruleId) &&
      !policy.allowedRuleIds.includes(suppression.ruleId);
    const isMissingExpiry =
      policy.requireExpiration && suppression.expires === undefined;

    if (isExpired || isUnknown || isMissingExpiry) {
      blocked.push(suppression);
    } else {
      valid.push(suppression);
    }
  }

  const allowed = valid.slice(0, policy.maxTotalSuppressions);
  blocked.push(...valid.slice(policy.maxTotalSuppressions));

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
