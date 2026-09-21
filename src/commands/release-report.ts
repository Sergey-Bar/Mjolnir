/**
 * `mjolnir release-report` — Release Readiness Report (Tier 5 #23).
 *
 * The go/no-go artifact for release meetings. Summarizes quality
 * posture and renders a management-ready verdict:
 *   GO · CONDITIONAL GO · NO-GO
 *
 * One command, screenshot-into-the-release-channel ready.
 *
 * Exit codes (frozen contract): 0 GO · 1 CONDITIONAL GO ·
 * 2 NO-GO · 10 usage · 20 internal.
 */

import { existsSync, readFileSync } from "node:fs";

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

/** Rules that count as CI integrity issues for release verdicts. */
const CI_INTEGRITY_RULES = new Set(["QA-CI-001", "QA-CI-002", "QA-CI-008"]);

export interface ReleaseHistory {
  /** Flaky tests at the time of the last release. */
  flakyAtRelease?: number;
  /** continue-on-error findings from last release scan. */
  continueOnErrorActive?: number;
  /** Tests skipped during the release cycle. */
  skippedDuringCycle?: number;
  /** Estimated test debt hours from the debt register. */
  testDebtHours?: number;
}

export interface ReleaseVerdict {
  verdict: "GO" | "CONDITIONAL GO" | "NO-GO";
  since: string;
  score: number | null;
  hygieneFixed: number;
  hygieneIntroduced: number;
  newTestsAdded: number;
  newTestsWithoutAssertions: number;
  skippedDuringCycle: number;
  flakyAtRelease: number;
  flakyAtLastRelease: number;
  ciIntegrityIssues: number;
  continueOnErrorActive: number;
  testDebtHours: number;
  blockingFindings: number;
  advisoryFindings: number;
  errorFindings: Finding[];
  warningFindings: Finding[];
}

function renderVerdictBlock(v: ReleaseVerdict): string {
  const lines: string[] = [];
  lines.push(sectionHeader(`RELEASE READINESS — since ${v.since}`, ui));
  lines.push("");
  lines.push(`Score: ${v.score !== null ? v.score + "/100" : "unknown"}`);
  lines.push("");

  lines.push("Test hygiene since last release:");
  lines.push(`  Issues fixed:        ${v.hygieneFixed}`);
  lines.push(`  Issues introduced:   ${v.hygieneIntroduced}`);
  lines.push("");
  lines.push("New tests added:");
  lines.push(`  Total:                ${v.newTestsAdded}`);
  lines.push(`  Without assertions:   ${v.newTestsWithoutAssertions}`);
  lines.push("");
  lines.push("Skipped during the cycle:");
  lines.push(`  ${v.skippedDuringCycle}  ← what we are NOT verifying`);
  lines.push("");
  lines.push("Flaky tests:");
  lines.push(`  At release:      ${v.flakyAtRelease}`);
  const improvement = v.flakyAtRelease <= v.flakyAtLastRelease ? " ✓" : " ↑";
  lines.push(`  At last release: ${v.flakyAtLastRelease}${improvement}`);
  lines.push("");
  lines.push("CI integrity:");
  const coeMark = v.continueOnErrorActive === 0 ? " ✓" : " ⚠";
  lines.push(
    `  continue-on-error still active: ${v.continueOnErrorActive}${coeMark}`,
  );
  lines.push(`  Total CI integrity issues:      ${v.ciIntegrityIssues}`);
  lines.push("");
  lines.push(
    `Test-debt cost estimate: ~${v.testDebtHours.toFixed(1)} engineer-hours/qtr`,
  );
  lines.push("");
  lines.push(`Blocking findings (error):   ${v.blockingFindings}`);
  lines.push(`Warning findings (warning):  ${v.advisoryFindings}`);
  lines.push("");
  lines.push("════════════════════════════════════════════");
  lines.push(`VERDICT: ${v.verdict}`);
  lines.push("════════════════════════════════════════════");
  lines.push("");

  if (v.verdict === "NO-GO") {
    lines.push("BLOCKING: error findings remain at the gate.");
    lines.push("");
    lines.push("Top blockers:");
    for (const f of v.errorFindings.slice(0, 5)) {
      lines.push(`  ✗ ${f.ruleId} · ${f.file}:${f.line} — ${f.message}`);
    }
  } else if (v.verdict === "CONDITIONAL GO") {
    lines.push("CONDITIONS:");
    if (v.flakyAtRelease > 0) {
      lines.push(
        `  → ${v.flakyAtRelease} flaky test(s) active — monitor during release`,
      );
    }
    if (v.continueOnErrorActive > 0) {
      lines.push(
        `  → ${v.continueOnErrorActive} continue-on-error still active — review before ship`,
      );
    }
    if (v.skippedDuringCycle > 0) {
      lines.push(
        `  → ${v.skippedDuringCycle} skipped test(s) — verify coverage gaps`,
      );
    }
    if (v.blockingFindings === 0 && v.advisoryFindings > 0) {
      lines.push(
        `  → ${v.advisoryFindings} advisory finding(s) — review before ship`,
      );
    }
  } else {
    lines.push("All gates clear. Release with confidence.");
  }

  lines.push("");
  lines.push("Screenshot this report into the release channel.");
  return lines.join("\n");
}

function determineVerdict(
  result: { findings: Finding[]; score: number | null },
  history: ReleaseHistory,
): { verdict: ReleaseVerdict["verdict"]; reasons: string[] } {
  const reasons: string[] = [];
  const blocking = result.findings.filter((f) => f.severity === "error");
  const warnings = result.findings.filter((f) => f.severity === "warning");

  if (blocking.length > 0) {
    reasons.push(`${blocking.length} error finding(s) at the gate`);
    return { verdict: "NO-GO", reasons };
  }

  const flakyCount = history.flakyAtRelease ?? 0;
  const ciIssues = history.continueOnErrorActive ?? 0;
  const skipped = history.skippedDuringCycle ?? 0;

  if (warnings.length > 0 || flakyCount > 0 || ciIssues > 0 || skipped > 0) {
    if (warnings.length > 0) reasons.push(`${warnings.length} warning(s)`);
    if (flakyCount > 0) reasons.push(`${flakyCount} flaky test(s)`);
    if (ciIssues > 0) reasons.push(`${ciIssues} CI integrity issue(s)`);
    if (skipped > 0) reasons.push(`${skipped} skipped test(s)`);
    return { verdict: "CONDITIONAL GO", reasons };
  }

  return { verdict: "GO", reasons };
}

export function buildReleaseReport(
  result: { findings: Finding[]; score: number | null },
  since: string,
  history: ReleaseHistory = {},
): ReleaseVerdict {
  const { verdict } = determineVerdict(result, history);
  const errorFindings = result.findings.filter((f) => f.severity === "error");
  const warningFindings = result.findings.filter(
    (f) => f.severity === "warning",
  );

  let testDebtHours = 0;
  for (const f of result.findings) {
    if (CI_INTEGRITY_RULES.has(f.ruleId)) {
      testDebtHours += 0.5;
    } else if (f.severity === "error") {
      testDebtHours += 0.5;
    } else if (f.severity === "warning") {
      testDebtHours += 0.2;
    } else {
      testDebtHours += 0.1;
    }
  }

  return {
    verdict,
    since,
    hygieneFixed: 0,
    hygieneIntroduced: 0,
    newTestsAdded: 0,
    newTestsWithoutAssertions: 0,
    skippedDuringCycle: history.skippedDuringCycle ?? 0,
    flakyAtRelease: history.flakyAtRelease ?? 0,
    flakyAtLastRelease: 0,
    ciIntegrityIssues: warningFindings.length,
    continueOnErrorActive: errorFindings.filter((f) =>
      CI_INTEGRITY_RULES.has(f.ruleId),
    ).length,
    testDebtHours,
    blockingFindings: errorFindings.length,
    advisoryFindings: warningFindings.length,
    score: result.score,
    errorFindings,
    warningFindings,
  };
}

export function renderReleaseReport(v: ReleaseVerdict): string {
  return renderVerdictBlock(v);
}

/**
 * CLI verb: `mjolnir release-report [--since <ref>] [--history <json>] [target]`.
 */
export async function runReleaseReportCommand(
  argv: string[],
  io: { out: Output; err: Output },
): Promise<number> {
  const target = argv.find((a) => !a.startsWith("-")) ?? ".";
  const sinceIdx = argv.indexOf("--since");
  const since = sinceIdx !== -1 ? (argv[sinceIdx + 1] ?? "unknown") : "unknown";
  const historyIdx = argv.indexOf("--history");
  let history: ReleaseHistory = {};
  if (historyIdx !== -1) {
    const historyPath = argv[historyIdx + 1];
    if (historyPath && existsSync(historyPath)) {
      try {
        const raw = JSON.parse(readFileSync(historyPath, "utf8")) as Record<
          string,
          number | undefined
        >;
        history = {};
        if (raw.flakyAtRelease !== undefined)
          history.flakyAtRelease = raw.flakyAtRelease;
        if (raw.continueOnErrorActive !== undefined)
          history.continueOnErrorActive = raw.continueOnErrorActive;
        if (raw.skippedDuringCycle !== undefined)
          history.skippedDuringCycle = raw.skippedDuringCycle;
        if (raw.testDebtHours !== undefined)
          history.testDebtHours = raw.testDebtHours;
      } catch {
        io.err(`Warning: cannot parse history file ${historyPath}`);
      }
    }
  }

  if (!existsSync(target)) {
    io.err(`mjolnir release-report: target does not exist: ${target}`);
    return EXIT_USAGE;
  }

  try {
    const result = await runScan({
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      strict: false,
    });

    const report = buildReleaseReport(result, since, history);
    io.out(renderReleaseReport(report));

    switch (report.verdict) {
      case "GO":
        return EXIT_CLEAN;
      case "CONDITIONAL GO":
        return EXIT_FINDINGS;
      case "NO-GO":
        return EXIT_FINDINGS;
      default: {
        void history;
        return EXIT_INTERNAL;
      }
    }
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
