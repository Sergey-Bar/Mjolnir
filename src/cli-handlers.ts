/**
 * Handler functions for every Mjolnir CLI verb.
 *
 * Extracted from cli.ts to keep the entry-point module under 800 lines
 * (Task 8) and to isolate the rendering dispatch for runScanCommand
 * (Task 6: renderScanOutput helper).
 */

import { existsSync, readFileSync, statSync } from "node:fs";

import { join, dirname, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  EXIT_CLEAN,
  EXIT_FINDINGS,
  EXIT_PARTIAL,
  EXIT_USAGE,
  EXIT_INTERNAL,
} from "./exit-codes.js";
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
import { explainVerdict, renderVerdictExplain } from "./commands/explain.js";
import { runForensics } from "./forensics/run.js";
import {
  renderTriage,
  renderTriageMd,
  renderTriageWorkflow,
  renderTriageWorkflowJson,
} from "./forensics/triage.js";
import {
  parseStrykerJson,
  looksLikeStrykerJson,
} from "./mutation/parse-stryker.js";
import { looksLikeMutmutXml, parseMutmutXml } from "./mutation/parse-mutmut.js";
import {
  renderMutationSummary,
  stampMutationEvidence,
} from "./mutation/derive.js";
import type { MutationReport } from "./mutation/types.js";
import { renderBadgeSnippet, writeBadge } from "./commands/badge.js";
import { renderDebt } from "./commands/debt.js";
import {
  createRuleScaffold,
  renderScaffoldReport,
} from "./commands/create-rule.js";
import { buildHandover, renderHandover } from "./commands/handover.js";
import { computeImpact, renderImpact } from "./commands/impact.js";
import {
  DEFAULT_BASELINE_PATH,
  diffAgainstBaseline,
  loadBaseline,
  renderBaselineDiff,
  renderBaselineSaved,
  saveBaseline,
} from "./commands/baseline.js";
import { buildVerifyDigest, renderVerifyDigest } from "./commands/verify.js";
import {
  DEFAULT_STATS_PATH,
  loadStats,
  recordMilestones,
  recordResolved,
  renderStats,
  saveStats,
  MILESTONE_MESSAGES,
} from "./commands/stats.js";
import { renderPrComment } from "./commands/pr-comment.js";
import { runInit, renderInit, tryReadPackageJson } from "./commands/init.js";
import { renderPwRunSummary, summarizePwRun } from "./commands/pw-report.js";
import { planAndApplyFixes, renderFixReport } from "./commands/fix.js";
import { buildCatalog, renderCatalogMd } from "./commands/rules-catalog.js";
import { explainRule, renderExplain } from "./commands/explain.js";
import { loadConfig, ConfigValidationError } from "./config/config.js";
import { createIgnoreMatcher } from "./discovery/ignores.js";
import { loadLocalRules } from "./plugins/local-rules.js";
import { writeFileAtomic } from "./lib/fs-atomic.js";
import { currentCommit } from "./lib/git-utils.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "./playwright/selector-health.js";
import { ENGINE_VERSION as CLI_VERSION } from "./engine/version.js";
import { internalErrorMessage, out, err } from "./cli-io.js";
import type { Output } from "./cli-io.js";

import {
  parseArgs,
  parseArgsOrUsage,
  validateScanTarget,
  exitForFindings,
} from "./cli.js";

/**
 * Render scan output in the requested format.
 *
 * Extracted from runScanCommand (Task 6) to reduce cyclomatic complexity.
 * Handles sarif, mermaid, codequality, json, and terminal (trust-report)
 * rendering. The caller handles first-run hint + milestones separately.
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
                crashLog.push(
                  `${ruleId} crashed on ${file}: ${error instanceof Error ? error.message : String(error)}`,
                );
              },
            }
          : {}),
      },
    );
    progress.done();
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
      return exitForFindings(
        result.findings,
        args.blocking === "none"
          ? "advisory"
          : (args.blocking ?? scoreConfig.gate ?? "error"),
      );
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
    return exitForFindings(
      result.findings,
      args.blocking === "none"
        ? "advisory"
        : (args.blocking ?? config.gate ?? "error"),
    );
  } catch (err) {
    if (err instanceof ConfigValidationError) {
      io.err(err.message);
      return EXIT_USAGE;
    }
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}

export function runTriageCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err(
      "Usage: mjolnir triage <test-results-dir-or-report-file> [--no-md] [--json] [--classic]",
    );
    return EXIT_USAGE;
  }
  const jsonMode = argv.includes("--json");
  const classic = argv.includes("--classic");
  try {
    const { report } = runForensics(resolve(targetArg), {
      writeFlakyMd: false,
    });
    if (jsonMode) {
      io.out(renderTriageWorkflowJson(report));
    } else if (classic) {
      io.out(renderTriage(report));
    } else {
      io.out(renderTriageWorkflow(report));
    }
    if (!argv.includes("--no-md") && !jsonMode && report.totalTests > 0) {
      const absTarget = resolve(targetArg);
      const mdPath = statSync(absTarget).isDirectory()
        ? join(absTarget, "TRIAGE.md")
        : join(dirname(absTarget), "TRIAGE.md");
      writeFileAtomic(mdPath, renderTriageMd(report));
      io.out(`\nWrote ${mdPath}`);
    }
    if (report.totalTests === 0) {
      io.err(
        "No test results recognized. Expected a Playwright JSON report (report.json) or JUnit XML files.",
      );
      return EXIT_PARTIAL;
    }
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

function ingestMutationReport(text: string): MutationReport {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<testsuite")) {
    return parseMutmutXml(text);
  }
  try {
    const json: unknown = JSON.parse(text);
    if (looksLikeStrykerJson(json)) return parseStrykerJson(json);
  } catch {
    /* not JSON — fall through */
  }
  if (looksLikeMutmutXml(text)) return parseMutmutXml(text);
  return { tool: "stryker", survived: [], noCoverage: 0, killed: 0 };
}

export async function runMutationCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err("Usage: mjolnir mutation <mutation-report> [--scan <path>]");
    return EXIT_USAGE;
  }
  const scanIdx = argv.indexOf("--scan");
  const scanArg = scanIdx !== -1 ? argv[scanIdx + 1] : undefined;
  if (scanIdx !== -1 && (!scanArg || scanArg.startsWith("-"))) {
    io.err("--scan requires a path argument");
    return EXIT_USAGE;
  }
  let report: MutationReport;
  try {
    const path = resolve(targetArg);
    if (!existsSync(path)) {
      io.err(`No such file: ${path}`);
      return EXIT_PARTIAL;
    }
    const text = readFileSync(path, "utf8");
    report = ingestMutationReport(text);
    if (
      report.survived.length === 0 &&
      report.killed === 0 &&
      report.noCoverage === 0
    ) {
      io.err(
        "No mutants recognized. Expected a Stryker JSON report (mutation-report.json) or a mutmut junitxml report.",
      );
      return EXIT_PARTIAL;
    }
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
  io.out(renderMutationSummary(report));

  if (scanArg === undefined) return EXIT_CLEAN;
  try {
    const scanPath = resolve(scanArg);
    const invalid = validateScanTarget(scanPath, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({
      target: scanPath,
      json: true,
      verbose: true,
      maxDurationMs: 120_000,
      scopeChanged: false,
      format: "json",
    });
    const stats = stampMutationEvidence(result.findings, report);
    io.out("");
    if (stats.stamped === 0) {
      io.out(
        "No findings intersect the survived-mutant surface — nothing to derive.",
      );
    } else {
      io.out(
        `${stats.stamped} finding(s) carry mutationEvidence (${stats.derived} consolidated E1→E2 by derivation — docs/RULE-LIFECYCLE.md):`,
      );
      for (const f of result.findings) {
        if (!f.mutationEvidence) continue;
        io.out(
          `  ${f.ruleId} ${f.file}:${f.line} — ${f.evidenceLevel} · ` +
            `${f.mutationEvidence.matchedMutants} mutant(s) @ ${f.mutationEvidence.granularity} granularity`,
        );
      }
      io.out("");
      io.out(
        "Machine form: re-run with --json — mutationEvidence rides the findings additively.",
      );
    }
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

export async function runBadgeCommand(
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
    const outPath = writeBadge(result, {
      outDir: target,
      commit: currentCommit(target) ?? "unknown",
    });
    io.out(`Wrote ${outPath}`);
    io.out("");
    io.out(renderBadgeSnippet(result));
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}

export async function runDebtCommand(
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
    io.out(renderDebt(result));
    return EXIT_CLEAN;
  } catch (err) {
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

export function runCreateRuleCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const id = argv.find((a) => /^QA-[A-Z]+-\d{3}$/.test(a));
  const titleIdx = argv.indexOf("--title");
  const title = titleIdx !== -1 ? argv[titleIdx + 1] : undefined;
  if (!id || !title) {
    io.err('Usage: mjolnir create-rule <QA-XXX-nnn> --title "Rule title"');
    io.err("Families: QA-TEST · QA-TQUAL · QA-PW · QA-CI · QA-PY");
    return EXIT_USAGE;
  }
  try {
    const result = createRuleScaffold({ id, title }, process.cwd());
    io.out(renderScaffoldReport(result));
    return result.ok ? EXIT_CLEAN : EXIT_FINDINGS;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
    return EXIT_INTERNAL;
  }
}

export async function runImpactCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const sinceIdx = argv.indexOf("--since");
  if (
    sinceIdx !== -1 &&
    (sinceIdx + 1 >= argv.length || argv[sinceIdx + 1]?.startsWith("--"))
  ) {
    io.err("--since requires a value: mjolnir impact [--since <ref>]");
    return EXIT_USAGE;
  }
  const since = sinceIdx !== -1 ? argv[sinceIdx + 1] : undefined;
  const args = parseArgs(
    sinceIdx === -1
      ? argv
      : argv.filter((_a, i) => i !== sinceIdx && i !== sinceIdx + 1),
  );
  if (!args) {
    return EXIT_USAGE;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const report = await computeImpact(target, {
      ...(since ? { since } : {}),
      runScan: (dir) => runScan({ ...args, target: dir }),
    });
    io.out(renderImpact(report));
    return report.hasComparison ? EXIT_CLEAN : EXIT_PARTIAL;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return EXIT_INTERNAL;
  }
}

export async function runBaselineCommand(
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
    const outPath = join(target, DEFAULT_BASELINE_PATH);
    let saved: ReturnType<typeof saveBaseline>;
    try {
      saved = saveBaseline(result, currentCommit(target) ?? "unknown", outPath);
    } catch (saveErr) {
      io.err(
        `baseline save FAILED — ${saveErr instanceof Error ? saveErr.message : String(saveErr)}`,
      );
      io.err(
        "The scan completed; the snapshot was not written. Fix the path permissions and re-run `mjolnir baseline`.",
      );
      return EXIT_FINDINGS;
    }
    io.out(
      renderBaselineSaved(DEFAULT_BASELINE_PATH, result.findings.length, {
        ...(saved.backupPath !== undefined
          ? { backupPath: saved.backupPath }
          : {}),
      }),
    );
    return EXIT_CLEAN;
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

export async function runDiffCommand(
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
    const diff = diffAgainstBaseline(result, baseline);
    io.out(renderBaselineDiff(diff));

    if (result.partial) return EXIT_PARTIAL;

    if (diff.hasBaseline) {
      const statsPath = join(target, DEFAULT_STATS_PATH);
      const stats = recordResolved(loadStats(statsPath), diff);
      if (!saveStats(stats, statsPath)) {
        io.err(
          "  (warning: stats could not be written — read-only filesystem? counters not recorded)",
        );
      }

      if (
        diff.resolvedFindings.some(
          (f) => f.resolution.status === "VERIFIED-RESOLVED",
        )
      ) {
        const milestone = recordMilestones(stats, ["first-debt-reduction"]);
        if (milestone.newlyAnnounced.length > 0) {
          if (saveStats(milestone.stats, statsPath)) {
            for (const id of milestone.newlyAnnounced)
              io.out(MILESTONE_MESSAGES[id]);
          } else {
            io.err(
              "  (warning: stats could not be written — read-only filesystem? milestone not recorded)",
            );
          }
        }
      }
    }

    if (!diff.hasBaseline) return EXIT_PARTIAL;
    return diff.newFindings.some((f) => f.severity === "error")
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

export function runInitCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  try {
    const rootDir = process.cwd();
    const pkg = tryReadPackageJson(rootDir);
    const workspace = pkg
      ? {
          root: rootDir,
          name: typeof pkg["name"] === "string" ? pkg["name"] : "repo",
          packageJson: pkg,
          workspaceGlobs: [],
        }
      : null;
    const result = runInit(rootDir, workspace, {
      interactive: argv.includes("--interactive"),
    });
    io.out(renderInit(result));
    return EXIT_CLEAN;
  } catch (err) {
    internalErrorMessage(err, io.err, argv.includes("--debug"));
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
      "Usage: mjolnir pw-report <playwright-report.json | test-results-dir>",
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

export function runForensicsCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const noMd = argv.includes("--no-flaky-md");
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err(
      "Usage: mjolnir forensics <test-results-dir-or-report-file> [--no-flaky-md]",
    );
    return EXIT_USAGE;
  }
  try {
    const { report, output, flakyMdPath } = runForensics(resolve(targetArg), {
      writeFlakyMd: !noMd,
    });
    io.out(output);
    if (flakyMdPath) io.out(`\nWrote ${flakyMdPath}`);
    if (!report.analysisComplete) {
      io.err(
        `forensics: ${report.skippedReports} report(s) skipped (${report.incompleteReasons.join(", ")}) — analysis is partial`,
      );
    }
    if (report.totalTests === 0) {
      io.err(
        "No test results recognized. Expected a Playwright JSON report (report.json) or JUnit XML files.",
      );
      return EXIT_PARTIAL;
    }
    return report.flakyTests > 0 || report.failed > 0
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
  const withExternal = argv.includes("--external");
  const root = process.cwd();
  const external = withExternal ? await loadLocalRules(root) : undefined;
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

export async function runExplainCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const subject = argv.find((a) => !a.startsWith("-"));
  if (!subject) {
    io.err(
      "Usage: mjolnir explain <RULE-ID | file:line | verdict> [--json <mjolnir.json>]",
    );
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
