/**
 * `mjolnir report` — Mjölnir findings in the Playwright report shape.
 *
 * What this command does NOT do, and why: a Playwright report describes tests
 * that were EXECUTED, with per-test outcomes and durations. A static scan
 * executed nothing. Presenting findings as Playwright `suites`/`tests` with a
 * `passed` status manufactured a runtime result that never happened — and on a
 * clean scan it published "0 tests, all passed", which a Playwright consumer
 * reads as a green test run.
 *
 * So the execution block is empty and says so, and the findings live in the
 * `mjolnir` extension block where they are honestly labelled as static
 * analysis. The file is a findings report in a familiar shape, not a test run.
 *
 * The TOP-LEVEL status is the same claim and is now held to it. It used to be
 * computed (`partial ? "interrupted" : hasError ? "failed" : "passed"`), so
 * the clean case shipped `{status: "passed", totalTests: 0}` — a green test
 * run over zero tests, in the one field a Playwright consumer reads first. The
 * per-finding statuses were fixed; this one was not. It is now the literal
 * `interrupted`, and what the scan actually found is reported as
 * `mjolnir.scanOutcome` instead of being smuggled into the run status.
 */

import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { writeFileAtomic } from "../lib/fs-atomic.js";

import type { Finding } from "../types.js";
import { runScan } from "../engine/scan-pipeline.js";
import { sectionHeader, plainContext } from "../reporter/ui.js";
import { internalErrorMessage, type Output } from "../cli-io.js";
import { decideClaim } from "../claim-evidence.js";
import { EXIT_INTERNAL, EXIT_USAGE } from "../exit-codes.js";

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
  /**
   * The run status, narrowed to the ONE honest value.
   *
   * Playwright's closed status enum is passed/failed/timedout/interrupted.
   * A static scan executed no test, so the first three are all false and
   * only `interrupted` — the member that refuses to assert a completed run
   * — survives. The type is the literal, not a union, so a future edit
   * that wants to reintroduce a runtime verdict does not typecheck.
   */
  status: "interrupted";
  /** Always 0: this command never executes a test. */
  totalTests: number;
  /** Always 0: see totalTests. */
  passedTests: number;
  /** Always 0: see totalTests. */
  failedTests: number;
  /** Always empty: see the module comment. */
  suites: Array<{
    title: string;
    file: string;
    tests: PlaywrightReportEntry[];
  }>;
  mjolnir: {
    /** Names the producer so a consumer cannot mistake this for a test run. */
    execution: "STATIC_ANALYSIS";
    /**
     * What the STATIC SCAN found — a different question from the run
     * status, deliberately kept out of it. `partial`: the scan was
     * truncated, so the surface is unverified. `blocked`: error-severity
     * findings. `clean`: nothing blocking was found by an analysis that
     * ran to completion. No member of this set describes a test run.
     */
    scanOutcome: "clean" | "blocked" | "partial";
    partial: boolean;
    score: number | null;
    framework: string;
    frameworkDetectionUnknown: boolean;
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

export function buildPlaywrightReport(result: {
  findings: Finding[];
  score: number | null;
  frameworks: string[];
  frameworkDetectionUnknown?: boolean;
  partial?: boolean;
}): PlaywrightReport {
  const now = new Date();
  const partial = result.partial === true;
  const hasError = result.findings.some((f) => f.severity === "error");
  // A CONSTANT, not a computation. The defect this replaces derived the
  // root status from the findings, so a clean scan published
  // `{status: "passed", totalTests: 0}` — the exact shape a Playwright
  // consumer reads as a green run, and the exact failure this file's own
  // header documents as fixed. `failed` was equally dishonest: it implies
  // tests ran and lost. A static scan started no run at all, so the status
  // is `interrupted` on every path.
  const status = "interrupted" as const;
  // The scan's own outcome is a different question and lives in the
  // extension block, where it cannot be read as a runtime verdict.
  const scanOutcome = partial ? "partial" : hasError ? "blocked" : "clean";

  return {
    version: 1,
    startTime: now.toISOString(),
    endTime: now.toISOString(),
    duration: 0,
    status,
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    suites: [],
    mjolnir: {
      execution: "STATIC_ANALYSIS",
      scanOutcome,
      partial,
      score: result.score,
      framework: result.frameworks[0] ?? "unknown",
      frameworkDetectionUnknown: result.frameworkDetectionUnknown === true,
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

    // One determination, from the one function — partial is checked before
    // the finding gate so a truncated scan can never read as clean.
    const decision = decideClaim({
      partial: result.partial,
      blockingFindings: result.findings.filter((f) => f.severity === "error")
        .length,
      supported: true,
    });

    const header = sectionHeader("PLAYWRIGHT-SHAPED FINDINGS REPORT", ui);
    io.out(`${header}\n`);
    io.out(
      `Score: ${result.score !== null ? result.score + "/100" : "unknown"}`,
    );
    io.out(
      `Findings: ${result.findings.length} (${result.findings.filter((f) => f.severity === "error").length} error, ${result.findings.filter((f) => f.severity === "warning").length} warning)`,
    );
    io.out(`Report written: ${fullPath}`);
    io.out(
      "Executed tests: 0 — this is static analysis, not a test run. The Playwright suite block is empty by design.",
    );
    io.out(`Determination: ${decision.state} — ${decision.reason}`);

    return decision.exitCode;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
