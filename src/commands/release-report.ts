/**
 * `mjolnir release-report` — Release Readiness Report (Tier 5 #23).
 *
 * The go/no-go artifact for release meetings. Summarizes quality
 * posture and renders a management-ready verdict:
 *   GO · CONDITIONAL GO · NO-GO
 *
 * What changed, and why: this report hardcoded `hygieneFixed: 0`,
 * `hygieneIntroduced: 0`, `newTestsAdded: 0`, `newTestsWithoutAssertions: 0`
 * and `flakyAtLastRelease: 0`, and printed them as measured figures beside a
 * ✓/↑ trend mark — so a report that measured nothing looked like a report
 * that measured an absence. It also added 0.5/0.2/0.1 engineer-hours per
 * finding to produce a "test-debt cost estimate" nobody had estimated, and it
 * ignored the scan's `partial` flag, so a truncated scan could reach GO.
 *
 * Unmeasured values are now `null` and print as "not measured". Trend marks
 * require two real measurements. GO requires a complete scan. The release
 * decision itself moves to the canonical proof in v5 (V5-070); until then this
 * is a summary, and says so.
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

/**
 * A figure this command cannot measure. `null` is rendered as
 * "not measured" — never as 0, which would read as a measured absence.
 */
type Unmeasured = number | null;

const NOT_MEASURED = "not measured";

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
  /** False when the scan did not cover the whole surface. */
  partial: boolean;
  /** Not derivable from a single scan: needs a previous-run comparison. */
  hygieneFixed: Unmeasured;
  hygieneIntroduced: Unmeasured;
  newTestsAdded: Unmeasured;
  newTestsWithoutAssertions: Unmeasured;
  skippedDuringCycle: number;
  flakyAtRelease: number;
  /** Needs the previous release's value; absent means no trend can be shown. */
  flakyAtLastRelease: Unmeasured;
  ciIntegrityIssues: number;
  continueOnErrorActive: number;
  /** Needs a real effort estimate; an invented one is worse than none. */
  testDebtHours: Unmeasured;
  blockingFindings: number;
  advisoryFindings: number;
  errorFindings: Finding[];
  warningFindings: Finding[];
}

function show(value: Unmeasured): string {
  return value === null ? NOT_MEASURED : String(value);
}

function renderVerdictBlock(v: ReleaseVerdict): string {
  const lines: string[] = [];
  lines.push(sectionHeader(`RELEASE READINESS — since ${v.since}`, ui));
  lines.push("");
  lines.push(`Score: ${v.score !== null ? v.score + "/100" : "unknown"}`);
  lines.push(`Analysis complete: ${v.partial ? "no (PARTIAL)" : "yes"}`);
  if (v.partial) {
    lines.push(
      "A partial scan cannot support a GO verdict: the unanalyzed surface is exactly where an unknown finding would live.",
    );
  }
  lines.push("");

  lines.push("Test hygiene since last release:");
  lines.push(`  Issues fixed:        ${show(v.hygieneFixed)}`);
  lines.push(`  Issues introduced:   ${show(v.hygieneIntroduced)}`);
  lines.push("");
  lines.push("New tests added:");
  lines.push(`  Total:                ${show(v.newTestsAdded)}`);
  lines.push(`  Without assertions:   ${show(v.newTestsWithoutAssertions)}`);
  lines.push("");
  lines.push("Skipped during the cycle:");
  lines.push(
    `  ${v.skippedDuringCycle}${
      v.skippedDuringCycle > 0 ? "  ← what we are NOT verifying" : ""
    }`,
  );
  lines.push("");
  lines.push("Flaky tests:");
  lines.push(`  At release:      ${v.flakyAtRelease}`);
  // A trend mark needs two measurements. With one, printing ✓ or ↑ invents
  // the comparison it is claiming to show.
  const improvement =
    v.flakyAtLastRelease === null
      ? ""
      : v.flakyAtRelease <= v.flakyAtLastRelease
        ? " ✓"
        : " ↑";
  lines.push(`  At last release: ${show(v.flakyAtLastRelease)}${improvement}`);
  lines.push("");
  lines.push("CI integrity:");
  const coeMark = v.continueOnErrorActive === 0 ? " ✓" : " ⚠";
  lines.push(
    `  continue-on-error still active: ${v.continueOnErrorActive}${coeMark}`,
  );
  lines.push(`  Total CI integrity issues:      ${v.ciIntegrityIssues}`);
  lines.push("");
  lines.push(
    `Test-debt cost estimate: ${
      v.testDebtHours === null
        ? NOT_MEASURED
        : `~${v.testDebtHours.toFixed(1)} engineer-hours/qtr`
    }`,
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
    lines.push(
      "No gate in this report fired. This is a summary of one static scan, not a release authorization: the canonical release proof is the authority, and it requires candidate-bound evidence this command does not have.",
    );
  }

  lines.push("");
  lines.push("Screenshot this report into the release channel.");
  return lines.join("\n");
}

function determineVerdict(
  result: { findings: Finding[]; score: number | null; partial: boolean },
  history: ReleaseHistory,
): { verdict: ReleaseVerdict["verdict"]; reasons: string[] } {
  const reasons: string[] = [];
  const blocking = result.findings.filter((f) => f.severity === "error");
  const warnings = result.findings.filter((f) => f.severity === "warning");

  if (blocking.length > 0) {
    reasons.push(`${blocking.length} error finding(s) at the gate`);
    return { verdict: "NO-GO", reasons };
  }

  // Law 11: an incomplete scan cannot clear a release gate. The unanalyzed
  // surface is precisely where an unknown blocking finding would live.
  if (result.partial) {
    reasons.push("scan was PARTIAL — the unanalyzed surface is unverified");
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
  result: { findings: Finding[]; score: number | null; partial: boolean },
  since: string,
  history: ReleaseHistory = {},
): ReleaseVerdict {
  const { verdict } = determineVerdict(result, history);
  const errorFindings = result.findings.filter((f) => f.severity === "error");
  const warningFindings = result.findings.filter(
    (f) => f.severity === "warning",
  );

  return {
    verdict,
    since,
    partial: result.partial,
    // Each of these needs a previous-run comparison or a real effort model.
    // A hardcoded 0 here renders as a measured absence and a ✓ beside it.
    hygieneFixed: null,
    hygieneIntroduced: null,
    newTestsAdded: null,
    newTestsWithoutAssertions: null,
    skippedDuringCycle: history.skippedDuringCycle ?? 0,
    flakyAtRelease: history.flakyAtRelease ?? 0,
    flakyAtLastRelease: null,
    ciIntegrityIssues: warningFindings.length,
    continueOnErrorActive: errorFindings.filter((f) =>
      CI_INTEGRITY_RULES.has(f.ruleId),
    ).length,
    // Previously 0.5h per error and 0.2h per warning, invented per finding and
    // labelled "engineer-hours/qtr". An estimate with no model behind it is a
    // fabricated cost. It now passes through only if the caller supplied one.
    testDebtHours: history.testDebtHours ?? null,
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
      maxDurationMs: 600_000,
      scopeChanged: false,
      format: "terminal",
      strict: false,
    });

    const report = buildReleaseReport(result, since, history);
    io.out(renderReleaseReport(report));

    // GO on a static scan is a summary verdict, not release authorization;
    // the release gate is the candidate decision (see scripts/lib/
    // candidate-decision.mjs), which this command cannot satisfy.
    if (report.verdict === "GO") {
      io.err(
        "mjolnir release-report: this is a static-scan summary, not release authorization. Run the release gate (npm run candidate:decision:release) before shipping.",
      );
      return EXIT_CLEAN;
    }
    if (report.verdict === "CONDITIONAL GO" || report.verdict === "NO-GO") {
      return EXIT_FINDINGS;
    }
    return EXIT_INTERNAL;
  } catch (e) {
    internalErrorMessage(e, io.err, false);
    return EXIT_INTERNAL;
  }
}
