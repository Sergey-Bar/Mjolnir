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
import { deriveScoreState, headlineFor } from "../reporter/score-state.js";
import { verdictFor } from "../reporter/terminal.js";

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
  return `${icon} **${escapeMarkdown(f.ruleId)}** \`${escapeMarkdown(f.file)}:${f.line}\` — ${escapeMarkdown(f.message)} ${escapeMarkdown(`[${evidenceTag(f)}]`)}\n  Fix: ${fixBody}`;
}

export interface PrCommentOptions {
  /** When provided, the comment reports only diff.newFindings, scoped to this PR's actual changes. */
  diff?: BaselineDiff;
  repoUrl?: string;
  /**
   * The running CLI version, injected by the command runner (plan M5
   * footer: `npx mjolnir-qa@<ver> <path>`). Omitted → the versionless
   * form; the PR comment must never suggest a floating @latest.
   */
  version?: string;
}

/**
 * Render the full comment body (plan M5 redesign). Idempotent by
 * design — the leading HTML comment marker lets the posting workflow
 * find and update its own prior comment instead of spamming a new one
 * on every push.
 */
export function renderPrComment(
  result: ScanResult,
  options: PrCommentOptions = {},
): string {
  const lines: string[] = [MARKER, ""];
  lines.push("### 🔨 Mjölnir — Verification Trust");
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
    const state = deriveScoreState(result.score);
    const verdict = verdictFor(result.score);
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
      lines.push(`**Score:** ${result.score}/100 · ${verdict} (${state.band})`);
    }
    lines.push("");
    lines.push(`_${headlineFor(state, result.findings.length)}_`);
    lines.push("");
  }

  // Dimensions may be absent on hand-built ScanResults (hostile-input
  // tests render partial objects) — guard instead of assuming.
  if (result.dimensions && result.dimensions.length > 0) {
    lines.push("| Category | Score |");
    lines.push("|---|---|");
    for (const d of result.dimensions) {
      lines.push(`| ${escapeMarkdown(d.category)} | ${d.score}/100 |`);
    }
    lines.push("");
  }

  if (findings.length === 0) {
    lines.push("✅ No new issues found in this PR's changes.");
  } else {
    const errors = findings.filter((f) => f.severity === "error");
    const warnings = findings.filter((f) => f.severity === "warning");
    const infos = findings.filter((f) => f.severity === "info");
    lines.push(
      `**${findings.length} new finding${findings.length === 1 ? "" : "s"}** (${errors.length} error, ${warnings.length} warning):`,
    );
    lines.push("");
    // Errors open by default — they are the merge blockers. Warnings and
    // infos collapse so a green-looking PR stays readable.
    const groups: Array<{
      icon: string;
      label: string;
      list: Finding[];
      open: boolean;
    }> = [
      { icon: "🔴", label: "errors", list: errors, open: true },
      { icon: "🟡", label: "warnings", list: warnings, open: false },
      { icon: "🔵", label: "infos", list: infos, open: false },
    ];
    let rendered = 0;
    for (const g of groups) {
      if (g.list.length === 0) continue;
      rendered += Math.min(g.list.length, 25);
      lines.push("<details" + (g.open ? " open" : "") + ">");
      lines.push(`<summary>${g.icon} ${g.list.length} ${g.label}</summary>`);
      lines.push("");
      for (const f of g.list.slice(0, 25)) {
        lines.push(`- ${findingLine(f)}`);
      }
      if (g.list.length > 25) {
        lines.push("");
        lines.push(
          `_...and ${g.list.length - 25} more ${g.label}. Run \`mjolnir\` locally for the full list._`,
        );
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
    const overflow = findings.length - rendered;
    if (overflow > 0) {
      lines.push(
        `_...and ${overflow} more overall — run \`mjolnir\` locally (or \`--verbose\`) for the full list._`,
      );
    }
  }

  lines.push("");
  // Plan M5 footer: the exact commands to run next, then the honesty
  // note about what this PR fixed.
  const version = options.version ? `@${options.version}` : "";
  lines.push("**What to run next:**");
  lines.push("");
  lines.push("```bash");
  lines.push(`npx mjolnir-qa${version} .            # full scan + score`);
  lines.push(`npx mjolnir-qa${version} . --verbose # every finding, uncapped`);
  lines.push("```");
  lines.push("");
  lines.push(
    `_Advisory only — this comment never blocks merging. Generated by [Mjölnir](${options.repoUrl ?? "https://github.com/Sergey-Bar/Mjolnir"})._`,
  );

  if (usingDiff && diff.resolvedFindings.length > 0) {
    lines.push("");
    lines.push(
      `✨ ${diff.resolvedFindings.length} pre-existing finding${diff.resolvedFindings.length === 1 ? "" : "s"} fixed in this PR.`,
    );
  }

  return lines.join("\n");
}

export { MARKER as PR_COMMENT_MARKER, escapeMarkdown };
