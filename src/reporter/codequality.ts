/**
 * GitLab Code Quality reporter (product-gap-remediation master plan P3a,
 * plan 1788853205786 — flag 2, decision 2: GitLab is the in-plan second
 * platform).
 *
 * Emits the Code Quality report schema GitLab's `codequality` artifact
 * type consumes (docs.gitlab.com/ee/ci/testing/code_quality.html) so
 * findings render as MR widgets and diff annotations inside existing
 * governance — the same distribution logic as SARIF for GitHub, never a
 * second truth: this is a deterministic projection of the same
 * ScanResult the JSON contract carries.
 *
 * Usage: mjolnir --format codequality > gl-code-quality-report.json
 *
 * Severity map (documented in docs/GITLAB-CI.md):
 *   error   → major   (categorical defects — the gate's core)
 *   warning → minor
 *   info    → info
 *
 * Fingerprint stability: GitLab deduplicates MR findings across runs by
 * `fingerprint` — an unstable fingerprint would resurrect closed
 * findings on every push (the exact PR-noise the MR flow exists to
 * avoid). The fingerprint is sha256 over ruleId + repo-relative path +
 * line + column + message — the same finding shape the --why command
 * addresses, so a moved line legitimately re-reports and an unchanged
 * finding stays silent.
 */

import { createHash } from "node:crypto";

import type { Finding, ScanResult } from "../types.js";

type CodeQualitySeverity = "major" | "minor" | "info";

function codeQualitySeverity(
  severity: Finding["severity"],
): CodeQualitySeverity {
  if (severity === "error") return "major";
  if (severity === "warning") return "minor";
  return "info";
}

/**
 * sha256 hex over the identifying tuple. Exported for the contract test:
 * the fingerprint MUST be stable across runs for an unchanged finding
 * (GitLab dedup contract) and MUST change when the finding's identity
 * changes (otherwise an MR could hide a moved-and-still-broken line).
 */
export function codeQualityFingerprint(f: Finding): string {
  return createHash("sha256")
    .update(
      `${f.ruleId}\u0000${f.file}\u0000${f.line}\u0000${f.column}\u0000${f.message}`,
    )
    .digest("hex");
}

export function renderCodeQuality(result: ScanResult): string {
  const issues = result.findings.map((f) => ({
    // GitLab renders this as the MR annotation body.
    description: f.message,
    check_name: f.ruleId,
    // GitLab requires a non-empty fingerprint; sha256 hex is their
    // canonical shape (their own analyzers emit exactly this).
    fingerprint: codeQualityFingerprint(f),
    severity: codeQualitySeverity(f.severity),
    location: {
      path: f.file.replaceAll("\\", "/"),
      lines: {
        begin: f.line,
        // `end` is optional in the schema; a single-line finding carries
        // no end and GitLab defaults it to `begin`.
      },
    },
  }));
  return JSON.stringify(issues, null, 2) + "\n";
}
