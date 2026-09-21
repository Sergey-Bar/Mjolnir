/**
 * ENGINE-006 — Suppression Integrity: detect suppression abuse,
 * unknown rules, expired entries, and compute a full integrity report.
 *
 * Pure module: no filesystem, no clock injection beyond an optional
 * `now` parameter — deterministic by construction.
 */

import { createHash } from "node:crypto";

export interface SuppressionEntry {
  ruleId: string;
  /** Repo-relative file globs this suppression covers. */
  files: string[];
  /** Human-readable reason for the suppression. */
  reason: string;
  /** ISO-8601 expiration date; absent means no expiration. */
  expires?: string;
}

export interface MassSuppressionResult {
  isMassSuppression: boolean;
  suppressedCount: number;
  totalFindings: number;
  ratio: number;
  threshold: number;
}

export interface SuppressionIntegrityReport {
  fingerprint: string;
  massSuppression: MassSuppressionResult;
  unknownRuleSuppressions: string[];
  expiredSuppressions: SuppressionEntry[];
}

/**
 * Deterministic sha256 fingerprint of the suppression set. Canonical
 * JSON sorted by ruleId+files+reason+expires so order in the config
 * file does not affect the hash.
 */
export function suppressionFingerprint(
  suppressions: SuppressionEntry[],
): string {
  const canonical = suppressions
    .map((s) => ({
      ruleId: s.ruleId,
      files: [...s.files].sort(),
      reason: s.reason,
      ...(s.expires !== undefined ? { expires: s.expires } : {}),
    }))
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Detect when suppressions cover an unusually large fraction of
 * findings. Default threshold is 50% (0.5).
 */
export function detectMassSuppression(
  suppressions: SuppressionEntry[],
  totalFindings: number,
  threshold = 0.5,
): MassSuppressionResult {
  const suppressedCount = suppressions.reduce(
    (sum, s) => sum + s.files.length,
    0,
  );
  const ratio = totalFindings === 0 ? 0 : suppressedCount / totalFindings;
  return {
    isMassSuppression: ratio >= threshold,
    suppressedCount,
    totalFindings,
    ratio,
    threshold,
  };
}

/**
 * Find suppressions that reference ruleIds not in the known set.
 */
export function detectUnknownRuleSuppressions(
  suppressions: SuppressionEntry[],
  knownRuleIds: ReadonlySet<string>,
): string[] {
  const unknown = new Set<string>();
  for (const s of suppressions) {
    if (!knownRuleIds.has(s.ruleId)) {
      unknown.add(s.ruleId);
    }
  }
  return [...unknown].sort();
}

/**
 * Find suppressions whose expiration date has passed.
 */
export function detectExpiredSuppressions(
  suppressions: SuppressionEntry[],
  now: Date = new Date(),
): SuppressionEntry[] {
  const nowMs = now.getTime();
  return suppressions.filter((s) => {
    if (s.expires === undefined) return false;
    return new Date(s.expires).getTime() <= nowMs;
  });
}

/**
 * Full suppression integrity report combining all checks.
 */
export function computeSuppressionIntegrity(
  suppressions: SuppressionEntry[],
  totalFindings: number,
  knownRuleIds: ReadonlySet<string>,
  now: Date = new Date(),
): SuppressionIntegrityReport {
  return {
    fingerprint: suppressionFingerprint(suppressions),
    massSuppression: detectMassSuppression(suppressions, totalFindings),
    unknownRuleSuppressions: detectUnknownRuleSuppressions(
      suppressions,
      knownRuleIds,
    ),
    expiredSuppressions: detectExpiredSuppressions(suppressions, now),
  };
}
