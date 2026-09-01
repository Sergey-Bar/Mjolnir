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
import type { BaselineDiff } from "./baseline.js";
import { sanitizeData } from "../reporter/theme.js";

const MARKER = "<!-- mjolnir-pr-comment -->";

/**
 * Bug-audit QA-2026-08-30 QA-10: finding metadata rendered into the PR
 * comment body is untrusted (hostile filenames, plugin messages). A raw
 * `|` breaks the markdown layout, a raw backtick escapes the code span,
 * and `</script>`/link syntax could inject content into the PR page.
 * Escape markdown-significant characters and strip control/ANSI escapes.
 */
function escapeMarkdown(s: string): string {
  return sanitizeData(s).replace(/([\\`*_{}[\]()#+!|<>])/g, "\\$1");
}

/** True when a fix recommendation reads as code rather than prose —
 * those render as a code span, the rest stay italic. */
function looksLikeCode(s: string): boolean {
  return /[(;={]|await |expect\(/.test(s);
}

/** Evidence tag per finding — Evidence > Assumption in the fabric: a
 * measured false-positive rate is shown right on the line when present. */
function evidenceTag(f: Finding): string {
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

function findingLine(f: Finding): string {
  const icon =
    f.severity === "error" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵";
  const fix = escapeMarkdown(f.fix);
  const fixBody = looksLikeCode(f.fix) ? `\`${fix}\`` : `_${fix}_`;
  return `${icon} **${escapeMarkdown(f.ruleId)}** \`${escapeMarkdown(f.file)}:${f.line}\` — ${escapeMarkdown(f.message)} ${escapeMarkdown(`[${evidenceTag(f)}]`)}\n  ${fixBody}`;
}

export interface PrCommentOptions {
  /** When provided, the comment reports only diff.newFindings, scoped to this PR's actual changes. */
  diff?: BaselineDiff;
  repoUrl?: string;
}

/**
 * Render the full comment body. Idempotent by design — the leading HTML
 * comment marker lets the posting workflow find and update its own prior
 * comment instead of spamming a new one on every push.
 */
export function renderPrComment(
  result: ScanResult,
  options: PrCommentOptions = {},
): string {
  const lines: string[] = [MARKER, ""];
  lines.push("### 🔨 Mjölnir scan");
  lines.push("");

  const diff = options.diff;
  const usingDiff = diff?.hasBaseline === true;
  const findings = usingDiff ? diff.newFindings : result.findings;

  if (usingDiff) {
    lines.push(
      `Comparing against the stored baseline (commit \`${diff.baselineCommit ?? "unknown"}\`) — showing only what this PR changed.`,
    );
  } else if (result.scope === "changed") {
    lines.push("Showing only findings on lines this PR changed.");
  } else {
    lines.push(
      "No baseline was found — showing the full scan. Run `mjolnir baseline` on the base branch to scope future comments to just what changed.",
    );
  }
  lines.push("");

  if (result.score !== null) {
    // Score drift (§5.4): when the baseline carries the additive score
    // field, the delta is shown against it. Older baselines (and no
    // baseline) degrade to the plain current score — never a fake delta.
    const baseScore = diff?.baselineScore;
    if (baseScore !== undefined) {
      const delta = result.score - baseScore;
      const sign = delta > 0 ? "+" : "";
      const commit = diff?.baselineCommit?.slice(0, 7) || "unknown";
      lines.push(
        `**Score:** ${result.score}/100 (${sign}${delta} since baseline \`${commit}\`)`,
      );
    } else {
      lines.push(`**Score:** ${result.score}/100`);
    }
    lines.push("");
  }

  if (findings.length === 0) {
    lines.push("✅ No new issues found in this PR's changes.");
  } else {
    const errors = findings.filter((f) => f.severity === "error").length;
    const warnings = findings.filter((f) => f.severity === "warning").length;
    lines.push(
      `**${findings.length} new finding${findings.length === 1 ? "" : "s"}** (${errors} error, ${warnings} warning):`,
    );
    lines.push("");
    for (const f of findings.slice(0, 25)) {
      lines.push(`- ${findingLine(f)}`);
    }
    if (findings.length > 25) {
      lines.push("");
      lines.push(
        `_...and ${findings.length - 25} more. Run \`mjolnir\` locally for the full list._`,
      );
    }
  }

  if (usingDiff && diff.resolvedFindings.length > 0) {
    lines.push("");
    lines.push(
      `✨ This PR also fixed ${diff.resolvedFindings.length} pre-existing finding${diff.resolvedFindings.length === 1 ? "" : "s"}.`,
    );
  }

  lines.push("");
  lines.push(
    `_Advisory only — this comment never blocks merging. Generated by [Mjölnir](${options.repoUrl ?? "https://github.com/Sergey-Bar/Mjolnir"})._`,
  );

  return lines.join("\n");
}

export { MARKER as PR_COMMENT_MARKER };
