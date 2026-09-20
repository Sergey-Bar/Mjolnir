/**
 * `mjolnir exec-report` — Executive Quality Report (QM-3).
 *
 * Generates a board-ready quality report with KPIs, trend summary,
 * risk assessment, and strategic recommendations.
 *
 * Output is human-readable terminal format suitable for copying into
 * executive presentations or email briefings.
 */

import { existsSync } from "node:fs";

import type { Finding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_INTERNAL,
  EXIT_USAGE,
} from "../exit-codes.js";

const ui = plainContext();

export interface ExecutiveKpi {
  label: string;
  value: string;
  delta: string;
  status: "good" | "warning" | "critical";
}

export interface ExecutiveReport {
  score: number | null;
  kpis: ExecutiveKpi[];
  riskLevel: "low" | "medium" | "high";
  topFindings: Array<{
    ruleId: string;
    file: string;
    message: string;
    severity: string;
  }>;
  recommendations: string[];
}

function assessRisk(findings: Finding[]): "low" | "medium" | "high" {
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  if (errors > 5 || warnings > 20) return "high";
  if (errors > 0 || warnings > 5) return "medium";
  return "low";
}

function buildRecommendations(
  findings: Finding[],
  score: number | null,
): string[] {
  const recs: string[] = [];
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;

  if (errors > 0) {
    recs.push(`Fix ${errors} error finding(s) blocking release confidence`);
  }
  if (warnings > 0) {
    recs.push(`Review ${warnings} warning finding(s) before next release`);
  }
  if (score !== null && score < 70) {
    recs.push(
      `Score ${score}/100 is below the 70 threshold — prioritize rule coverage`,
    );
  }
  if (score !== null && score >= 90) {
    recs.push(
      `Score ${score}/100 is excellent — maintain current quality gate`,
    );
  }
  if (recs.length === 0) {
    recs.push("No critical issues — maintain current quality practices");
  }
  return recs;
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
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "json",
      strict: false,
    });

    const risk = assessRisk(result.findings);
    const recommendations = buildRecommendations(result.findings, result.score);

    const kpis = [
      {
        label: "Trust Score",
        value: result.score !== null ? `${result.score}/100` : "N/A",
        delta:
          result.score !== null && result.score >= 80
            ? "↑ healthy"
            : result.score !== null
              ? "↓ needs work"
              : "—",
        status:
          result.score !== null && result.score >= 80
            ? "good"
            : result.score !== null && result.score >= 60
              ? "warning"
              : "critical",
      },
      {
        label: "Total Findings",
        value: String(result.findings.length),
        delta: "",
        status:
          result.findings.length <= 5
            ? "good"
            : result.findings.length <= 20
              ? "warning"
              : "critical",
      },
      {
        label: "Errors",
        value: String(
          result.findings.filter((f) => f.severity === "error").length,
        ),
        delta: "",
        status:
          result.findings.filter((f) => f.severity === "error").length === 0
            ? "good"
            : "critical",
      },
      {
        label: "Warnings",
        value: String(
          result.findings.filter((f) => f.severity === "warning").length,
        ),
        delta: "",
        status:
          result.findings.filter((f) => f.severity === "warning").length <= 5
            ? "good"
            : "warning",
      },
    ];

    const header = sectionHeader("EXECUTIVE QUALITY REPORT", ui);
    io.out(`${header}\n`);
    io.out(`Generated: ${new Date().toISOString()}`);
    io.out(`Target: ${target}`);
    io.out(`Risk Level: ${risk.toUpperCase()}`);
    io.out("");

    io.out("--- Key Performance Indicators ---");
    for (const kpi of kpis) {
      const icon =
        kpi.status === "good" ? "✅" : kpi.status === "warning" ? "⚠️ " : "🔴";
      io.out(`  ${icon} ${kpi.label}: ${kpi.value} ${kpi.delta}`);
    }
    io.out("");

    io.out("--- Top Findings ---");
    const top = result.findings.slice(0, 5);
    for (const f of top) {
      io.out(
        `  [${f.severity.toUpperCase()}] ${f.ruleId}: ${f.message} (${f.file}:${f.line})`,
      );
    }
    if (result.findings.length === 0) {
      io.out("  No findings — clean scan.");
    }
    io.out("");

    io.out("--- Recommendations ---");
    for (const r of recommendations) {
      io.out(`  • ${r}`);
    }
    io.out("");

    return result.findings.some((f) => f.severity === "error")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
