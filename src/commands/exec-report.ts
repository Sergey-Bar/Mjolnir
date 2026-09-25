/**
 * `mjolnir exec-report` — a short, measured summary of one scan.
 *
 * What changed, and why: this command used to render an executive "Risk Level:
 * LOW", KPI deltas ("↑ healthy") with no previous run to compare against,
 * and assurances ("Score 85/100 is excellent — maintain current quality gate")
 * that no measurement supports. It also ignored the `partial` flag entirely,
 * so a truncated scan could print "No findings — clean scan." and exit 0.
 *
 * It now reports only what the scan measured, names the surface each number
 * came from, and defers the verdict to the one determination function
 * (`decideClaim`) so a partial scan can never read as clean. Whether a
 * business is "low risk" is a decision this tool does not make for anyone.
 */

import { existsSync } from "node:fs";

import { runScan } from "../engine/scan-pipeline.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { decideClaim } from "../claim-evidence.js";
import { EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";

const ui = plainContext();

export interface ExecutiveKpi {
  label: string;
  value: string;
  /** Where the number came from. A KPI with no source is a rumour. */
  source: string;
  /** `null` when the measurement does not support a direction. */
  direction: "higher-is-better" | "lower-is-better" | null;
}

export interface ExecutiveReport {
  score: number | null;
  partial: boolean;
  kpis: ExecutiveKpi[];
  topFindings: Array<{
    ruleId: string;
    file: string;
    message: string;
    severity: string;
  }>;
  determination: "READY" | "BLOCKED" | "INCONCLUSIVE";
}

export function buildExecutiveKpis(result: {
  score: number | null;
  findings: ReadonlyArray<{ severity: string }>;
  partial: boolean;
}): ExecutiveKpi[] {
  const errors = result.findings.filter((f) => f.severity === "error").length;
  const warnings = result.findings.filter(
    (f) => f.severity === "warning",
  ).length;
  return [
    {
      label: "Worthiness score",
      value: result.score !== null ? `${result.score}/100` : "not measured",
      source: "scan result score",
      direction: "higher-is-better",
    },
    {
      label: "Error findings",
      value: String(errors),
      source: "scan result findings",
      direction: "lower-is-better",
    },
    {
      label: "Warning findings",
      value: String(warnings),
      source: "scan result findings",
      direction: "lower-is-better",
    },
    {
      label: "Analysis complete",
      value: result.partial ? "no (partial)" : "yes",
      source: "scan result partial flag",
      direction: null,
    },
  ];
}

export async function runExecReportCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";

  if (!existsSync(target)) {
    io.err(`mjolnir exec-report: target does not exist: ${target}`);
    return EXIT_USAGE;
  }

  try {
    const result = await runScan({
      target,
      json: true,
      verbose: false,
      maxDurationMs: 600_000,
      scopeChanged: false,
      format: "json",
      strict: false,
    });

    const decision = decideClaim({
      partial: result.partial,
      blockingFindings: result.findings.filter((f) => f.severity === "error")
        .length,
      supported: true,
    });
    const kpis = buildExecutiveKpis(result);

    const header = sectionHeader("SCAN SUMMARY", ui);
    io.out(`${header}\n`);
    io.out(`Target: ${target}`);
    io.out(`Determination: ${decision.state} — ${decision.reason}`);
    io.out("");
    io.out("--- Measured values ---");
    for (const kpi of kpis) {
      io.out(`  ${kpi.label}: ${kpi.value}  (source: ${kpi.source})`);
    }
    io.out("");

    io.out("--- Top findings ---");
    const top = result.findings.slice(0, 5);
    for (const f of top) {
      io.out(
        `  [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.message} (${f.file}:${f.line})`,
      );
    }
    if (result.findings.length === 0) {
      // Law 11: an incomplete empty result is inconclusive, never clean.
      io.out(
        result.partial
          ? "  No findings in the analyzed portion of the surface. The scan was PARTIAL, so this is not a clean result."
          : "  No findings in a complete scan of this surface.",
      );
    }
    if (result.findings.length > top.length) {
      io.out(`  …and ${result.findings.length - top.length} more.`);
    }
    io.out("");
    io.out(
      "Not reported here: business risk, ROI, or release readiness. Those are decisions, and this tool has no evidence for them.",
    );
    io.out("");

    return decision.exitCode;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
