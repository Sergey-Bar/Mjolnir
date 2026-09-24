/**
 * `mjolnir report playwright` — Playwright Reporter Package (SDET-2).
 *
 * Generates a Playwright-compatible JSON report from Mjölnir scan results,
 * enabling Playwright's own UI and tooling to visualize Mjölnir findings.
 *
 * The report follows the Playwright JSON report schema's structure:
 * each finding becomes a "test" entry with Mjölnir's verdict as outcome.
 */

import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { writeFileAtomic } from "../lib/fs-atomic.js";

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

export interface PlaywrightReportEntry {
  title: string;
  path: string;
  outcome: "passed" | "failed" | "skipped" | "expectedFailure";
  duration: number;
  annotations: Array<{ type: "warning" | "error"; message: string }>;
}

export interface PlaywrightReport {
  version: 1;
  startTime: string;
  endTime: string;
  duration: number;
  status: "passed" | "failed" | "timedout" | "interrupted";
  totalTests: number;
  passedTests: number;
  failedTests: number;
  suites: Array<{
    title: string;
    file: string;
    tests: PlaywrightReportEntry[];
  }>;
  mjolnir: {
    score: number | null;
    framework: string;
    findings: Array<{
      ruleId: string;
      file: string;
      line: number;
      column: number;
      message: string;
      severity: string;
      evidenceLevel?: string;
      measuredFpRate?: number;
    }>;
  };
}

function findingOutcome(f: Finding): PlaywrightReportEntry["outcome"] {
  if (f.severity === "error") return "failed";
  if (f.severity === "warning") return "expectedFailure";
  return "passed";
}

export function buildPlaywrightReport(result: {
  findings: Finding[];
  score: number | null;
  frameworks: string[];
}): PlaywrightReport {
  const now = new Date();
  const findingsByFile = new Map<string, Finding[]>();
  for (const f of result.findings) {
    const existing = findingsByFile.get(f.file) ?? [];
    existing.push(f);
    findingsByFile.set(f.file, existing);
  }

  const suites = Array.from(findingsByFile.entries()).map(
    ([file, findings]): {
      title: string;
      file: string;
      tests: PlaywrightReportEntry[];
    } => ({
      title: file,
      file,
      tests: findings.map((f): PlaywrightReportEntry => ({
        title: `${f.ruleId}: ${f.message}`,
        path: file,
        outcome: findingOutcome(f),
        duration: 0,
        annotations: [
          {
            type: f.severity === "error" ? "error" : "warning",
            message: `${f.ruleId} — ${f.message}${f.fix ? `\nFix: ${f.fix}` : ""}`,
          },
        ],
      })),
    }),
  );

  const allTests = suites.flatMap((s) => s.tests);
  return {
    version: 1,
    startTime: now.toISOString(),
    endTime: now.toISOString(),
    duration: 0,
    status: result.findings.some((f) => f.severity === "error")
      ? "failed"
      : "passed",
    totalTests: allTests.length,
    passedTests: allTests.filter((t) => t.outcome === "passed").length,
    failedTests: allTests.filter((t) => t.outcome === "failed").length,
    suites,
    mjolnir: {
      score: result.score,
      framework: result.frameworks[0] ?? "unknown",
      findings: result.findings.map((f) => {
        const entry: {
          ruleId: string;
          file: string;
          line: number;
          column: number;
          message: string;
          severity: string;
          evidenceLevel?: string;
          measuredFpRate?: number;
        } = {
          ruleId: f.ruleId,
          file: f.file,
          line: f.line,
          column: f.column,
          message: f.message,
          severity: f.severity,
        };
        if (f.evidenceLevel !== undefined) {
          entry.evidenceLevel = f.evidenceLevel;
        }
        if (f.measuredFpRate !== undefined) {
          entry.measuredFpRate = f.measuredFpRate;
        }
        return entry;
      }),
    },
  };
}

export async function runReportPlaywrightCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";
  const outputIdx = argv.indexOf("--output");
  const outputPath =
    outputIdx !== -1
      ? (argv[outputIdx + 1] ?? "playwright-report.json")
      : "playwright-report.json";

  if (!existsSync(target)) {
    io.err(`mjolnir report playwright: target does not exist: ${target}`);
    return EXIT_USAGE;
  }
  const root = resolve(target);
  const requestedOutput = resolve(outputPath);
  const outputRelative = relative(root, requestedOutput);
  if (isAbsolute(outputRelative) || outputRelative.startsWith("..")) {
    io.err(
      "mjolnir report playwright: output must stay within the target root",
    );
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

    const report = buildPlaywrightReport(result);
    const outDir = resolve(".");
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    const fullPath = requestedOutput;
    writeFileAtomic(fullPath, JSON.stringify(report, null, 2) + "\n", {
      encoding: "utf8",
    });

    const header = sectionHeader("PLAYWRIGHT REPORT", ui);
    io.out(`${header}\n`);
    io.out(
      `Score: ${result.score !== null ? result.score + "/100" : "unknown"}`,
    );
    io.out(
      `Findings: ${result.findings.length} (${result.findings.filter((f) => f.severity === "error").length} error, ${result.findings.filter((f) => f.severity === "warning").length} warning)`,
    );
    io.out(`Report written: ${fullPath}`);
    io.out(
      `Tests: ${report.totalTests} total, ${report.passedTests} passed, ${report.failedTests} failed`,
    );

    return result.findings.some((f) => f.severity === "error")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
