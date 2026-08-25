/**
 * QA Doctor CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";

import {
  compareFindings,
  SCHEMA_VERSION,
  type Finding,
  type ScanResult,
} from "./types.js";
import { discoverWorkspace } from "./discovery/workspace.js";
import { detectFrameworks } from "./discovery/frameworks.js";
import { RULES } from "./rules/index.js";
import { computeDimensions, computeTotal } from "./scorer/scorer.js";
import { renderTerminal } from "./reporter/terminal.js";
import { renderSarif } from "./reporter/sarif.js";
import { computeChangedScope, filterToChanged } from "./scope/changed.js";
import { asUniversal } from "./engine/rule-runner.js";
import { typescriptAdapter } from "./adapters/typescript.js";
import { githubActionsAdapter } from "./adapters/github-actions.js";
import { pythonAdapter } from "./adapters/python.js";
import { ciInstall, type GateLevel } from "./integrations/ci-install.js";
import { runForensics } from "./forensics/run.js";
import { renderTriage, renderTriageMd } from "./forensics/triage.js";
import { renderBadgeSnippet, writeBadge } from "./commands/badge.js";
import { renderDebt } from "./commands/debt.js";
import {
  createRuleScaffold,
  renderScaffoldReport,
} from "./commands/create-rule.js";
import { buildHandover, renderHandover } from "./commands/handover.js";
import { runInit, renderInit, tryReadPackageJson } from "./commands/init.js";
import { renderPwRunSummary, summarizePwRun } from "./commands/pw-report.js";
import { planAndApplyFixes, renderFixReport } from "./commands/fix.js";

const ADAPTERS = [
  typescriptAdapter,
  pythonAdapter,
  githubActionsAdapter,
] as const;
const UNIVERSAL_RULES = RULES.map(asUniversal);
import { loadSuppressions, renderSuppressions } from "./config/suppressions.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "./playwright/selector-health.js";

interface CliArgs {
  target: string;
  json: boolean;
  verbose: boolean;
  maxDurationMs: number;
  scopeChanged: boolean;
  format: "terminal" | "json" | "sarif";
}

export function parseArgs(argv: string[]): CliArgs | null {
  const args: CliArgs = {
    target: ".",
    json: false,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "terminal",
  };
  for (let i = 0; i < argv.length; i++) {
    const a: string = argv[i] ?? "";
    if (a === "--json") {
      args.json = true;
      args.format = "json";
    } else if (a === "--format") {
      const fmt = argv[++i];
      if (fmt === "sarif") args.format = "sarif";
      else if (fmt === "json") {
        args.format = "json";
        args.json = true;
      } else if (fmt !== "terminal") return null;
    } else if (a === "--verbose") args.verbose = true;
    else if (a === "--scope") {
      const mode = argv[++i];
      if (mode === "changed") args.scopeChanged = true;
      else return null; // unknown scope = usage error
    } else if (a === "--max-duration") {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v <= 0) return null;
      args.maxDurationMs = v * 1000;
    } else if (a === "--help" || a === "-h") {
      return null;
    } else if (!a.startsWith("-")) {
      args.target = a;
    } else {
      return null; // unknown flag = usage error (exit 10)
    }
  }
  return args;
}

const TEST_FILE_RE = /(?:\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs))$/;
void TEST_FILE_RE; // retained for legacy walk parity; adapters own discovery now

export function runScan(args: CliArgs): ScanResult {
  const started = Date.now();
  const deadline = started + args.maxDurationMs;
  // package.json workspace OR non-JS repo (Python etc.) — fall back to the
  // target dir itself so language adapters can still discover their files.
  const workspace = discoverWorkspace(args.target) ?? {
    root: resolve(args.target),
    name: resolve(args.target).split(/[\\/]/).pop() ?? "repo",
    packageJson: {},
    workspaceGlobs: [],
  };
  const findings: Finding[] = [];
  let skippedFiles = 0;
  let testFileCount = 0;

  if (workspace) {
    // R1: dispatch through language adapters. Rules stay unchanged; the
    // adapters own discovery, parsing, and rule application.
    const ctx = {
      workspace,
      testFiles: [] as string[],
      deadline,
      onSkippedFile: () => skippedFiles++,
    };

    for (const adapter of ADAPTERS) {
      adapter.discoverTestFiles(ctx);
    }

    for (const path of ctx.testFiles) {
      const isWorkflow = githubActionsAdapter.isTestFile(path);
      const isPython = pythonAdapter.isTestFile(path);
      if (!isWorkflow) testFileCount++;
      let text: string;
      try {
        text = readFileSync(path, "utf8");
      } catch {
        skippedFiles++;
        continue;
      }
      const relPath = relative(workspace.root, path).replaceAll("\\", "/");
      const adapter = isWorkflow
        ? githubActionsAdapter
        : isPython
          ? pythonAdapter
          : typescriptAdapter;
      try {
        adapter.runRules(
          UNIVERSAL_RULES,
          { path: relPath, text },
          (f, ruleId, category) => {
            findings.push({ ...f, ruleId, category } as Finding);
          },
        );
      } catch {
        // WorkflowParseSkipped and friends — counted, never fatal.
        skippedFiles++;
      }
    }
  }

  // Changed-scope filtering (Sprint-Plan W6): report only findings on
  // new/changed lines vs the merge base. Degraded git data → full files.
  let scopeInfo: { scope: "all" | "changed"; degraded?: string | undefined } = {
    scope: "all",
  };
  if (args.scopeChanged && workspace) {
    const diff = computeChangedScope(workspace.root);
    const filtered = filterToChanged(findings, diff);
    findings.length = 0;
    findings.push(...filtered);
    scopeInfo = diff.degraded
      ? { scope: "changed", degraded: diff.reason }
      : { scope: "changed" };
  }

  // Framework detection (0.2): wire the previously-dead detector into the
  // pipeline so output and rules can be framework-aware.
  const frameworks = workspace
    ? detectFrameworks(workspace)
    : { frameworks: [], unknown: true };

  findings.sort(compareFindings);
  const dimensions = computeDimensions(findings);
  const total = computeTotal(dimensions, findings);
  const elapsed = Date.now() - started;

  // R2 empty-state: score is null when no test files exist at all.
  // A "100/100" on a repo with zero tests would be a false proof.
  const hasTests = testFileCount > 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    partial: Date.now() > deadline || skippedFiles > 0,
    score: hasTests ? total : null,
    ...(hasTests ? {} : { reason: "no-tests-found" as const }),
    frameworks: frameworks.frameworks,
    frameworkDetectionUnknown: frameworks.unknown,
    ...(args.scopeChanged
      ? {
          scope: scopeInfo.scope,
          ...(scopeInfo.degraded ? { scopeDegraded: scopeInfo.degraded } : {}),
        }
      : {}),
    dimensions,
    findings: args.verbose ? findings : findings.slice(0, 50),
    analysisStatus: {
      discovery: Date.now() > deadline ? "partial" : "complete",
      rules: "complete",
      skippedFiles,
      durationMs: elapsed,
    },
  };
}

export type Output = (...parts: unknown[]) => void;

const out: Output = (line) => console.log(line);
const err: Output = (line) => console.error(line);

/** Testable `ci install` handler. Returns the process exit code. */
export function runCiInstall(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const gateArg = argv.includes("--gate")
    ? argv[argv.indexOf("--gate") + 1]
    : undefined;
  if (gateArg && !["advisory", "error", "warning"].includes(gateArg)) {
    io.err("Unknown gate level. Use: advisory | error | warning");
    return 10;
  }
  const { written, existed } = ciInstall(
    resolve("."),
    (gateArg as GateLevel) ?? "advisory",
  );
  io.out(`${existed ? "Updated" : "Created"} ${written}`);
  io.out("Default mode: advisory — findings reported, never blocking.");
  io.out("Change with: qa-doctor ci install --gate error|warning|advisory");
  return 0;
}

/** Testable `suppressions` handler. */
export function runSuppressions(io: { out: Output } = { out }): number {
  io.out(renderSuppressions(loadSuppressions(resolve("."))));
  return 0;
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
      "Usage: qa-doctor forensics <test-results-dir-or-report-file> [--no-flaky-md]",
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
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `doctor:playwright` handler. */
export function runDoctorPlaywright(
  argv: string[],
  io: { out: Output } = { out },
): number {
  const targetArg = argv[1] && !argv[1].startsWith("-") ? argv[1] : ".";
  const target = resolve(targetArg);
  const result = runScan({ ...parseArgs([target])!, target });
  const pwFindings = result.findings.filter((f) => f.category === "QA-PW");
  io.out(
    renderTerminal(
      { ...result, findings: pwFindings },
      { isTTY: process.stdout.isTTY ?? false },
    ),
  );

  // Selector Health per spec.
  const specs = computeSelectorHealth(target);
  io.out(renderSelectorHealth(specs));
  return 0;
}

/** Testable default scan path. */
export function runScanCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const result = runScan({ ...args, target: resolve(args.target) });
    if (args.format === "sarif") {
      io.out(renderSarif(result));
    } else if (args.json) {
      io.out(JSON.stringify(result, null, 2));
    } else {
      io.out(renderTerminal(result, { isTTY: process.stdout.isTTY ?? false }));
    }
    // Exit-code × gate semantics (S13): partial scans NEVER block.
    if (result.partial) return 2;
    return result.findings.some((f) => f.severity === "error") ? 1 : 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `triage` handler (Tier 5 #22). */
export function runTriageCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-"));
  if (!targetArg) {
    io.err(
      "Usage: qa-doctor triage <test-results-dir-or-report-file> [--no-md]",
    );
    return 10;
  }
  try {
    const { report } = runForensics(resolve(targetArg), {
      writeFlakyMd: false,
    });
    io.out(renderTriage(report));
    if (!argv.includes("--no-md")) {
      const mdPath = resolve(join(targetArg, "TRIAGE.md"));
      writeFileSync(mdPath, renderTriageMd(report));
      io.out(`\nWrote ${mdPath}`);
    }
    return 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `badge` handler (Tier 1 #5). */
export function runBadgeCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const result = runScan({ ...args, target: resolve(args.target) });
    const outPath = writeBadge(result, { outDir: process.cwd() });
    io.out(`Wrote ${outPath}`);
    io.out("");
    io.out(renderBadgeSnippet(result));
    return 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `debt` handler (Tier 5 #27). */
export function runDebtCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const result = runScan({ ...args, target: resolve(args.target) });
    io.out(renderDebt(result));
    return 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `fix` handler (Tier 1 #3) — safe auto-fix with proof. */
export function runFixCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const dryRun = argv.includes("--dry-run");
  const args = parseArgs(argv.filter((a) => a !== "--dry-run"));
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const result = runScan({ ...args, target });
    const fixes = planAndApplyFixes(result, target, { dryRun });
    io.out(renderFixReport(fixes, dryRun));
    // Exit 1 when anything failed verification; applied/dry-run is fine.
    return fixes.some((f) => f.status === "failed") ? 1 : 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
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
    io.err('Usage: qa-doctor create-rule <QA-XXX-nnn> --title "Rule title"');
    io.err("Families: QA-TEST · QA-TQUAL · QA-PW · QA-CI · QA-PY");
    return 10;
  }
  try {
    const result = createRuleScaffold({ id, title }, process.cwd());
    io.out(renderScaffoldReport(result));
    return result.ok ? 0 : 1;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `handover` handler (Tier 5 #28). */
export function runHandoverCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const result = runScan({ ...args, target });
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
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
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
          name: String(pkg["name"] ?? "repo"),
          packageJson: pkg as Record<string, unknown>,
          workspaceGlobs: [],
        }
      : null;
    const result = runInit(rootDir, workspace, {
      interactive: argv.includes("--interactive"),
    });
    io.out(renderInit(result));
    return 0;
  } catch (err) {
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
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
      "Usage: qa-doctor pw-report <playwright-report.json | test-results-dir>",
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
    io.err(
      "qa-doctor internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

export function main(argv: string[] = process.argv.slice(2)): number {
  // Subcommands (§69): ci install · suppressions · forensics · doctor:playwright
  if (argv[0] === "ci" && argv[1] === "install")
    return runCiInstall(argv.slice(2));
  if (argv[0] === "suppressions") return runSuppressions();
  if (argv[0] === "forensics") return runForensicsCommand(argv.slice(1));
  if (argv[0] === "triage") return runTriageCommand(argv.slice(1));
  if (argv[0] === "badge") return runBadgeCommand(argv.slice(1));
  if (argv[0] === "debt") return runDebtCommand(argv.slice(1));
  if (argv[0] === "fix") return runFixCommand(argv.slice(1));
  if (argv[0] === "create-rule") return runCreateRuleCommand(argv.slice(1));
  if (argv[0] === "handover") return runHandoverCommand(argv.slice(1));
  if (argv[0] === "init") return runInitCommand(argv.slice(1));
  if (argv[0] === "pw-report") return runPwReportCommand(argv.slice(1));
  if (argv[0] === "doctor:playwright") return runDoctorPlaywright(argv);
  return runScanCommand(argv);
}

function printUsage(print: (s: string) => void): void {
  print(`qa-doctor — quality scanner for test suites and CI pipelines

Usage: qa-doctor [path] [options]

Options:
  --json                machine-readable output (schemaVersion ${SCHEMA_VERSION})
  --format sarif        SARIF 2.1 output for GitHub Code Scanning
  --verbose             show all findings
  --scope changed       only findings on new/changed lines vs merge-base
  --max-duration <sec>  stop analysis after N seconds (partial results flagged)
  -h, --help            show this help

Subcommands:
  ci install [--gate advisory|error|warning]   generate PR workflow
  suppressions                                  list suppressed findings
  forensics <dir|file> [--no-flaky-md]          runtime evidence: retries,
                                                flakes, FLAKY.md artifact
  triage <dir|file> [--no-md]                   flaky-triage proposal + TRIAGE.md
  badge                                         shields.io endpoint JSON + snippet
  debt                                          test debt register with cost model
  fix [--dry-run]                               apply safe auto-fixes with proof
  create-rule <ID> --title "..."                scaffold a new rule + fixtures
  handover                                      new-QA onboarding map of the suite
  init [--interactive]                          detect frameworks + setup checklist
  pw-report <dir|file>                          Playwright run summary (retries/flakes)

Exit codes: 0 clean · 1 errors found · 2 partial · 10 usage · 20 crash`);
}

if (
  process.argv[1]?.replaceAll("\\", "/").endsWith("cli.ts") ||
  process.argv[1]?.replaceAll("\\", "/").endsWith("cli.js")
) {
  process.exitCode = main();
}
