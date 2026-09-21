/**
 * Finding Identity (ENGINE-002): deterministic, stable fingerprints for
 * deduplication, correlation, and lifecycle tracking across scans.
 *
 * Three identity layers:
 *   1. findingFingerprint — ruleId + file + message (line-independent;
 *      survives source edits that shift line numbers).
 *   2. codeQualityFingerprint — sha256 over ruleId + file + line + column
 *      + message (GitLab Code Quality dedup contract; position-sensitive).
 *   3. findingId — fingerprint + line + column for disambiguation when
 *      the same rule fires multiple times in one file.
 *
 * Root-cause and deduplication groups are initially identity aliases;
 * future rules may coarsen them.
 */

import { createHash } from "node:crypto";

import type { Finding } from "../types.js";

/**
 * Correlation identity for before/after comparison: ruleId + file +
 * message, deliberately EXCLUDING line — a source edit that shifts a
 * finding still correlates. Shared by baseline, impact, and resolution.
 */
export function findingFingerprint(
  f: Pick<Finding, "ruleId" | "file" | "message">,
): string {
  return `${f.ruleId}\u0000${f.file}\u0000${f.message}`;
}

/**
 * Position-sensitive fingerprint for GitLab Code Quality dedup:
 * sha256(ruleId + file + line + column + message). A moved line
 * legitimately re-reports; an unchanged finding stays silent.
 */
export function codeQualityFingerprint(
  f: Pick<Finding, "ruleId" | "file" | "line" | "column" | "message">,
): string {
  return createHash("sha256")
    .update(
      `${f.ruleId}\u0000${f.file}\u0000${f.line}\u0000${f.column}\u0000${f.message}`,
    )
    .digest("hex");
}

/**
 * Disambiguated finding identity: fingerprint + line + column. Unique
 * per occurrence when the same rule fires multiple times in one file.
 */
export function findingId(
  f: Pick<Finding, "ruleId" | "file" | "line" | "column" | "message">,
): string {
  return `${findingFingerprint(f)}\u0000${f.line}\u0000${f.column}`;
}

/**
 * Root-cause identity: initially the same as the fingerprint. Future
 * rules may coarsen this to group findings by underlying cause.
 */
export function rootCauseId(
  f: Pick<Finding, "ruleId" | "file" | "message">,
): string {
  return findingFingerprint(f);
}

/**
 * Deduplication group: initially the same as rootCauseId. Future rules
 * may further coarsen this.
 */
export function deduplicationGroup(
  f: Pick<Finding, "ruleId" | "file" | "message">,
): string {
  return rootCauseId(f);
}
