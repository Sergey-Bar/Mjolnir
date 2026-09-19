/**
 * `mjolnir pr-comment` — Sprint 6 Task 25 (Master-Stabilization-Plan.md).
 *
 * Renders a Markdown PR comment body from a scan result, scoped to only
 * what a baseline diff says is new (built on Task 24), or to the
 * `--scope changed` finding set when no baseline exists. Findings must
 * arrive where the work happens — a PR thread — not just a terminal
 * nobody re-runs.
 *
 * Pure function over ScanResult (+ optional BaselineDiff) — no I/O, no
 * GitHub API calls. The actual posting is the CI workflow's job
 * (.github/workflows/mjolnir.yml), which pipes this render into
 * `actions/github-script`'s issue-comment API — keeping this command
 * testable without a real PR and honoring the zero-network constraint
 * for the CLI itself.
 */

import type { Finding, ScanResult } from "../types.js";
import { deriveEvidenceLevel } from "../types.js";
import { sanitizeData } from "../reporter/theme.js";
import {
  renderUnifiedReport as _renderUnifiedReport,
  type UnifiedReportOptions,
} from "../reporter/pr-report-shared.js";

/**
 * Idempotency marker — used by the CI workflow to find and update
 * the existing comment rather than spawning a new one on every push.
 */
export const PR_COMMENT_MARKER = "<!-- mjolnir-report:v2 -->";

/**
 * Escape markdown-significant characters (markdown spec).
 * Kept exported for downstream consumer compatibility.
 */
export function escapeMarkdown(s: string): string {
  return sanitizeData(s).replace(/([\\`*_{}[\]()#+!|<>])/g, "\\$1");
}

/** True when a fix recommendation reads as code rather than prose —
 * those render as a code span, the rest stay italic. */
export function looksLikeCode(s: string): boolean {
  return /[(;={]|await |expect\(/.test(s);
}

/** Evidence tag per finding — Evidence > Assumption in the fabric: a
 * measured false-positive rate is shown right on the line when present. */
export function evidenceTag(f: Finding): string {
  const level =
    f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
  const kind =
    level === "E2"
      ? "deterministic"
      : level === "E1"
        ? "heuristic"
        : "observation";
  let tag = `${level} · ${kind}`;
  if (f.measuredFpRate !== undefined) {
    tag += ` · measured FP ${Math.round(f.measuredFpRate * 100)}%`;
    if (f.measuredFpN !== undefined) tag += ` · n=${f.measuredFpN}`;
  }
  return tag;
}

/** Build a single finding line with icon, ruleId, location, and message. */
export function findingLine(f: Finding): string {
  const icon =
    f.severity === "error" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵";
  const fix = escapeMarkdown(f.fix);
  const fixBody = looksLikeCode(f.fix) ? `\`${fix}\`` : `_${fix}_`;
  return `${icon} **${escapeMarkdown(f.ruleId)}** \`${escapeMarkdown(f.file)}:${f.line}\` — ${escapeMarkdown(f.message)} ${escapeMarkdown(`[${evidenceTag(f)}]`)}\n  Fix: ${fixBody}`;
}

/**
 * Render the full comment body (plan M5 redesign, now unified with
 * trust report). Idempotent by design — the leading HTML comment
 * marker lets the posting workflow find and update its own prior
 * comment instead of spawning a new one on every push.
 */
export function renderPrComment(
  result: ScanResult,
  options: UnifiedReportOptions = {},
): string {
  return _renderUnifiedReport(result, {
    ...(options.diff ? { diff: options.diff } : {}),
    ...(options.repoUrl ? { repoUrl: options.repoUrl } : {}),
    ...(options.version ? { version: options.version } : {}),
    ...(options.commit !== undefined ? { commit: options.commit } : {}),
  });
}
