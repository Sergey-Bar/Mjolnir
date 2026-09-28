/**
 * Shared PR-report rendering helpers (Phase 3 — Production Hardening Plan).
 *
 * Pure functions for the unified "Mjölnir Verification Report" PR comment.
 * Shared between the PR comment (`commands/pr-comment.ts`) and the Trust
 * Report MD artifact (`commands/trust-report.ts`).
 *
 * Design: progressive-disclosure pattern — scannable hero table at top,
 * collapsible detail sections below. Marker: `<!-- mjolnir-report:v2 -->`.
 */

import type { Finding, ScanResult, TrustSummary } from "../types.js";
import { deriveEvidenceLevel } from "../types.js";
import type { BaselineDiff } from "../commands/baseline.js";
import { sanitizeData } from "./theme.js";
import {
  deriveScoreState,
  headlineFor,
  testsAnalyzedCell,
  verdictFor,
} from "./presentation.js";
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
import { PR_BRAND_CONTRACT } from "../brand/pr-brand-contract.js";

export const UNIFIED_MARKER = "<!-- mjolnir-report:v2 -->";
export const LEGACY_PR_MARKER = "<!-- mjolnir-pr-comment -->";
export const LEGACY_TRUST_MARKER = "<!-- mjolnir-trust-report:v1 -->";

/**
 * The one place a comment asset URL is written down.
 *
 * It was a string literal at the header, naming `assets/mjolnir-icon.svg` —
 * a file this repository has never had. GitHub's sanitizer drops a broken
 * `<img>` silently, so the comment rendered with a blank 16px box and no
 * error anywhere. Taking the path from `PR_BRAND_CONTRACT.logoAsset` means
 * a future asset move is one edit with a test that resolves the URL against
 * the tree, rather than a literal nobody looks at.
 */
const MARK_URL = PR_BRAND_CONTRACT.logoAsset.dark;

/** GitHub's hard cap on a PR comment body. Exceeding it is a silent no-post. */
export const GITHUB_COMMENT_LIMIT = 65_536;

/**
 * Findings rendered per severity group before the rest are summarised.
 *
 * This existed, but nothing counted the rendered LENGTH, so 25 findings per
 * group across three groups was enough to exceed 65,536 characters and the
 * comment would fail to post on a large PR — silently, because the workflow
 * step that posts it has no length assertion. The cap is applied at the end
 * (see `enforceCommentLimit`) and the truncation is stated, because a
 * comment that silently drops findings reads as "there were only these".
 */
const MAX_FINDINGS_PER_GROUP = 25;

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
  return `${icon} **${escMd(f.ruleId)}** \`${safePath}:${f.line}\` — ${escMd(f.message)} ${escMd(`[${evidenceTagLine(f)}]`)}\n  Fix: ${fixBody}`;
}

/**
 * Reader-facing sentences for the `analysisStatus.reasons` tokens.
 *
 * A PREFIX matcher, not an exhaustive one, and that is forced by the data:
 * `types.ts` declares `reasons` as an OPEN `string[]` so a producer may add
 * a member without a schema bump. An exhaustive table would therefore be
 * wrong by construction — it would go stale silently the next time
 * `completion.ts` mints a new reason, and the symptom would be a token
 * printed in prose again.
 *
 * So the rule is: match the longest known prefix, and if nothing matches,
 * say the reason is unreported rather than printing it. An unknown token is
 * a finding about this renderer, and it is visible; a raw `scope-ignored:1`
 * in a comment is a finding a user cannot act on.
 */
const REASON_PHRASES: ReadonlyArray<[prefix: string, phrase: string]> = [
  ["discovery-truncated", "discovery stopped before it covered the tree"],
  ["rules-partial", "the rule pass did not complete"],
  ["skipped-files:", "some files were skipped"],
  ["rules-crashed:", "some rules crashed and were isolated"],
  ["scope-ignored", "some paths were ignored by the scope filter"],
  ["scope-unrecognized", "the engine saw files it does not recognise"],
  ["scope-degraded", "change scope could not be resolved completely"],
  ["parse-failed:", "some files failed to parse"],
  ["parse-fallbacks:", "some files fell back to a weaker parse"],
  [
    "ast-budget-fallback-files:",
    "some files lost their AST stage to the time budget",
  ],
  ["runtime-incomplete", "the runtime evidence set is incomplete"],
  ["identity-incomplete", "the run could not be bound to the tree it analysed"],
  ["degraded:", "capability was lost to a swallowed error"],
  ["truncated:", "the scan was cut short"],
];

/**
 * `scope-ignored:1` -> "1 path was ignored by the scope filter".
 *
 * The count is kept when the token carries one, because "some paths were
 * ignored" is the same sentence whether it is one or four hundred, and the
 * reader's next question is which.
 */
function humanizeReason(reason: string): string {
  for (const [prefix, phrase] of REASON_PHRASES) {
    if (!reason.startsWith(prefix)) continue;
    const count = /:(\d+)$/.exec(reason)?.[1];
    if (count === undefined) return phrase;
    return `${count} × ${phrase}`;
  }
  // Deliberately not the token. A reader who sees "an unreported reason
  // (scope-ignored)" learns something is wrong with the report; a reader who
  // sees "scope-ignored" learns nothing they can act on. The gate in
  // tests/reporters/pr-comment-render-gate.spec.ts fails if a bare token
  // reaches prose, so adding a reason means adding it HERE, where the wording
  // gets reviewed.
  return "an unreported reason (see the machine contract for the raw token)";
}

function humanizeReasons(reasons: readonly string[]): string {
  return reasons.map((reason) => humanizeReason(reason)).join("; ");
}

/**
 * HTML-escape for text that lands inside a table cell.
 *
 * `escMd` backslash-escapes, which is correct for markdown prose and WRONG
 * here: these strings go inside raw HTML, where a backslash means nothing to
 * the parser. `L2 <script>` reached the output as `L2 \<script>`, and while
 * the backslash does stop the tag forming in CommonMark, that is one layer of
 * parser coincidence rather than a guarantee. Inside a `<b>` element the
 * caller wants entity escaping and nothing else.
 */
function escHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * A hero-table CELL.
 *
 * HTML only. These strings were markdown headings inside a `<td>`, and inside
 * block-level HTML CommonMark does not parse markdown at all. GitHub's
 * sanitizer then strips the table, so the four cells flattened into one run of
 * text. Every existing assertion was a `toContain` on the heading, which is
 * satisfied by exactly the string that does not render.
 *
 * `<br>` is the only line break that survives inside a table cell, `<b>` the
 * only emphasis, and the label is `<small>` so the value reads first. `body`
 * is trusted HTML assembled by this module; `label` is a literal; anything
 * derived from the result goes through `escHtml` at the call site.
 */
function cell(label: string, body: string): string {
  return `<small>${escHtml(label)}</small><br>${body}`;
}

/** Score cell with its band, and a stamp when the score was clamped. */
export function renderScoreBadge(
  score: number | null,
  delta?: number,
  verdictOverride?: string,
  clamped?: boolean,
): string {
  if (score === null) return cell("Score", "<i>n/a — no tests found</i>");
  // `deriveScoreState` was called into `_state` and never read, so the band,
  // the colour and the rune never reached the output. The state is the
  // presentation model's decision (see its module header) and this function
  // is the surface, so the surface renders it.
  const state = deriveScoreState(score);
  const verdict = verdictOverride ?? verdictFor(score);
  let value = `<b>${escHtml(state.rune)} ${score}</b>/100`;
  // Two clamp sites turn 100 into 99 so a perfect score cannot be reported by
  // a scan that had a finding. Without this stamp a clamped 99 is
  // indistinguishable from a genuine 99, which is the whole reason the clamp
  // exists.
  if (clamped) {
    value +=
      " <sub>(capped from 100 — the raw value is withheld so a scan with a finding cannot report a perfect score)</sub>";
  }
  if (delta !== undefined && delta !== 0) {
    value += ` (${delta > 0 ? "+" : ""}${delta})`;
  }
  return cell("Score", `${value}<br><small>${escHtml(verdict)}</small>`);
}

/** Trust level cell, with the rung's own label rather than the bare code. */
export function renderTrustBadge(level: string): string {
  return cell("Trust level", `<b>${escHtml(level)}</b>`);
}

/** Findings count cell. */
export function renderFindingsBadge(errors: number, warnings: number): string {
  return cell(
    "Findings",
    `<b>${errors}</b> error${errors === 1 ? "" : "s"} · <b>${warnings}</b> warning${warnings === 1 ? "" : "s"}`,
  );
}

/** Evidence coverage cell. */
export function renderEvidenceBadge(coverage: number): string {
  return cell("Evidence", `<b>${pct(coverage)}</b> coverage`);
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
    `| Tests analyzed | ${testsAnalyzedCell(result.testDeclarationCount, result.testFileCount)} |`,
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
  // This row used to read `Rule(rev) inventory | none` on any scan with zero
  // findings, under a heading called Artifact Integrity — because
  // `buildArtifactIdentity` loops `result.findings` and a clean run has none.
  // So the one section whose entire job is to say what was scanned reported
  // that nothing was scanned.
  //
  // Two rows, because they answer different questions and only one of them
  // can be complete from a findings-only source: the fired rules carry their
  // revisions, and the WHOLE rule set is covered by the identity's
  // `rulesDigest`, which is computed over every rule that ran rather than
  // every rule that fired.
  const revs = identity.detectorRevisions
    .map((r) => `${r.ruleId}@${r.detectorRevision}`)
    .join(" · ");
  lines.push(`| Fired rules | ${revs || "none fired"} |`);
  lines.push(
    `| Whole rule set | ${
      identity.rulesDigest
        ? `digest \`${identity.rulesDigest.slice(0, 12)}\` over every rule that ran`
        : "no digest (producer predates run identity)"
    } |`,
  );
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

function isIncompleteResult(result: ScanResult): boolean {
  const status = result.analysisStatus;
  return (
    result.partial ||
    status === undefined ||
    status.discovery !== "complete" ||
    status.rules !== "complete" ||
    (status.rulesCrashed ?? 0) > 0 ||
    result.scopeIntegrity?.scopeVerdict === "PARTIAL"
  );
}

/**
 * Render the unified "Mjölnir Verification Report" PR comment.
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
  const incomplete =
    isIncompleteResult(result) ||
    !result.trustSummary ||
    (summary.level === "L0" && summary.evidenceCoverage === 0);

  // ─── Hero header ───
  // The alt text is `alt=""`: an `<img>` whose alt duplicates the adjacent
  // heading is read by a screen reader as "Mjölnir Mjölnir", and the heading
  // already names the product. A decorative mark takes an empty alt and the
  // heading carries the name.
  lines.push(
    `## <img width="16" height="16" alt="" src="${MARK_URL}"/> Mjölnir Verification Report`,
  );
  lines.push("");
  lines.push(
    "> Tests tell you what passed. Mjölnir tells you what you can trust.",
  );
  lines.push("");
  if (result.scope === "changed") {
    lines.push("_Scope: only the lines this PR changed._");
    lines.push("");
  }
  if (incomplete) {
    const reasons = result.analysisStatus?.reasons ?? [];
    lines.push(
      `> **Analysis status: INCOMPLETE.** ${reasons.length > 0 ? humanizeReasons(reasons) : "The scan did not complete a trustworthy analysis."}`,
    );
    lines.push("");
  }

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

  lines.push('<table role="presentation">');
  lines.push("<tr>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(renderTrustBadge(summary.level));
  lines.push("");
  lines.push("</td>");
  lines.push('<td width="130">');
  lines.push("");
  lines.push(
    renderScoreBadge(
      result.score,
      delta,
      incomplete ? "INCOMPLETE" : undefined,
      // The clamp reason, not a boolean re-derived here. A presentation
      // surface that re-derives "was this clamped" from partial/scope will
      // disagree with the pipeline the first time a third clamp is added.
      result.scoreClampReason !== undefined,
    ),
  );
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
  lines.push(
    incomplete
      ? "**Headline:** Analysis is incomplete; this report is not a clean or worthy verdict."
      : `**Headline:** ${headlineFor(state, headlineFindings)}`,
  );
  lines.push("");

  // ─── Coverage ───
  // The comment's own completeness claim. `analysisStatus.rules` says "a rule
  // did not fail", which is true on every run and says nothing about which
  // rules were PRESENT — a scan over 45 of 79 detectors reports
  // `rules: "complete"` and reads, to anyone not reading the contract, like
  // the whole registry ran.
  // `analysisStatus` is optional on the type, and `isIncompleteResult` above
  // treats its ABSENCE as incomplete — which is how a pre-field producer is
  // reported. Reading `.rulesWithheld` off it directly crashed instead, so
  // the disclosure that names the defect is itself undefined on exactly the
  // inputs the defect describes.
  const withheld = result.analysisStatus?.rulesWithheld;
  if (withheld !== undefined && withheld > 0) {
    const applied = result.analysisStatus?.rulesApplied;
    lines.push(
      `> ⚠️ **Rule coverage: ${withheld} of ${applied !== undefined ? applied + withheld : "the"} registered rules were withheld** (quarantine tier — not run in this scan). A clean result here is a clean result over the rules that ran, not over the whole registry.`,
    );
    lines.push("");
  }

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
    lines.push(
      incomplete
        ? "⚠️ No findings were observed, but the analysis is incomplete; this is not proof of cleanliness."
        : usingDiff
          ? "✅ No new findings in this PR's changes."
          : "✅ No new findings in the analyzed surface.",
    );
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
      for (const f of g.list.slice(0, MAX_FINDINGS_PER_GROUP)) {
        lines.push(`- ${findingLineMd(f)}`);
      }
      if (g.list.length > MAX_FINDINGS_PER_GROUP) {
        lines.push("");
        lines.push(
          `_...and ${g.list.length - MAX_FINDINGS_PER_GROUP} more ${g.label}. Run \`mjolnir\` locally for the full list._`,
        );
      }
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }

    const totalHidden = groups.reduce(
      (sum, g) => sum + Math.max(0, g.list.length - MAX_FINDINGS_PER_GROUP),
      0,
    );
    if (totalHidden > 0) {
      lines.push(
        `_...and ${totalHidden} more overall. Run \`mjolnir\` locally for the full list._`,
      );
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
  // Stated in terms of what the reader must DECIDE, not which flags exist.
  // The old block was a flag dump whose only line was "full scan + score",
  // and `--require-full-coverage` — the flag that makes a withheld rule a
  // failure — was not in it.
  const version = options.version ? `@${options.version}` : "";
  lines.push("**What to run next:**");
  lines.push("```bash");
  lines.push(
    `npx mjolnir-qa${version} . --blocking none   # see every finding, gate nothing`,
  );
  if (withheld !== undefined && withheld > 0) {
    lines.push(
      `npx mjolnir-qa${version} . --require-full-coverage   # fail if any of the ${withheld} withheld rule(s) were skipped`,
    );
  }
  lines.push(
    `npx mjolnir-qa${version} . --verbose   # every finding, uncapped`,
  );
  lines.push("```");
  lines.push("");
  const repoLink = options.repoUrl ? ` — ${options.repoUrl}` : "";
  // This used to claim "blocks merging when the CI gate reports findings at
  // the configured severity" — a statement about the PUBLISHER's
  // configuration, made by a pure rendering function that cannot see the
  // workflow, the gate level, or whether the check is even required. It was
  // wrong in the same run it was most needed: a scan that exited 2 on
  // `--require-full-coverage` has `partial: false`, so the renderer took the
  // else-branch and advertised a clean gate on a run the gate had just
  // failed.
  //
  // A renderer should state what the SCAN was. Whether the comment blocks a
  // merge is the check's business, and the check already says so on its own
  // run.
  lines.push(
    incomplete
      ? `<sub>Posted by GitHub Actions${repoLink} — analysis incomplete; no release verdict is claimed.</sub>`
      : `<sub>Posted by GitHub Actions${repoLink} — this is a measurement of the changes scanned, not a merge decision. The CI check named in the run is the gating surface.</sub>`,
  );

  return enforceCommentLimit(lines);
}

/**
 * Keep the comment postable, and say so when it had to drop something.
 *
 * A comment over GitHub's 65,536-character limit is not an error the poster
 * reports clearly — the API rejects it and the workflow step has no length
 * assertion, so a large PR silently got no comment while the run itself
 * stayed green. Three severity groups at 25 findings each was enough to get
 * there, and nothing measured the output.
 *
 * Truncation is done by dropping whole BLOCKS from the end and saying so.
 * Slicing a markdown string at a character offset would leave an unclosed
 * `<details>`, and GitHub's sanitizer swallows the rest of the comment when
 * it sees unbalanced HTML — a hard truncation makes the damage worse, not
 * smaller.
 *
 * REACHABILITY, stated honestly: with `MAX_FINDINGS_PER_GROUP = 25` and the
 * current 79-rule registry, the longest renderable comment measured across a
 * matrix of 0–400 findings × three severities × 100–2,000-character messages
 * is ~62,400 characters — under the limit. So this is defence-in-depth, not a
 * fix for an observed overflow. It is exported and unit-tested anyway,
 * because the alternative is a ceiling that is discovered by a failed API
 * call on someone's large PR. It is NOT counted as closing a shipped bug, and
 * the test that pins the ceiling says so rather than implying the guard fires
 * on every run.
 */
export function enforceCommentLimit(lines: string[]): string {
  const render = (parts: string[]) => parts.join("\n");
  if (render(lines).length <= GITHUB_COMMENT_LIMIT) return render(lines);

  // Drop the collapsible detail sections first: they are the least
  // load-bearing content and the largest blocks. The footer, the hero
  // table and the findings are what the reader came for.
  const droppable = new Set([
    "📊 Confidence & Evidence",
    "🔧 Diff vs Baseline",
    "🔗 Artifact Integrity",
  ]);
  const kept = lines.filter(
    (line) => ![...droppable].some((label) => line.includes(label)),
  );

  const hidden = [...droppable].filter((label) =>
    lines.some((line) => line.includes(label)),
  );
  kept.splice(
    kept.length - 1,
    0,
    "",
    `> ⚠️ **This comment was truncated to fit GitHub's ${GITHUB_COMMENT_LIMIT.toLocaleString("en-US")}-character limit.**`,
    `> ${hidden.length} detail section${hidden.length === 1 ? "" : "s"} (${hidden.join(", ")}) ${hidden.length === 1 ? "was" : "were"} omitted, and the finding list above may be partial.`,
    "> Run `npx mjolnir-qa` locally for the complete report — the machine contract (`--json`) carries no such limit.",
    "",
  );

  const output = render(kept);
  if (output.length <= GITHUB_COMMENT_LIMIT) return output;

  // Still over: a single huge finding list. Drop findings lines, which are
  // one `- ` bullet each and are the only block with a per-line cost.
  const final: string[] = [];
  for (const line of kept) {
    if (
      final.length > 0 &&
      render([...final, line]).length > GITHUB_COMMENT_LIMIT - 400
    ) {
      break;
    }
    final.push(line);
  }
  final.push(
    "",
    `> ⚠️ **The finding list is truncated at ${GITHUB_COMMENT_LIMIT.toLocaleString("en-US")} characters.** The counts above are exact; the detail below this line is not complete. Run \`npx mjolnir-qa\` locally for the full list.`,
  );
  return render(final);
}
