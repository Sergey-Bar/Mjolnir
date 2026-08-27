/**
 * Mjölnir CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  compareFindings,
  SCHEMA_VERSION,
  type Finding,
  type ScanResult,
} from "./types.js";
import { discoverWorkspace } from "./discovery/workspace.js";
import { detectFrameworks } from "./discovery/frameworks.js";
import { RULES } from "./rules/index.js";
import {
  computeDimensions,
  computeTotal,
  stampEvidenceLevels,
} from "./scorer/scorer.js";
import { renderTerminal } from "./reporter/terminal.js";
import { renderSarif } from "./reporter/sarif.js";
import { renderMermaid } from "./reporter/mermaid.js";
import { computeChangedScope, filterToChanged } from "./scope/changed.js";
import { asUniversal } from "./engine/rule-runner.js";
import { isAdvisoryFinding } from "./types.js";
import { typescriptAdapter } from "./adapters/typescript.js";
import { githubActionsAdapter } from "./adapters/github-actions.js";
import { pythonAdapter } from "./adapters/python.js";
import { javaAdapter } from "./adapters/java.js";
import { csharpAdapter } from "./adapters/csharp.js";
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
import { loadConfig, applySeverityOverrides } from "./config/config.js";
import { loadPlugins } from "./plugins/load.js";
import {
  computeSelectorHealth,
  renderSelectorHealth,
} from "./playwright/selector-health.js";

const ADAPTERS = [
  typescriptAdapter,
  pythonAdapter,
  javaAdapter,
  csharpAdapter,
  githubActionsAdapter,
] as const;
const UNIVERSAL_RULES = RULES.map(asUniversal);

// Plugin API (Phase 6): third-party rules are appended after core rules;
// core findings always win dedup by running first.
function buildUniversalRules(root: string) {
  const { plugins, errors } = loadPlugins(root);
  const pluginRules = plugins.flatMap((p) => p.rules.map(asUniversal));
  return { rules: [...UNIVERSAL_RULES, ...pluginRules], pluginErrors: errors };
}

/** Rule-declared evidence-level overrides (Honesty Core). */
const EVIDENCE_OVERRIDES: ReadonlyMap<string, string> = new Map(
  RULES.filter((r) => r.evidenceLevel !== undefined).map((r) => [
    r.id,
    r.evidenceLevel as string,
  ]),
);

interface CliArgs {
  target: string;
  json: boolean;
  verbose: boolean;
  maxDurationMs: number;
  scopeChanged: boolean;
  format: "terminal" | "json" | "sarif" | "mermaid";
  /** --width override for terminal box/gauge wrapping (Sprint 5 Task 22). */
  width?: number;
  /** --ascii / --no-ascii override for shouldUseAscii()'s heuristic. */
  ascii?: boolean;
  /** --tone blunt: opt-in blunter messages (Sprint 9 Task 40). */
  tone?: "blunt";
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
      else if (fmt === "mermaid") args.format = "mermaid";
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
      else return null; // unknown tone = usage error
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
  const discovered = discoverWorkspace(args.target);
  const targetAbs = resolve(args.target);
  // Scope containment: when the user targets a subdirectory of the
  // discovered project root (e.g. one package in a monorepo), scan ONLY
  // that subtree — sibling packages were never pointed at.
  const scanRoot =
    discovered &&
    discovered.root !== targetAbs &&
    targetAbs.startsWith(discovered.root + sep)
      ? { ...discovered, root: targetAbs }
      : (discovered ?? {
          root: targetAbs,
          name: targetAbs.split(/[\\/]/).pop() ?? "repo",
          packageJson: {},
          workspaceGlobs: [],
        });
  const workspace = scanRoot;
  const findings: Finding[] = [];
  let skippedFiles = 0;
  let testFileCount = 0;

  if (workspace) {
    // R1: dispatch through language adapters. Rules stay unchanged; the
    // adapters own discovery, parsing, and rule application.
    const { rules: activeRules, pluginErrors } = buildUniversalRules(
      workspace.root,
    );
    for (const err of pluginErrors) {
      findings.push({
        ruleId: "QA-PLUGIN-000",
        category: "QA-PW",
        severity: "warning",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "HYGIENE",
        evidenceLevel: "E2",
        file: "mjolnir.config.json",
        line: 1,
        column: 1,
        message: `Plugin problem: ${err}`,
        why: "A configured plugin could not be loaded or declared invalid rules — its checks are silently missing from this scan.",
        fix: "Fix or remove the plugin entry in mjolnir.config.json.",
      } as Finding);
    }
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
      const isJava = javaAdapter.isTestFile(path);
      const isCs = csharpAdapter.isTestFile(path);
      if (!isWorkflow) testFileCount++;
      let text: string;
      try {
        // Normalize once at read time: strip BOM (breaks ^-anchored regexes)
        // and unify CRLF → LF ($-anchored regexes miss every line on Windows
        // checkouts otherwise). Rules can rely on LF-only text.
        text = readFileSync(path, "utf8")
          .replace(/^\uFEFF/, "")
          .replace(/\r\n?/g, "\n");
      } catch {
        skippedFiles++;
        continue;
      }
      const relPath = relative(workspace.root, path).replaceAll("\\", "/");
      const adapter = isWorkflow
        ? githubActionsAdapter
        : isPython
          ? pythonAdapter
          : isJava
            ? javaAdapter
            : isCs
              ? csharpAdapter
              : typescriptAdapter;
      try {
        adapter.runRules(
          activeRules,
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

  // Suppression enforcement: active `ignore` entries in
  // mjolnir.config.json remove findings from output, scoring, and exit
  // codes. Expired entries suppress nothing (stale config hides nothing).
  // An entry with `files` globs only suppresses findings under those paths.
  if (workspace) {
    const { config } = loadConfig(workspace.root);
    applySeverityOverrides(findings, config);
    const suppressions = loadSuppressions(workspace.root);
    const active = suppressions.entries.filter((e) => e.status === "active");
    if (active.length > 0) {
      const ruleOnly = new Set(
        active.filter((e) => !e.files?.length).map((e) => e.ruleId),
      );
      const kept = findings.filter((f) => {
        if (ruleOnly.has(f.ruleId)) return false;
        return !active.some(
          (e) =>
            e.files?.length &&
            e.ruleId === f.ruleId &&
            e.files.some((g) => pathMatchesGlob(f.file, g)),
        );
      });
      findings.length = 0;
      findings.push(...kept);
    }
  }

  findings.sort(compareFindings);
  // Honesty Core Phase 1: every finding carries its honest evidence level
  // (rule override wins; otherwise derived from findingType+confidence).
  stampEvidenceLevels(findings, EVIDENCE_OVERRIDES);
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
    // Honesty: the JSON/SARIF contract carries ALL findings — silent
    // truncation would make machine consumers (Code Scanning, CI gates)
    // act on incomplete evidence. The terminal reporter limits its own
    // display (top 5 + "--verbose for all"); no data is dropped here.
    findings,
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

/**
 * Minimal glob match for suppression `files` patterns. Supports:
 *   "tests/**"  — everything under tests/
 *   "**‍/*.spec.ts" — any depth ending pattern
 *   "tests/foo.spec.ts" — exact path
 * Forward slashes only (findings always use normalized paths).
 */
export function pathMatchesGlob(path: string, glob: string): boolean {
  // Single-pass tokenizer: split on "**" first, escape the literal
  // segments, then rejoin with the right wildcards. Avoids the
  // replaceAll ordering bugs of multi-pass approaches.
  const parts = glob.split("**");
  const pattern = parts
    .map((p) =>
      p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*"),
    )
    .join(".*");
  return new RegExp(`^${pattern}$`).test(path);
}

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
  io.out("Change with: mjolnir ci install --gate error|warning|advisory");
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
    io.err(
      "mjolnir internal error:",
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
  const args = parseArgs([target]);
  if (!args) return 10;
  const result = runScan({ ...args, target });
  const pwFindings = result.findings.filter((f) => f.category === "QA-PW");
  io.out(
    renderTerminal(
      { ...result, findings: pwFindings },
      { isTTY: process.stdout.isTTY ?? false, verbose: args.verbose },
    ),
  );

  // Selector Health per spec.
  const specs = computeSelectorHealth(target);
  io.out(renderSelectorHealth(specs));
  return 0;
}

/** Testable `doctor` handler — self-audit of Mjölnir's own rule base. */
export function runDoctorCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const targetArg = argv.find((a) => !a.startsWith("-")) ?? process.cwd();
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `rules` handler — rule catalog with Trust Metadata. */
export function runRulesCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const catalog = buildCatalog();
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
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
      // Milestones (Sprint 9 Task 39) — terminal-only, display-only.
      // Never printed for --json/--format sarif/mermaid: those are
      // machine contracts and must stay byte-for-byte what the schema
      // promises, nothing extra appended.
      if (result.score === 100 && result.findings.length === 0) {
        const target = resolve(args.target);
        const statsPath = join(target, DEFAULT_STATS_PATH);
        const { newlyAnnounced, stats } = recordMilestones(
          loadStats(statsPath),
          ["first-clean-scan"],
        );
        if (newlyAnnounced.length > 0) {
          saveStats(stats, statsPath);
          for (const id of newlyAnnounced) io.out(MILESTONE_MESSAGES[id]);
        }
      }
    }
    // Exit-code × gate semantics (S13): partial scans NEVER block.
    // Honesty Core Phase 2: advisory (E0) findings never gate CI —
    // observations are reported but carry no enforcement weight.
    if (result.partial) return 2;
    return result.findings.some(
      (f) => f.severity === "error" && !isAdvisoryFinding(f),
    )
      ? 1
      : 0;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
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
      const mdPath = resolve(join(targetArg, "TRIAGE.md"));
      writeFileSync(mdPath, renderTriageMd(report));
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
    io.err(
      "mjolnir internal error:",
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
      "mjolnir internal error:",
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
      "mjolnir internal error:",
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
      "mjolnir internal error:",
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
    io.err('Usage: mjolnir create-rule <QA-XXX-nnn> --title "Rule title"');
    io.err("Families: QA-TEST · QA-TQUAL · QA-PW · QA-CI · QA-PY");
    return 10;
  }
  try {
    const result = createRuleScaffold({ id, title }, process.cwd());
    io.out(renderScaffoldReport(result));
    return result.ok ? 0 : 1;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

function currentCommit(root: string): string {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unknown";
  }
}

/** Testable `impact` handler (Sprint 6 Task 23). */
export function runImpactCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): number {
  const sinceIdx = argv.indexOf("--since");
  const since = sinceIdx !== -1 ? argv[sinceIdx + 1] : undefined;
  const args = parseArgs(
    sinceIdx === -1
      ? argv
      : argv.filter((_a, i) => i !== sinceIdx && i !== sinceIdx + 1),
  );
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const report = computeImpact(target, {
      ...(since ? { since } : {}),
      runScan: (dir) => runScan({ ...args, target: dir }),
    });
    io.out(renderImpact(report));
    return report.hasComparison ? 0 : 2;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `baseline` handler (Sprint 6 Task 24). */
export function runBaselineCommand(
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
    const outPath = join(target, DEFAULT_BASELINE_PATH);
    saveBaseline(result, currentCommit(target), outPath);
    io.out(renderBaselineSaved(DEFAULT_BASELINE_PATH, result.findings.length));
    return 0;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `diff` handler (Sprint 6 Task 24) — new/worsened debt only. */
export function runDiffCommand(
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
    const baselinePath = join(target, DEFAULT_BASELINE_PATH);
    const baseline = loadBaseline(baselinePath);
    const diff = diffAgainstBaseline(result, baseline);
    io.out(renderBaselineDiff(diff));

    // Fold resolved findings into all-time stats (Task 26) — only when a
    // real comparison happened; establishing a baseline records nothing.
    if (diff.hasBaseline) {
      const statsPath = join(target, DEFAULT_STATS_PATH);
      const stats = recordResolved(loadStats(statsPath), diff);
      saveStats(stats, statsPath);

      // Milestones (Sprint 9 Task 39) — real event this command just
      // witnessed (diff.resolvedFindings is non-empty), never a guess.
      if (diff.resolvedFindings.length > 0) {
        const milestone = recordMilestones(stats, ["first-debt-reduction"]);
        if (milestone.newlyAnnounced.length > 0) {
          saveStats(milestone.stats, statsPath);
          for (const id of milestone.newlyAnnounced)
            io.out(MILESTONE_MESSAGES[id]);
        }
      }
    }

    if (!diff.hasBaseline) return 2;
    return diff.newFindings.some((f) => f.severity === "error") ? 1 : 0;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `pr-comment` handler (Sprint 6 Task 25). */
export function runPrCommentCommand(
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
    const baseline = loadBaseline(join(target, DEFAULT_BASELINE_PATH));
    const diff = baseline ? diffAgainstBaseline(result, baseline) : undefined;
    io.out(renderPrComment(result, diff ? { diff } : {}));
    return 0;
  } catch (err) {
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
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
    io.err(
      "mjolnir internal error:",
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
      "mjolnir internal error:",
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
      "mjolnir internal error:",
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
    io.err(
      "mjolnir internal error:",
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
  if (argv[0] === "impact") return runImpactCommand(argv.slice(1));
  if (argv[0] === "baseline") return runBaselineCommand(argv.slice(1));
  if (argv[0] === "diff") return runDiffCommand(argv.slice(1));
  if (argv[0] === "pr-comment") return runPrCommentCommand(argv.slice(1));
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
  return runScanCommand(argv);
}

function printUsage(print: (s: string) => void): void {
  print(`🔨 mjölnir — verification trust engine for test suites and CI pipelines

Usage: mjolnir [path] [options]

Options:
  --json                machine-readable output (schemaVersion ${SCHEMA_VERSION})
  --format sarif        SARIF 2.1 output for GitHub Code Scanning
  --format mermaid      test-architecture diagram (frameworks → rule
                        categories → severity), pastes directly into a
                        GitHub/GitLab markdown comment or a slide
  --tone blunt          blunter, pattern-mocking messages (opt-in)
  --verbose             show all findings
  --scope changed       only findings on new/changed lines vs merge-base
  --max-duration <sec>  stop analysis after N seconds (partial results flagged)
  --width <cols>        override terminal width for box/gauge wrapping
                        (defaults to the detected terminal width, or 80)
  --ascii               force plain-ASCII glyphs/box-drawing (auto-detected
                        for cmd.exe/legacy consoles; use this to force it
                        anywhere, e.g. an unrecognized CI log renderer)
  --no-ascii            force Unicode box-drawing even where auto-detection
                        would have chosen ASCII
  -h, --help            show this help

Subcommands:
  ci install [--gate advisory|error|warning]   generate PR workflow
  suppressions                                  list suppressed findings
  forensics <dir|file> [--no-flaky-md]          runtime evidence: retries,
                                                flakes, FLAKY.md artifact
  triage <dir|file> [--no-md]                   flaky-triage proposal + TRIAGE.md
  badge                                         shields.io endpoint JSON + snippet
  debt                                          test debt register with cost model
  impact [--since <ref>]                        what changed since a prior commit —
                                                fixes and new debt, or UNKNOWN
  baseline                                       snapshot current findings for later diff
  diff                                           new/worsened debt only, vs the baseline
  pr-comment                                     render a scoped PR comment (Markdown)
  stats                                          all-time local counters of fixes seen
  fix [--dry-run]                               apply safe auto-fixes with proof
  create-rule <ID> --title "..."                scaffold a new rule + fixtures
  handover                                      new-QA onboarding map of the suite
  init [--interactive]                          detect frameworks + setup checklist
  pw-report <dir|file>                          Playwright run summary (retries/flakes)
  doctor                                        self-audit: fixture firewall,
                                                registry sanity, trust metadata
  rules [--md]                                  rule catalog with trust metadata
                                                (JSON or markdown)
  explain <RULE-ID> [--fixtures-root <dir>]     what/why/fix for one rule,
                                                with a real example from its
                                                own must-fire fixture

Exit codes: 0 clean · 1 errors found · 2 partial · 10 usage · 20 crash`);
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
  process.exitCode = main();
}
