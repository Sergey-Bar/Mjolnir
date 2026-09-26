#!/usr/bin/env node
/**
 * Mjölnir CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  RULE_CATEGORIES,
  SCHEMA_VERSION,
  type Finding,
  type RuleCategory,
  isAdvisoryFinding,
} from "./types.js";
import { EXIT_CLEAN, EXIT_USAGE, EXIT_INTERNAL } from "./exit-codes.js";
// The one exit-code matrix (plan V5-002). Every surface that finishes an
// analysis routes its determination through this module.
import { scanExitCode } from "./claim-evidence.js";
// M6 (blueprint §9.2): the canonical scan pipeline lives in
// engine/scan-pipeline.ts — cli.ts is presentation + argument parsing.
// The namespace import keeps the historical import surface working
// (tests import runScan and friends from cli.js) while every scan
// semantic is owned by the pipeline module.
import * as pipeline from "./engine/scan-pipeline.js";
export const {
  runScan,
  buildUniversalRules,
  fallbackWorkspace,
  pathMatchesGlob,
  isValidFindingRecord,
  discoverAndParseRuntimeReport,
  KNOWN_RULE_IDS,
  OVERLAP_META_BY_RULE_ID,
  EVIDENCE_OVERRIDES,
  SUITE_INVALIDATING_RULE_IDS,
} = pipeline;
export type { ScanHooks, CliArgs } from "./engine/scan-pipeline.js";
import type { CliArgs } from "./engine/scan-pipeline.js";

import {
  renderRootHelp,
  renderVerbHelp,
  hasVerbHelp,
} from "./commands/help.js";
import {
  captureInternalError,
  flushSentry,
  initSentry,
} from "./integrations/sentry.js";
import { loadSuppressions, renderSuppressions } from "./config/suppressions.js";
import { ConfigValidationError } from "./config/config.js";
import { ciInstall, type GateLevel } from "./integrations/ci-install.js";
import { runStdioTransport } from "./mcp/transport.js";

/**
 * Tool version for `mjolnir --version`.
 *
 * A literal, not a package.json read: the shipped artifact is a single
 * bundled `dist/cli.mjs`, so resolving package.json at runtime depends on
 * where the file happens to sit after install. This follows the same
 * discipline as SARIF's `driver.version` — kept in sync by
 * `scripts/sync-sarif-version.cjs` on release and guarded by
 * `tests/version-consistency.spec.ts` locally. R4c moved the literal to
 * src/engine/version.ts (a leaf module) so the scan pipeline's run
 * identity can carry it without a cli.ts import cycle; this re-export
 * keeps every existing consumer stable.
 */
import { ENGINE_VERSION as CLI_VERSION } from "./engine/version.js";
export { CLI_VERSION };

/** A usage-error detail: the offending token, when one exists. */
export interface UsageErrorDetail {
  /** The unknown flag or rejected value (e.g. `--nope`, `loud`). */
  token?: string | undefined;
  /** The flag whose value was rejected (`--tone` for `--tone loud`). */
  flag?: string | undefined;
}

export const DEFAULT_MAX_DURATION_MS = 600_000;
export const MAX_DURATION_MS = 3_600_000;

export function parseArgs(
  argv: string[],
  onError?: (detail: UsageErrorDetail) => void,
): CliArgs | null {
  const args: CliArgs = {
    target: ".",
    json: false,
    verbose: false,
    maxDurationMs: DEFAULT_MAX_DURATION_MS,
    scopeChanged: false,
    format: "terminal",
  };
  const reject = (detail: UsageErrorDetail): null => {
    onError?.(detail);
    return null;
  };
  for (let i = 0; i < argv.length; i++) {
    const a: string = argv[i] ?? "";
    if (a === "--json") {
      args.json = true;
      args.format = "json";
    } else if (a === "--format") {
      const fmt = argv[++i];
      if (fmt === undefined)
        return reject({ flag: "--format", token: "(missing)" });
      if (fmt === "sarif") args.format = "sarif";
      else if (fmt === "mermaid") args.format = "mermaid";
      else if (fmt === "codequality") args.format = "codequality";
      else if (fmt === "json") {
        args.format = "json";
        args.json = true;
      } else if (fmt !== "terminal")
        return reject({ flag: "--format", token: fmt });
    } else if (a === "--verbose") args.verbose = true;
    else if (a === "--scope") {
      const mode = argv[++i];
      if (mode === "changed") args.scopeChanged = true;
      else return reject({ flag: "--scope", token: mode });
    } else if (a === "--base") {
      const ref = argv[++i];
      if (!ref || ref.startsWith("-"))
        return reject({ flag: "--base", token: ref });
      args.base = ref;
    } else if (a === "--max-duration") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0 || v * 1000 > MAX_DURATION_MS)
        return reject({ flag: "--max-duration", token: argv[i] });
      args.maxDurationMs = v * 1000;
    } else if (a === "--width") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0)
        return reject({ flag: "--width", token: argv[i] });
      args.width = v;
    } else if (a === "--ascii") {
      args.ascii = true;
    } else if (a === "--no-ascii") {
      args.ascii = false;
    } else if (a === "--tone") {
      const tone = argv[++i];
      if (tone === "blunt") args.tone = "blunt";
      else return reject({ flag: "--tone", token: tone });
    } else if (a === "--strict") {
      args.strict = true;
    } else if (a === "--debug") {
      args.debug = true;
    } else if (a === "--record-milestones") {
      args.recordMilestones = true;
    } else if (a === "--cache") {
      args.cache = true;
    } else if (a === "--no-progress") {
      args.noProgress = true;
    } else if (a === "--category") {
      const cat = argv[++i];
      const valid: readonly string[] = RULE_CATEGORIES;
      if (cat === undefined || !valid.includes(cat)) {
        return reject({ flag: "--category", token: cat });
      }
      args.categories = [...(args.categories ?? []), cat as RuleCategory];
    } else if (a === "--score") {
      args.scoreOnly = true;
    } else if (a === "--staged") {
      args.staged = true;
    } else if (a === "--blocking") {
      const level = argv[++i];
      if (level === "error" || level === "warning" || level === "none") {
        args.blocking = level;
      } else {
        return reject({ flag: "--blocking", token: level });
      }
    } else if (a === "--enable-plugins") {
      args.enablePlugins = true;
    } else if (a === "--classic") {
      args.classic = true;
    } else if (a === "--monorepo") {
      args.monorepo = true;
    } else if (a === "--help" || a === "-h") {
      return null;
    } else if (!a.startsWith("-")) {
      args.target = a;
    } else {
      return reject({ token: a });
    }
  }
  return args;
}

/** Scan flags that exist — the "did you mean" candidate pool. */
const KNOWN_SCAN_FLAGS = [
  "--json",
  "--format",
  "--verbose",
  "--scope",
  "--base",
  "--max-duration",
  "--width",
  "--ascii",
  "--no-ascii",
  "--tone",
  "--classic",
  "--strict",
  "--debug",
  "--record-milestones",
  "--cache",
  "--monorepo",
  "--help",
  "-h",
  "--version",
  "-v",
  "--dry-run",
];

/** Hand-rolled Levenshtein distance (plan M2: no new dependencies). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const memo = new Map<string, number>();
  const walk = (i: number, j: number): number => {
    if (i === a.length) return b.length - j;
    if (j === b.length) return a.length - i;
    const key = `${i}:${j}`;
    const hit = memo.get(key);
    if (hit !== undefined) return hit;
    const cost = a[i] === b[j] ? 0 : 1;
    const best = Math.min(
      walk(i + 1, j) + 1,
      walk(i, j + 1) + 1,
      walk(i + 1, j + 1) + cost,
    );
    memo.set(key, best);
    return best;
  };
  return walk(0, 0);
}

/** Nearest known flags within distance ≤ 2, nearest first. */
export function nearestFlags(flag: string, max = 3): string[] {
  return KNOWN_SCAN_FLAGS.map((f) => ({ f, d: levenshtein(flag, f) }))
    .filter((x) => x.d <= 2)
    .sort((x, y) => x.d - y.d)
    .slice(0, max)
    .map((x) => x.f);
}

/**
 * Friendly usage error (plan M2, exit 10 preserved): nearest-flag
 * suggestion, the valid neighbors, and the exact help command. Printed
 * to stderr; findings/usage stay on their documented streams.
 */
export function usageErrorMessage(detail: UsageErrorDetail): string {
  const lines: string[] = [];
  if (detail.flag) {
    lines.push(
      `mjolnir: invalid value "${detail.token ?? ""}" for ${detail.flag}`,
    );
  } else {
    lines.push(`mjolnir: unknown flag "${detail.token ?? ""}"`);
  }
  if (detail.token) {
    const near = nearestFlags(detail.token);
    if (near.length > 0) {
      lines.push(`  Did you mean: ${near.join("  ")}`);
    }
  }
  lines.push(`  Run mjolnir --help for the full flag list.`);
  return lines.join("\n");
}

/**
 * Shared parse-or-report path for scan-backed subcommands: friendly
 * usage errors on stderr (exit 10), the full overview only for an
 * explicit help flag. Returns null when the caller must exit 10.
 */
export function parseArgsOrUsage(
  argv: string[],
  io: { out: Output; err: Output },
): CliArgs | null {
  let reported = false;
  const args = parseArgs(argv, (detail) => {
    reported = true;
    io.err(usageErrorMessage(detail));
  });
  if (!args && !reported) printUsage(io.out, resolveHelpWidth(argv));
  return args;
}

/**
 * Resolves the effective terminal width for help rendering. Scans the
 * raw argv for `--width <cols>` (the help path runs before full arg
 * parsing, so we read it directly); falls back to the detected TTY
 * column width, then the default help width of 88.
 */
function resolveHelpWidth(argv: string[]): number {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--width") {
      const v = Number(argv[i + 1]);
      if (Number.isFinite(v)) return Math.max(1, Math.floor(v));
    }
  }
  return process.stdout.columns ?? 88;
}

import type { Output } from "./cli-io.js";
export type { Output };

import { out, err } from "./cli-io.js";
import { internalErrorMessage } from "./cli-io.js";
export { out, err, internalErrorMessage } from "./cli-io.js";

/**
 * Audit H-4 (extended to every scanning subcommand): a nonexistent or
 * non-directory target is a usage error — a typo'd CI path must be a
 * loud red, never a silent green. Returns the exit code (10) or null
 * when the target is valid.
 */
export function validateScanTarget(target: string, err: Output): number | null {
  if (!existsSync(target)) {
    err(`mjolnir: scan target does not exist: ${target}`);
    return EXIT_USAGE;
  }
  if (!statSync(target).isDirectory()) {
    err(`mjolnir: scan target is not a directory: ${target}`);
    return EXIT_USAGE;
  }
  return null;
}

/**
 * Exit-code decision for findings only (audit H-7): the previously-dead
 * config.gate field selects which severities block. Advisory (E0) findings
 * never gate at any level.
 *
 * This is a findings-only view of the one exit matrix in `claim-evidence`.
 * Callers that have just finished an ANALYSIS must use `scanExitCode`
 * instead — this function cannot see `partial`, and a truncated scan with
 * zero findings is exactly the case that turns a bug into a green build.
 */
export function exitForFindings(
  findings: readonly Finding[],
  gate: "advisory" | "error" | "warning",
): number {
  return scanExitCode({
    partial: false,
    findings,
    gate,
    isAdvisory: isAdvisoryFinding,
  });
}

/** Testable `ci install` handler. Returns the process exit code. */
export function runCiInstall(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  let gateArg: string | undefined;
  let gateSeen = false;
  let force = false;
  let noAction = false;
  const unknown: string[] = [];
  for (const arg of argv) {
    if (arg === "--gate") {
      gateSeen = true;
    } else if (arg === "--force") {
      force = true;
    } else if (arg === "--no-action") {
      noAction = true;
    } else if (gateSeen && gateArg === undefined && !arg.startsWith("--")) {
      gateArg = arg;
    } else {
      unknown.push(arg);
    }
  }
  if (gateSeen && gateArg === undefined) {
    io.err("--gate requires a value. Use: advisory | error | warning");
    return EXIT_USAGE;
  }
  if (unknown.length > 0) {
    io.err(`Unknown argument(s): ${unknown.join(" ")}`);
    return EXIT_USAGE;
  }
  if (gateArg && !["advisory", "error", "warning"].includes(gateArg)) {
    io.err("Unknown gate level. Use: advisory | error | warning");
    return EXIT_USAGE;
  }
  const gate = (gateArg as GateLevel | undefined) ?? "advisory";
  const result = ciInstall(resolve("."), gate, {
    force,
    action: !noAction,
  });
  if (result.refused) {
    io.err(
      `Refusing to overwrite the customized workflow at ${result.written}.`,
    );
    io.err("The file differs from the template Mjölnir would write:");
    for (const line of result.diffSummary) io.err(line);
    io.err("Re-run with --force to replace it with the generated template.");
    return EXIT_USAGE;
  }
  io.out(`${result.existed ? "Updated" : "Created"} ${result.written}`);
  io.out(
    noAction
      ? `Plain-npx template (--no-action). Gate: ${gate}.`
      : `Action-based template: uses Sergey-Bar/Mjolnir@4a588bc62d517bc85fc44c0eae64c6587d3bf70b0 (immutable pin). Gate: ${gate}.`,
  );
  io.out(
    gate === "advisory"
      ? "Advisory mode reports findings without blocking. Opt in with --gate error or --gate warning."
      : `Blocking mode fails on ${gate} findings.`,
  );
  io.out("Change with: mjolnir ci install --gate error|warning|advisory");
  if (!noAction) {
    io.out("Prefer the plain-npx workflow? Re-run with --no-action.");
  }
  return EXIT_CLEAN;
}

/** Testable `suppressions` handler. */
export function runSuppressions(
  io: { out: Output; err?: Output } = { out },
): number {
  try {
    io.out(renderSuppressions(loadSuppressions(resolve("."))));
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

/**
 * Audit S8: the subcommand registry. Every verb name main() dispatches
 * on lives here — a first token that is neither a registered subcommand
 * nor an existing path is a TYPO, and a typo must not silently fall
 * through to a scan of whatever the remaining arguments parse to.
 */
const SUBCOMMANDS: ReadonlySet<string> = new Set(CLI_COMMAND_NAMES);

// Handler imports — the bulk of verb implementations live in cli-handlers.ts
// to keep this entry-point module under 800 lines (Task 8).
import {
  runScanCommand,
  runForensicsCommand,
  runTriageCommand,
  runMutationCommand,
  runBadgeCommand,
  runDebtCommand,
  runFixCommand,
  runCreateRuleCommand,
  runImpactCommand,
  runBaselineCommand,
  runDiffCommand,
  runVerifyCommand,
  runPrCommentCommand,
  runStatsCommand,
  runHandoverCommand,
  runInitCommand,
  runPwReportCommand,
  runRulesCommand,
  runExplainCommand,
  runDoctorPlaywright,
} from "./cli-handlers.js";

// Re-export handler functions so tests importing from "cli.js" still work.
export {
  runScanCommand,
  renderScanOutput,
  runForensicsCommand,
  runTriageCommand,
  runMutationCommand,
  runBadgeCommand,
  runDebtCommand,
  runFixCommand,
  runCreateRuleCommand,
  runImpactCommand,
  runBaselineCommand,
  runDiffCommand,
  runVerifyCommand,
  runPrCommentCommand,
  runStatsCommand,
  runHandoverCommand,
  runInitCommand,
  runPwReportCommand,
  runRulesCommand,
  runExplainCommand,
  runDoctorPlaywright,
} from "./cli-handlers.js";

import { runDoctorCommand } from "./commands/doctor-run.js";
import { runSummaryCommand } from "./commands/summary.js";
import { runWhyCommand } from "./commands/why.js";
import { runHandoffCommand } from "./commands/handoff.js";
import { runInstallCommand } from "./commands/install-agents.js";
import { runTrustReportCommand } from "./commands/trust-report.js";
import { runReleaseTrustCommand } from "./commands/release-trust.js";
import { runBusinessCaseCommand } from "./commands/business-case.js";
import { runReleaseReportCommand } from "./commands/release-report.js";
import { runReportPlaywrightCommand } from "./commands/report-playwright.js";
import { runTrendCommand } from "./commands/trend.js";
import { runExecReportCommand } from "./commands/exec-report.js";
import { runPolicyCommand } from "./commands/policy.js";
import { runQuarantineCommand } from "./commands/quarantine.js";
import { runAnalyzeCommand } from "./commands/analyze.js";
import { runCiAdapterCommand } from "./commands/ci-adapter.js";
import { runDashboardCommand } from "./commands/dashboard.js";
import { runEnterpriseCommand } from "./commands/enterprise.js";
import { runMaturityCommand } from "./commands/maturity.js";
import { CLI_COMMAND_NAMES } from "./engine/cli-command-names.js";
import {
  runCIIntegrityCommand,
  runContractVerifyCommand,
  runCrossFileCommand,
  runEvidenceGraphCommand,
  runFrameworkMaturityCommand,
  runSuppressionGateCommand,
  runTrustTrendCommand,
} from "./commands/milestone.js";

export {
  runDoctorCommand,
  runSummaryCommand,
  runWhyCommand,
  runHandoffCommand,
  runInstallCommand,
  runTrustReportCommand,
  runReleaseTrustCommand,
  runBusinessCaseCommand,
  runReleaseReportCommand,
  runReportPlaywrightCommand,
  runTrendCommand,
  runExecReportCommand,
  runPolicyCommand,
  runQuarantineCommand,
  runAnalyzeCommand,
  runCiAdapterCommand,
  runDashboardCommand,
  runEnterpriseCommand,
  runMaturityCommand,
  runCIIntegrityCommand,
  runContractVerifyCommand,
  runCrossFileCommand,
  runEvidenceGraphCommand,
  runFrameworkMaturityCommand,
  runSuppressionGateCommand,
  runTrustTrendCommand,
};

export function printUsage(
  print: (s: string) => void,
  width: number = 88,
): void {
  print(renderRootHelp(1, { width }));
}

export async function main(
  argv: string[] = process.argv.slice(2),
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  if (argv[0] === "--version" || argv[0] === "-v") {
    io.out(`mjolnir-qa ${CLI_VERSION}`);
    return EXIT_CLEAN;
  }
  if (argv[0] === "--help" || argv[0] === "-h") {
    return runHelpCommand([], io);
  }
  if (argv.length >= 2 && (argv[1] === "--help" || argv[1] === "-h")) {
    return runHelpCommand([argv[0] as string], io);
  }
  if (
    argv[0] === "ci" &&
    argv.length >= 3 &&
    (argv[2] === "--help" || argv[2] === "-h")
  ) {
    return runHelpCommand(["ci", "install"], io);
  }
  if (argv[0] === "ci" && argv[1] === "install")
    return runCiInstall(argv.slice(2), io);
  type VerbHandler = (
    argv: string[],
    io: { out: Output; err: Output },
  ) => Promise<number> | number;
  const VERBS: Record<string, VerbHandler | undefined> = {
    scan: (a, o) => runScanCommand(a, o),
    suppressions: (_a, o) => runSuppressions(o),
    forensics: (a, o) => runForensicsCommand(a, o),
    triage: (a, o) => runTriageCommand(a, o),
    mutation: (a, o) => runMutationCommand(a, o),
    badge: (a, o) => runBadgeCommand(a, o),
    "trust-report": (a, o) => runTrustReportCommand(a, o),
    debt: (a, o) => runDebtCommand(a, o),
    impact: (a, o) => runImpactCommand(a, o),
    "business-case": (a, o) => runBusinessCaseCommand(a, o),
    "release-report": (a, o) => runReleaseReportCommand(a, o),
    report: (a, o) => runReportPlaywrightCommand(a, o),
    trend: (a, o) => runTrendCommand(a, o),
    "exec-report": (a, o) => runExecReportCommand(a, o),
    policy: (a, o) => runPolicyCommand(a, o),
    quarantine: (a, o) => runQuarantineCommand(a, o),
    analyze: (a, o) => runAnalyzeCommand(a, o),
    "ci-adapter": (a, o) => runCiAdapterCommand(a, o),
    dashboard: (a, o) => runDashboardCommand(a, o),
    enterprise: (a, o) => runEnterpriseCommand(a, o),
    maturity: (a, o) => runMaturityCommand(a, o),
    baseline: (a, o) => runBaselineCommand(a, o),
    diff: (a, o) => runDiffCommand(a, o),
    verify: (a, o) => runVerifyCommand(a, o),
    "pr-comment": (a, o) => runPrCommentCommand(a, o),
    summary: (a, o) => runSummaryCommand(a, o),
    stats: (a, o) => runStatsCommand(a, o),
    fix: (a, o) => runFixCommand(a, o),
    "create-rule": (a, o) => runCreateRuleCommand(a, o),
    handover: (a, o) => runHandoverCommand(a, o),
    init: (a, o) => runInitCommand(a, o),
    "pw-report": (a, o) => runPwReportCommand(a, o),
    doctor: (a, o) => runDoctorCommand(a, o),
    "release-trust": (a, o) => runReleaseTrustCommand(a, o),
    rules: (a, o) => runRulesCommand(a, o),
    explain: (a, o) => runExplainCommand(a, o),
    "doctor:playwright": (a, o) => runDoctorPlaywright(a, o),
    why: (a, o) => runWhyCommand(a, o),
    handoff: (a, o) => runHandoffCommand(a, o),
    install: (a, o) => runInstallCommand(a, o),
    "ci-integrity": (a, o) => runCIIntegrityCommand(a, o),
    "framework-maturity": (a, o) => runFrameworkMaturityCommand(a, o),
    "suppression-gate": (a, o) => runSuppressionGateCommand(a, o),
    "cross-file": (a, o) => runCrossFileCommand(a, o),
    "contract-verify": (a, o) => runContractVerifyCommand(a, o),
    "trust-trend": (a, o) => runTrustTrendCommand(a, o),
    "evidence-graph": (a, o) => runEvidenceGraphCommand(a, o),
  };
  // Contract: tests/contract/readme-commands.spec.ts reads known subcommands
  // from argv[0] === "..." literals in this source file. Keep in sync with VERBS:
  // argv[0] === "scan"
  // argv[0] === "suppressions"
  // argv[0] === "forensics"
  // argv[0] === "triage"
  // argv[0] === "mutation"
  // argv[0] === "badge"
  // argv[0] === "trust-report"
  // argv[0] === "debt"
  // argv[0] === "impact"
  // argv[0] === "baseline"
  // argv[0] === "diff"
  // argv[0] === "verify"
  // argv[0] === "pr-comment"
  // argv[0] === "summary"
  // argv[0] === "stats"
  // argv[0] === "fix"
  // argv[0] === "create-rule"
  // argv[0] === "handover"
  // argv[0] === "init"
  // argv[0] === "pw-report"
  // argv[0] === "doctor"
  // argv[0] === "release-trust"
  // argv[0] === "rules"
  // argv[0] === "explain"
  // argv[0] === "doctor:playwright"
  // argv[0] === "why"
  // argv[0] === "handoff"
  // argv[0] === "install"
  // argv[0] === "mcp"
  // argv[0] === "business-case"
  // argv[0] === "release-report"
  // argv[0] === "report"
  // argv[0] === "trend"
  // argv[0] === "exec-report"
  // argv[0] === "policy"
  // argv[0] === "quarantine"
  // argv[0] === "analyze"
  // argv[0] === "ci-adapter"
  // argv[0] === "dashboard"
  // argv[0] === "enterprise"
  // argv[0] === "maturity"
  // argv[0] === "help"
  const verb = argv[0] ?? "";
  const handler = Object.hasOwn(VERBS, verb) ? VERBS[verb] : undefined;
  if (handler) return await handler(argv.slice(1), io);
  if (argv[0] === "mcp") {
    await runStdioTransport(process.stdin, process.stdout);
    return EXIT_CLEAN;
  }
  if (argv[0] === "help") return runHelpCommand(argv.slice(1), io);
  if (SUBCOMMANDS.has(argv[0] ?? "")) {
    io.err(`mjolnir: incomplete or unknown subcommand "${argv[0]}".`);
    printUsage(io.out, resolveHelpWidth(argv));
    return EXIT_USAGE;
  }
  if (
    argv[0] !== undefined &&
    argv[0].length > 0 &&
    !argv[0].startsWith("-") &&
    !existsSync(argv[0]) &&
    argv[0].match(/^[a-z][\w:-]*$/i) !== null
  ) {
    io.err(`mjolnir: unknown subcommand "${argv[0]}".`);
    io.err(
      "Run `mjolnir --help` for the verb list, or pass a directory to scan.",
    );
    return EXIT_USAGE;
  }
  return runScanCommand(argv, io);
}

/**
 * `mjolnir help` / `mjolnir help <verb>` (plan M2). `--help`/`-h` and
 * `<verb> --help` route here too. Exit 0 — help answers a question.
 * Two-word verbs (`ci install`) are resolved first via the join of the
 * leading non-flag tokens, then the single-word form.
 */
export function runHelpCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const tokens = argv.filter((a) => !a.startsWith("-"));
  const helpWidth = resolveHelpWidth(argv);
  if (tokens.length >= 2) {
    const joined = `${tokens[0]} ${tokens[1]}`;
    if (hasVerbHelp(joined)) {
      io.out(renderVerbHelp(joined, { width: helpWidth }));
      return EXIT_CLEAN;
    }
  }
  if (tokens.length > 0) {
    io.out(renderVerbHelp(tokens[0] as string, { width: helpWidth }));
    return EXIT_CLEAN;
  }
  io.out(renderRootHelp(SCHEMA_VERSION, { width: helpWidth }));
  return EXIT_CLEAN;
}

// Run only when this module is the entry point (not when tests import it).
export function isEntryPoint(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(argv1);
  } catch {
    return import.meta.url === pathToFileURL(argv1).href;
  }
}

if (isEntryPoint()) {
  // Opt-in crash reporting: a no-op unless SENTRY_DSN is set, and it never
  // touches the exit-code contract below — a lost report must not change
  // the code CI reads.
  await initSentry();
  try {
    process.exitCode = await main();
  } catch (err) {
    captureInternalError(err, "cli");
    internalErrorMessage(err, (s) => process.stderr.write(s + "\n"), false);
    process.exitCode = EXIT_INTERNAL;
  } finally {
    await flushSentry();
  }
}
