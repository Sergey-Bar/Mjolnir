/**
 * Terminal reporter (W1-06). Retro CRT/arcade redesign.
 * Respects NO_COLOR and non-TTY (R11): plain text, no ANSI codes.
 * Symbols accompany color for color-blind users.
 *
 * Information architecture: SUMMARY (hammer instrument) → SIGNAL
 * (dimensions + deductions) → EVIDENCE (finding cards) → DETAILS
 * (verbose + honesty footer) → ACTION (fix-first + verify hints).
 */

import type { Finding, ScanResult } from "../types.js";
import { DEDUCTIONS, deriveEvidenceLevel } from "../types.js";
import { computeDimensions, deductionFor } from "../scorer/scorer.js";
import { topFixes } from "../scorer/prioritize.js";
import {
  palette,
  shouldColorize,
  shouldUseAscii,
  scoreGauge,
  severityTag,
  box,
  measure,
  padTo,
  sanitizeData,
  wrapText,
} from "./theme.js";
import { deriveScoreState, headlineFor } from "./score-state.js";
import {
  LOGO,
  LOGO_ASCII,
  TROPHY,
  DIVIDER,
  FORGED_WORDMARK,
  renderHammer,
} from "./art.js";
import { bluntMessage } from "./tone-blunt.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { SEARCHED_FOR } from "../discovery/scan-adapters.js";

/** Non-verbose finding cards shown before the overflow line. The
 * JSON/SARIF contract always carries ALL findings — this cap is a
 * terminal display concern only. */
const MAX_CARDS = 10;

/** Group findings under a single rule header when more than this many
 * share the same ruleId ("same fix applies" collapse). */
const GROUP_THRESHOLD = 3;

/** Reflow floor: below this, box wrapping targets a minimum readable
 * width rather than shrinking further (an 8-column box is useless). */
const MIN_BOX_WIDTH = 20;

export interface RenderTerminalOpts {
  isTTY: boolean;
  verbose?: boolean;
  /** Explicit column width override (--width). Defaults to
   * process.stdout.columns, then 80 when neither is known (piped/CI). */
  width?: number;
  /** Force ASCII glyphs/box-drawing. Defaults to shouldUseAscii()'s
   * cmd.exe/legacy-console heuristic when omitted. */
  ascii?: boolean;
  /** --tone blunt: blunter, pattern-mocking messages (Sprint 9 Task 40). */
  tone?: "blunt";
}

export function renderTerminal(
  result: ScanResult,
  opts: RenderTerminalOpts,
): string {
  const p = palette(shouldColorize(opts.isTTY));
  const width = Math.max(
    MIN_BOX_WIDTH,
    opts.width ?? process.stdout.columns ?? 80,
  );
  const ascii = opts.ascii ?? shouldUseAscii();
  const lines: string[] = [];

  const logo = ascii ? LOGO_ASCII : LOGO;
  for (const l of logo.split("\n")) if (l.trim()) lines.push(p.accent(l));
  lines.push("");

  if (result.score === null) {
    return renderNoTests(p, ascii);
  }

  const counts = countBySeverity(result);

  // The null branch returned renderNoTests above; the score section only
  // ever sees a numeric score from here on.
  appendScoreSection(
    lines,
    { ...result, score: result.score },
    p,
    width,
    ascii,
  );
  appendFrameworks(lines, result, p);
  appendDimensions(lines, result, p, ascii);
  appendDeductions(lines, result, counts, p, width, ascii);
  appendFixThisFirst(lines, result, p);
  appendFindings(
    lines,
    result,
    counts,
    opts.verbose === true,
    p,
    ascii,
    width,
    opts.tone,
  );
  if (counts.total === 0 && result.score === 100) {
    appendForgedBlock(lines, p, ascii);
  }
  appendFooter(lines, result, p, width);
  return lines.join("\n");
}

/**
 * Contract-stable three-band verdict (property-locked in
 * tests/scoring-precision.spec.ts). Delegates to the ScoreState model —
 * 100 keeps returning WORTHY here; the FORGED premium treatment lives
 * in the dedicated block, not in this public mapping.
 */
export function verdictFor(
  score: number,
): "WORTHY" | "NEEDS WORK" | "UNWORTHY" {
  const verdict = deriveScoreState(score).verdict;
  return verdict === "FORGED" ? "WORTHY" : verdict;
}

function appendScoreSection(
  lines: string[],
  result: ScanResult & { score: number },
  p: ReturnType<typeof palette>,
  width: number,
  ascii: boolean,
): void {
  const state = deriveScoreState(result.score);
  const verdict = verdictFor(result.score);
  const verdictColored = colorizeVerdict(verdict, state.band, p);
  const scoreText = String(result.score).padStart(3);

  // The hammer is the instrument: the first thing the eye lands on,
  // state-resolved, before any word is read.
  lines.push("");
  for (const l of renderHammer(state, p, ascii)) lines.push(`  ${l}`);
  lines.push("");
  lines.push(
    `  ${p.bold("WORTHINESS")} ${p.bold(scoreText)}${p.dim("/100")}  ${verdictColored}`,
  );
  // Gauge width tracks the terminal so it never wraps awkwardly on a
  // narrow window; floors at 10 blocks so the gauge stays legible.
  const gaugeWidth = Math.max(10, Math.min(30, width - 4));
  lines.push(`  ${scoreGauge(result.score, p, gaugeWidth, ascii)}`);
  lines.push(`  ${p.dim(headlineFor(state, result.findings.length))}`);
  // Phase 5 transparency: show raw deductions and the actual denominator so
  // the normalization is never opaque.
  if (result.rawDeductions !== undefined && result.testDeclarationCount) {
    lines.push(
      `  ${p.dim(`(${result.rawDeductions} raw pts / ${result.testDeclarationCount} test declarations — normalized)`)}`,
    );
  }
  if (result.suppressionCount && result.suppressionCount > 0) {
    lines.push(
      `  ${p.dim(`(${result.suppressionCount} finding(s) suppressed by config)`)}`,
    );
  }
  lines.push("");
}

function colorizeVerdict(
  verdict: string,
  band: ReturnType<typeof deriveScoreState>["band"],
  p: ReturnType<typeof palette>,
): string {
  if (band === "forged") return p.forged(verdict);
  if (band === "trusted") return p.trusted(verdict);
  if (band === "warning") return p.warning(verdict);
  return p.error(verdict);
}

function appendFrameworks(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
): void {
  if (result.frameworks.length > 0) {
    const tags = result.frameworks.map((f) => `[${f}]`).join(" ");
    lines.push(`  ${p.dim("DETECTED")} ${p.info(tags)}`);
  } else if (result.frameworkDetectionUnknown) {
    lines.push(
      `  ${p.dim("FRAMEWORK")} unknown — scanning all test-looking files. ` +
        `Add a package.json/config the detector recognizes for framework-aware scoring.`,
    );
  }
  lines.push("");
}

function appendDimensions(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
  ascii: boolean,
): void {
  const dims =
    result.dimensions.length > 0
      ? result.dimensions
      : computeDimensions(result.findings);
  if (dims.length === 0) return;
  lines.push(`  ${p.accent("▚ DIAGNOSTICS BY CATEGORY")}`);
  const width = Math.max(...dims.map((d) => d.category.length));
  for (const d of dims) {
    const label = padTo(d.category, width);
    const scoreText = String(d.score).padStart(3);
    lines.push(`  ${label}  ${scoreGauge(d.score, p, 16, ascii)} ${scoreText}`);
  }
  lines.push("");
}

function appendDeductions(
  lines: string[],
  result: ScanResult,
  counts: { error: number; warning: number; info: number; total: number },
  p: ReturnType<typeof palette>,
  width: number,
  ascii: boolean,
): void {
  if (counts.total === 0) return;
  lines.push(`  ${p.accent("▚ WHERE POINTS WERE LOST")}`);
  // Honesty Core: the table must reconcile with the score. Deductions are
  // computed per finding via deductionFor — E0 costs 0, E1 costs half —
  // so count × base would silently lie whenever evidence levels apply.
  const rows: string[] = [];
  const bySeverity = {
    error: { n: 0, ded: 0 },
    warning: { n: 0, ded: 0 },
    info: { n: 0, ded: 0 },
  } as Record<"error" | "warning" | "info", { n: number; ded: number }>;
  for (const f of result.findings) {
    // Severity is a closed three-value union — every finding lands in the
    // table, so there is no filtered-out case.
    bySeverity[f.severity].n++;
    bySeverity[f.severity].ded += deductionFor(f);
  }
  for (const sev of ["error", "warning", "info"] as const) {
    const s = bySeverity[sev];
    if (s.n === 0) continue;
    const discounted = s.ded < s.n * DEDUCTIONS[sev];
    rows.push(
      `${s.n} × ${sev.padEnd(7)} −${String(s.ded).padStart(3)}${discounted ? p.dim(" (evidence-discounted)") : ""}`,
    );
  }
  for (const row of box(rows, 1, { maxWidth: width - 2, ascii }))
    lines.push(`  ${row}`);
  lines.push("");
}

function appendFixThisFirst(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
): void {
  const fixes = topFixes(result.findings, 3);
  if (fixes.length === 0) return;
  lines.push(`  ${p.accent("▚ FIX THIS FIRST")}`);
  for (const { finding: f, scoreGain, autofixable } of fixes) {
    const gainText = `+${scoreGain} pt${scoreGain === 1 ? "" : "s"}`;
    const autofixTag = autofixable ? p.ok(" [autofix available]") : "";
    // QA-2026-08-30 QA-10: ruleId/file are data (plugin rule ids, hostile
    // filenames) — sanitize before raw interpolation outside the palette.
    const loc = `${sanitizeData(f.ruleId)} · ${sanitizeData(f.file)}:${f.line}`;
    lines.push(`  ${p.bold(gainText)}  ${loc}${autofixTag}`);
  }
  lines.push("");
}

interface FindingCard {
  severity: Finding["severity"];
  /** One-line location summary shown under the card title. */
  loc: string;
  /** Problem = the (tone-adjusted) message. */
  problem: string;
  /** Evidence tag: [E2 · deterministic] / [E1 · heuristic · measured FP 14% · n=38]. */
  evidence: string;
  /** Impact = qaImpact label + the rule's why. */
  impact: string;
  /** Fix = the concrete recommendation. */
  fix: string;
  /** Verify = deterministic re-run expectation. */
  verify: string;
}

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
  // Plan §16: surface the trust ladder + what runtime vouched for.
  if (f.trustLevel !== undefined) tag += ` · trust ${f.trustLevel}`;
  if (f.runtimeCorroboration !== undefined) {
    const c = f.runtimeCorroboration;
    let label = "file executed";
    if (c.level === "defect") label = "defect corroborated";
    else if (c.level === "test") label = "test executed";
    tag += ` · runtime: ${label}`;
  }
  return `[${tag}]`;
}

/** Deterministic per-severity verification hint: what re-running should
 * show after the fix lands. Deduction is the honest, evidence-discounted
 * number this finding costs right now. */
function verifyHint(f: Finding): string {
  const pts = deductionFor(f);
  if (f.severity === "error") {
    return pts > 0
      ? `Re-run mjolnir after the change — the gate should stop failing and the score should recover by ${pts}.`
      : "Re-run mjolnir after the change — the finding should no longer appear.";
  }
  if (f.severity === "warning") {
    return pts > 0
      ? `Re-run mjolnir after the change — deduction should drop by ${pts}.`
      : "Re-run mjolnir after the change — the finding should no longer appear.";
  }
  return "Re-run mjolnir after the change — the finding should no longer appear.";
}

function toCard(f: Finding, tone?: "blunt"): FindingCard {
  const problem = tone === "blunt" ? bluntMessage(f) : f.message;
  return {
    severity: f.severity,
    loc: `${sanitizeData(f.ruleId)} · ${sanitizeData(f.file)}:${f.line}`,
    problem: sanitizeData(problem),
    evidence: evidenceTag(f),
    impact: `${f.qaImpact} — ${sanitizeData(f.why)}`,
    fix: sanitizeData(f.fix),
    verify: verifyHint(f),
  };
}

/** Wrap plain text (no ANSI in body) into lines of at most `width`. */
function wrapLines(text: string, width: number): string[] {
  if (text.trim().length === 0) return ["—"];
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= width || current === "") current = candidate;
    else {
      out.push(current);
      current = word;
    }
  }
  // The trim guard above guarantees at least one word, so `current`
  // always holds the tail accumulator here.
  out.push(current);
  return out;
}

const CARD_LABEL_PAD = 8;
const CARD_GUTTER = "    ";

function pushCard(
  lines: string[],
  card: FindingCard,
  p: ReturnType<typeof palette>,
  width: number,
  ascii: boolean,
): void {
  const contentWidth = Math.max(
    20,
    width - 2 - CARD_GUTTER.length - CARD_LABEL_PAD,
  );
  // The evidence bracket is the longest thing on a card header and it is
  // one atomic unit — "[E2 · deterministic · measured FP 0% · n=20 · trust
  // L3 · runtime: file executed]" is 78 columns on its own. Keeping it
  // inline pushed the header past 128 columns and out of any default
  // terminal. It drops to its own indented line when it does not fit,
  // matching what the grouped "same fix applies" header already does.
  const header = `  ${severityTag(card.severity, p, ascii)} ${p.bold(card.loc)}`;
  if (measure(`${header}  ${card.evidence}`) <= width) {
    lines.push(`${header}  ${p.dim(card.evidence)}`);
  } else {
    lines.push(header);
    lines.push(`${CARD_GUTTER}${p.dim(card.evidence)}`);
  }
  const fields: Array<{ label: string; text: string; dim: boolean }> = [
    { label: "Problem", text: card.problem, dim: false },
    { label: "Impact", text: card.impact, dim: false },
    { label: "Fix", text: card.fix, dim: false },
    { label: "Verify", text: card.verify, dim: true },
  ];
  for (const field of fields) {
    const body = wrapLines(field.text, contentWidth);
    const label = field.dim
      ? p.dim(field.label.padEnd(CARD_LABEL_PAD))
      : p.accent(field.label.padEnd(CARD_LABEL_PAD));
    body.forEach((seg, i) => {
      lines.push(
        `${CARD_GUTTER}${i === 0 ? label : " ".repeat(CARD_LABEL_PAD)}${seg}`,
      );
    });
  }
  lines.push("");
}

/**
 * The findings experience — EVIDENCE layer. Cards carry
 * severity → Problem → Impact → Fix → Verify; the evidence tag sits
 * beside the title. >3 findings sharing a rule collapse under one
 * "same fix applies" header. Non-verbose shows MAX_CARDS cards plus an
 * overflow line; --verbose shows everything.
 */
function appendFindings(
  lines: string[],
  result: ScanResult,
  counts: { total: number },
  verbose: boolean,
  p: ReturnType<typeof palette>,
  ascii: boolean,
  width: number,
  tone?: "blunt",
): void {
  if (counts.total === 0) return;

  // Group by ruleId when >3 findings share a rule — one header, count,
  // "same fix applies", then one-liners. Groups keep first-appearance
  // order relative to their rule's first finding; grouped summaries
  // surface after the singles so scan order stays recognizable.
  const byRule = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const list = byRule.get(f.ruleId) ?? [];
    list.push(f);
    byRule.set(f.ruleId, list);
  }

  type RenderUnit =
    | { kind: "card"; finding: Finding }
    | { kind: "group"; ruleId: string; findings: [Finding, ...Finding[]] };

  const units: RenderUnit[] = [];
  const groupedRuleIds = new Set<string>();
  for (const [ruleId, list] of byRule) {
    if (list.length > GROUP_THRESHOLD) groupedRuleIds.add(ruleId);
  }
  const groupQueues = new Map<string, Finding[]>();
  for (const f of result.findings) {
    if (groupedRuleIds.has(f.ruleId)) {
      const q = groupQueues.get(f.ruleId) ?? [];
      q.push(f);
      groupQueues.set(f.ruleId, q);
      continue;
    }
    units.push({ kind: "card", finding: f });
  }
  for (const [ruleId, q] of groupQueues) {
    // Queue invariant: an entry only exists after at least one finding
    // was pushed into it, so the tuple head is always present.
    units.push({
      kind: "group",
      ruleId,
      findings: q as [Finding, ...Finding[]],
    });
  }

  const cardBudget = verbose ? Number.POSITIVE_INFINITY : MAX_CARDS;
  let shown = 0;
  let hidden = 0;
  const hiddenRules = new Set<string>();

  lines.push(`  ${p.accent("▚ FINDINGS")}`);
  lines.push("");
  for (const unit of units) {
    if (unit.kind === "group") {
      const n = unit.findings.length;
      const first = unit.findings[0];
      if (shown >= cardBudget) {
        hidden += n;
        hiddenRules.add(unit.ruleId);
        continue;
      }
      // Same overflow rule as a single card: the evidence bracket moves to
      // its own line rather than running the group header off the screen.
      const groupHead = `  ${severityTag(maxSeverity(unit.findings), p, ascii)} ${p.bold(sanitizeData(unit.ruleId))} ${p.dim(`× ${n} — same fix applies`)}`;
      const groupEvidence = evidenceTag(first);
      if (measure(`${groupHead} ${groupEvidence}`) <= width) {
        lines.push(`${groupHead} ${p.dim(groupEvidence)}`);
      } else {
        lines.push(groupHead);
        lines.push(`${CARD_GUTTER}${p.dim(groupEvidence)}`);
      }
      // The shared fix is prose and wraps like every other card field; it
      // was the one field pushed unwrapped, so a long fix ran ~140 columns.
      const groupContentWidth = Math.max(
        20,
        width - 2 - CARD_GUTTER.length - CARD_LABEL_PAD,
      );
      wrapLines(sanitizeData(first.fix), groupContentWidth).forEach(
        (seg, i) => {
          const label =
            i === 0
              ? p.accent("Fix".padEnd(CARD_LABEL_PAD))
              : " ".repeat(CARD_LABEL_PAD);
          lines.push(`${CARD_GUTTER}${label}${p.dim(seg)}`);
        },
      );
      // The per-occurrence one-liners wrap too — a long rule message plus
      // a deep path ran past 100 columns and was the last thing in the
      // report that ignored the width budget.
      for (const f of unit.findings) {
        wrapLines(
          `· ${sanitizeData(f.file)}:${f.line} — ${sanitizeData(f.message)}`,
          groupContentWidth,
        ).forEach((seg, i) => {
          lines.push(
            `${CARD_GUTTER}${" ".repeat(CARD_LABEL_PAD)}${p.dim(i === 0 ? seg : `  ${seg}`)}`,
          );
        });
      }
      lines.push("");
      shown++;
      continue;
    }
    if (shown >= cardBudget) {
      hidden++;
      hiddenRules.add(unit.finding.ruleId);
      continue;
    }
    pushCard(lines, toCard(unit.finding, tone), p, width, ascii);
    shown++;
  }

  if (hidden > 0) {
    lines.push(
      `  ${p.dim(`… +${hidden} more across ${hiddenRules.size} rule${hiddenRules.size === 1 ? "" : "s"}. Run with --verbose for all findings.`)}`,
    );
  }
  lines.push("");
}

function maxSeverity(findings: Finding[]): Finding["severity"] {
  if (findings.some((f) => f.severity === "error")) return "error";
  if (findings.some((f) => f.severity === "warning")) return "warning";
  return "info";
}

/**
 * FORGED — the 100-state premium block. Replaces the bare FLAWLESS
 * VICTORY line: wordmark + the trophy retained inside, all in the
 * forged gold-white pair. The halo hammer itself is the score
 * instrument above — one mark, calmly (brand usage rule); ASCII mode
 * keeps the `*** FLAWLESS VICTORY ***` contract string (test-locked in
 * empty-states/long-tail-arms).
 */
function appendForgedBlock(
  lines: string[],
  p: ReturnType<typeof palette>,
  ascii: boolean,
): void {
  lines.push("");
  if (ascii) {
    lines.push(p.forged("*** FLAWLESS VICTORY ***"));
  } else {
    lines.push(`  ${p.forged(FORGED_WORDMARK)}`);
  }
  lines.push(p.forged("  FORGED — zero findings. The suite is clean."));
  lines.push("");
  lines.push(p.forged(TROPHY));
  lines.push("");
}

/**
 * Pushes dimmed prose that respects the terminal width.
 *
 * The honesty footer used to be pushed as single unbroken strings — the
 * rule-coverage line alone is ~147 columns, so it overflowed every
 * default 80- or 100-column terminal and ignored `--width` entirely.
 * `wrapText` is the same helper the finding cards already use.
 */
function pushWrapped(
  lines: string[],
  p: ReturnType<typeof palette>,
  text: string,
  width: number,
): void {
  const indent = "  ";
  for (const line of wrapText(text, Math.max(20, width - indent.length))) {
    lines.push(p.dim(`${indent}${line}`));
  }
}

function appendFooter(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
  width: number,
): void {
  lines.push(p.dim(DIVIDER));
  const status =
    result.analysisStatus.discovery === "partial"
      ? p.warning("PARTIAL — verdict may be incomplete")
      : p.ok("complete");
  lines.push(`  Analysis: ${status} · ${result.analysisStatus.durationMs}ms`);
  // Honesty Core: advisory findings are visible but never cost points.
  const advisory = result.findings.filter(
    (f) =>
      (f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence)) ===
      "E0",
  ).length;
  if (advisory > 0) {
    pushWrapped(
      lines,
      p,
      `${advisory} advisory finding${advisory === 1 ? "" : "s"} (E0 — observation only, no score impact)`,
      width,
    );
  }

  // Honesty Core: how much of what fired here is backed by a measured
  // false-positive rate, vs. shipping on assumption. Only meaningful when
  // there are findings — a clean repo needs no caveat.
  if (result.findings.length > 0) {
    const firedRuleIds = new Set(result.findings.map((f) => f.ruleId));
    const measuredHere = [...firedRuleIds].filter(
      (id) => MEASURED_FP[id] !== undefined,
    ).length;
    pushWrapped(
      lines,
      p,
      `Rule coverage: ${measuredHere}/${firedRuleIds.size} rules that fired here have a measured` +
        ` false-positive rate; the rest are heuristics.` +
        ` \`mjolnir rules --unmeasured\` lists them.`,
      width,
    );
    // Plan §16: verified vs assumed — how many findings a real run
    // report corroborated. When no report was present, say so honestly
    // instead of implying the split is all-assumed by choice.
    const verified = result.findings.filter(
      (f) => f.runtimeCorroboration !== undefined,
    ).length;
    if (verified > 0) {
      pushWrapped(
        lines,
        p,
        `Runtime evidence: ${verified}/${result.findings.length} findings corroborated by a real run report (trust L3–L5); the rest are static-only.`,
        width,
      );
    } else {
      pushWrapped(
        lines,
        p,
        `Runtime evidence: not available — no run report (mjolnir.report.json / test-results) next to the scan target; all findings are static-only (L0–L2).`,
        width,
      );
    }
  }

  // Plan §17.2: Agentic Trust Profile — provenance metadata, surfaced
  // honestly (static markers only; never a trust verdict). Only when
  // something was actually detected — silence over noise.
  const profile = result.agenticProfile;
  if (
    profile &&
    (profile.generatedMarkedFiles > 0 || profile.codegenLikeFiles > 0)
  ) {
    const parts: string[] = [];
    if (profile.generatedMarkedFiles > 0) {
      parts.push(
        `${profile.generatedMarkedFiles} generated-marked file${profile.generatedMarkedFiles === 1 ? "" : "s"}`,
      );
    }
    if (profile.codegenLikeFiles > 0) {
      parts.push(
        `${profile.codegenLikeFiles} codegen-like file${profile.codegenLikeFiles === 1 ? "" : "s"}`,
      );
    }
    lines.push(
      p.dim(
        `  Agentic provenance: ${parts.join(", ")} of ${profile.testFiles} test files (static markers only — provenance is metadata, not trust).`,
      ),
    );
  }

  // Audit S-8: third-party plugin code executed during this scan must be
  // visible to anyone reading the report — plugin rules run with full
  // Node privileges by documented design.
  if (result.plugins && result.plugins.length > 0) {
    const summary = result.plugins
      .map((p2) => `${p2.name} (${p2.rules} rule${p2.rules === 1 ? "" : "s"})`)
      .join(", ");
    lines.push(
      p.warning(
        `  Plugins: ${summary} — third-party code executed with full privileges.`,
      ),
    );
  }
  lines.push("");
}

function renderNoTests(p: ReturnType<typeof palette>, ascii: boolean): string {
  const warnGlyph = ascii ? "!" : "⚠";
  // Audit H-6: say what was actually searched for, per adapter — the
  // tool ships five adapters, not three JavaScript frameworks.
  const searched = SEARCHED_FOR.map((e) => `${e.label}: ${e.globs.join("  ")}`);
  const lines = [
    "",
    p.warning(`  ${warnGlyph} NO TESTS DETECTED`),
    "",
    ...box(
      [
        "No test files found for any supported framework.",
        "Searched for:",
        ...searched,
        "",
        "A score cannot be calculated honestly.",
      ],
      1,
      { ascii, maxWidth: 78 },
    ).map((l) => `  ${l}`),
    "",
    "  If your tests live elsewhere: mjolnir <path-to-your-tests>",
    "",
  ];
  return lines.join("\n");
}

function countBySeverity(result: ScanResult) {
  const counts = { error: 0, warning: 0, info: 0, total: 0 };
  for (const f of result.findings) {
    counts[f.severity]++;
    counts.total++;
  }
  return counts;
}
