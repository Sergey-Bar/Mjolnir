/**
 * Terminal reporter (W1-06). Retro CRT/arcade redesign.
 * Respects NO_COLOR and non-TTY (R11): plain text, no ANSI codes.
 * Symbols accompany color for color-blind users.
 */

import type { ScanResult } from "../types.js";
import { DEDUCTIONS, deriveEvidenceLevel } from "../types.js";
import { computeDimensions, deductionFor } from "../scorer/scorer.js";
import {
  palette,
  shouldColorize,
  scoreGauge,
  severityTag,
  box,
  padTo,
} from "./theme.js";
import { LOGO, TROPHY, DIVIDER } from "./art.js";

/** Terminal display cap — the JSON/SARIF contract always carries ALL findings. */
const MAX_DISPLAYED = 50;

export function renderTerminal(
  result: ScanResult,
  opts: { isTTY: boolean; verbose?: boolean },
): string {
  const p = palette(shouldColorize(opts.isTTY));
  const lines: string[] = [];

  for (const l of LOGO.split("\n")) if (l.trim()) lines.push(p.accent(l));
  lines.push("");

  if (result.score === null) {
    return renderNoTests(p);
  }

  const counts = countBySeverity(result);

  appendScoreSection(lines, result, p);
  appendFrameworks(lines, result, p);
  appendDimensions(lines, result, p);
  appendDeductions(lines, result, counts, p);
  appendTopIssues(lines, result, counts, opts.verbose === true, p);
  if (counts.total === 0 && result.score === 100) {
    lines.push(
      p.ok(TROPHY),
      p.ok("  FLAWLESS VICTORY — zero findings. The suite is clean."),
      "",
    );
  }
  appendFooter(lines, result, p);
  return lines.join("\n");
}

function verdictFor(score: number): "HEALTHY" | "NEEDS WORK" | "CRITICAL" {
  if (score >= 80) return "HEALTHY";
  return score >= 50 ? "NEEDS WORK" : "CRITICAL";
}

function appendScoreSection(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
): void {
  if (result.score === null) return;
  const verdict = verdictFor(result.score);
  const verdictColored = colorizeVerdict(verdict, p);
  const scoreText = String(result.score).padStart(3);
  lines.push(
    `  ${p.bold("SCORE")} ${p.bold(scoreText)}${p.dim("/100")}  ${verdictColored}`,
  );
  lines.push(`  ${scoreGauge(result.score, p)}`, "");
}

function colorizeVerdict(
  verdict: string,
  p: ReturnType<typeof palette>,
): string {
  if (verdict === "HEALTHY") return p.ok(verdict);
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
      `  ${p.dim("FRAMEWORK")} unknown — scanning all test-looking files`,
    );
  }
  lines.push("");
}

function appendDimensions(
  lines: string[],
  result: ScanResult,
  p: ReturnType<typeof palette>,
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
    lines.push(`  ${label}  ${scoreGauge(d.score, p, 16)} ${scoreText}`);
  }
  lines.push("");
}

function appendDeductions(
  lines: string[],
  result: ScanResult,
  counts: { error: number; warning: number; info: number; total: number },
  p: ReturnType<typeof palette>,
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
  for (const row of box(rows)) lines.push(`  ${row}`);
  lines.push("");
}

function appendTopIssues(
  lines: string[],
  result: ScanResult,
  counts: { total: number },
  verbose: boolean,
  p: ReturnType<typeof palette>,
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
    lines.push(
      `  ${severityTag(f.severity, p)} ${p.bold(f.message)} ${p.dim(`[${level}]`)}`,
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
  lines.push("");
}

function renderNoTests(p: ReturnType<typeof palette>): string {
  const lines = [
    "",
    p.warning("  ⚠ NO TESTS DETECTED"),
    "",
    ...box([
      "No Jest/Vitest/Playwright test files were found.",
      "A score cannot be calculated honestly.",
    ]).map((l) => `  ${l}`),
    "",
    "  If your tests live elsewhere: qa-doctor --tests-dir <path>",
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
