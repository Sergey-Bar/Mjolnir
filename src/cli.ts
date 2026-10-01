#!/usr/bin/env node
/**
 * Mjölnir CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean Â· 1 findings â‰¥ gate Â· 2 partial Â·
 * 10 usage error Â· 20 internal error.
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
 * `scripts/archive/sync-sarif-version.cjs` (archived; superseded by the release
 * workflow's own version stamping) on release and guarded by
 * `tests/contract/version-consistency.spec.ts` locally. R4c moved the literal to
 * src/engine/version.ts (a leaf module) so the scan pipeline's run
 * identity can carry it without a cli.ts import cycle; this re-export
 * keeps every existing consumer stable.
 */
import { BUILD_ID, ENGINE_VERSION as CLI_VERSION } from "./engine/version.js";
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
      // The v6 collapse's REPLACE arm (plan §3). `trust-report`,
      // `pr-comment` and `summary` were three verbs whose whole body was
      // "scan, then render" — a verb per output shape, which is a command
      // surface to remember rather than a capability. The renderers already
      // existed; what was missing was a way to name them.
      //
      // `github-summary` is named after its CONSUMER (GitHub Actions step
      // summary) rather than its shape, because "summary" was ambiguous with
      // the terminal's own summary band, and a flag that means two things is
      // a flag whose output nobody can predict.
      else if (fmt === "trust-report") args.format = "trust-report";
      else if (fmt === "pr-comment") args.format = "pr-comment";
      else if (fmt === "github-summary") args.format = "github-summary";
      else if (fmt === "json") {
        args.format = "json";
        args.json = true;
      } else if (fmt !== "terminal")
        return reject({ flag: "--format", token: fmt });
    } else if (a === "--verbose") args.verbose = true;
    // The v6 collapse's REPLACE arm (plan §3). Each of these was a verb
    // whose entire body is a mode of the scan, and a verb per mode is a
    // command surface to remember rather than a capability to use. The flags
    // are read here, in `parseArgs`, so the whole vocabulary of `mjolnir
    // scan --help` is one list rather than four.
    else if (a === "--suppressions") args.suppressions = true;
    else if (a === "--suppression-gate") args.suppressionGate = true;
    else if (a === "--policy") args.policy = true;
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
    } else if (a === "--require-full-coverage") {
      // Opt-in coverage gate. Exits EXIT_PARTIAL when the quarantine filter
      // withheld rules; a whole scan with quarantined detectors removed is
      // not evidence about those detectors. See CliArgs.requireFullCoverage
      // for why this cannot be the default.
      args.requireFullCoverage = true;
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

/** Nearest known flags within distance â‰¤ 2, nearest first. */
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

/**
 * The `ci` subcommand table — the v6 collapse's MOVE arm (plan §3).
 *
 * Five top-level verbs become `ci <subcommand>`. They are grouped here rather
 * than spread across the dispatcher because the table IS the claim: one place
 * says what `ci` can do, and `mjolnir ci --help` renders from it, so a
 * subcommand that exists is documented and one that is documented exists. A
 * dispatcher with five inline `if` arms plus a separate help string is how the
 * two drift apart.
 *
 * None of these reimplements a check. Each entry is the command that already
 * existed, because a governance rule that exists twice can disagree with
 * itself — and the copy a pipeline runs is the one that has to be right.
 */
const CI_SUBCOMMANDS: Record<
  string,
  {
    summary: string;
    run: (
      argv: string[],
      io: { out: Output; err: Output },
    ) => Promise<number> | number;
  }
> = {
  install: {
    summary: "write the CI workflow for this repository",
    run: (argv, io) => runCiInstall(argv, io),
  },
  adapters: {
    summary: "which ecosystems can be analysed, and how well",
    run: (argv, io) => runCiAdapterCommand(argv, io),
  },
  integrity: {
    summary: "the workflow Mjölnir would generate is itself correct",
    run: (argv, io) => runCIIntegrityCommand(argv, io),
  },
  verify: {
    summary: "run the blocking check and the suppression policy",
    run: (argv, io) => runVerifyCommand(argv, io),
  },
  "release-trust": {
    summary: "the signed measurement release's own trust record",
    run: (argv, io) => runReleaseTrustCommand(argv, io),
  },
  "release-trend": {
    summary: "how that trust record has moved across releases",
    run: (argv, io) => runTrustTrendCommand(argv, io),
  },
};

/** `mjolnir ci --help`, rendered from the table so it cannot drift. */
export function renderCiSubcommandHelp(): string {
  const names = Object.keys(CI_SUBCOMMANDS).sort();
  const width = Math.max(...names.map((n) => n.length));
  return [
    "mjolnir ci <subcommand> — the checks a pipeline runs",
    "",
    ...names.map(
      (n) => `  ci ${n.padEnd(width)}  ${CI_SUBCOMMANDS[n]?.summary ?? ""}`,
    ),
    "",
    "Each was a top-level verb before the v6 collapse, which is why",
    "`mjolnir integrity` and `mjolnir ci verify` read as two products that",
    "shared a surface nobody could see from the command list.",
  ].join("\n");
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
  runFixCommand,
  runVerifyCommand,
  runStatsCommand,
  runExplainCommand,
  runExplainHelp,
} from "./cli-handlers.js";

// Re-export handler functions so tests importing from "cli.js" still work.
export {
  runScanCommand,
  renderScanOutput,
  runFixCommand,
  runVerifyCommand,
  runPrCommentCommand,
  runStatsCommand,
  runPwReportCommand,
  runExplainCommand,
  runDoctorPlaywright,
  // The `explain` arms' implementations. No longer VERB runners — they are
  // what the arms call — but still commands, and the specs that exercise
  // their behaviour reach them through this entry point.
  runRulesCommand,
  runWhyCommand,
  runHandoverCommand,
  runEvidenceArm,
} from "./cli-handlers.js";

export { runCrossFileCommand } from "./commands/milestone.js";

import { runDoctorCommand } from "./commands/doctor-run.js";
import { runHandoffCommand } from "./commands/handoff.js";
import { runInstallCommand } from "./commands/install-agents.js";
import { runReleaseTrustCommand } from "./commands/release-trust.js";
import { runPolicyCommand } from "./commands/policy.js";
import { runAnalyzeCommand } from "./commands/analyze.js";
import { runCiAdapterCommand } from "./commands/ci-adapter.js";
import { CLI_COMMAND_NAMES } from "./engine/cli-command-names.js";
import { runContractVerifyCommand } from "./commands/contract-verify.js";
import { runTrustTrendCommand } from "./commands/release-trend.js";
import {
  runCIIntegrityCommand,
  runEvidenceGraphCommand,
  runFrameworkMaturityCommand,
  runSuppressionGateCommand,
} from "./commands/milestone.js";

export {
  runDoctorCommand,
  runHandoffCommand,
  runInstallCommand,
  runReleaseTrustCommand,
  runPolicyCommand,
  runAnalyzeCommand,
  runCiAdapterCommand,
  runCIIntegrityCommand,
  runContractVerifyCommand,
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
    // The release answers "what should I install"; the build answers "what
    // exactly ran". A bug report with only the first is not reproducible when
    // two local builds share a version.
    io.out(
      BUILD_ID
        ? `mjolnir-qa ${CLI_VERSION} (build ${BUILD_ID})`
        : `mjolnir-qa ${CLI_VERSION}`,
    );
    return EXIT_CLEAN;
  }
  if (argv[0] === "--help" || argv[0] === "-h") {
    return runHelpCommand([], io);
  }
  // `--help` ANYWHERE in the invocation asks for help, and the rule is
  // positional rather than a pair of special cases.
  //
  // It used to be `argv.length >= 2 && argv[1] === "--help"`, which handled
  // `mjolnir fix --help` and, separately, `argv.length >= 3 && argv[2] ===
  // "--help"`, which handled `mjolnir ci install --help`. The collapse
  // deleted the second rule and generalised the first — and deleted the
  // `ci install --help` path with it, so `mjolnar ci install --help` started
  // running the installer and exiting 10. The scan is the rule that was
  // always true: a reader who types `--help` anywhere wants the page for what
  // they typed, not an error from the command they meant to read about.
  const helpAt = argv.findIndex((a) => a === "--help" || a === "-h");
  if (helpAt > 0) {
    // `ci` is two tokens, so the subject is the verb plus its subcommand when
    // one was given. That is the only reason this block knows about `ci`, and
    // knowing about it here is why `ci verify --help` describes `ci verify`
    // rather than `ci install`.
    const subject =
      argv[0] === "ci" && helpAt > 1 ? `ci ${argv[1]}` : (argv[0] as string);
    if (subject === "ci") {
      io.out(renderCiSubcommandHelp());
      return EXIT_CLEAN;
    }
    if (subject === "explain") {
      return runExplainHelp(io);
    }
    return runHelpCommand([subject], io);
  }
  if (argv[0] === "ci" && argv[1] === undefined) {
    io.out(renderCiSubcommandHelp());
    return EXIT_USAGE;
  }
  if (argv[0] === "ci" && argv[1] === "install")
    return runCiInstall(argv.slice(2), io);
  // The v6 collapse's MOVE arm (plan §3): five top-level verbs become
  // `ci <subcommand>`.
  //
  // `ci` is the right home for all five and the word is not incidental — each
  // one is a check a CI pipeline runs, and `ci` is already the verb whose
  // meaning is "the thing a pipeline does". `ci integrity` and `ci verify`
  // are the sharpest case: they were separate top-level verbs, so `mjolnir
  // integrity` and `mjolnir ci verify` read as two products, and the surface
  // they belonged to was invisible from the command list.
  if (argv[0] === "ci") {
    const sub = argv[1];
    if (sub === undefined || sub === "--help" || sub === "-h") {
      io.out(renderCiSubcommandHelp());
      return sub === undefined ? EXIT_USAGE : EXIT_CLEAN;
    }
    const entry = CI_SUBCOMMANDS[sub];
    if (entry === undefined) {
      io.err(`mjolnir ci: unknown subcommand "${sub}".`);
      io.err(
        `Known: ${Object.keys(CI_SUBCOMMANDS).sort().join(", ")}. Run \`mjolnir ci --help\`.`,
      );
      return EXIT_USAGE;
    }
    return entry.run(argv.slice(2), io);
  }
  type VerbHandler = (
    argv: string[],
    io: { out: Output; err: Output },
  ) => Promise<number> | number;
  const VERBS: Record<string, VerbHandler | undefined> = {
    scan: (a, o) => runScanCommand(a, o),
    // Wave 1: the registry is inspectable, and deliberately not editable.
    // There is no --set and no --promote, because maturity is derived from
    // evidence (ADR 0001) — a verb that could raise a level would be a verb
    // that could lie about one.
    policy: (a, o) => runPolicyCommand(a, o),
    analyze: (a, o) => runAnalyzeCommand(a, o),
    stats: (a, o) => runStatsCommand(a, o),
    fix: (a, o) => runFixCommand(a, o),
    doctor: (a, o) => runDoctorCommand(a, o),
    explain: (a, o) => runExplainCommand(a, o),
    handoff: (a, o) => runHandoffCommand(a, o),
    install: (a, o) => runInstallCommand(a, o),
    // PENDING MERGE: the plan folds this into `ci verify`, which does not
    // yet run the contract validators. Kept as its own verb until it does.
    "contract-verify": (a, o) => runContractVerifyCommand(a, o),
    "suppression-gate": (a, o) => runSuppressionGateCommand(a, o),
    "evidence-graph": (a, o) => runEvidenceGraphCommand(a, o),
  };
  // Contract: tests/contract/readme-commands.spec.ts reads known subcommands
  // from argv[0] === "..." literals in this source file. Keep in sync with VERBS:
  // argv[0] === "scan"
  // argv[0] === "stats"
  // argv[0] === "fix"
  // argv[0] === "doctor"
  // argv[0] === "explain"
  // argv[0] === "handoff"
  // argv[0] === "install"
  // argv[0] === "mcp"
  // argv[0] === "policy"
  // argv[0] === "analyze"
  // argv[0] === "help"
  // `doctor --frameworks`: the plan's MOVE for `framework-maturity` and
  // `doctor:playwright` (both marked internal). One audit asked two ways, so
  // it is a FLAG and not a second `argv[0] === "doctor"` branch — the known
  // subcommand set is read from those literals, and one verb with two entries
  // in it is a set that no longer means what it says.
  if (argv[0] === "doctor" && argv.includes("--frameworks")) {
    return runFrameworkMaturityCommand(
      argv.filter((a) => a !== "--frameworks"),
      io,
    );
  }
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
