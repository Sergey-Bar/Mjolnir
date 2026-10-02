/**
 * Handler functions for every Mjolnir CLI verb.
 *
 * Extracted from cli.ts to keep the entry-point module under 800 lines
 * (Task 8) and to isolate the rendering dispatch for runScanCommand
 * (Task 6: renderScanOutput helper).
 */

import { existsSync } from "node:fs";

import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
  EXIT_USAGE,
  EXIT_INTERNAL,
} from "./exit-codes.js";
// The one exit-code matrix (plan V5-002).
import { scanExitCode } from "./claim-evidence.js";
import { isAdvisoryFinding } from "./types.js";
import type { CliArgs } from "./engine/scan-pipeline.js";
import { runScan, KNOWN_RULE_IDS } from "./engine/scan-pipeline.js";
import { buildMachineContract } from "./engine/machine-contract.js";

import { renderTerminal } from "./reporter/terminal.js";
import { renderTrustReport } from "./reporter/trust-report.js";
import { renderSarif } from "./reporter/sarif.js";
import { renderCodeQuality } from "./reporter/codequality.js";
import { renderMermaid } from "./reporter/mermaid.js";
import { ProgressRenderer, shouldRenderProgress } from "./reporter/progress.js";
import { runWhyCommand } from "./commands/why.js";
// Re-exported because `explain <file:line>` IS the `why` arm: the command did
// not move, only the verb that used to name it. Several specs import it from
// the entry point, and a command that survives as a flag is still a command.
export { runWhyCommand };
import { explainVerdict, renderVerdictExplain } from "./commands/explain.js";
import { runForensics } from "./forensics/run.js";
import { renderTriage, renderTriageMd } from "./forensics/triage.js";
import { buildHandover, renderHandover } from "./commands/handover.js";
import {
  DEFAULT_BASELINE_PATH,
  diffAgainstBaseline,
  loadBaseline,
  renderBaselineSaved,
  saveBaseline,
} from "./commands/baseline.js";
import { buildVerifyDigest, renderVerifyDigest } from "./commands/verify.js";
import {
  DEFAULT_STATS_PATH,
  loadStats,
  recordMilestones,
  renderStats,
  saveStats,
  MILESTONE_MESSAGES,
} from "./commands/stats.js";
import { renderPrComment } from "./commands/pr-comment.js";
import { renderStepSummary } from "./commands/summary.js";
// The `explain` arms' implementations. `cross-file` and `triage` live in
// `commands/milestone.ts` alongside the other milestone commands; they are
// imported here because the plan relocates them onto `explain` as flags, and
// the import is the record that the relocation happened.
import { runCrossFileCommand } from "./commands/milestone.js";
import { renderScoringPolicy, scoringPolicy } from "./scorer/scoring-policy.js";
import { runSuppressionGateCommand } from "./commands/milestone.js";
import { loadSuppressions, renderSuppressions } from "./config/suppressions.js";
import { loadSavedReport } from "./commands/report-io.js";
import { errorMessage } from "./cli-io.js";
import { renderPwRunSummary, summarizePwRun } from "./commands/pw-report.js";
import { planAndApplyFixes, renderFixReport } from "./commands/fix.js";
import { buildCatalog, renderCatalogMd } from "./commands/rules-catalog.js";
import { runCapabilityCommand } from "./commands/capability.js";
import {
  buildRuleHealth,
  renderRuleStats,
  renderRuleHealth,
} from "./commands/rule-health.js";
import { explainRule, renderExplain } from "./commands/explain.js";
import { loadConfig, ConfigValidationError } from "./config/config.js";
import { createIgnoreMatcher } from "./discovery/ignores.js";
import { loadLocalRules } from "./plugins/local-rules.js";
import { pluginsGateOpen, renderGateNotice } from "./plugins/trust-gate.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "./playwright/selector-health.js";
import { ENGINE_VERSION as CLI_VERSION } from "./engine/version.js";
import { internalErrorMessage, out, err } from "./cli-io.js";
import type { Output } from "./cli-io.js";
import { currentCommit } from "./lib/git-utils.js";

import { parseArgsOrUsage, validateScanTarget } from "./cli.js";

/**
 * Render scan output in the requested format.
 *
 * Extracted from runScanCommand (Task 6) to reduce cyclomatic complexity.
 * Handles sarif, mermaid, codequality, json, and terminal (trust-report)
 * rendering. The caller handles first-run hint + milestones separately.
 *
 * The v6 collapse's REPLACE arm (plan §3) lands here: `trust-report`,
 * `pr-comment` and `summary` were three verbs whose whole body was this
 * function with one branch each. The renderers already existed; what was
 * missing was a way to name them from the one verb a reader already knows.
 *
 * `--format trust-report` is the terminal render, which is why the `else`
 * below is spelled `terminal` and not `trust-report`: naming a default after
 * a flag that is also its value is a way to make the default untypeable.
 */
export function renderScanOutput(
  result: Awaited<ReturnType<typeof runScan>>,
  args: CliArgs,
  target: string,
  io: { out: Output; err: Output },
): void {
  if (args.format === "sarif") {
    io.out(renderSarif(result, pathToFileURL(target).href));
  } else if (args.format === "mermaid") {
    io.out(renderMermaid(result));
  } else if (args.format === "codequality") {
    io.out(renderCodeQuality(result));
  } else if (args.format === "pr-comment") {
    // The verb also diffed against the stored baseline, so a PR comment can
    // say RESOLVED as well as NEW. The flag does the same: a comment that
    // cannot distinguish a fixed finding from a fresh one is a comment that
    // reports the same churn forever.
    const baseline = loadBaseline(join(target, DEFAULT_BASELINE_PATH));
    const diff = baseline ? diffAgainstBaseline(result, baseline) : undefined;
    io.out(
      renderPrComment(result, {
        ...(diff ? { diff } : {}),
        version: CLI_VERSION,
      }),
    );
  } else if (args.format === "github-summary") {
    io.out(renderStepSummary(result));
  } else if (args.json) {
    io.out(
      JSON.stringify(
        { ...result, contract: buildMachineContract(result) },
        null,
        2,
      ),
    );
  } else {
    const categories = args.categories;
    const visible =
      categories && categories.length > 0
        ? result.findings.filter((f) => categories.includes(f.category))
        : result.findings;
    io.out(
      renderTrustReport(result, {
        isTTY: process.stdout.isTTY ?? false,
        verbose: args.verbose,
        ...(categories && categories.length > 0
          ? { visibleFindings: visible }
          : {}),
        ...(args.width !== undefined ? { width: args.width } : {}),
        ...(args.ascii !== undefined ? { ascii: args.ascii } : {}),
        ...(args.tone !== undefined ? { tone: args.tone } : {}),
        ...(args.classic ? { classic: true } : {}),
      }),
    );
  }
}

/**
 * The three REPLACE modes, each of which used to be a verb.
 *
 * They are functions rather than inline branches so each is testable on its
 * own — the retired verbs each had a spec file, and a capability that loses
 * its test the moment it becomes a flag has lost something the collapse was
 * not supposed to cost.
 */

/**
 * `--suppressions`: the ledger, and nothing else.
 *
 * Reads the TARGET's config, not the CWD, so `mjolnir scan --suppressions
 * <path>` inspects the repository it was pointed at. The retired verb read
 * the CWD; reading the target is the one behaviour change, and it is the
 * right one — a flag that ignored its own positional argument would be a flag
 * that could inspect the wrong repository while appearing to inspect the
 * right one.
 */
export function printSuppressionLedger(
  target: string,
  io: { out: Output; err: Output },
): number {
  try {
    io.out(renderSuppressions(loadSuppressions(target)));
    return EXIT_CLEAN;
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      io.err(err.message);
      return EXIT_USAGE;
    }
    internalErrorMessage(err, io.err, true);
    return EXIT_INTERNAL;
  }
}

/** `--policy`: the scoring policy in force, so it can be checked. */
export function printScoringPolicy(
  target: string,
  io: { out: Output; err: Output },
  args?: CliArgs,
): number {
  void target;
  if (args?.json === true) {
    io.out(JSON.stringify(scoringPolicy(), null, 2));
    return EXIT_CLEAN;
  }
  io.out(renderScoringPolicy());
  return EXIT_CLEAN;
}

/**
 * `--suppression-gate`: the governance judgement, after a real scan.
 *
 * It DELEGATES to the command that already implements it, by synthesising the
 * argv it would have received. Two reasons, and the second is the one that
 * decides it:
 *
 *   1. A governance rule that exists twice can disagree with itself. The
 *      retired verb's implementation reads the suppression ledger, the
 *      policy, the known-rule set and the pre-suppression findings — four
 *      inputs, any of which a copy could get subtly wrong.
 *   2. The flag and the command are the same judgement, so there must be one
 *      place that makes it. If they ever diverge, the flag is the one a reader
 *      is holding, and the verb is the one a CI job runs.
 *
 * Synthesised argv is the adapter: `scan --suppression-gate <target> --json`
 * becomes the command with the same tokens, so `--json` and `--debug` keep
 * meaning exactly what they meant.
 */
export async function runSuppressionGate(
  args: CliArgs,
  target: string,
  io: { out: Output; err: Output },
): Promise<number> {
  const argv = [target];
  if (args.json) argv.push("--json");
  if (args.debug) argv.push("--debug");
  if (args.base !== undefined) argv.push("--base", args.base);
  return runSuppressionGateCommand(argv, io);
}

export async function runScanCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return EXIT_USAGE;
  }
  const target = resolve(args.target);
  const invalid = validateScanTarget(target, io.err);
  if (invalid !== null) return invalid;
  // ── The v6 collapse's REPLACE arm (plan §3) ────────────────────────────
  //
  // Three verbs that were "scan, then do one more thing" become modes of the
  // one verb. They are handled HERE, before the scan, because two of the three
  // are "read a file and print it" — running the scan first would make a
  // ledger view depend on the code compiling, which is the dependency the
  // retired verb never had.
  //
  // `--suppression-gate` is the exception: a governance judgement about a
  // suppression needs the findings the suppression would have hidden, so it
  // falls through to the scan and is decided after it.
  if (args.suppressions) {
    return printSuppressionLedger(target, io);
  }
  if (args.policy) {
    return printScoringPolicy(target, io, args);
  }
  if (args.suppressionGate) {
    return runSuppressionGate(args, target, io);
  }
  try {
    const crashLog: string[] = [];
    const progress = new ProgressRenderer({
      stream: process.stderr,
      isTTY: shouldRenderProgress({
        isTTY: (process.stderr as { isTTY?: boolean }).isTTY === true,
        noProgress: args.noProgress === true,
        machineFormat: args.format !== "terminal",
        env: process.env,
      }),
    });
    const result = await runScan(
      { ...args, target },
      {
        onConfigWarning: (message) => io.err(message),
        onProgress: (e) => progress.onEvent(e),
        onGateNotice: (notice) => io.err(notice),
        ...(args.debug
          ? {
              onRuleCrash: (ruleId: string, file: string, error: unknown) => {
                const detail =
                  error instanceof Error
                    ? [error.message, error.stack]
                        .filter((value): value is string => Boolean(value))
                        .join("\n")
                    : String(error);
                crashLog.push(`${ruleId} crashed on ${file}: ${detail}`);
              },
            }
          : {}),
      },
    );
    progress.done();

    // `--save-baseline` writes the snapshot this scan just produced, so a
    // later scan can distinguish RESOLVED from NEW. It is a write, so a
    // failure is reported as one rather than swallowed — the scan succeeded,
    // the snapshot did not, and a reader who is told "captured" when nothing
    // was written is exactly the false-green this product exists to catch.
    if (args.saveBaseline) {
      const outPath = join(target, DEFAULT_BASELINE_PATH);
      try {
        const saved = saveBaseline(
          result,
          currentCommit(target) ?? "unknown",
          outPath,
        );
        io.out(
          renderBaselineSaved(DEFAULT_BASELINE_PATH, result.findings.length, {
            ...(saved.backupPath !== undefined
              ? { backupPath: saved.backupPath }
              : {}),
          }),
        );
      } catch (saveErr) {
        io.err(
          `baseline save FAILED — ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`,
        );
        io.err(
          "The scan completed; the snapshot was not written. Fix the path permissions and re-run with `--save-baseline`.",
        );
        return EXIT_FINDINGS;
      }
    }

    if (args.debug && crashLog.length > 0) {
      io.err(
        `debug: ${crashLog.length} rule crash(es) were swallowed by crash isolation:`,
      );
      for (const line of crashLog.slice(0, 50)) io.err(`  ${line}`);
      if (crashLog.length > 50) io.err(`  … and ${crashLog.length - 50} more`);
    }
    if (args.scoreOnly) {
      if (args.json) {
        io.err("--score overrides --json; stdout is the bare score.");
      }
      const { config: scoreConfig } = loadConfig(target, {
        knownRuleIds: KNOWN_RULE_IDS,
      });
      io.out(result.score === null ? "unknown" : String(result.score));
      // V5-002: this path used to call exitForFindings directly and never
      // look at `partial`, so `--score` on a truncated scan with zero
      // findings exited 0. `--score` is what badge and baseline tooling
      // read; a green there is a green that ships.
      return scanExitCode({
        partial: result.partial,
        findings: result.findings,
        gate:
          args.blocking === "none"
            ? "advisory"
            : (args.blocking ?? scoreConfig.gate ?? "error"),
        isAdvisory: isAdvisoryFinding,
        // `--score` is what the badge and baseline tooling read, so it has
        // to honour the same coverage law as the full report: an opt-in
        // that says "a withheld rule is a failure" has to mean it on the
        // path that feeds a green badge too.
        ...(result.analysisStatus.rulesWithheld !== undefined
          ? { rulesWithheld: result.analysisStatus.rulesWithheld }
          : {}),
        ...(args.requireFullCoverage !== undefined
          ? { requireFullCoverage: args.requireFullCoverage }
          : {}),
      });
    }

    renderScanOutput(result, args, target, io);

    if (args.format === "terminal") {
      const bareFirstRun =
        !args.scopeChanged &&
        !args.verbose &&
        args.target === "." &&
        !existsSync(join(target, "mjolnir.config.json")) &&
        result.findings.length > 0;
      if (bareFirstRun) {
        io.out(
          "  New here? `mjolnir ci install` adds this as a PR check. " +
            "`mjolnir explain <RULE-ID>` explains any finding above.\n",
        );
      }

      if (
        args.recordMilestones &&
        !result.partial &&
        result.score === 100 &&
        result.findings.length === 0
      ) {
        const statsPath = join(target, DEFAULT_STATS_PATH);
        const { newlyAnnounced, stats } = recordMilestones(
          loadStats(statsPath),
          ["first-clean-scan"],
        );
        if (newlyAnnounced.length > 0) {
          if (!saveStats(stats, statsPath)) {
            io.err(
              "  (warning: stats could not be written — read-only filesystem? milestone not recorded)",
            );
          } else {
            for (const id of newlyAnnounced) io.out(MILESTONE_MESSAGES[id]);
          }
        }
      }
    }

    if (result.partial) return EXIT_PARTIAL;
    const { config, warnings } = loadConfig(target, {
      knownRuleIds: KNOWN_RULE_IDS,
    });
    for (const w of warnings) io.err(w);
    return scanExitCode({
      partial: false,
      findings: result.findings,
      gate:
        args.blocking === "none"
          ? "advisory"
          : (args.blocking ?? config.gate ?? "error"),
      isAdvisory: isAdvisoryFinding,
      // Coverage gating is opt-in and stays opt-in. See scanExitCode for
      // why a default here would be self-defeating.
      ...(result.analysisStatus.rulesWithheld !== undefined
        ? { rulesWithheld: result.analysisStatus.rulesWithheld }
        : {}),
      ...(args.requireFullCoverage !== undefined
        ? { requireFullCoverage: args.requireFullCoverage }
        : {}),
    });
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      io.err(err.message);
      return EXIT_USAGE;
    }
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}

export async function runFixCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const dryRun = argv.includes("--dry-run");
  const args = parseArgsOrUsage(
    argv.filter((a) => a !== "--dry-run"),
    io,
  );
  if (!args) {
    return EXIT_USAGE;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target, strict: true });
    const fixes = planAndApplyFixes(result, target, { dryRun });
    io.out(renderFixReport(fixes, dryRun));
    return fixes.some((f) => f.status === "failed")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}
export async function runVerifyCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return EXIT_USAGE;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    const baselinePath = join(target, DEFAULT_BASELINE_PATH);
    const baseline = loadBaseline(baselinePath, (w) => io.err(w));
    const digest = buildVerifyDigest(result, baseline);
    io.out(renderVerifyDigest(digest));
    if (result.partial) return EXIT_PARTIAL;
    if (!digest.hasBaseline) return EXIT_PARTIAL;
    return digest.new.some((f) => f.severity === "error")
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}
export async function runPrCommentCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const fromIdx = argv.indexOf("--from");
  if (fromIdx !== -1) {
    const fromPath = argv[fromIdx + 1];
    if (!fromPath || fromPath.startsWith("-")) {
      io.err("error: --from requires a saved report path");
      return EXIT_USAGE;
    }
    try {
      const saved = loadSavedReport(resolve(fromPath));
      const option = (flag: string): string | undefined => {
        const index = argv.indexOf(flag);
        return index >= 0 ? argv[index + 1] : undefined;
      };
      const version = option("--version");
      const commit = option("--commit");
      const repoUrl = option("--repo-url");
      io.out(
        renderPrComment(saved, {
          ...(version ? { version } : {}),
          ...(commit ? { commit } : {}),
          ...(repoUrl ? { repoUrl } : {}),
        }),
      );
      return EXIT_CLEAN;
    } catch (err) {
      io.err(`error: cannot read ${fromPath}: ${errorMessage(err)}`);
      return EXIT_USAGE;
    }
  }
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return EXIT_USAGE;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    const baseline = loadBaseline(join(target, DEFAULT_BASELINE_PATH), (w) =>
      io.err(w),
    );
    const diff = baseline ? diffAgainstBaseline(result, baseline) : undefined;
    io.out(
      renderPrComment(result, {
        ...(diff ? { diff } : {}),
        version: CLI_VERSION,
      }),
    );
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}

export function runStatsCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? ".";
  try {
    const target = resolve(targetArg);
    const stats = loadStats(join(target, DEFAULT_STATS_PATH));
    io.out(renderStats(stats));
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

export async function runHandoverCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return EXIT_USAGE;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    let forensics: ReturnType<typeof buildHandover> extends never
      ? never
      : Parameters<typeof buildHandover>[1] = null;
    const resultsDir = join(target, "test-results");
    if (existsSync(resultsDir)) {
      try {
        forensics = runForensics(resultsDir, { writeFlakyMd: false }).report;
      } catch {
        /* no run data — static map only */
      }
    }
    io.out(renderHandover(buildHandover(result, forensics)));
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}
export function runPwReportCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err(
      "Usage: mjolnir explain --playwright <playwright-report.json | test-results-dir>",
    );
    return EXIT_USAGE;
  }
  try {
    const { report } = runForensics(resolve(targetArg), {
      writeFlakyMd: false,
    });
    if (report.totalTests === 0) {
      io.err(
        "No Playwright JSON report found. Add reporter: [['json', { outputFile: 'report.json' }]] to playwright.config.",
      );
      return EXIT_PARTIAL;
    }
    io.out(renderPwRunSummary(summarizePwRun(report)));
    return report.failed > 0 || report.flakyTests > 0
      ? EXIT_FINDINGS
      : EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}
export async function runRulesCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  // Flag-parity with every other subcommand: the catalogue arm accepts a
  // closed set of flags, and a flag outside it is a typo. Silently ignoring
  // it made `mjolnir explain --list --nonsense` print the full catalogue and
  // exit 0 — a caller scripting a filter got every rule and no warning. The
  // set is listed, not pattern-matched, so adding a flag is one line here and
  // the error message below is derived from the same list.
  const CATALOGUE_FLAGS = new Set([
    "--external",
    "--enable-plugins",
    "--stats",
    "--health",
    "--unmeasured",
    "--measured",
    "--md",
    "--json",
    "capability",
  ]);
  // `--limit=<n>` is a valued flag, so it is matched by prefix rather than
  // membership. Its value is validated by the `--health` arm below; here it
  // only has to be recognised so the shape is not reported as unknown.
  const unknownFlags = argv.filter(
    (a) =>
      a.startsWith("-") && !CATALOGUE_FLAGS.has(a) && !a.startsWith("--limit="),
  );
  if (unknownFlags.length > 0) {
    io.err(
      `Usage: mjolnir explain --list [--md] [--json] [--measured|--unmeasured] ` +
        `[--health [--limit=<n>]] [--stats]`,
    );
    return EXIT_USAGE;
  }

  const withExternal = argv.includes("--external");

  // The capability registry is the same evidence the rule catalog renders,
  // so it is a `rules` subcommand rather than a verb of its own.
  if (argv.includes("capability")) {
    return runCapabilityCommand(
      argv.filter((a) => a !== "capability"),
      io,
    );
  }

  if (argv.includes("--stats")) {
    io.out(renderRuleStats(buildRuleHealth()));
    return EXIT_CLEAN;
  }
  if (argv.includes("--health")) {
    const limitArg = argv.find((a) => a.startsWith("--limit="));
    if (limitArg !== undefined) {
      const rawLimit = limitArg.slice("--limit=".length);
      const parsed = /^\d+$/.test(rawLimit) ? Number(rawLimit) : Number.NaN;
      if (!Number.isSafeInteger(parsed) || parsed <= 0) {
        io.err(
          "Usage: mjolnir explain --list --health [--limit=<positive-integer>]",
        );
        return EXIT_USAGE;
      }
      io.out(renderRuleHealth(buildRuleHealth(), parsed));
      return EXIT_CLEAN;
    }
    io.out(renderRuleHealth(buildRuleHealth()));
    return EXIT_CLEAN;
  }

  const root = process.cwd();
  const gateOpen = pluginsGateOpen(argv.includes("--enable-plugins"));
  const external = withExternal
    ? await loadLocalRules(root, gateOpen)
    : undefined;
  if (external?.skipped.length) {
    io.err(
      renderGateNotice(
        external.skipped.map((name) => ({ kind: "js-module", name })),
      ),
    );
  }
  let catalog = [
    ...buildCatalog(),
    ...(external
      ? buildCatalog(external.rules, { provenance: "external" })
      : []),
  ];
  for (const w of external?.errors ?? []) io.err(`mjolnir: ${w}`);
  if (argv.includes("--unmeasured")) {
    catalog = catalog.filter((e) => e.measuredFpRate === undefined);
  } else if (argv.includes("--measured")) {
    catalog = catalog.filter((e) => e.measuredFpRate !== undefined);
  }
  if (argv.includes("--md")) {
    io.out(renderCatalogMd(catalog));
  } else {
    io.out(JSON.stringify(catalog, null, 2));
  }
  return EXIT_CLEAN;
}

/**
 * `explain` ARMS — the v6 collapse's MOVE arm, group 2 (plan §3).
 *
 * `explain` is the question verb: what does this finding mean, and what else
 * does it touch. Five capabilities were top-level verbs that all answer a
 * variation of that question, and each is a flag here:
 *
 *   --list       the rule catalogue        (was `mjolnir explain --list`)
 *   <file:line>  why this finding          (was `mjolnir explain <file:line>` — already
 *                                           delegated by the subject form)
 *   --callers    who calls this symbol     (was `mjolnir explain --callers`)
 *   --plan       what to do next           (was `mjolnir explain --plan`)
 *   --evidence   what really ran           (was the `triage` verb)
 *   --playwright a Playwright run summary  (was `mjolnir explain --playwright`)
 *
 * The table is the same shape as `CI_SUBCOMMANDS`, and for the same reason: it
 * is the single source the dispatcher reads AND the help renders from, so an
 * arm that exists is documented and one that is documented exists.
 *
 * `--playwright` is INTERNAL in the plan and marked here as such. `pw-report`
 * summarised a Playwright JSON run for a person reading CI output; the same
 * information arrives through `--evidence` once it reads a report rather than
 * a specific runner's format, and one flag that means "the run summary"
 * whichever runner produced it beats two that mean it for one of them.
 */
/**
 * `explain --evidence` — the runtime-evidence arm.
 *
 * The `triage` verb's body, verbatim in behaviour: read a real run, classify
 * every test's verdict, and render the table plus the meeting artifact. The
 * arm does not add anything, which is the point — the capability is the same
 * one `src/forensics/triage.ts` and the MCP server already expose, and the
 * reason the verb is retired is the reason the flag exists.
 *
 * `--json` and `--md` are the verb's own output selectors, preserved so a
 * script written against them keeps working with one word changed.
 *
 * The one behaviour note: the report is written to `--flaky-md`'s path, which
 * the verb also did, and the arm does not silently write a file into a
 * directory a reader did not name. `--no-md` is still how you decline it.
 */
export function runEvidenceArm(
  argv: string[],
  io: { out: Output; err: Output },
): number {
  const target = argv.find((a) => !a.startsWith("-"));
  if (target === undefined) {
    io.err("explain --evidence requires a run report: <dir-or-report.json>");
    return EXIT_USAGE;
  }
  const asJson = argv.includes("--json");
  const asMd = argv.includes("--md");
  const writeFlakyMd =
    !argv.includes("--no-flaky-md") && !argv.includes("--no-md");
  try {
    // `runForensics` is SYNCHRONOUS and returns the rendered output plus the
    // report it built. The triage renderers take the report, so the wrapper is
    // unwrapped here; the rendered half is not what the triage table is, and
    // this arm has no `--no-render` mode because the flag would be saying
    // "render the run, and also do not render the run".
    const { report } = runForensics(resolve(target), { writeFlakyMd });
    if (asJson) io.out(JSON.stringify(report, null, 2));
    else io.out(asMd ? renderTriageMd(report) : renderTriage(report));
    return report.analysisComplete === false ? EXIT_FINDINGS : EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

export const EXPLAIN_ARMS: Record<
  string,
  {
    summary: string;
    status: "public" | "internal";
    run: (
      argv: string[],
      io: { out: Output; err: Output },
    ) => Promise<number> | number;
  }
> = {
  "--list": {
    summary: "the rule catalogue, with each rule's measured FP rate",
    status: "public",
    run: (argv, io) => runRulesCommand(argv, io),
  },
  "--callers": {
    summary: "callers and callees of the symbol at <file:line>",
    status: "public",
    run: (argv, io) => runCrossFileCommand(argv, io),
  },
  "--plan": {
    summary: "the handoff: who owns what, and what to do next",
    status: "public",
    run: (argv, io) => runHandoverCommand(argv, io),
  },
  "--evidence": {
    summary: "runtime evidence from a real run: retries, flakes, durations",
    status: "public",
    run: (argv, io) => runEvidenceArm(argv, io),
  },
  "--playwright": {
    summary: "summarise a Playwright JSON run (folded into --evidence soon)",
    status: "internal",
    run: (argv, io) => runPwReportCommand(argv, io),
  },
};

/** `mjolnir explain --help`, rendered from the arm table. */
/**
 * `mjolnir explain --help`. Reached from the dispatcher, which knows which
 * verb was asked about; the arm table supplies the content.
 */
export function runExplainHelp(io: { out: Output; err: Output }): number {
  io.out(renderExplainArmsHelp());
  return EXIT_CLEAN;
}

export function renderExplainArmsHelp(): string {
  const names = Object.keys(EXPLAIN_ARMS).sort();
  const width = Math.max(...names.map((n) => n.length));
  return [
    "mjolnir explain <RULE-ID | file:line | verdict> [arms]",
    "",
    "Arms — each was a top-level verb before the v6 collapse:",
    ...names.map((n) => {
      const arm = EXPLAIN_ARMS[n];
      const mark = arm?.status === "internal" ? "  (internal)" : "";
      return `  ${n.padEnd(width)}  ${arm?.summary ?? ""}${mark}`;
    }),
    "",
    "An arm changes WHAT is asked; it never changes WHERE the answer comes",
    "from. That is why they are flags and not subcommands: `explain` is one",
    "question with five shapes, and a verb per shape was a surface to remember.",
  ].join("\n");
}
export async function runExplainCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  // The arms first: `--list` and `--plan` take no subject, and the
  // subject check below is what `mjolnir explain --plan` used to hit.
  const armFlag = argv.find((a) => EXPLAIN_ARMS[a] !== undefined);
  if (armFlag !== undefined) {
    const rest = argv.filter(
      (a, i) => i !== argv.indexOf(armFlag) && a !== armFlag,
    );
    // `--evidence <dir>` is the one arm with a required value, and it is
    // checked here rather than inside the command so the error names the
    // flag the reader typed.
    if (armFlag === "--evidence" && rest.length === 0) {
      io.err("explain --evidence requires a run report: <dir-or-report.json>");
      return EXIT_USAGE;
    }
    const arm = EXPLAIN_ARMS[armFlag];
    if (arm !== undefined) return arm.run(rest, io);
  }
  const subject = argv.find((a) => !a.startsWith("-"));
  if (!subject) {
    io.err(
      "Usage: mjolnir explain <RULE-ID | file:line | verdict> [--json <mjolnir.json>]",
    );
    io.err(renderExplainArmsHelp());
    return EXIT_USAGE;
  }
  if (subject === "verdict") {
    const jsonIdx = argv.indexOf("--json");
    const jsonPath =
      jsonIdx !== -1 ? argv[jsonIdx + 1] : join(process.cwd(), "mjolnir.json");
    if (jsonPath === undefined || jsonPath.startsWith("--")) {
      io.err("explain verdict requires a saved scan: --json <mjolnir.json>");
      return EXIT_USAGE;
    }
    try {
      const r = explainVerdict(resolve(jsonPath));
      io.out(renderVerdictExplain(r));
      return r.ok ? EXIT_CLEAN : EXIT_USAGE;
    } catch (err) {
      internalErrorMessage(err, io.err, argv.includes("--debug"));
      return EXIT_INTERNAL;
    }
  }
  if (/^[^:]+\.\w+:\d+$/.test(subject)) {
    return runWhyCommand([subject, ...argv.filter((a) => a !== subject)], io);
  }
  const fixturesRootIdx = argv.indexOf("--fixtures-root");
  if (
    fixturesRootIdx !== -1 &&
    (fixturesRootIdx + 1 >= argv.length ||
      argv[fixturesRootIdx + 1]?.startsWith("--"))
  ) {
    io.err(
      "--fixtures-root requires a value: mjolnir explain <RULE-ID> --fixtures-root <dir>",
    );
    return EXIT_USAGE;
  }
  const explicitRoot =
    fixturesRootIdx !== -1 ? argv[fixturesRootIdx + 1] : undefined;
  const fixturesRoot = resolve(
    explicitRoot ?? join(process.cwd(), "tests", "fixtures"),
  );
  try {
    const result = explainRule(subject, fixturesRoot);
    io.out(renderExplain(result));
    if (!result.ok) return EXIT_USAGE;
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

export async function runDoctorPlaywright(
  argv: string[],
  io: { out: Output; err?: Output } = { out },
): Promise<number> {
  try {
    const targetArg =
      argv.find((a) => !a.startsWith("-") && a !== "doctor:playwright") ?? ".";
    const target = resolve(targetArg);
    const invalid = validateScanTarget(target, io.err ?? err);
    if (invalid !== null) return invalid;
    const args: CliArgs = {
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      enablePlugins: argv.includes("--enable-plugins"),
    };
    const result = await runScan({ ...args, target });
    const pwFindings = result.findings.filter((f) => f.category === "QA-PW");
    io.out(
      renderTerminal(
        { ...result, findings: pwFindings },
        { isTTY: process.stdout.isTTY ?? false, verbose: args.verbose },
      ),
    );

    const specs = computeSelectorHealth(target, createIgnoreMatcher(target));
    io.out(renderSelectorHealth(specs));
    return EXIT_CLEAN;
  } catch (e) {
    if (e instanceof ConfigValidationError) {
      (io.err ?? err)(e.message);
      return EXIT_USAGE;
    }
    (io.err ?? err)(
      "mjolnir internal error:",
      e instanceof Error ? e.message : String(e),
    );
    return EXIT_INTERNAL;
  }
}
