/**
 * `mjolnir summary [report.json]` — CI annotations + step summary
 * (Terminal + CI UX Overhaul plan, M4).
 *
 * Additive command; default report path `mjolnir.json`. Reads a saved
 * ScanResult JSON (the `--json` scan output) and emits:
 *  1. GitHub annotations to stdout, only when GITHUB_ACTIONS=true —
 *     one per finding, via the single github.ts emitter.
 *  2. A step-summary markdown document to $GITHUB_STEP_SUMMARY when
 *     set (else stdout; --stdout forces stdout): score + band, text
 *     score bar, dimensions table, top deductions, collapsible
 *     per-severity details with fix lines, and an honesty notice for
 *     partial/no-score reports.
 *
 * Exit codes (frozen contract): 0 on success — this command NEVER
 * blocks; the gate step decides. 10 missing file argument. 2
 * unreadable/invalid JSON (a data problem; the message explains).
 *
 * Paths: findings are scan-target-relative. The generated workflow
 * scans the repo root, so the default output is directly usable;
 * `--path-prefix <dir>` re-scopes for subdirectory scans.
 */

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import type { Finding, ScanResult } from "../types.js";
import type { Output } from "../cli.js";
import { deriveScoreState, headlineFor } from "../reporter/score-state.js";
import { verdictFor } from "../reporter/terminal.js";
import {
  renderAnnotations,
  truncateMessage,
  stripAnsiForSummary,
} from "../reporter/github.js";

export interface SummaryOptions {
  /** Force the summary to stdout even when $GITHUB_STEP_SUMMARY is set. */
  stdout?: boolean;
  /** Prefix applied to every finding path (subdirectory scans). */
  pathPrefix?: string;
  /** Name of the repo root the paths are relative to (titles). */
  env?: NodeJS.ProcessEnv;
}

const DETAILS_PER_SEVERITY_CAP = 25;

export function validateReportJson(text: string): ScanResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(
      `not valid JSON (${err instanceof Error ? err.message : String(err)})`,
      { cause: err },
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("the file is a JSON value but not an object");
  }
  const doc = parsed as { schemaVersion?: unknown; findings?: unknown };
  if (doc.schemaVersion !== 1) {
    throw new Error(
      `unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)} — expected 1`,
    );
  }
  if (!Array.isArray(doc.findings)) {
    throw new Error(
      'missing a "findings" array — is this a Mjölnir --json report?',
    );
  }
  return parsed as ScanResult;
}

function scoreBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, width - filled))}`;
}

/** Markdown step summary. Pure over (result, options) — testable. */
export function renderStepSummary(
  result: ScanResult,
  options: SummaryOptions = {},
): string {
  const lines: string[] = [];
  lines.push("### 🔨 Mjölnir — Verification Trust");
  lines.push("");

  if (result.score === null) {
    lines.push(
      "Score: **not measurable** — no test files found (`reason: no-tests-found`).",
    );
    lines.push("");
    lines.push("> No fake numbers: a repo without tests has no score to show.");
  } else {
    const state = deriveScoreState(result.score);
    const verdict = verdictFor(result.score);
    lines.push(
      `Score: **${result.score}/100** · ${verdict} (${state.band}) · ${headlineFor(state, result.findings.length)}`,
    );
    lines.push("");
    lines.push("```text");
    lines.push(`${scoreBar(result.score)}  ${result.score}/100`);
    lines.push("```");
  }
  lines.push("");

  if (result.frameworks.length > 0) {
    lines.push(
      `Detected: ${result.frameworks.map((f) => `\`${f}\``).join(" · ")}`,
    );
    lines.push("");
  }

  if (result.dimensions.length > 0) {
    lines.push("| Category | Score |");
    lines.push("|----------|-------|");
    for (const d of result.dimensions) {
      lines.push(`| ${d.category} | ${d.score}/100 |`);
    }
    lines.push("");
  }

  if (result.rawDeductions !== undefined && result.testDeclarationCount) {
    lines.push(
      `Transparency: ${result.rawDeductions} raw pts over ${result.testDeclarationCount} test declarations (normalized).`,
    );
    lines.push("");
  }

  const bySeverity: Record<"error" | "warning" | "info", Finding[]> = {
    error: [],
    warning: [],
    info: [],
  };
  for (const f of result.findings) bySeverity[f.severity].push(f);

  const icons = { error: "🔴", warning: "🟡", info: "🔵" } as const;
  for (const sev of ["error", "warning", "info"] as const) {
    const list = bySeverity[sev];
    if (list.length === 0) continue;
    const open = sev === "error" ? " open" : "";
    lines.push(
      `<details${open}>`,
      `<summary>${icons[sev]} ${list.length} ${sev}${list.length === 1 ? "" : "s"}</summary>`,
      "",
    );
    for (const f of list.slice(0, DETAILS_PER_SEVERITY_CAP)) {
      const path = options.pathPrefix
        ? `${options.pathPrefix.replace(/\/$/, "")}/${f.file}`
        : f.file;
      lines.push(
        `- **${f.ruleId}** \`${path}:${f.line}\` — ${stripAnsiForSummary(f.message)}`,
      );
      lines.push(`  - Fix: ${stripAnsiForSummary(f.fix)}`);
    }
    if (list.length > DETAILS_PER_SEVERITY_CAP) {
      lines.push(
        `- … and ${list.length - DETAILS_PER_SEVERITY_CAP} more — see the full JSON artifact.`,
      );
    }
    lines.push("", "</details>", "");
  }

  if (result.findings.length === 0 && result.score !== null) {
    lines.push("Zero findings — nothing to fix.");
    lines.push("");
  }

  if (result.partial) {
    lines.push(
      "> ⚠ Partial scan: the budget expired or files were skipped — verdict may be incomplete.",
    );
    lines.push("");
  }

  lines.push(
    "<!-- mjolnir-honesty: scores derive from rules with published evidence levels and measured false-positive rates where available. -->",
  );
  return lines.join("\n");
}

/** Render one finding as an escaped annotation line. */
export function annotationForFinding(f: Finding): string {
  return renderAnnotations([
    { ...f, message: truncateMessage(stripAnsiForSummary(f.message)) },
  ])[0] as string;
}

/**
 * Testable summary command core. Returns the process exit code.
 * Streams: annotations → stdout (always; GitHub greps them), summary →
 * step-summary file when set unless --stdout.
 */
export function runSummaryCommand(
  argv: string[],
  io: { out: Output; err: Output } = {
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  },
): number {
  const stdout = argv.includes("--stdout");
  const prefixIdx = argv.indexOf("--path-prefix");
  const pathPrefix = prefixIdx !== -1 ? argv[prefixIdx + 1] : undefined;
  const positional = argv.filter(
    (a, i) => !a.startsWith("-") && (prefixIdx === -1 || i !== prefixIdx + 1),
  );
  const reportPath = positional[0] ?? "mjolnir.json";

  if (!existsSync(reportPath)) {
    io.err(`mjolnir summary: report file not found: ${reportPath}`);
    io.err("  Run the scan with --json first: mjolnir --json > mjolnir.json");
    return 10;
  }

  let result: ScanResult;
  try {
    result = validateReportJson(readFileSync(reportPath, "utf8"));
  } catch (err) {
    io.err(
      `mjolnir summary: cannot read ${reportPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return 2;
  }

  const env = process.env;
  // Annotations only inside GitHub Actions (one emitter, one code path).
  if (env["GITHUB_ACTIONS"] === "true") {
    for (const f of result.findings) {
      const file = pathPrefix
        ? `${pathPrefix.replace(/\/$/, "")}/${f.file}`
        : f.file;
      io.out(annotationForFinding({ ...f, file }));
    }
  }

  const summary = renderStepSummary(result, {
    stdout,
    ...(pathPrefix !== undefined ? { pathPrefix } : {}),
  });
  const stepSummaryPath = stdout ? undefined : env["GITHUB_STEP_SUMMARY"];
  if (stepSummaryPath) {
    try {
      appendFileSync(stepSummaryPath, `${summary}\n`);
    } catch (err) {
      io.err(
        `mjolnir summary: could not write $GITHUB_STEP_SUMMARY (${err instanceof Error ? err.message : String(err)}); printing to stdout instead.`,
      );
      io.out(summary);
    }
  } else {
    io.out(summary);
  }

  // Never blocks — the gate step decides. (0 on success; 10/2 above.)
  return 0;
}
