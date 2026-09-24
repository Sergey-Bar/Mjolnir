/**
 * Terminal reporter (W1-06). Retro CRT/arcade redesign.
 * Respects NO_COLOR and non-TTY (R11): plain text, no ANSI codes.
 * Symbols accompany color for color-blind users.
 *
 * Information architecture: SUMMARY (score + verdict) → SIGNAL
 * (dimensions + deductions) → EVIDENCE (finding cards) → DETAILS
 * (verbose + honesty footer) → ACTION (fix-first + verify hints).
 */

import type { Finding, ScanResult } from "../types.js";
import { DEDUCTIONS, deriveEvidenceLevel } from "../types.js";
import {
  computeDimensions,
  deductionFor,
  massCeiling,
  SUITE_INVALIDATED_CEILING,
} from "../scorer/scorer.js";
import { topFixes } from "../scorer/prioritize.js";
import {
  palette,
  shouldColorize,
  shouldUseAscii,
  scoreGauge,
  box,
  measure,
  padTo,
  sanitizeData,
  wrapText,
} from "./theme.js";
import {
  buildFooter,
  sectionHeader,
  severityIcon,
  nextStep,
  panel,
  type UiContext,
} from "./ui.js";
import { deriveScoreState, headlineFor } from "./score-state.js";
import { LOGO, LOGO_ASCII, TROPHY, FORGED_WORDMARK } from "./art.js";
import { bluntMessage } from "./tone-blunt.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { SEARCHED_FOR } from "../discovery/scan-adapters.js";

/** Non-verbose finding cards shown before the overflow line. The
 * JSON/SARIF contract always carries ALL findings — this cap is a
 * terminal display concern only. */
const MAX_CARDS = 5;

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
  /**
   * Pre-filtered finding list for `--category` (agent-handoff plan
   * §5.5): the renderer displays ONLY these, and prints the dim
   * `filtered view` note whenever the full list is larger. The score,
   * dimensions and gauge in the same render ALWAYS reflect the full
   * scan — --category is a presentation filter, never a scoring filter.
   */
  visibleFindings?: ScanResult["findings"];
}

/** Renders a scan as a compact terminal report, prioritizing actionable fixes before diagnostics. */
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
  const ui: UiContext = { p, ascii, width };
  const lines: string[] = [];

  const logo = ascii ? LOGO_ASCII : LOGO;
  for (const l of logo.split("\n")) if (l.trim()) lines.push(p.accent(l));
  lines.push("");

  if (result.score === null) {
    return renderNoTests(ui);
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
  appendFrameworks(lines, result, ui);
  if (result.staged !== undefined) {
    lines.push(
      ui.p.dim(
        `  staged surface: ${result.staged.files} file(s) scanned; score reflects that surface`,
      ),
    );
    lines.push("");
  }
  // --category (agent-handoff plan §5.5): presentation filter. The
  // filtered list drives FIX THIS FIRST + FINDINGS; score/dimensions/
  // deductions above always reflect the full scan. The dim note keeps
  // the full-scan vs filtered-view distinction unambiguous.
  const filtered = opts.visibleFindings;
  const filtering =
    filtered !== undefined && filtered.length < result.findings.length;
  const display: ScanResult = filtering
    ? { ...result, findings: filtered }
    : result;
  appendFixThisFirst(lines, display, ui);
  appendDimensions(lines, result, ui);
  appendDeductions(lines, result, counts, ui);
  if (filtering) {
    lines.push(
      ui.p.dim(
        `  filtered view: ${filtered?.length} of ${result.findings.length} findings shown; score reflects the full scan`,
      ),
    );
    lines.push("");
  }
  appendFindings(lines, display, counts, opts.verbose === true, ui, opts.tone);
  if (counts.total === 0 && result.score === 100 && !result.partial) {
    appendForgedBlock(lines, ui);
  } else if (counts.total === 0 && result.score === 100 && result.partial) {
    appendPartialCleanGuidance(lines, ui);
  }
  appendNextActions(lines, display, result, ui);
  appendFooter(lines, result, ui);
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

/** Appends the score, gauge, verdict, and honesty metadata for the full scan. */
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

  // The score is the first thing the eye lands on. The verdict word
  // carries the band without colour (R11); no picture repeats it.
  lines.push("");
  lines.push(
    `  ${p.bold("WORTHINESS")} ${p.bold(scoreText)}${p.dim("/100")}  ${verdictColored}`,
  );
  // Gauge width tracks the terminal so it never wraps awkwardly on a
  // narrow window; floors at 10 blocks so the gauge stays legible.
  const gaugeWidth = Math.max(10, Math.min(30, width - 4));
  lines.push(`  ${scoreGauge(result.score, p, gaugeWidth, ascii)}`);
  // Partial scans must never read as clean (MVP-009): override the
  // forged/trusted headline when analysis was incomplete.
  const headline = result.partial
    ? "Partial scan — findings reflect analyzed surface only."
    : headlineFor(state, result.findings.length);
  lines.push(`  ${p.dim(headline)}`);
  // Phase 5 transparency: show raw deductions and the actual denominator so
  // the normalization is never opaque.
  if (result.rawDeductions !== undefined && result.testDeclarationCount) {
    lines.push(
      `  ${p.dim(`(${result.rawDeductions} raw pts / ${result.testDeclarationCount} test declarations — normalized)`)}`,
    );
  }
  // P2.3: when the deduction-mass ceiling binds (the score was capped by
  // absolute mass, not density), say so — a reader comparing a padded
  // suite's tiny rate with its low score must be able to see why.
  if (result.effectiveDeductions !== undefined && result.score !== null) {
    const ceiling = massCeiling(result.effectiveDeductions);
    if (
      ceiling !== null &&
      result.score <= ceiling &&
      result.rawDeductions !== undefined
    ) {
      lines.push(
        `  ${p.dim(`(capped: deduction mass ${result.effectiveDeductions} pts — absolute ceiling ${ceiling})`)}`,
      );
    }
  }
  if (result.suppressionCount && result.suppressionCount > 0) {
    lines.push(
      `  ${p.dim(`(${result.suppressionCount} finding(s) suppressed by config)`)}`,
    );
  }
  if (result.suiteInvalidatedBy && result.suiteInvalidatedBy.length > 0) {
    const rules = result.suiteInvalidatedBy.join(", ");
    lines.push(
      `  ${p.dim(`(score capped at ${SUITE_INVALIDATED_CEILING}: suite invalidated by ${rules} — the suite did not fully execute)`)}`,
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
  ui: UiContext,
): void {
  const { p } = ui;
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
  ui: UiContext,
): void {
  const dims =
    result.dimensions.length > 0
      ? result.dimensions
      : computeDimensions(result.findings);
  if (dims.length === 0) return;
  lines.push(sectionHeader("DIAGNOSTICS BY CATEGORY", ui));
  const width = Math.max(...dims.map((d) => d.category.length));
  for (const d of dims) {
    const label = padTo(d.category, width);
    const scoreText = String(d.score).padStart(3);
    lines.push(
      `  ${label}  ${scoreGauge(d.score, ui.p, 16, ui.ascii)} ${scoreText}`,
    );
  }
  lines.push("");
}

function appendDeductions(
  lines: string[],
  result: ScanResult,
  counts: { error: number; warning: number; info: number; total: number },
  ui: UiContext,
): void {
  const { p } = ui;
  if (counts.total === 0) return;
  lines.push(sectionHeader("WHERE POINTS WERE LOST", ui));
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
  for (const row of panel(rows, ui)) lines.push(row);
  lines.push("");
}

/** Prepends up to three highest-gain fixes with rationale and a concrete next command. */
function appendFixThisFirst(
  lines: string[],
  result: ScanResult,
  ui: UiContext,
): void {
  const fixes = topFixes(result.findings, 3);
  if (fixes.length === 0 && result.findings.length === 0) return;

  lines.push(sectionHeader("FIX THIS FIRST", ui));
  pushWrapped(lines, ui.p, fixFirstWhy(result), ui.width);

  if (fixes.length === 0) {
    pushWrapped(
      lines,
      ui.p,
      "Next action: review the advisory findings, then re-run with full detail if you need the evidence trail.",
      ui.width,
    );
    lines.push(nextStep("mjolnir --verbose", ui));
    lines.push("");
    return;
  }

  pushWrapped(
    lines,
    ui.p,
    "Next action: fix the highest score-gain item below, then re-run the changed scope.",
    ui.width,
  );
  lines.push(nextStep("mjolnir --scope changed", ui));
  for (const { finding: f, scoreGain, autofixable } of fixes) {
    const gainText = `+${scoreGain} pt${scoreGain === 1 ? "" : "s"}`;
    const autofixTag = autofixable ? ui.p.ok(" [autofix available]") : "";
    // QA-2026-08-30 QA-10: ruleId/file are data (plugin rule ids, hostile
    // filenames) — sanitize before raw interpolation outside the palette.
    const loc = `${sanitizeData(f.ruleId)} · ${sanitizeData(f.file)}:${f.line}`;
    lines.push(`  ${ui.p.bold(gainText)}  ${loc}${autofixTag}`);
  }
  lines.push("");
}

/** Returns the default-report rationale based on scan completeness and finding severity. */
function fixFirstWhy(result: ScanResult): string {
  const counts = countBySeverity(result);
  if (
    result.partial ||
    result.analysisStatus.discovery === "partial" ||
    result.analysisStatus.rules === "partial"
  ) {
    return "Why it matters: this scan is partial, so fix the visible risks but do not treat missing findings as proof of a clean suite.";
  }
  if (counts.error > 0) {
    return `Why it matters: ${counts.error} error finding${counts.error === 1 ? "" : "s"} can let a false-green or release-blocking test issue survive review.`;
  }
  if (counts.warning > 0) {
    return `Why it matters: ${counts.warning} warning finding${counts.warning === 1 ? "" : "s"} can turn into flaky triage or weak release confidence.`;
  }
  return "Why it matters: these advisory findings do not gate CI, but they still mark places where the test signal is weaker than it looks.";
}

function appendNextActions(
  lines: string[],
  display: ScanResult,
  fullResult: ScanResult,
  ui: UiContext,
): void {
  const partial =
    fullResult.partial ||
    fullResult.analysisStatus.discovery === "partial" ||
    fullResult.analysisStatus.rules === "partial";
  const findings = display.findings;
  if (findings.length === 0 && fullResult.score !== 100 && !partial) return;

  lines.push(sectionHeader("NEXT ACTIONS", ui));
  if (partial) {
    pushWrapped(
      lines,
      ui.p,
      "Partial scan: do not trust this as a release gate yet. Fix scan coverage or rerun with a larger budget before treating the result as clean.",
      ui.width,
    );
  }

  if (findings.length > 0) {
    const first = findings[0];
    if (first === undefined) return;
    const loc = `${sanitizeData(first.file)}:${first.line}`;
    lines.push(nextStep(`mjolnir explain ${sanitizeData(first.ruleId)}`, ui));
    lines.push(nextStep(`mjolnir why ${loc}`, ui));
    pushWrapped(
      lines,
      ui.p,
      "Existing debt path: capture the current state once, then review only new or worse findings on future changes.",
      ui.width,
    );
    lines.push(nextStep("mjolnir baseline", ui));
    lines.push(nextStep("mjolnir diff", ui));
  } else if (fullResult.score === 100) {
    pushWrapped(
      lines,
      ui.p,
      "Clean path: install the advisory PR workflow so new trust debt is caught before it reaches main.",
      ui.width,
    );
    lines.push(nextStep("mjolnir ci install", ui));
  } else if (partial) {
    lines.push(nextStep("mjolnir --verbose", ui));
  }
  lines.push("");
}

interface FindingCard {
  severity: Finding["severity"];
  /** One-line location summary shown under the card title. */
  loc: string;
  /** The finding itself = the (tone-adjusted) message. */
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
  ui: UiContext,
  verbose = true,
): void {
  const { p, width } = ui;
  const contentWidth = Math.max(
    20,
    width - 2 - CARD_GUTTER.length - CARD_LABEL_PAD,
  );
  const header = `  ${severityIcon(card.severity, ui)} ${p.bold(card.loc)}`;
  lines.push(header);
  lines.push(`${CARD_GUTTER}${p.dim(card.evidence)}`);
  const fields: Array<{ label: string; text: string; dim: boolean }> = [
    { label: "Finding", text: card.problem, dim: false },
    ...(verbose ? [{ label: "Impact", text: card.impact, dim: false }] : []),
    { label: "Fix", text: card.fix, dim: false },
    ...(verbose ? [{ label: "Verify", text: card.verify, dim: true }] : []),
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
 * severity → Finding → Impact → Fix → Verify; the evidence tag sits
 * beside the title. >3 findings sharing a rule collapse under one
 * "same fix applies" header. Non-verbose shows MAX_CARDS cards plus an
 * overflow line; --verbose shows everything.
 */
function appendFindings(
  lines: string[],
  result: ScanResult,
  counts: { total: number },
  verbose: boolean,
  ui: UiContext,
  tone?: "blunt",
): void {
  const { p, width } = ui;
  if (counts.total === 0) return;

  // --category presentation filter: when nothing survives the filter,
  // say so honestly instead of silently rendering an empty FINDINGS
  // section (plan §5.5).
  if (result.findings.length === 0) {
    lines.push(
      ui.p.dim("  filtered view: no findings in the selected category"),
    );
    lines.push("");
    return;
  }

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

  lines.push(sectionHeader("FINDINGS", ui));
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
      const groupHead = `  ${severityIcon(maxSeverity(unit.findings), ui)} ${p.bold(sanitizeData(unit.ruleId))} ${p.dim(`× ${n} — same fix applies`)}`;
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
    pushCard(lines, toCard(unit.finding, tone), ui, verbose);
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
 * labels the result as static rather than claiming a clean suite.
 */
function appendForgedBlock(lines: string[], ui: UiContext): void {
  const { p, ascii } = ui;
  lines.push("");
  if (ascii) {
    lines.push(p.forged("*** ZERO FINDINGS (STATIC) ***"));
  } else {
    lines.push(`  ${p.forged(FORGED_WORDMARK)}`);
  }
  lines.push(
    p.forged(
      "  FORGED — zero findings on the analyzed surface; runtime evidence is still required for higher trust.",
    ),
  );
  lines.push("");
  lines.push(p.forged(TROPHY));
  lines.push("");
  pushWrapped(
    lines,
    p,
    "Next: re-scan changed tests and keep the advisory CI workflow installed so new regressions are surfaced.",
    ui.width,
  );
  lines.push(nextStep("mjolnir --scope changed", ui));
  lines.push("");
}

/**
 * Guidance for partial scans with zero findings and score 100.
 * A partial scan cannot claim a clean suite — the absence of findings
 * may be due to incomplete analysis, not actual cleanliness.
 */
function appendPartialCleanGuidance(lines: string[], ui: UiContext): void {
  const { p } = ui;
  lines.push("");
  lines.push(
    p.warning("  ⚠ PARTIAL SCAN — no findings, but analysis was incomplete"),
  );
  lines.push("");
  pushWrapped(
    lines,
    p,
    "This scan did not analyze the full test surface. Zero findings here does not mean the suite is clean — it means the scan was cut short.",
    ui.width,
  );
  lines.push("");
  pushWrapped(
    lines,
    p,
    "Next action: fix the cause of the partial scan (timeouts, exclusions, parse failures), then re-run a complete scan before trusting the gate.",
    ui.width,
  );
  lines.push(nextStep("mjolnir --scope changed", ui));
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
  ui: UiContext,
): void {
  const { p, width } = ui;
  lines.push(
    ...buildFooter({
      ui,
      complete: result.analysisStatus.discovery !== "partial",
      durationMs: result.analysisStatus.durationMs,
    }),
  );
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
    // R4c Scope Integrity: "repository verified" is FORBIDDEN output
    // unless scopeVerdict is PROVEN (plan §7). On PARTIAL, the scope
    // block states the shortfall instead — the phrasing never claims
    // more than the run analyzed. (A producer predating the block gets
    // the honest PARTIAL rendering with the absent-block marker.)
    const scope = result.scopeIntegrity;
    if (scope?.scopeVerdict === "PROVEN") {
      pushWrapped(
        lines,
        p,
        `Scope: PROVEN — analyzed == claimed scope (${scope.analyzed}/${scope.discovered} discovered files; no exclusions, no parse failures).`,
        width,
      );
    } else {
      const reasons =
        scope?.reasons?.join(", ") ??
        (scope === undefined
          ? "scope-integrity block absent (producer predates R4c)"
          : "unspecified");
      pushWrapped(
        lines,
        p,
        `Scope: PARTIAL — ${reasons}; analyzed ${scope?.analyzed ?? 0} of ${scope?.discovered ?? 0} discovered files. No repository-verified claim applies to this scan.`,
        width,
      );
    }
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

function renderNoTests(ui: UiContext): string {
  const { p, ascii } = ui;
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
    nextStep("mjolnir <path-to-your-tests>", ui),
    "",
  ];
  return lines.join("\n");
}

function countBySeverity(result: ScanResult): {
  error: number;
  warning: number;
  info: number;
  total: number;
} {
  const counts = { error: 0, warning: 0, info: 0, total: 0 };
  for (const f of result.findings) {
    counts[f.severity]++;
    counts.total++;
  }
  return counts;
}
