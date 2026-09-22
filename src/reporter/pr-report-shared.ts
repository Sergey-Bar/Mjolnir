/**
 * Shared PR-report rendering helpers (Phase 3 — Production Hardening Plan).
 *
 * Pure functions for the unified "QA Doctor Verification Report" PR comment.
 * Shared between the PR comment (`commands/pr-comment.ts`) and the Trust
 * Report MD artifact (`commands/trust-report.ts`).
 *
 * Design: progressive-disclosure pattern — scannable hero table at top,
 * collapsible detail sections below. Marker: `<!-- qa-doctor-report:v2 -->`.
 */

import type { Finding, ScanResult, TrustSummary } from "../types.js";
import { deriveEvidenceLevel } from "../types.js";
import type { BaselineDiff } from "../commands/baseline.js";
import { sanitizeData } from "./theme.js";
import { deriveScoreState, headlineFor } from "./score-state.js";
import { verdictFor } from "./terminal.js";
import { pct } from "../lib/format.js";
import {
  nextAction as _nextAction,
  topTrustRisks as _topTrustRisks,
  trustHeadline as _trustHeadline,
} from "./trust-report.js";
import {
  buildArtifactIdentity,
  type ArtifactIdentity,
} from "../commands/trust-report.js";

export const UNIFIED_MARKER = "<!-- qa-doctor-report:v2 -->";
export const LEGACY_PR_MARKER = "<!-- qa-doctor-pr-comment -->";
export const LEGACY_TRUST_MARKER = "<!-- qa-doctor-trust-report:v1 -->";

function escMd(s: string): string {
  return sanitizeData(s).replace(/([\\`*_{}[\]()#+!|<>])/g, "\\$1");
}

function looksLikeCode(s: string): boolean {
  return /[(;={]|await |expect\(/.test(s);
}

function evidenceTagLine(f: Finding): string {
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

function findingLineMd(f: Finding): string {
  const icon =
    f.severity === "error" ? "🔴" : f.severity === "warning" ? "🟡" : "🔵";
  const fix = escMd(f.fix);
  const fixBody = looksLikeCode(f.fix) ? `\`${fix}\`` : `_${fix}_`;
  const safePath = escMd(f.file).replace(/[\r\n]+/g, " ");
  return `${icon} **${escMd(f.ruleId)}** <code>${safePath}:${f.line}</code> — ${escMd(f.message)} ${escMd(`[${evidenceTagLine(f)}]`)}\n  Fix: ${fixBody}`;
}

/** Score cell with color-coded emoji and optional delta. */
export function renderScoreBadge(score: number | null, delta?: number): string {
  if (score === null) return "### Score\n*n/a*";
  const _state = deriveScoreState(score);
  const verdict = verdictFor(score);
  let text = `**${score}**/100 ${verdict}`;
  if (delta !== undefined && delta !== 0) {
    const sign = delta > 0 ? "+" : "";
    text += ` (${sign}${delta})`;
  }
  return `### Score\n${text}`;
}

/** Trust level cell. */
export function renderTrustBadge(level: string): string {
  return `### Trust Level\n**${level}**`;
}

/** Findings count cell. */
export function renderFindingsBadge(errors: number, warnings: number): string {
  return `### Findings\n**${errors}** errors · **${warnings}** warnings`;
}

/** Evidence coverage cell. */
export function renderEvidenceBadge(coverage: number): string {
  return `### Evidence\n**${pct(coverage)}** coverage`;
}

/** Collapsible confidence metrics table. */
export function renderConfidenceTable(
  result: ScanResult,
  summary: TrustSummary,
): string[] {
  const lines: string[] = [];
  lines.push("<details>");
  lines.push("<summary><b>📊 Confidence & Evidence</b></summary>");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("|--------|-------|");
  lines.push(
    `| Confidence | ${pct(summary.confidence)}${summary.confidenceCeiling !== undefined ? ` (ceiling ${pct(summary.confidenceCeiling)})` : ""} |`,
  );
  lines.push(`| Evidence coverage | ${pct(summary.evidenceCoverage)} |`);
  lines.push(`| Inconclusive | ${pct(summary.inconclusiveRate)} |`);
  lines.push(
    `| Measured FP (fired) | ${
      summary.measuredFpOfFiredRules !== undefined
        ? pct(summary.measuredFpOfFiredRules)
        : summary.provisionalRuleIds.length > 0
          ? `PROVISIONAL (${summary.provisionalRuleIds.length} unmeasured)`
          : "n/a"
    } |`,
  );
  lines.push(
    `| Tests analyzed | ${result.testDeclarationCount ?? 0} in ${result.testFileCount ?? 0} files |`,
  );
  lines.push("");
  lines.push("</details>");
  return lines;
}

/** Collapsible baseline diff section. */
export function renderDiffSection(diff: BaselineDiff): string[] {
  const lines: string[] = [];
  lines.push("<details>");
  lines.push("<summary><b>🔧 Diff vs Baseline</b></summary>");
  lines.push("");
  if (diff.hasBaseline) {
    const commit = diff.baselineCommit?.slice(0, 7) || "unknown";
    lines.push(
      `Comparing against baseline \`${commit}\` — showing only what this PR changed.`,
    );
  } else {
    lines.push("No baseline found — showing full scan results.");
  }
  if (diff.resolvedFindings.length > 0) {
    const verified = diff.resolvedFindings.filter(
      (f) => f.resolution.status === "VERIFIED-RESOLVED",
    );
    if (verified.length > 0) {
      lines.push(
        `✨ ${verified.length} pre-existing finding${verified.length === 1 ? "" : "s"} verified as fixed in this PR.`,
      );
    }
  }
  lines.push("");
  lines.push("</details>");
  return lines;
}

/** Collapsible artifact integrity section. */
export function renderArtifactIntegrity(identity: ArtifactIdentity): string[] {
  const lines: string[] = [];
  lines.push("<details>");
  lines.push("<summary><b>🔗 Artifact Integrity</b></summary>");
  lines.push("");
  lines.push("| Key | Value |");
  lines.push("|-----|-------|");
  lines.push(`| scanId | \`${identity.scanId ?? "unbound"}\` |`);
  lines.push(`| Commit | \`${identity.commit ?? "unknown"}\` |`);
  const revs = identity.detectorRevisions
    .map((r) => `${r.ruleId}@${r.detectorRevision}`)
    .join(" · ");
  lines.push(`| Rule(rev) inventory | ${revs || "none"} |`);
  lines.push(
    `| Evidence inventory | ${identity.evidenceInventory.totalFindings} finding(s), ${identity.evidenceInventory.corroborated} runtime-corroborated |`,
  );
  lines.push("");
  lines.push("</details>");
  return lines;
}

export interface UnifiedReportOptions {
  diff?: BaselineDiff;
  repoUrl?: string;
  version?: string;
  commit?: string | null;
}

/**
 * Render the unified "QA Doctor Verification Report" PR comment.
 *
 * Merges data from the former `renderPrComment()` (findings, score, diff)
 * and `renderTrustReportMarkdown()` (trust level, confidence, artifact
 * integrity) into a single progressive-disclosure comment.
 */
export function renderUnifiedReport(
  result: ScanResult,
  options: UnifiedReportOptions = {},
): string {
  const lines: string[] = [UNIFIED_MARKER, ""];
  const summary: TrustSummary = result.trustSummary ?? {
    level: "L0",
    confidence: 0,
    evidenceCoverage: 0,
    inconclusiveRate: 0,
    provisionalRuleIds: [],
    ceilingReasons: [],
  };

  // ─── Hero header ───
  lines.push(
    '## <img width="16" src="https://raw.githubusercontent.com/Sergey-Bar/qa-doctor/main/assets/qa-doctor-icon.svg"/> QA Doctor Verification Report',
  );
  lines.push("");
  lines.push(
    "> Tests tell you what passed. QA Doctor tells you what you can trust.",
  );
  lines.push("");

  // ─── Hero table ───
  const diff = options.diff;
  const usingDiff = diff?.hasBaseline === true;
  const findings = usingDiff ? diff.newFindings : result.findings;
  const errorCount = findings.filter((f) => f.severity === "error").length;
  const warningCount = findings.filter((f) => f.severity === "warning").length;
  const baseScore = diff?.baselineScore;
  const delta =
    baseScore !== undefined && result.score !== null
      ? result.score - baseScore
      : undefined;

  lines.push("<table>");
  lines.push("<tr>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(renderTrustBadge(summary.level));
  lines.push("");
  lines.push("</td>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(renderScoreBadge(result.score, delta));
  lines.push("");
  lines.push("</td>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(renderFindingsBadge(errorCount, warningCount));
  lines.push("");
  lines.push("</td>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(renderEvidenceBadge(summary.evidenceCoverage));
  lines.push("");
  lines.push("</td>");
  lines.push("</tr>");
  lines.push("</table>");
  lines.push("");

  // ─── Headline ───
  const state = deriveScoreState(result.score);
  const headlineFindings = usingDiff ? findings.length : result.findings.length;
  lines.push(`**Headline:** ${headlineFor(state, headlineFindings)}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // ─── Score breakdown ───
  if (result.dimensions && result.dimensions.length > 0) {
    lines.push("### Score Breakdown");
    lines.push("");
    lines.push("| Category | Score |");
    lines.push("|----------|-------|");
    for (const d of result.dimensions) {
      lines.push(`| ${escMd(d.category)} | ${d.score}/100 |`);
    }
    lines.push("");
  }

  // ─── Findings by severity ───
  if (findings.length === 0) {
    lines.push("✅ No new findings in this PR's changes.");
    lines.push("");
  } else {
    const errors = findings.filter((f) => f.severity === "error");
    const warnings = findings.filter((f) => f.severity === "warning");
    const infos = findings.filter((f) => f.severity === "info");

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

    for (const g of groups) {
      if (g.list.length === 0) continue;
      lines.push(`<details${g.open ? " open" : ""}>`);
      lines.push(
        `<summary><b>${g.icon} ${g.list.length} ${g.label}</b>${g.open ? " — must fix before merge" : " — advisory"}</summary>`,
      );
      lines.push("");
      for (const f of g.list.slice(0, 25)) {
        lines.push(`- ${findingLineMd(f)}`);
      }
      if (g.list.length > 25) {
        lines.push("");
        lines.push(
          `_...and ${g.list.length - 25} more ${g.label}. Run \`qa-doctor\` locally for the full list._`,
        );
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
  }

  // ─── Confidence & Evidence ───
  lines.push(...renderConfidenceTable(result, summary));
  lines.push("");

  // ─── Diff vs Baseline ───
  if (diff) {
    lines.push(...renderDiffSection(diff));
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // ─── Artifact Integrity ───
  const identity = buildArtifactIdentity(result, options.commit);
  lines.push(...renderArtifactIntegrity(identity));
  lines.push("");

  // ─── What to run next ───
  const version = options.version ? `@${options.version}` : "";
  lines.push("**What to run next:**");
  lines.push("```bash");
  lines.push(`npx mjolnir-qa${version} .            # full scan + score`);
  lines.push(`npx mjolnir-qa${version} . --verbose # every finding, uncapped`);
  lines.push("```");
  lines.push("");
  lines.push(
    `<sub>Advisory only — this comment never blocks merging. Generated by [QA Doctor](${options.repoUrl ?? "https://github.com/Sergey-Bar/qa-doctor"}).</sub>`,
  );

  return lines.join("\n");
}
