/**
 * Forensics analysis — verdicts, retry forensics, Flakiness Leaderboard,
 * FLAKY.md artifact generation (Master Plan R4).
 *
 * Core fact: a test that passes only on attempt >= 2 is not a passing
 * test — it is a lucky test. It gets flagged as TRUE-FLAKE regardless of
 * the final green checkmark.
 */

import type {
  ForensicsReport,
  NetworkObservation,
  RunStatus,
  TestRecord,
  TestVerdict,
} from "./types.js";
import { FORENSICS_SCHEMA_VERSION } from "./types.js";
import { FLAKE_GLYPH, sectionHeader, plainContext } from "../reporter/ui.js";
import { classifyForensicVerdict } from "./classify.js";

const ui = plainContext();

const MAX_RECORDS = 100_000;

export function analyze(
  records: TestRecord[],
  source: ForensicsReport["source"],
): ForensicsReport {
  const verdicts: TestVerdict[] = [];
  const networkObservations: NetworkObservation[] = [];
  let failed = 0;
  let skipped = 0;
  let retried = 0;
  let flaky = 0;
  let totalDuration = 0;

  for (const rec of records.slice(0, MAX_RECORDS)) {
    const attempts = rec.attempts;
    const last = attempts[attempts.length - 1];
    const finalStatus: RunStatus = last?.status ?? "skipped";
    const totalDurationMs = attempts.reduce((s, a) => s + a.durationMs, 0);
    if (rec.evidenceKind === "network-observation") {
      networkObservations.push({
        file: rec.file,
        title: rec.title,
        outcome:
          finalStatus === "passed"
            ? "succeeded"
            : finalStatus === "skipped"
              ? "unknown"
              : "failed",
        durationMs: totalDurationMs,
        ...(rec.errors !== undefined ? { errors: rec.errors } : {}),
      });
      continue;
    }
    totalDuration += totalDurationMs;

    const everFailed = attempts.some(
      (a) => a.status === "failed" || a.status === "timedOut",
    );
    const passedOnRetry =
      finalStatus === "passed" && attempts.length >= 2 && everFailed;

    if (
      finalStatus === "failed" ||
      finalStatus === "timedOut" ||
      finalStatus === "interrupted"
    )
      failed++;
    if (finalStatus === "skipped") skipped++;
    if (attempts.length >= 2) retried++;
    if (passedOnRetry) flaky++;

    verdicts.push({
      file: rec.file,
      title: rec.title,
      attempts: attempts.length,
      finalStatus,
      totalDurationMs,
      passedOnRetry,
      everFailed,
      skipped: finalStatus === "skipped",
      ...(rec.line !== undefined ? { line: rec.line } : {}),
      // WI-18 (plan 1788882429145 §6): the forensic verdict taxonomy runs
      // over machine-visible facts only (attempts + error text the source
      // carries). Additive fields; sources without error text mark the
      // state unsupported rather than guessing.
      forensic: classifyForensicVerdict({
        verdict: {
          attempts: attempts.length,
          finalStatus,
          passedOnRetry,
          everFailed,
          skipped: finalStatus === "skipped",
        },
        errorTexts: rec.errors ?? [],
        errorTextsUnsupported: source === "junit-xml",
      }),
    });
  }

  return {
    forensicsSchemaVersion: FORENSICS_SCHEMA_VERSION,
    source,
    totalTests: verdicts.length,
    failed,
    skipped,
    retriedTests: retried,
    flakyTests: flaky,
    totalDurationMs: totalDuration,
    verdicts,
    ...(networkObservations.length > 0
      ? {
          totalNetworkObservations: networkObservations.length,
          failedNetworkObservations: networkObservations.filter(
            (observation) => observation.outcome === "failed",
          ).length,
          networkObservations,
        }
      : {}),
    analysisComplete: records.length <= MAX_RECORDS,
    skippedReports: 0,
    incompleteReasons:
      records.length > MAX_RECORDS ? ["record-count-limit"] : [],
  };
}

/** Flakiness Leaderboard: flakiest first, then slowest. */
export function leaderboard(report: ForensicsReport): TestVerdict[] {
  return [...report.verdicts]
    .filter((v) => v.passedOnRetry || v.everFailed)
    .sort((a, b) => {
      if (a.passedOnRetry !== b.passedOnRetry) return a.passedOnRetry ? -1 : 1;
      if (a.attempts !== b.attempts) return b.attempts - a.attempts;
      return b.totalDurationMs - a.totalDurationMs;
    })
    .slice(0, 25);
}

function bar(ms: number, maxMs: number, width = 20): string {
  // renderLeaderboard floors maxMs at 1, so the divisor is never zero.
  const filled = Math.round((ms / maxMs) * width);
  return (
    "█".repeat(Math.min(width, filled)) +
    "░".repeat(Math.max(0, width - filled))
  );
}

function renderNetworkObservations(report: ForensicsReport): string[] {
  if (!report.networkObservations?.length) return [];
  const failures = report.networkObservations.filter(
    (observation) => observation.outcome === "failed",
  );
  return [
    `${report.networkObservations.length} network observations · ${failures.length} network failures (not test outcomes)`,
    ...failures
      .slice(0, 25)
      .map(
        (observation) =>
          `NETWORK FAILURE ${observation.title} · ${(observation.durationMs / 1000).toFixed(1)}s`,
      ),
    "",
  ];
}

function partialAnalysisMessage(report: ForensicsReport): string {
  const skippedReasons = report.incompleteReasons.filter(
    (reason) => reason !== "record-count-limit",
  );
  const partialReasons = report.incompleteReasons
    .filter((reason) => reason === "record-count-limit")
    .map(() => "record count limit reached");
  if (report.skippedReports > 0) {
    const skippedReasonText =
      skippedReasons.length > 0 ? ` (${skippedReasons.join(", ")})` : "";
    const suffix =
      partialReasons.length > 0 ? `; ${partialReasons.join(", ")}.` : ".";
    return `Analysis is partial — ${report.skippedReports} report(s) skipped${skippedReasonText}${suffix}`;
  }
  const reasonText =
    partialReasons.length > 0
      ? partialReasons.join(", ")
      : report.incompleteReasons.join(", ");
  return `${reasonText}; analysis is partial.`;
}

export function renderLeaderboard(report: ForensicsReport): string {
  const lines: string[] = [];
  lines.push(sectionHeader("FLAKINESS LEADERBOARD", ui));
  lines.push("");
  lines.push(
    `${report.totalTests} tests · ${report.failed} failed · ${report.flakyTests} flaky · ${report.retriedTests} retried`,
  );
  lines.push("");

  lines.push(...renderNetworkObservations(report));
  const top = leaderboard(report);
  if (top.length === 0) {
    lines.push(
      report.totalTests === 0 && (report.totalNetworkObservations ?? 0) > 0
        ? "No test outcomes available from network observations."
        : (report.totalNetworkObservations ?? 0) > 0
          ? "No flaky or failing tests detected; network evidence is listed separately."
          : "No failures or retries found — nothing suspicious this run.",
    );
    if (!report.analysisComplete) {
      lines.push(`⚠ ${partialAnalysisMessage(report)}`);
    }
    return lines.join("\n");
  }

  const maxMs = Math.max(...top.map((v) => v.totalDurationMs), 1);
  for (const v of top) {
    // `top` keeps only verdicts with a failure or a true flake, so every
    // row here is one of exactly two things: a lucky pass or a failure.
    const flag = v.passedOnRetry ? "TRUE-FLAKE" : "FAILING";
    lines.push(
      `${flag.padEnd(10)} ${v.title} (${v.file})`,
      `           ${bar(v.totalDurationMs, maxMs)} ${(v.totalDurationMs / 1000).toFixed(1)}s · ${v.attempts} attempt${v.attempts === 1 ? "" : "s"}`,
    );
  }
  if (!report.analysisComplete) {
    lines.push("");
    lines.push(`⚠ ${partialAnalysisMessage(report)}`);
  }
  return lines.join("\n");
}

/** FLAKY.md — the committed artifact. */
export function renderFlakyMd(report: ForensicsReport): string {
  const lines: string[] = [];
  lines.push("# FLAKY.md");
  lines.push("");
  lines.push(
    `> Generated by mjolnir forensics from ${report.source} run data.`,
  );
  lines.push(
    "> A test that passes only on retry is not a passing test — it is a lucky test.",
  );
  lines.push("");
  lines.push(
    `**${report.totalTests}** tests analyzed · **${report.flakyTests}** true flakes · **${report.retriedTests}** retried · **${report.failed}** failing`,
  );
  lines.push("");

  lines.push(...renderNetworkObservations(report));
  const top = leaderboard(report);
  if (top.length === 0) {
    lines.push(
      report.totalTests === 0 && (report.totalNetworkObservations ?? 0) > 0
        ? "_No test outcomes available from network observations._"
        : "_No flaky or failing tests detected in this run._",
    );
    if (!report.analysisComplete) {
      lines.push("");
      lines.push(`> ⚠ ${partialAnalysisMessage(report)}`);
    }
    return lines.join("\n");
  }

  lines.push("| Status | Test | File | Attempts | Duration |");
  lines.push("|--------|------|------|----------|----------|");
  for (const v of top) {
    // Same two-row invariant as renderLeaderboard: a failure or a flake.
    const status = v.passedOnRetry ? `${FLAKE_GLYPH} TRUE-FLAKE` : "❌ failing";
    lines.push(
      `| ${status} | \`${v.title}\` | \`${v.file}\` | ${v.attempts} | ${(v.totalDurationMs / 1000).toFixed(1)}s |`,
    );
  }
  if (!report.analysisComplete) {
    lines.push("");
    lines.push(`> ⚠ ${partialAnalysisMessage(report)}`);
  }
  lines.push("");
  return lines.join("\n");
}
