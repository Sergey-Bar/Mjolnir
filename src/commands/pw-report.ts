/**
 * `qa-doctor pw-report` — Playwright run summary (Tier 2 #9 wedge).
 *
 * Consumes a Playwright JSON report (the same ingestion as forensics)
 * and prints the QA-Doctor view of a real run: retries, true flakes,
 * slowest tests. This is the data the npm `@sergey-bar/qa-doctor-playwright-reporter`
 * package will emit inline in every Playwright run.
 *
 * The standalone npm package wraps this renderer; keeping the logic here
 * means one implementation, two distribution surfaces.
 */

import type { ForensicsReport } from "../forensics/types.js";

export interface PwRunSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  retried: number;
  trueFlakes: number;
  wallTimeMs: number;
  slowest: Array<{ title: string; file: string; ms: number }>;
}

export function summarizePwRun(report: ForensicsReport): PwRunSummary {
  const slowest = [...report.verdicts]
    .sort((a, b) => b.totalDurationMs - a.totalDurationMs)
    .slice(0, 5)
    .map((v) => ({
      title: v.title,
      file: v.file,
      ms: v.totalDurationMs,
    }));

  return {
    total: report.totalTests,
    passed: report.verdicts.filter((v) => v.finalStatus === "passed").length,
    failed: report.failed,
    skipped: report.skipped,
    retried: report.retriedTests,
    trueFlakes: report.flakyTests,
    wallTimeMs: report.totalDurationMs,
    slowest,
  };
}

export function renderPwRunSummary(s: PwRunSummary): string {
  const lines: string[] = [];
  lines.push("▚▞ QA DOCTOR — RUN SUMMARY");
  lines.push("");
  lines.push(
    `${s.total} tests · ${s.passed} passed · ${s.failed} failed · ${s.skipped} skipped`,
  );
  if (s.retried > 0 || s.trueFlakes > 0) {
    lines.push(
      `↻ ${s.retried} retried · 🔥 ${s.trueFlakes} TRUE-FLAKE${s.trueFlakes === 1 ? "" : "S"} (passed only on attempt ≥2)`,
    );
  }
  const secs = (s.wallTimeMs / 1000).toFixed(1);
  lines.push(`⏱ total test time: ${secs}s`);
  if (s.slowest.length > 0 && (s.slowest[0]?.ms ?? 0) > 0) {
    lines.push("");
    lines.push("Slowest:");
    for (const t of s.slowest.slice(0, 3)) {
      lines.push(`  ${(t.ms / 1000).toFixed(1)}s  ${t.title} (${t.file})`);
    }
  }
  return lines.join("\n");
}
