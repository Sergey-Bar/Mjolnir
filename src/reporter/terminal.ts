/**
 * Terminal reporter (W1-06). Retro CRT/arcade redesign.
 * Respects NO_COLOR and non-TTY (R11): plain text, no ANSI codes.
 * Symbols accompany color for color-blind users.
 */

import type { ScanResult } from "../types.js";
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
  padTo,
} from "./theme.js";
import { LOGO, LOGO_ASCII, TROPHY, DIVIDER } from "./art.js";
import { bluntMessage } from "./tone-blunt.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";

/** Terminal display cap — the JSON/SARIF contract always carries ALL findings. */
const MAX_DISPLAYED = 50;

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

  appendScoreSection(lines, result, p, width, ascii);
  appendFrameworks(lines, result, p);
  appendDimensions(lines, result, p, ascii);
  appendDeductions(lines, result, counts, p, width, ascii);
  appendFixThisFirst(lines, result, p);
  appendTopIssues(
    lines,
    result,
    counts,
    opts.verbose === true,
    p,
    ascii,
    opts.tone,
  );
  if (counts.total === 0 && result.score === 100) {
    lines.push(
      p.ok(ascii ? "*** FLAWLESS VICTORY ***" : TROPHY),
      p.ok("  FLAWLESS VICTORY — zero findings. The suite is clean."),
      "",
    );
  }
  appendFooter(lines, result, p);
  return lines.join("\n");
}

function verdictFor(score: number): "WORTHY" | "NEEDS WORK" | "UNWORTHY" {
  if (score >= 80) return "WORTHY";
  return score >= 50 ? "NEEDS WORK" : "UNWORTHY";
}

function appendScoreSection(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
  width: number,
  ascii: boolean,
): void {
  if (result.score === null) return;
  const verdict = verdictFor(result.score);
  const verdictColored = colorizeVerdict(verdict, p);
  const scoreText = String(result.score).padStart(3);
  lines.push(
    `  ${p.bold("WORTHINESS")} ${p.bold(scoreText)}${p.dim("/100")}  ${verdictColored}`,
  );
  // Gauge width tracks the terminal so it never wraps awkwardly on a
  // narrow window; floors at 10 blocks so the gauge stays legible.
  const gaugeWidth = Math.max(10, Math.min(30, width - 4));
  lines.push(`  ${scoreGauge(result.score, p, gaugeWidth, ascii)}`);
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
  p: ReturnType<typeof palette>,
): string {
  if (verdict === "WORTHY") return p.ok(verdict);
  return verdict === "NEEDS WORK" ? p.warning(verdict) : p.error(verdict);
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
    if (
      f.severity === "error" ||
      f.severity === "warning" ||
      f.severity === "info"
    ) {
      bySeverity[f.severity].n++;
      bySeverity[f.severity].ded += deductionFor(f);
    }
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
    lines.push(
      `  ${p.bold(gainText)}  ${f.ruleId} · ${f.file}:${f.line}${autofixTag}`,
    );
  }
  lines.push("");
}

function appendTopIssues(
  lines: string[],
  result: ScanResult,
  counts: { total: number },
  verbose: boolean,
  p: ReturnType<typeof palette>,
  ascii: boolean,
  tone?: "blunt",
): void {
  const top = verbose
    ? result.findings
    : result.findings.slice(0, MAX_DISPLAYED);
  if (top.length === 0) return;
  lines.push(`  ${p.accent("▚ TOP ISSUES")}`);
  lines.push("");
  for (const f of top) {
    const loc = `${f.ruleId} · ${f.file}:${f.line}`;
    // Honesty Core: every finding shows how strong its evidence is.
    const level =
      f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
    const msg = tone === "blunt" ? bluntMessage(f) : f.message;
    lines.push(
      `  ${severityTag(f.severity, p, ascii)} ${p.bold(msg)} ${p.dim(`[${level}]`)}`,
    );
    lines.push(`         ${p.dim(loc)}`);
  }
  const rest = counts.total - top.length;
  if (rest > 0) {
    const more = `… +${rest} more. Run with --verbose for all findings.`;
    lines.push(`  ${p.dim(more)}`);
  }
  lines.push("");
}

function appendFooter(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
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
    lines.push(
      p.dim(
        `  ${advisory} advisory finding${advisory === 1 ? "" : "s"} (E0 — observation only, no score impact)`,
      ),
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
    lines.push(
      p.dim(
        `  Rule coverage: ${measuredHere}/${firedRuleIds.size} rules that fired here have a measured` +
          ` false-positive rate; the rest are heuristics.` +
          ` \`mjolnir rules --unmeasured\` lists them.`,
      ),
    );
  }
  lines.push("");
}

function renderNoTests(p: ReturnType<typeof palette>, ascii: boolean): string {
  const warnGlyph = ascii ? "!" : "⚠";
  const lines = [
    "",
    p.warning(`  ${warnGlyph} NO TESTS DETECTED`),
    "",
    ...box(
      [
        "No Jest/Vitest/Playwright test files were found.",
        "A score cannot be calculated honestly.",
      ],
      1,
      { ascii },
    ).map((l) => `  ${l}`),
    "",
    "  If your tests live elsewhere: mjolnir --tests-dir <path>",
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
