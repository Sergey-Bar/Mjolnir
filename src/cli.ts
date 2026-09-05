#!/usr/bin/env node
/**
 * Mjölnir CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SCHEMA_VERSION,
  type Finding,
  type Severity,
  isAdvisoryFinding,
} from "./types.js";
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
  discoverRuntimeReport,
  KNOWN_RULE_IDS,
  OVERLAP_META_BY_RULE_ID,
  EVIDENCE_OVERRIDES,
  SUITE_INVALIDATING_RULE_IDS,
} = pipeline;
export type { ScanHooks, CliArgs } from "./engine/scan-pipeline.js";
import type { CliArgs } from "./engine/scan-pipeline.js";

import { renderTerminal } from "./reporter/terminal.js";
import { renderSarif } from "./reporter/sarif.js";
import { renderMermaid } from "./reporter/mermaid.js";
import { ProgressRenderer, shouldRenderProgress } from "./reporter/progress.js";
import { runSummaryCommand } from "./commands/summary.js";
import { ciInstall, type GateLevel } from "./integrations/ci-install.js";
import { runForensics } from "./forensics/run.js";
import { renderTriage, renderTriageMd } from "./forensics/triage.js";
import { renderBadgeSnippet, writeBadge } from "./commands/badge.js";
import {
  renderRootHelp,
  renderVerbHelp,
  hasVerbHelp,
} from "./commands/help.js";
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
import { renderDoctorReport, runDoctorSelfAudit } from "./commands/doctor.js";
import { buildCatalog, renderCatalogMd } from "./commands/rules-catalog.js";
import { explainRule, renderExplain } from "./commands/explain.js";
import { loadSuppressions, renderSuppressions } from "./config/suppressions.js";
import { loadConfig, ConfigValidationError } from "./config/config.js";
import { resolveGitPath } from "./scope/git-resolve.js";
import { createIgnoreMatcher } from "./discovery/ignores.js";
import { loadLocalRules } from "./plugins/local-rules.js";
import { writeFileAtomic } from "./lib/fs-atomic.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "./playwright/selector-health.js";

/**
 * Tool version for `mjolnir --version`.
 *
 * A literal, not a package.json read: the shipped artifact is a single
 * bundled `dist/cli.mjs`, so resolving package.json at runtime depends on
 * where the file happens to sit after install. This follows the same
 * discipline as SARIF's `driver.version` — kept in sync by
 * `scripts/sync-sarif-version.cjs` on release and guarded by
 * `tests/version-consistency.spec.ts` locally.
 */
export const CLI_VERSION = "0.5.3";

/** A usage-error detail: the offending token, when one exists. */
export interface UsageErrorDetail {
  /** The unknown flag or rejected value (e.g. `--nope`, `loud`). */
  token?: string | undefined;
  /** The flag whose value was rejected (`--tone` for `--tone loud`). */
  flag?: string | undefined;
}

export function parseArgs(
  argv: string[],
  onError?: (detail: UsageErrorDetail) => void,
): CliArgs | null {
  const args: CliArgs = {
    target: ".",
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
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
      if (fmt === "sarif") args.format = "sarif";
      else if (fmt === "mermaid") args.format = "mermaid";
      else if (fmt === "json") {
        args.format = "json";
        args.json = true;
      } else if (fmt !== "terminal")
        return reject({ flag: "--format", token: fmt });
    } else if (a === "--verbose") args.verbose = true;
    else if (a === "--scope") {
      const mode = argv[++i];
      if (mode === "changed") args.scopeChanged = true;
      else return reject({ flag: "--scope", token: mode }); // unknown scope
    } else if (a === "--base") {
      const ref = argv[++i];
      if (!ref || ref.startsWith("-")) return null;
      args.base = ref;
    } else if (a === "--max-duration") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) return null;
      args.maxDurationMs = v * 1000;
    } else if (a === "--width") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) return null;
      args.width = v;
    } else if (a === "--ascii") {
      args.ascii = true;
    } else if (a === "--no-ascii") {
      args.ascii = false;
    } else if (a === "--tone") {
      const tone = argv[++i];
      if (tone === "blunt") args.tone = "blunt";
      else return reject({ flag: "--tone", token: tone }); // unknown tone
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
    } else if (a === "--enable-plugins") {
      // Audit C2: opt-in code execution for plugin/JS-module rule
      // sources. Additive flag, accepted by every verb that loads rules.
      args.enablePlugins = true;
    } else if (a === "--help" || a === "-h") {
      return null;
    } else if (!a.startsWith("-")) {
      args.target = a;
    } else {
      return reject({ token: a }); // unknown flag = usage error (exit 10)
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
  "--strict",
  "--debug",
  "--record-milestones",
  "--cache",
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
  // Memoized edit-distance walk. Map-based memo (not row arrays) keeps
  // every access defined — no defensive ?? arms for the coverage gate.
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
function parseArgsOrUsage(
  argv: string[],
  io: { out: Output; err: Output },
): CliArgs | null {
  let reported = false;
  const args = parseArgs(argv, (detail) => {
    reported = true;
    io.err(usageErrorMessage(detail));
  });
  if (!args && !reported) printUsage(io.out);
  return args;
}

export type Output = (...parts: unknown[]) => void;

// Audit C3: true variadic sinks. The one-arg signatures silently DROPPED
// every argument after the first — `io.err("mjolnir internal error:", msg)`
// printed only the prefix, losing the actual error. Join with spaces so
// multi-arg calls render as one readable line on the default consoles.
// Exported for contract tests (audit C3): the default sinks must stay
// variadic — a narrowing back to one-arg signatures is a regression.
export const out: Output = (...parts) =>
  console.log(parts.map(String).join(" "));
export const err: Output = (...parts) =>
  console.error(parts.map(String).join(" "));

/** Testable `ci install` handler. Returns the process exit code. */
export function runCiInstall(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  let gateArg: string | undefined;
  let gateSeen = false;
  let force = false;
  const unknown: string[] = [];
  for (const arg of argv) {
    if (arg === "--gate") {
      gateSeen = true;
    } else if (arg === "--force") {
      force = true;
    } else if (gateSeen && gateArg === undefined && !arg.startsWith("--")) {
      gateArg = arg;
    } else {
      unknown.push(arg);
    }
  }
  // Bug-audit L11: `--gate` as the final argument used to silently
  // degrade to advisory — a typo'd invocation got the opposite gate the
  // user asked for. A dangling `--gate` is a usage error instead.
  if (gateSeen && gateArg === undefined) {
    io.err("--gate requires a value. Use: advisory | error | warning");
    return 10;
  }
  if (unknown.length > 0) {
    io.err(`Unknown argument(s): ${unknown.join(" ")}`);
    return 10;
  }
  if (gateArg && !["advisory", "error", "warning"].includes(gateArg)) {
    io.err("Unknown gate level. Use: advisory | error | warning");
    return 10;
  }
  const result = ciInstall(resolve("."), (gateArg as GateLevel) ?? "advisory", {
    force,
  });
  if (result.refused) {
    // H2(e): the existing workflow differs from anything Mjölnir generates
    // — it is hand-customized. Never silently overwrite it (the old code
    // did, contradicting init's "existing files are never overwritten").
    io.err(
      `Refusing to overwrite the customized workflow at ${result.written}.`,
    );
    io.err("The file differs from the template Mjölnir would write:");
    for (const line of result.diffSummary) io.err(line);
    io.err("Re-run with --force to replace it with the generated template.");
    return 10;
  }
  io.out(`${result.existed ? "Updated" : "Created"} ${result.written}`);
  io.out("Default mode: advisory — findings reported, never blocking.");
  io.out("Change with: mjolnir ci install --gate error|warning|advisory");
  return 0;
}

/** Testable `suppressions` handler. */
export function runSuppressions(
  io: { out: Output; err?: Output } = { out },
): number {
  try {
    io.out(renderSuppressions(loadSuppressions(resolve("."))));
    return 0;
  } catch (e) {
    // Bug-audit M6: a corrupted config must not render as an empty (and
    // silently unenforcing) report — surface it on the usage-error path.
    if (e instanceof ConfigValidationError) {
      (io.err ?? err)(e.message);
      return 10;
    }
    // Audit S8: any other throw is contained (catch-to-20) instead of
    // escaping as an unhandled rejection with a misleading exit 1.
    (io.err ?? err)(
      "mjolnir internal error:",
      e instanceof Error ? e.message : String(e),
    );
    return 20;
  }
}

/** Testable `forensics` handler. */
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
    return 10;
  }
  try {
    const { report, output, flakyMdPath } = runForensics(resolve(targetArg), {
      writeFlakyMd: !noMd,
    });
    io.out(output);
    if (flakyMdPath) io.out(`\nWrote ${flakyMdPath}`);
    if (report.totalTests === 0) {
      io.err(
        "No test results recognized. Expected a Playwright JSON report (report.json) or JUnit XML files.",
      );
      return 2;
    }
    // Exit 1 only when true flakes or failures exist.
    return report.flakyTests > 0 || report.failed > 0 ? 1 : 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/** Testable `doctor:playwright` handler. */
export async function runDoctorPlaywright(
  argv: string[],
  io: { out: Output; err?: Output } = { out },
): Promise<number> {
  try {
    const targetArg = argv[1] && !argv[1].startsWith("-") ? argv[1] : ".";
    const target = resolve(targetArg);
    const invalid = validateScanTarget(target, io.err ?? err);
    if (invalid !== null) return invalid;
    // A resolved absolute path is never flag-like, so parseArgs([target])
    // is exactly the defaults with target set — constructed directly, since
    // a null-check here would be a dead branch v8 can never cover.
    const args: CliArgs = {
      target,
      json: false,
      verbose: false,
      maxDurationMs: Number.POSITIVE_INFINITY,
      scopeChanged: false,
      format: "terminal",
      // Audit C2: this verb loads rules, so it honors the gate flag too.
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

    // Selector Health per spec — same ignore state as the scan (audit R-8).
    const specs = computeSelectorHealth(target, createIgnoreMatcher(target));
    io.out(renderSelectorHealth(specs));
    return 0;
  } catch (e) {
    // Audit S8: contained (catch-to-20) — never an unhandled rejection.
    // ConfigValidationError keeps the fixable-message exit 10.
    if (e instanceof ConfigValidationError) {
      (io.err ?? err)(e.message);
      return 10;
    }
    (io.err ?? err)(
      "mjolnir internal error:",
      e instanceof Error ? e.message : String(e),
    );
    return 20;
  }
}

/** Testable `doctor` handler — self-audit of Mjölnir's own rule base. */
export function runDoctorCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  // Flag-parity with every other subcommand (flagged by the Open-Beta
  // E2E exit-code sweep): `doctor` accepts only an optional repo-root
  // positional, so a flag-shaped arg is a typo — silently ignoring it
  // used to turn `doctor --bogus` into a surprise full scan of the CWD.
  if (argv.some((a) => a.startsWith("-"))) {
    io.err("Usage: mjolnir doctor [repo-root]");
    return 10;
  }
  const targetArg = argv[0] ?? process.cwd();
  try {
    // Fixtures live under <repo>/tests/fixtures relative to the target.
    const fixturesRoot = resolve(join(targetArg, "tests", "fixtures"));
    if (!existsSync(fixturesRoot)) {
      io.err(
        `No fixtures directory at ${fixturesRoot}. Run from the mjolnir repo root.`,
      );
      return 2;
    }
    const report = runDoctorSelfAudit(fixturesRoot);
    io.out(renderDoctorReport(report));
    return report.healthy ? 0 : 1;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/** Testable `rules` handler — rule catalog with Trust Metadata. */
export async function runRulesCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  // Plan §18: `--external` includes workspace-local mjolnir-rules/
  // rules in the catalog (provenance "external") — the drift-check
  // surface: an edit to a local rule file changes the next render.
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
  // `--unmeasured`: the rules shipping on assumption — no measured
  // false-positive rate (n < 10 classified corpus verdicts). This is
  // what the scan footer's "rule coverage" line points at.
  if (argv.includes("--unmeasured")) {
    catalog = catalog.filter((e) => e.measuredFpRate === undefined);
  } else if (argv.includes("--measured")) {
    catalog = catalog.filter((e) => e.measuredFpRate !== undefined);
  }
  if (argv.includes("--md")) {
    io.out(renderCatalogMd(catalog));
  } else {
    // Default: JSON (machine-readable, schema-stable).
    io.out(JSON.stringify(catalog, null, 2));
  }
  return 0;
}

/**
 * Testable `explain <RULE-ID>` handler (Plan.md Sprint 1.3,
 * Master-Stabilization-Plan Sprint 5 Task 19). Metadata always renders
 * offline from the registry; the concrete example is real detector
 * output from the rule's own must-fire fixture when one is findable
 * (this repo checkout, or --fixtures-root), and honestly omitted
 * otherwise — never a fabricated example.
 */
export function runExplainCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const ruleId = argv.find((a) => !a.startsWith("-"));
  if (!ruleId) {
    io.err("Usage: mjolnir explain <RULE-ID>");
    return 10;
  }
  const fixturesRootIdx = argv.indexOf("--fixtures-root");
  // Audit S8: a dangling `--fixtures-root` is a usage error, not a
  // silent fall back to the default fixtures directory.
  if (
    fixturesRootIdx !== -1 &&
    (fixturesRootIdx + 1 >= argv.length ||
      argv[fixturesRootIdx + 1]?.startsWith("--"))
  ) {
    io.err(
      "--fixtures-root requires a value: mjolnir explain <RULE-ID> --fixtures-root <dir>",
    );
    return 10;
  }
  const explicitRoot =
    fixturesRootIdx !== -1 ? argv[fixturesRootIdx + 1] : undefined;
  const fixturesRoot = resolve(
    explicitRoot ?? join(process.cwd(), "tests", "fixtures"),
  );
  try {
    const result = explainRule(ruleId, fixturesRoot);
    io.out(renderExplain(result));
    if (!result.ok) return 10; // unknown rule ID is a usage error, not a crash
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/**

/** Testable default scan path. */
/**
 * Audit H-4 (extended to every scanning subcommand): a nonexistent or
 * non-directory target is a usage error — a typo'd CI path must be a
 * loud red, never a silent green. Returns the exit code (10) or null
 * when the target is valid.
 */
function validateScanTarget(target: string, err: Output): number | null {
  if (!existsSync(target)) {
    err(`mjolnir: scan target does not exist: ${target}`);
    return 10;
  }
  if (!statSync(target).isDirectory()) {
    err(`mjolnir: scan target is not a directory: ${target}`);
    return 10;
  }
  return null;
}

export async function runScanCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
  }
  const target = resolve(args.target);
  const invalid = validateScanTarget(target, io.err);
  if (invalid !== null) return invalid;
  try {
    // Audit R-9: collect swallowed rule crashes; --debug prints them.
    const crashLog: string[] = [];
    // Plan M3: live progress on stderr, event-driven. Auto-off when
    // stderr is not a TTY, in machine formats, in CI, or via
    // --no-progress — shouldRenderProgress owns the whole matrix.
    const progress = new ProgressRenderer({
      stream: process.stderr,
      isTTY: shouldRenderProgress({
        isTTY: (process.stderr as { isTTY?: boolean }).isTTY === true,
        noProgress: args.noProgress === true,
        machineFormat: args.format !== "terminal",
        env: process.env,
      }),
    });
    // Bug-audit M4: non-fatal config warnings reach stderr in every mode.
    const result = await runScan(
      { ...args, target },
      {
        onConfigWarning: (message) => io.err(message),
        onProgress: (e) => progress.onEvent(e),
        // Audit C2: the gate notice rides the injected io so tests can
        // capture it and it never pollutes stdout machine contracts.
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
    if (args.format === "sarif") {
      io.out(renderSarif(result));
    } else if (args.format === "mermaid") {
      io.out(renderMermaid(result));
    } else if (args.json) {
      io.out(JSON.stringify(result, null, 2));
    } else {
      io.out(
        renderTerminal(result, {
          isTTY: process.stdout.isTTY ?? false,
          verbose: args.verbose,
          ...(args.width !== undefined ? { width: args.width } : {}),
          ...(args.ascii !== undefined ? { ascii: args.ascii } : {}),
          ...(args.tone !== undefined ? { tone: args.tone } : {}),
        }),
      );
      // First-run hint — terminal only, and only for the bare, full-repo
      // scan with no config on disk (i.e. someone trying the tool for the
      // first time). Points at the two things they'd want next; silent
      // once they've adopted it or in any CI/machine context.
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

      // Milestones (Sprint 9 Task 39) — terminal-only, display-only, and
      // WRITE-ONLY under explicit opt-in (audit R-1): a read-only scan
      // must never dirty the scanned repo's working tree. Never printed
      // for --json/--format sarif/mermaid: those are machine contracts.
      // Audit C5: a PARTIAL scan (truncated by --max-duration, a
      // discovery cap, or skipped files) must never write the milestone
      // — "clean so far" is not "clean", and a truncated scan's 100
      // score proves nothing about the files it never analyzed.
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
    // Exit-code × gate semantics (S13): partial scans NEVER block.
    // Honesty Core Phase 2: advisory (E0) findings never gate CI —
    // observations are reported but carry no enforcement weight.
    if (result.partial) return 2;
    // Audit H-7: config.gate is live. "advisory" never blocks,
    // "warning" also blocks on warnings, "error" (default) on errors.
    const { config, warnings } = loadConfig(target, {
      knownRuleIds: KNOWN_RULE_IDS,
    });
    for (const w of warnings) io.err(w);
    return exitForFindings(result.findings, config.gate ?? "error");
  } catch (err) {
    // Bug-audit M4: a config typo is a user error with an actionable
    // message — usage exit 10, not "internal error" exit 20.
    if (err instanceof ConfigValidationError) {
      io.err(err.message);
      return 10;
    }
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/**
 * Exit-code decision for a finished scan under the given gate level
 * (audit H-7): the previously-dead config.gate field now selects which
 * severities block. Advisory (E0) findings never gate at any level.
 */
export function exitForFindings(
  findings: readonly Finding[],
  gate: "advisory" | "error" | "warning",
): number {
  if (gate === "advisory") return 0;
  const gateSeverities: readonly Severity[] =
    gate === "warning" ? ["error", "warning"] : ["error"];
  return findings.some(
    (f) => gateSeverities.includes(f.severity) && !isAdvisoryFinding(f),
  )
    ? 1
    : 0;
}

/** Testable `triage` handler (Tier 5 #22). */
export function runTriageCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err("Usage: mjolnir triage <test-results-dir-or-report-file> [--no-md]");
    return 10;
  }
  try {
    const { report } = runForensics(resolve(targetArg), {
      writeFlakyMd: false,
    });
    io.out(renderTriage(report));
    // Only write TRIAGE.md when there's something to triage AND the
    // target dir exists — a missing dir must degrade honestly, not crash.
    if (!argv.includes("--no-md") && report.totalTests > 0) {
      // Bug-audit M1: the documented `mjolnir triage <report-file>` joined
      // the FILE path with "TRIAGE.md" → `<file>/TRIAGE.md` is not a
      // directory → writeFileSync threw → "internal error" exit 20 after
      // a successful parse. Write next to the file target instead.
      const absTarget = resolve(targetArg);
      const mdPath = statSync(absTarget).isDirectory()
        ? join(absTarget, "TRIAGE.md")
        : join(dirname(absTarget), "TRIAGE.md");
      writeFileAtomic(mdPath, renderTriageMd(report));
      io.out(`\nWrote ${mdPath}`);
    }
    // Nothing recognized (e.g. missing dir) → honest no-op, not a crash.
    if (report.totalTests === 0) {
      io.err(
        "No test results recognized. Expected a Playwright JSON report (report.json) or JUnit XML files.",
      );
      return 2;
    }
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/** Testable `badge` handler (Tier 1 #5). */
export async function runBadgeCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    // Audit (badge): the badge belongs to the SCANNED repo — it stamps
    // that repo's HEAD commit and lands in the scanned target, not in
    // whatever directory the user happened to run from.
    const outPath = writeBadge(result, {
      outDir: target,
      commit: currentCommit(target),
    });
    io.out(`Wrote ${outPath}`);
    io.out("");
    io.out(renderBadgeSnippet(result));
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `debt` handler (Tier 5 #27). */
export async function runDebtCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    io.out(renderDebt(result));
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `fix` handler (Tier 1 #3) — safe auto-fix with proof. */
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
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    // Fix must see quarantine-tier findings too: an auto-fixable rule
    // that is measured into quarantine (e.g. QA-TEST-001) still has a
    // mechanical fix, and hiding its findings from fix would make the
    // command a silent no-op on the exact debt it exists to remove.
    const result = await runScan({ ...args, target, strict: true });
    const fixes = planAndApplyFixes(result, target, { dryRun });
    io.out(renderFixReport(fixes, dryRun));
    // Exit 1 when anything failed verification; applied/dry-run is fine.
    return fixes.some((f) => f.status === "failed") ? 1 : 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `create-rule` handler (Tier 6 #34). */
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
    return 10;
  }
  try {
    const result = createRuleScaffold({ id, title }, process.cwd());
    io.out(renderScaffoldReport(result));
    return result.ok ? 0 : 1;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

function currentCommit(root: string): string {
  try {
    // Audit S1: absolute git path — never resolvable from the scanned
    // repo's own directory.
    return execFileSync(
      resolveGitPath() ?? "git",
      ["-C", root, "rev-parse", "HEAD"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return "unknown";
  }
}

/** Testable `impact` handler (Sprint 6 Task 23). */
export async function runImpactCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const sinceIdx = argv.indexOf("--since");
  // Audit S8: a dangling `--since` (no value after it) is a usage error,
  // not a silent "compare against the default base".
  if (
    sinceIdx !== -1 &&
    (sinceIdx + 1 >= argv.length || argv[sinceIdx + 1]?.startsWith("--"))
  ) {
    io.err("--since requires a value: mjolnir impact [--since <ref>]");
    return 10;
  }
  const since = sinceIdx !== -1 ? argv[sinceIdx + 1] : undefined;
  const args = parseArgs(
    sinceIdx === -1
      ? argv
      : argv.filter((_a, i) => i !== sinceIdx && i !== sinceIdx + 1),
  );
  if (!args) {
    return 10;
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
    return report.hasComparison ? 0 : 2;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `baseline` handler (Sprint 6 Task 24). */
export async function runBaselineCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    const outPath = join(target, DEFAULT_BASELINE_PATH);
    const saved = saveBaseline(result, currentCommit(target), outPath);
    io.out(
      renderBaselineSaved(DEFAULT_BASELINE_PATH, result.findings.length, {
        ...(saved.backupPath !== undefined
          ? { backupPath: saved.backupPath }
          : {}),
      }),
    );
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `diff` handler (Sprint 6 Task 24) — new/worsened debt only. */
export async function runDiffCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
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

    // Audit C5: a PARTIAL (truncated) scan proves nothing about what was
    // resolved — the head simply didn't analyze those files. It must not
    // fold "resolved" findings into all-time stats, must not fire
    // first-debt-reduction, and must return the partial exit code so CI
    // never treats a truncated diff as a clean bill.
    if (result.partial) return 2;

    // Fold resolved findings into all-time stats (Task 26) — only when a
    // real comparison happened; establishing a baseline records nothing.
    // Audit R-2: the write is best-effort — a read-only mount degrades to
    // a warning instead of turning a successful diff into exit 20.
    if (diff.hasBaseline) {
      const statsPath = join(target, DEFAULT_STATS_PATH);
      const stats = recordResolved(loadStats(statsPath), diff);
      if (!saveStats(stats, statsPath)) {
        io.err(
          "  (warning: stats could not be written — read-only filesystem? counters not recorded)",
        );
      }

      // Milestones (Sprint 9 Task 39) — real event this command just
      // witnessed (diff.resolvedFindings is non-empty), never a guess.
      if (diff.resolvedFindings.length > 0) {
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

    if (!diff.hasBaseline) return 2;
    return diff.newFindings.some((f) => f.severity === "error") ? 1 : 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `pr-comment` handler (Sprint 6 Task 25). */
export async function runPrCommentCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
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
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `stats` handler (Sprint 6 Task 26). */
export function runStatsCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? ".";
  try {
    const target = resolve(targetArg);
    const stats = loadStats(join(target, DEFAULT_STATS_PATH));
    io.out(renderStats(stats));
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/** Testable `handover` handler (Tier 5 #28). */
export async function runHandoverCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgsOrUsage(argv, io);
  if (!args) {
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    // Optional forensics enrichment when a results dir sits next to target.
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
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, args?.debug === true);
    return 20;
  }
}

/** Testable `init` handler (Tier 2 #10). */
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
          // FW-BUG-02: a malformed package.json may carry a non-string
          // `name` (number/object); only a real string is used as the
          // badge label — everything else falls back to "repo".
          name: typeof pkg["name"] === "string" ? pkg["name"] : "repo",
          packageJson: pkg,
          workspaceGlobs: [],
        }
      : null;
    const result = runInit(rootDir, workspace, {
      interactive: argv.includes("--interactive"),
    });
    io.out(renderInit(result));
    return 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/** Testable `pw-report` handler (Tier 2 #9 wedge). */
export function runPwReportCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err(
      "Usage: mjolnir pw-report <playwright-report.json | test-results-dir>",
    );
    return 10;
  }
  try {
    const { report } = runForensics(resolve(targetArg), {
      writeFlakyMd: false,
    });
    if (report.totalTests === 0) {
      io.err(
        "No Playwright JSON report found. Add reporter: [['json', { outputFile: 'report.json' }]] to playwright.config.",
      );
      return 2;
    }
    io.out(renderPwRunSummary(summarizePwRun(report)));
    return report.failed > 0 || report.flakyTests > 0 ? 1 : 0;
  } catch (err) {
    internalErrorMessage(err, io.err, process.argv.includes("--debug"));
    return 20;
  }
}

/**
 * Audit S8: the subcommand registry. Every verb name main() dispatches
 * on lives here — a first token that is neither a registered subcommand
 * nor an existing path is a TYPO, and a typo must not silently fall
 * through to a scan of whatever the remaining arguments parse to (the
 * classic `mjolnir sccan .` accident: exit 0, nothing checked, green
 * badge).
 */
const SUBCOMMANDS: ReadonlySet<string> = new Set([
  "scan",
  "ci",
  "suppressions",
  "forensics",
  "triage",
  "badge",
  "debt",
  "impact",
  "baseline",
  "diff",
  "pr-comment",
  "stats",
  "fix",
  "create-rule",
  "handover",
  "init",
  "pw-report",
  "doctor",
  "rules",
  "explain",
  "doctor:playwright",
]);

export async function main(
  argv: string[] = process.argv.slice(2),
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  // `--version` is the first thing most people type against an unfamiliar
  // CLI. Without this it fell through to the scan arg parser, which does
  // not know the flag, and printed the full help — technically not a
  // crash, but it answers a different question than the one asked.
  if (argv[0] === "--version" || argv[0] === "-v") {
    io.out(`mjolnir-qa ${CLI_VERSION}\n`);
    return 0;
  }
  // Subcommands (§69): ci install · suppressions · forensics · doctor:playwright
  // Scan-backed handlers are async since the Phase 0.5 parse stage (§10) —
  // returning their promise from this async dispatcher awaits it.
  // `<verb> --help` / `<verb> -h` routes to the help registry (plan M2)
  // before any handler parses flags.
  if (argv.length >= 2 && (argv[1] === "--help" || argv[1] === "-h")) {
    return runHelpCommand([argv[0] as string], io);
  }
  // Two-word verb: `ci install --help` (argv[1] is "install", so the
  // single-word interception above does not fire).
  if (
    argv[0] === "ci" &&
    argv.length >= 3 &&
    (argv[2] === "--help" || argv[2] === "-h")
  ) {
    return runHelpCommand(["ci", "install"], io);
  }
  if (argv[0] === "ci" && argv[1] === "install")
    return runCiInstall(argv.slice(2));
  if (argv[0] === "scan") return runScanCommand(argv.slice(1));
  if (argv[0] === "suppressions") return runSuppressions();
  if (argv[0] === "forensics") return runForensicsCommand(argv.slice(1));
  if (argv[0] === "triage") return runTriageCommand(argv.slice(1));
  if (argv[0] === "badge") return runBadgeCommand(argv.slice(1));
  if (argv[0] === "debt") return runDebtCommand(argv.slice(1));
  if (argv[0] === "impact") return runImpactCommand(argv.slice(1));
  if (argv[0] === "baseline") return runBaselineCommand(argv.slice(1));
  if (argv[0] === "diff") return runDiffCommand(argv.slice(1));
  if (argv[0] === "pr-comment") return runPrCommentCommand(argv.slice(1));
  if (argv[0] === "summary") return runSummaryCommand(argv.slice(1), io);
  if (argv[0] === "stats") return runStatsCommand(argv.slice(1));
  if (argv[0] === "fix") return runFixCommand(argv.slice(1));
  if (argv[0] === "create-rule") return runCreateRuleCommand(argv.slice(1));
  if (argv[0] === "handover") return runHandoverCommand(argv.slice(1));
  if (argv[0] === "init") return runInitCommand(argv.slice(1));
  if (argv[0] === "pw-report") return runPwReportCommand(argv.slice(1));
  if (argv[0] === "doctor") return runDoctorCommand(argv.slice(1));
  if (argv[0] === "rules") return runRulesCommand(argv.slice(1));
  if (argv[0] === "explain") return runExplainCommand(argv.slice(1));
  if (argv[0] === "doctor:playwright") return runDoctorPlaywright(argv);
  // `help` must dispatch BEFORE the scan fall-through: an unknown verb
  // becomes a scan target (mjolnir ./help scans a folder named help;
  // bare `mjolnir help` used to scan the CWD as if it were a path).
  if (argv[0] === "help") return runHelpCommand(argv.slice(1), io);
  // Audit S8: a first token that LOOKS like a verb but is not one is a
  // typo — reject with usage instead of scanning with the typo dropped.
  // Bare non-verbs (paths, flags) still mean "scan this".
  if (SUBCOMMANDS.has(argv[0] ?? "")) {
    // A known subcommand stem that fell through (e.g. bare `ci` without
    // `install`) is usage.
    err(`mjolnir: incomplete or unknown subcommand "${argv[0]}".`);
    printUsage(out);
    return 10;
  }
  if (
    argv[0] !== undefined &&
    argv[0].length > 0 &&
    !argv[0].startsWith("-") &&
    !existsSync(argv[0]) &&
    argv[0].match(/^[a-z][\w:-]*$/i) !== null
  ) {
    // Word-like token, not a path that exists, not a flag: the user
    // almost certainly meant a subcommand. `mjolnir scna` must not scan.
    err(`mjolnir: unknown subcommand "${argv[0]}".`);
    err("Run `mjolnir --help` for the verb list, or pass a directory to scan.");
    return 10;
  }
  return runScanCommand(argv);
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
  if (tokens.length >= 2) {
    const joined = `${tokens[0]} ${tokens[1]}`;
    if (hasVerbHelp(joined)) {
      io.out(renderVerbHelp(joined));
      return 0;
    }
  }
  if (tokens.length > 0) {
    io.out(renderVerbHelp(tokens[0] as string));
    return 0;
  }
  io.out(renderRootHelp(SCHEMA_VERSION));
  return 0;
}

function printUsage(print: (s: string) => void): void {
  print(renderRootHelp());
}

/**
 * Friendly exit-20 path (plan M2): the crash says it's Mjölnir's bug,
 * not the user's repo, carries the underlying message for a report, and
 * prints the stack ONLY when `debug` is set (uniform across
 * subcommands — they don't parse scan flags). Tests pin
 * /internal error/i. Exported so the --debug stack arm is directly
 * spec-coverable (spawning a real crash under --debug would be flaky).
 */
export function internalErrorMessage(
  err: unknown,
  emit: (s: string) => void,
  debug: boolean,
): void {
  const message = err instanceof Error ? err.message : String(err);
  emit("mjolnir internal error — this is a bug in Mjölnir, not your repo:");
  emit(`  ${message}`);
  if (debug && err instanceof Error && err.stack) {
    emit(err.stack);
  }
  emit("Rerun with --debug for the stack trace. Please report this:");
  emit("  https://github.com/Sergey-Bar/Mjolnir/issues");
}

// Run only when this module is the entry point (not when tests import it).
// Comparing resolved real paths (not raw string equality on
// import.meta.url vs pathToFileURL(process.argv[1]).href) because on
// macOS, os.tmpdir() commonly returns a path under /var/folders/... that
// is itself a symlink to /private/var/folders/...: Node's ESM loader
// resolves import.meta.url through that symlink, but process.argv[1]
// stays unresolved, so a literal string comparison silently never
// matches when a packed tarball is extracted into a macOS temp dir —
// main() never runs, the process exits 0 with zero output, and it looks
// exactly like the CLI itself is broken. realpathSync on both sides
// makes the comparison symlink-agnostic on every platform. Falls back
// to the original string comparison if realpathSync throws (e.g. the
// path genuinely doesn't exist) so this can't newly crash anything.
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
  // Top-level await: main() is async since the Phase 0.5 parse stage.
  process.exitCode = await main();
}
