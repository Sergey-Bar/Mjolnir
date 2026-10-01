/**
 * ENGINE-006 — Suppression Integrity: detect suppression abuse,
 * unknown rules, expired entries, and compute a full integrity report.
 *
 * Pure module: no filesystem, no clock injection beyond an optional
 * `now` parameter — deterministic by construction.
 */

import { createHash } from "node:crypto";

import { anyDepthGlobRegExp, anchoredGlobRegExp } from "../lib/glob.js";
import { compareCodePoints } from "../lib/compare.js";

export interface SuppressionEntry {
  ruleId: string;
  /** Repo-relative file globs this suppression covers. */
  files?: string[];
  /** Human-readable reason for the suppression. */
  reason: string;
  /** ISO-8601 expiration date; absent means no expiration. */
  expires?: string;
}

export interface SuppressionFinding {
  ruleId: string;
  file: string;
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
 *
 * Code-unit order on the ruleId, not an ambient `localeCompare`: the sorted
 * array is serialized into the hash, so a locale-dependent collation would
 * make the SAME suppression file produce two different fingerprints on two
 * machines — and that fingerprint is what tells a reader their suppressions
 * changed. (Line 55 keeps a bare `.sort()`: that is `Array.prototype.sort`'s
 * own code-unit default, which is already locale-free.)
 */
export function suppressionFingerprint(
  suppressions: SuppressionEntry[],
): string {
  const canonical = suppressions
    .map((s) => ({
      ruleId: s.ruleId,
      files: [...(s.files ?? [])].sort(),
      reason: s.reason,
      ...(s.expires !== undefined ? { expires: s.expires } : {}),
    }))
    .sort((a, b) => compareCodePoints(a.ruleId, b.ruleId));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Detect when suppressions cover an unusually large fraction of
 * findings. Default threshold is 50% (0.5).
 */
export function detectMassSuppression(
  suppressions: SuppressionEntry[],
  findings: readonly SuppressionFinding[],
  threshold = 0.5,
): MassSuppressionResult {
  const matchers = suppressions.map((suppression) => ({
    ruleId: suppression.ruleId,
    // One compiler, one dialect. This used to reach into
    // `discovery/ignores.ts` for `globToRegExp` while the SCAN applied
    // suppressions through `pathMatchesGlob` in `scan-pipeline.ts` — two
    // compilers that disagreed on `?` and on `**`. So this gate measured a
    // suppressed set using a different dialect than the one that suppressed
    // them: a suppression the scan honoured but this file could not see
    // counted as unsuppressed, and the ratio below under-reported. Both now
    // come from `src/lib/glob.ts`.
    patterns: (suppression.files ?? []).map((glob) =>
      glob.includes("/") ? anchoredGlobRegExp(glob) : anyDepthGlobRegExp(glob),
    ),
    ruleOnly: !suppression.files?.length,
  }));
  const suppressedCount = findings.filter((finding) => {
    const file = finding.file.replaceAll("\\", "/");
    return matchers.some(
      (matcher) =>
        matcher.ruleId === finding.ruleId &&
        (matcher.ruleOnly ||
          matcher.patterns.some((pattern) => pattern.test(file))),
    );
  }).length;
  const totalFindings = findings.length;
  const ratio = totalFindings === 0 ? 0 : suppressedCount / totalFindings;
  // `>= threshold`, documented. The code said the same thing, but the docstring
  // said "unusually large fraction ... default threshold is 50%" and the field
  // is named `threshold` — the one thing a reader cannot infer is where the
  // boundary sits, so it is stated rather than implied. Exactly at the
  // threshold is not "unusual", it is the limit; flagging it gives the gate a
  // reason to exist at that number instead of above it.
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
 *
 * An unparseable `expires` is EXPIRED, not perpetual.
 *
 * `new Date("whenever").getTime()` is `NaN`, and every comparison against
 * `NaN` is false — so the filter below returned `false` for a suppression with
 * a typo in its date, and a suppression meant to expire "2026-13-45" would
 * have suppressed findings forever. NaN is what a malformed date *is*: the
 * comparison has no opinion, so the gate does. A date nobody can read is not a
 * date nobody has to honour, and "this suppression never expires" must be
 * written as an absent `expires`, which is a decision someone made on purpose.
 */
export function detectExpiredSuppressions(
  suppressions: SuppressionEntry[],
  now: Date = new Date(),
): SuppressionEntry[] {
  const nowMs = now.getTime();
  return suppressions.filter((s) => {
    if (s.expires === undefined) return false;
    const expiry = new Date(s.expires).getTime();
    if (Number.isNaN(expiry)) return true;
    return expiry <= nowMs;
  });
}

/**
 * Full suppression integrity report combining all checks.
 */
export function computeSuppressionIntegrity(
  suppressions: SuppressionEntry[],
  findings: readonly SuppressionFinding[],
  knownRuleIds: ReadonlySet<string>,
  now: Date = new Date(),
): SuppressionIntegrityReport {
  return {
    fingerprint: suppressionFingerprint(suppressions),
    massSuppression: detectMassSuppression(suppressions, findings),
    unknownRuleSuppressions: detectUnknownRuleSuppressions(
      suppressions,
      knownRuleIds,
    ),
    expiredSuppressions: detectExpiredSuppressions(suppressions, now),
  };
}
