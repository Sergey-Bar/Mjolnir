/**
 * `mjolnir why <file>:<line>` — occurrence-level evidence/explanation
 * query (agent-handoff plan M2).
 *
 * Role: an INFORMATIONAL query, not a gate. It works regardless of
 * verdict or tier, shows evidence tags, measured FP rates, runtime
 * corroboration, why/fix, and suppression guidance. Matching is exact
 * file + exact line — the occurrence location as reported, not a
 * durable identity (the fingerprint contract, baseline.ts, governs
 * before/after correlation instead).
 *
 * Two modes:
 * - `--json <mjolnir.json>`: the saved report is AUTHORITATIVE — the
 *   query runs against exactly what the saved scan found (deterministic,
 *   offline).
 * - live (default): runs a fresh scan of the target.
 *
 * Exit codes: 0 match · 1 no finding at that location · 10 usage ·
 * 2 invalid saved report · 20 crash.
 */

import { existsSync } from "node:fs";
import {
  isValidCategory,
  RULE_CATEGORIES,
  type Finding,
  type RuleCategory,
  type ScanResult,
} from "../types.js";
import type { Output } from "../cli.js";
import { runScan } from "../cli.js";
import {
  sectionHeader,
  severityIcon,
  nextStep,
  plainContext,
  type UiContext,
} from "../reporter/ui.js";
import { escapeMarkdown } from "./pr-comment.js";
import { errorText, loadSavedReport, reportExists } from "./report-io.js";

export interface WhyMatch {
  findings: Finding[];
  /** The queried location, normalized. */
  file: string;
  line: number;
}

/** Exact file + exact line match over a finding list. Pure. */
export function explainAt(
  findings: readonly Finding[],
  file: string,
  line: number,
): WhyMatch {
  const normalized = file.replace(/\\/g, "/");
  return {
    findings: findings.filter((f) => f.file === normalized && f.line === line),
    file: normalized,
    line,
  };
}

/** Parse the `<file>:<line>` positional (split at the LAST colon). */
export function parseFileLine(
  token: string,
): { file: string; line: number } | null {
  const idx = token.lastIndexOf(":");
  if (idx === -1) return null;
  const file = token.slice(0, idx);
  const line = Number(token.slice(idx + 1));
  if (!file || !Number.isInteger(line) || line < 1) return null;
  return { file, line };
}

function evidenceLines(f: Finding, ui: UiContext): string[] {
  const lines: string[] = [];
  if (f.evidenceLevel !== undefined || f.trustLevel !== undefined) {
    const parts: string[] = [];
    if (f.evidenceLevel !== undefined) {
      parts.push(`evidence ${f.evidenceLevel}`);
    }
    if (f.trustLevel !== undefined) parts.push(`trust ${f.trustLevel}`);
    lines.push(`  Evidence: ${parts.join(" · ")}`);
  }
  if (f.measuredFpRate !== undefined) {
    const pct = Math.round(f.measuredFpRate * 100);
    const n =
      f.measuredFpN !== undefined
        ? ` over ${f.measuredFpN} classified verdicts`
        : "";
    lines.push(`  Measured FP rate: ${pct}%${n}`);
  } else {
    lines.push("  Measured FP rate: none — this rule ships on assumption.");
  }
  if (f.runtimeCorroboration !== undefined) {
    const c = f.runtimeCorroboration;
    const label =
      c.level === "defect"
        ? "defect corroborated by the run report"
        : c.level === "test"
          ? "the containing test executed in the run report"
          : "the containing file executed in the run report";
    lines.push(`  Runtime corroboration: ${label} (${c.source})`);
  }
  void ui;
  return lines;
}

const SUPPRESSION_HINT =
  "Suppression (only with cause): an `ignore` entry in mjolnir.config.json — reason REQUIRED, expires after 90 days. Prefer fixing the root cause.";

/** Render the why answer. Pure over (match, ui). */
export function renderWhy(
  match: WhyMatch,
  ui: UiContext = plainContext(),
): string {
  const { p } = ui;
  if (match.findings.length === 0) {
    const lines: string[] = [
      sectionHeader(`WHY — ${match.file}:${match.line}`, ui),
      "",
      `  No finding at ${match.file}:${match.line} in this report.`,
      "",
      p.dim("  Locations are exact (file + line as reported). If the code"),
      p.dim("  moved since the scan, re-run mjolnir to refresh locations."),
      "",
    ];
    return lines.join("\n");
  }
  const lines: string[] = [
    sectionHeader(`WHY — ${match.file}:${match.line}`, ui),
    "",
    `${match.findings.length} finding${match.findings.length === 1 ? "" : "s"} at this location:`,
    "",
  ];
  for (const f of match.findings) {
    lines.push(
      `  ${severityIcon(f.severity, ui)} ${p.bold(escapeMarkdown(f.ruleId))} — ${escapeMarkdown(f.message)}`,
    );
    lines.push(`  Why it matters: ${escapeMarkdown(f.why)}`);
    lines.push(`  Fix: ${escapeMarkdown(f.fix)}`);
    for (const line of evidenceLines(f, ui)) lines.push(line);
    lines.push(SUPPRESSION_HINT);
    lines.push("");
  }
  lines.push(
    nextStep("mjolnir explain <RULE-ID>", ui) + " — full rule context.",
  );
  return lines.join("\n");
}

/**
 * Testable why command core. Returns the process exit code.
 * Live mode awaits the real scan; saved-report mode is synchronous.
 */
export async function runWhyCommand(
  argv: string[],
  io: { out: Output; err: Output } = {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
): Promise<number> {
  // --category validation runs FIRST (Phase 1.2): a malformed category is
  // a parse-time usage error even when the location is also malformed —
  // parse-time errors are position-independent.
  const catIdxs: number[] = [];
  argv.forEach((a, i) => {
    if (a === "--category") catIdxs.push(i + 1);
  });
  const categories: RuleCategory[] = [];
  for (const i of catIdxs) {
    const value = argv[i];
    if (!isValidCategory(value)) {
      io.err(
        `mjolnir why: unknown --category: ${value === undefined ? "(missing value)" : value}`,
      );
      io.err(`  Valid categories: ${RULE_CATEGORIES.join(", ")}`);
      return 10;
    }
    categories.push(value);
  }

  const locationToken = argv.find((a) => !a.startsWith("-"));
  if (!locationToken) {
    io.err("Usage: mjolnir why <file>:<line> [--json <mjolnir.json>]");
    return 10;
  }
  const location = parseFileLine(locationToken);
  if (!location) {
    io.err(
      `mjolnir why: cannot parse location "${locationToken}" — expected <file>:<line>`,
    );
    return 10;
  }

  const jsonIdx = argv.indexOf("--json");
  const reportPath = jsonIdx !== -1 ? argv[jsonIdx + 1] : undefined;
  // Positions consumed by flag VALUES (never candidates for the target):
  // --json's value and every --category's value (Phase 1.2).
  const valuePositions = new Set<number>();
  if (jsonIdx !== -1) valuePositions.add(jsonIdx + 1);
  for (const i of catIdxs) valuePositions.add(i);
  const targetIdx = argv.findIndex(
    (a, i) => !a.startsWith("-") && i !== 0 && !valuePositions.has(i),
  );
  const target = targetIdx !== -1 ? (argv[targetIdx] as string) : ".";

  let result: ScanResult;
  if (reportPath !== undefined) {
    // Saved-report mode: the report is authoritative.
    if (!reportExists(reportPath)) {
      io.err(`mjolnir why: report file not found: ${reportPath}`);
      io.err("  Run the scan with --json first: mjolnir --json > mjolnir.json");
      return 10;
    }
    try {
      result = loadSavedReport(reportPath);
    } catch (err) {
      io.err(`mjolnir why: cannot read ${reportPath}: ${errorText(err)}`);
      return 2;
    }
  } else {
    // Live mode: a fresh scan of the target via the real scan pipeline.
    // A nonexistent/non-directory target is a usage error (audit H-4
    // posture), not a silent empty scan.
    if (!existsSync(target)) {
      io.err(`mjolnir why: scan target does not exist: ${target}`);
      return 10;
    }
    try {
      result = await runScan({
        target: target,
        json: false,
        verbose: false,
        maxDurationMs: Number.POSITIVE_INFINITY,
        scopeChanged: false,
        format: "terminal",
        strict: argv.includes("--strict"),
      });
    } catch (err) {
      io.err(`mjolnir why: scan failed: ${errorText(err)}`);
      return 20;
    }
  }

  const match = explainAt(result.findings, location.file, location.line);
  // --category is a presentation filter (plan §5.5): narrows the why
  // answer; the underlying report is untouched. Validation happened at
  // parse time above.
  const filtered =
    categories.length > 0
      ? match.findings.filter((f) => categories.includes(f.category))
      : match.findings;
  io.out(renderWhy({ ...match, findings: filtered }));
  return filtered.length > 0 ? 0 : 1;
}
