#!/usr/bin/env node
/**
 * Mjölnir CLI entry point (W1-02).
 * Exit codes (§24.1, frozen): 0 clean · 1 findings ≥ gate · 2 partial ·
 * 10 usage error · 20 internal error.
 */

import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  compareFindings,
  SCHEMA_VERSION,
  type Finding,
  type ScanResult,
  type Severity,
} from "./types.js";
import { discoverWorkspace, type Workspace } from "./discovery/workspace.js";
import { detectFrameworks } from "./discovery/frameworks.js";
import {
  SCAN_ADAPTERS as ADAPTERS,
  discoverAllTestFiles,
} from "./discovery/scan-adapters.js";
import { createIgnoreMatcher, LIMITS } from "./discovery/ignores.js";
import { RULES } from "./rules/index.js";
import { MEASURED_FP } from "./rules/measured-fp.generated.js";
import {
  computeDimensions,
  computeTotal,
  countTestDeclarations,
  deductionFor,
  stampEvidenceLevels,
} from "./scorer/scorer.js";
import { renderTerminal } from "./reporter/terminal.js";
import { renderSarif } from "./reporter/sarif.js";
import { renderMermaid } from "./reporter/mermaid.js";
import { computeChangedScope, filterToChanged } from "./scope/changed.js";
import { asUniversal } from "./engine/rule-runner.js";
import { enforceTierPolicy, type Tier } from "./engine/tier-policy.js";
import type { ParsedAst, ParsedFile } from "./engine/adapter.js";
import { releaseTreeSitterResources } from "./engine/tree-sitter-ast.js";
import { applyOverlapDedup, type OverlapMeta } from "./engine/overlap-dedup.js";
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
import {
  loadConfig,
  ConfigValidationError,
  applySeverityOverrides,
} from "./config/config.js";
import { loadPlugins } from "./plugins/load.js";
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
export const CLI_VERSION = "0.5.0";

const UNIVERSAL_RULES = RULES.map(asUniversal);

/** Registered rule IDs — used to warn on unknown severityOverrides keys (M4). */
const KNOWN_RULE_IDS: ReadonlySet<string> = new Set(RULES.map((r) => r.id));

/**
 * R6 (Bug Map M-02): per-rule overlap metadata, built from RULES the
 * same way tierByRuleId is — `asUniversal` drops `overlapWith`, so the
 * dedup map must come from the registry directly.
 */
const OVERLAP_META_BY_RULE_ID: ReadonlyMap<string, OverlapMeta> = new Map(
  RULES.map((r, order) => {
    const meta: OverlapMeta = {
      ...(r.overlapWith ? { overlapWith: r.overlapWith } : {}),
      ...(r.tier ? { tier: r.tier } : {}),
      order,
    };
    return [r.id, meta] as const;
  }),
);

// Plugin API (Phase 6): third-party rules are appended after core rules;
// core findings always win dedup by running first.
function buildUniversalRules(root: string, strict?: boolean) {
  const { plugins, errors } = loadPlugins(root);
  const pluginRules = plugins.flatMap((p) => p.rules.map(asUniversal));
  let rules = [...UNIVERSAL_RULES, ...pluginRules];
  // Phase 4 (Tempering): exclude quarantine-tier rules unless --strict
  if (!strict) {
    rules = rules.filter((r) => {
      const original = RULES.find((orig) => orig.id === r.id);
      return original?.tier !== "quarantine";
    });
  }
  const tierByRuleId = new Map<string, Tier>();
  for (const r of RULES) {
    if (r.tier) tierByRuleId.set(r.id, r.tier);
  }
  for (const p of plugins) {
    for (const r of p.rules) {
      if (r.tier) tierByRuleId.set(r.id, r.tier);
    }
  }
  const pluginMeta = plugins.map((p) => ({
    name: p.name,
    rules: p.rules.length,
  }));
  return { rules, pluginErrors: errors, tierByRuleId, pluginMeta };
}

/** Rule-declared evidence-level overrides (Honesty Core). */ const EVIDENCE_OVERRIDES: ReadonlyMap<
  string,
  string
> = new Map(
  RULES.filter((r) => r.evidenceLevel !== undefined).map((r) => [
    r.id,
    r.evidenceLevel as string,
  ]),
);

/**
 * Rules whose findings void the suite's pass claim (RuleMeta.suiteInvalidating).
 * Built from the registry so the scorer never has to import it.
 */
const SUITE_INVALIDATING_RULE_IDS: ReadonlySet<string> = new Set(
  RULES.filter((r) => r.suiteInvalidating === true).map((r) => r.id),
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
  /** --strict: include quarantine-tier rules in the scan (Phase 4). */
  strict?: boolean;
  /** --base <ref>: base ref for --scope changed (audit H-10). */
  base?: string;
  /** --debug: print errors swallowed by crash isolation (audit R-9). */
  debug?: boolean;
  /** --record-milestones: let a scan write .mjolnir/stats.json (audit R-1). */
  recordMilestones?: boolean;
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
      else return null; // unknown tone = usage error
    } else if (a === "--strict") {
      args.strict = true;
    } else if (a === "--debug") {
      args.debug = true;
    } else if (a === "--record-milestones") {
      args.recordMilestones = true;
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

export interface ScanHooks {
  /** Invoked when a rule throws on a file (audit R-9). */
  onRuleCrash?: (ruleId: string, file: string, error: unknown) => void;
  /** Invoked for non-fatal config warnings (bug-audit M4). */
  onConfigWarning?: (message: string) => void;
}

/**
 * Workspace fallback for targets with no discoverable project root
 * (package.json-less repos, Python/Java/C# trees). Exported pure so the
 * root-path degenerate case (`C:\` → basename "") is testable without
 * scanning a filesystem root.
 */
export function fallbackWorkspace(targetAbs: string): Workspace {
  return {
    root: targetAbs,
    name: targetAbs.split(/[\\/]/).pop() || "repo",
    packageJson: {},
    workspaceGlobs: [],
  };
}

/**
 * Testable default scan path core. `hooks` lets callers observe
 * normally-invisible events (swallowed rule crashes) without changing
 * the ScanResult contract beyond the rulesCrashed counter.
 *
 * Async since the Verification Trust Evolution Plan Phase 0.5 (§10): the
 * per-file loop awaits the adapter parse stage (WASM grammar load is
 * inherently async); `runRules` and every rule stay synchronous and
 * consume `ParsedFile.ast`. Callers await the returned promise.
 */
export async function runScan(
  args: CliArgs,
  hooks: ScanHooks = {},
): Promise<ScanResult> {
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
      : (discovered ?? fallbackWorkspace(targetAbs));
  const workspace = scanRoot;
  const findings: Finding[] = [];
  let skippedFiles = 0;
  let testFileCount = 0;
  let testDeclarationCount = 0;
  // Bug-audit L3: per-file declaration counts, so a changed-scope scan can
  // score against the files it actually judged instead of the whole repo.
  const declarationsByFile = new Map<string, number>();
  let rulesCrashed = 0;
  // Audits H-3/H-8: honest analysis status. Each phase reports what
  // actually happened; truncation carries named reasons.
  const truncationReasons = new Set<string>();
  let discoveryTruncated = false;
  let rulesPartial = false;

  let tierByRuleId: Map<string, Tier>;
  let pluginsLoaded: Array<{ name: string; rules: number }>;
  // R1: dispatch through language adapters. Rules stay unchanged; the
  // adapters own discovery, parsing, and rule application.
  const {
    rules: activeRules,
    pluginErrors,
    tierByRuleId: tiers,
    pluginMeta,
  } = buildUniversalRules(workspace.root, args.strict);
  tierByRuleId = tiers;
  pluginsLoaded = pluginMeta;
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
    });
  }
  const ctx = {
    workspace,
    testFiles: [] as string[],
    deadline,
    maxFiles: LIMITS.maxFilesPerAdapter,
    ignoreMatcher: createIgnoreMatcher(workspace.root),
    onSkippedFile: (reason?: string) => {
      skippedFiles++;
      if (reason) truncationReasons.add(reason);
    },
    onDiscoveryTruncated: (reason: string) => {
      discoveryTruncated = true;
      if (!truncationReasons.has(reason)) {
        truncationReasons.add(reason);
        skippedFiles++;
      }
    },
    onRuleCrash: (ruleId: string, file: string, error: unknown) => {
      rulesCrashed++;
      hooks.onRuleCrash?.(ruleId, file, error);
    },
  };

  // Phase 2 (Tempering): resolve ignore patterns from .mjolnirignore
  // and config exclude into the scan's own matcher (audit R-8) before
  // discovering test files.

  // Audit H-8/P-2: each adapter discovers into its own capped bucket,
  // via ONE shared tree walk — the pipeline no longer readdirSyncs
  // every directory once per language.
  const languageAdapters = ADAPTERS.filter((a) => a.id !== "github-actions");
  const buckets = new Map<string, string[]>(
    languageAdapters.map((a) => [a.id, [] as string[]]),
  );
  const fixtureDirMemo = new Map<string, boolean>();
  discoverAllTestFiles(ctx, languageAdapters, buckets, fixtureDirMemo);
  // Map preserves insertion order (= languageAdapters order), so the
  // concat order is identical to the per-adapter lookup it replaces.
  for (const bucket of buckets.values()) {
    ctx.testFiles.push(...bucket);
  }
  const wfBucket: string[] = [];
  githubActionsAdapter.discoverTestFiles({ ...ctx, testFiles: wfBucket });
  ctx.testFiles.push(...wfBucket);

  // Audit H-3: the deadline is checked per file here too — discovery
  // alone no longer owns the budget.
  let scanned = 0;
  for (const path of ctx.testFiles) {
    if (Date.now() > deadline) {
      rulesPartial = true;
      skippedFiles += ctx.testFiles.length - scanned;
      truncationReasons.add("rule-loop-deadline");
      break;
    }
    scanned++;
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
    // Exposure metric (Phase 5): count declarations, not files. Workflows
    // declare no tests, so they are excluded from the denominator.
    const relPath = relative(workspace.root, path).replaceAll("\\", "/");
    if (!isWorkflow) {
      const decls = countTestDeclarations(text);
      testDeclarationCount += decls;
      // Per-file accounting (bug-audit L3): in changed-scope mode the
      // score must use a denominator from the files actually judged,
      // not the whole repo.
      declarationsByFile.set(relPath, decls);
    }
    const adapter = isWorkflow
      ? githubActionsAdapter
      : isPython
        ? pythonAdapter
        : isJava
          ? javaAdapter
          : isCs
            ? csharpAdapter
            : typescriptAdapter;
    // Phase 0.5 parse stage (§10): discovery and rule execution stay
    // where they were; the awaited parse sits between them. `runRules`
    // and rules remain synchronous and consume `file.ast`. Every
    // dispose path below runs in a finally-equivalent position — tree
    // release must never depend on rules completing successfully
    // (§10.3): normal completion, rule crash, per-file budget expiry,
    // and adapter throw all pass through `finally`.
    const parsedFile: ParsedFile = { path: relPath, text };
    let parsed: ParsedAst | undefined;
    try {
      if (adapter.parseAst && Date.now() <= deadline) {
        parsed = await adapter.parseAst(parsedFile);
      }
      const fileForRules: ParsedFile = parsed
        ? { ...parsedFile, ast: parsed.ast }
        : parsedFile;
      adapter.runRules(
        activeRules,
        fileForRules,
        (f, ruleId, category) => {
          findings.push({ ...f, ruleId, category } as Finding);
        },
        // Audit R-9: rule crashes stay isolated but are counted and
        // surfaced via hooks (--debug prints them).
        (ruleId, error) => {
          ctx.onRuleCrash?.(ruleId, relPath, error);
        },
        // Audit P-1: per-file analysis budget — one oversized file can
        // no longer own the scan; the skip is counted and reported.
        {
          deadline: Math.min(deadline, Date.now() + LIMITS.maxFileAnalysisMs),
          onExceeded: () => {
            rulesPartial = true;
            skippedFiles++;
            truncationReasons.add("file-budget");
          },
        },
      );
    } catch {
      // WorkflowParseSkipped and friends — counted, never fatal. A
      // parse-stage throw (contract: never happens) lands here too: the
      // file produced no analysis, so counting it as skipped is honest.
      skippedFiles++;
    } finally {
      // §10.3: release the AST on every exit path, success or not.
      parsed?.dispose();
    }
  }

  // Changed-scope filtering (Sprint-Plan W6): report only findings on
  // new/changed lines vs the merge base. Degraded git data → full files.
  let scopeInfo: { scope: "all" | "changed"; degraded?: string | undefined } = {
    scope: "all",
  };
  if (args.scopeChanged) {
    const diff = computeChangedScope(workspace.root, args.base);
    const filtered = filterToChanged(findings, diff);
    findings.length = 0;
    for (const f of filtered) findings.push(f);
    scopeInfo = diff.degraded
      ? { scope: "changed", degraded: diff.reason }
      : { scope: "changed" };
    // Bug-audit L3: restrict the scoring denominator to the changed files
    // — repo-wide declarations + changed-lines-only deductions inflated
    // the score and made it incomparable to a full-scan score.
    if (!diff.degraded) {
      testDeclarationCount = [...Object.keys(diff.changed)].reduce(
        (sum, file) => sum + (declarationsByFile.get(file) ?? 0),
        0,
      );
    }
  }

  // Framework detection (0.2): wire the previously-dead detector into the
  // pipeline so output and rules can be framework-aware.
  const frameworks = detectFrameworks(workspace);

  // Suppression enforcement: active `ignore` entries in
  // mjolnir.config.json remove findings from output, scoring, and exit
  // codes. Expired entries suppress nothing (stale config hides nothing).
  // An entry with `files` globs only suppresses findings under those paths.
  let suppressionCount: number;
  const { config, warnings } = loadConfig(workspace.root, {
    knownRuleIds: KNOWN_RULE_IDS,
  });
  for (const w of warnings) hooks.onConfigWarning?.(w);
  applySeverityOverrides(findings, config);
  const suppressions = loadSuppressions(workspace.root);
  const active = suppressions.entries.filter((e) => e.status === "active");
  suppressionCount = active.length;
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
    for (const f of kept) findings.push(f);
  }

  // R6 (Bug Map M-02): cross-rule overlap dedup. Runs AFTER changed-scope
  // filtering and suppression (review fix): a user's ignore entry that
  // suppresses a pair's survivor must leave the twin present, so the twin
  // is then deduped only if its declarer actually survives suppression —
  // pre-dedup placement silently erased the twin with no trace. Still
  // before scoring/reporting, so the deduped set is what everyone sees.
  const deduped = applyOverlapDedup(findings, OVERLAP_META_BY_RULE_ID);
  findings.length = 0;
  // Loop, not spread: `push(...arr)` throws RangeError above ~124k
  // arguments (V8 call-stack limit) and the scan pipeline has no
  // findings-count cap — large monorepos can exceed it.
  for (const f of deduped) findings.push(f);

  findings.sort(compareFindings);
  // Honesty Core Phase 1: every finding carries its honest evidence level
  // (rule override wins; otherwise derived from findingType+confidence).
  stampEvidenceLevels(findings, EVIDENCE_OVERRIDES);
  // Honesty Core: tag each finding with its rule's measured FP rate when
  // one exists, so JSON consumers get the same signal the footer shows.
  for (const f of findings) {
    const m = MEASURED_FP[f.ruleId];
    if (m) {
      f.measuredFpRate = m.fpRate;
      f.measuredFpN = m.n;
    }
  }
  // Audit H-1: the tier is authoritative — a quarantine finding is
  // advisory by construction (info + E0) no matter what its rule
  // declares, so an unproven rule can never gate CI or deduct score.
  enforceTierPolicy(findings, tierByRuleId);
  const dimensions = computeDimensions(findings);
  const rawDeductions = findings.reduce((sum, f) => sum + deductionFor(f), 0);
  const total = computeTotal(dimensions, findings, {
    testDeclarations: testDeclarationCount,
    testFileCount,
    suiteInvalidatingRuleIds: SUITE_INVALIDATING_RULE_IDS,
  });
  const elapsed = Date.now() - started;

  // R2 empty-state: score is null when no test files exist at all.
  // A "100/100" on a repo with zero tests would be a false proof.
  const hasTests = testFileCount > 0;

  const result: ScanResult = {
    schemaVersion: SCHEMA_VERSION,
    partial: discoveryTruncated || rulesPartial || skippedFiles > 0,
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
    testFileCount,
    testDeclarationCount,
    rawDeductions,
    suppressionCount,
    ...(pluginsLoaded.length > 0 ? { plugins: pluginsLoaded } : {}),
    analysisStatus: {
      // Audits H-3/H-8: both fields derive from what actually happened.
      discovery: discoveryTruncated ? "partial" : "complete",
      rules: rulesPartial ? "partial" : "complete",
      skippedFiles,
      durationMs: elapsed,
      // Audit R-9: crashes swallowed by per-rule isolation, visible.
      rulesCrashed,
      ...(truncationReasons.size > 0
        ? { truncationReasons: [...truncationReasons].sort() }
        : {}),
    },
  };
  // §10.3: every per-file tree was already disposed in the loop's
  // finally; tearing the memoized parsers down here releases the
  // grammar-level WASM state so a long-lived process (library consumer,
  // test runner) doesn't pin it between scans. The next scan
  // transparently re-creates them.
  await releaseTreeSitterResources();
  return result;
}

export type Output = (...parts: unknown[]) => void;

const out: Output = (line) => console.log(line);
const err: Output = (line) => console.error(line);

// Minimal glob match for suppression `files` patterns, with gitignore
// `**` semantics (bug-audit M5). Supports:
//   "tests/**"             — everything inside tests/
//   "tests" + "/**/*.spec.ts" — any depth UNDER tests/ (including none) ending in .spec.ts
//   "**" + "/*.spec.ts"    — any depth including root-level files
//   "tests/foo.spec.ts"    — exact path
//   "*" within a segment never crosses "/".
//
// Forward slashes only (findings always use normalized paths). `?`,
// character classes and `!` negation are not metacharacters here — same
// as before this rewrite.
export function pathMatchesGlob(path: string, glob: string): boolean {
  // Bug-audit QA-2026-08-30 QA-8: normalize BOTH sides to forward
  // slashes. Finding paths are already normalized by the walker, but a
  // suppression `files` pattern written on Windows ("e2e\\x.spec.ts")
  // compiled to a literal-backslash regex that could never match any
  // finding — the suppression silently never applied.
  const p = path.replaceAll("\\", "/");
  const segments = glob.replaceAll("\\", "/").split("/");
  let re = "^";
  for (const [i, segment] of segments.entries()) {
    const last = i === segments.length - 1;
    if (segment === "**") {
      // A `**` segment matches ZERO or more whole path segments. The old
      // split+join compiled it to `.*`, which (a) demanded ≥1 segment in
      // `a/**/b`-shaped patterns and (b) made `tests/**/*.spec.ts` skip
      // single-level paths — suppressions silently never matched.
      if (last) {
        // Trailing `**`: everything inside the prefix, never the prefix
        // directory itself (gitignore semantics).
        re += "(?:[^/]+/)*[^/]+";
      } else {
        re += "(?:[^/]+/)*";
      }
      continue;
    }
    re += segment
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replaceAll("*", "[^/]*");
    if (!last) re += "/";
  }
  return new RegExp(`${re}$`).test(p);
}

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
    throw e;
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `doctor:playwright` handler. */
export async function runDoctorPlaywright(
  argv: string[],
  io: { out: Output; err?: Output } = { out },
): Promise<number> {
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
  let catalog = buildCatalog();
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
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  const target = resolve(args.target);
  const invalid = validateScanTarget(target, io.err);
  if (invalid !== null) return invalid;
  try {
    // Audit R-9: collect swallowed rule crashes; --debug prints them.
    const crashLog: string[] = [];
    // Bug-audit M4: non-fatal config warnings reach stderr in every mode.
    const result = await runScan(
      { ...args, target },
      {
        onConfigWarning: (message) => io.err(message),
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
      if (
        args.recordMilestones &&
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
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
export async function runBadgeCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
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
export async function runDebtCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `fix` handler (Tier 1 #3) — safe auto-fix with proof. */
export async function runFixCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const dryRun = argv.includes("--dry-run");
  const args = parseArgs(argv.filter((a) => a !== "--dry-run"));
  if (!args) {
    printUsage(io.out);
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
export async function runImpactCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
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
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const report = await computeImpact(target, {
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
export async function runBaselineCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `diff` handler (Sprint 6 Task 24) — new/worsened debt only. */
export async function runDiffCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
    const baselinePath = join(target, DEFAULT_BASELINE_PATH);
    const baseline = loadBaseline(baselinePath);
    const diff = diffAgainstBaseline(result, baseline);
    io.out(renderBaselineDiff(diff));

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
    io.err(
      "mjolnir internal error:",
      err instanceof Error ? err.message : String(err),
    );
    return 20;
  }
}

/** Testable `pr-comment` handler (Sprint 6 Task 25). */
export async function runPrCommentCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
    return 10;
  }
  try {
    const target = resolve(args.target);
    const invalid = validateScanTarget(target, io.err);
    if (invalid !== null) return invalid;
    const result = await runScan({ ...args, target });
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
export async function runHandoverCommand(
  argv: string[],
  io: { out: Output; err: Output } = { out, err },
): Promise<number> {
  const args = parseArgs(argv);
  if (!args) {
    printUsage(io.out);
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

export async function main(
  argv: string[] = process.argv.slice(2),
): Promise<number> {
  // `--version` is the first thing most people type against an unfamiliar
  // CLI. Without this it fell through to the scan arg parser, which does
  // not know the flag, and printed the full help — technically not a
  // crash, but it answers a different question than the one asked.
  if (argv[0] === "--version" || argv[0] === "-v") {
    out(`mjolnir-qa ${CLI_VERSION}\n`);
    return 0;
  }
  // Subcommands (§69): ci install · suppressions · forensics · doctor:playwright
  // Scan-backed handlers are async since the Phase 0.5 parse stage (§10) —
  // returning their promise from this async dispatcher awaits it.
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

Usage: mjolnir [path] [options] · mjolnir <subcommand> [args]

The product is one command in CI:

  mjolnir --scope changed        scan only what the branch touched; exit 1 on
                                 new findings. \`mjolnir ci install\` writes the
                                 workflow for you.

Everything else is optional.

  mjolnir [path]                 full-repo scan + WORTHINESS score
  mjolnir explain <RULE-ID>      what/why/fix + measured FP rate for one rule
  mjolnir rules --unmeasured     the rules running on assumption, not measurement

Options:
  --json                machine-readable output (schemaVersion ${SCHEMA_VERSION})
  --format sarif        SARIF 2.1 output for GitHub Code Scanning
  --format mermaid      test-architecture diagram (frameworks → rule
                        categories → severity), pastes directly into a
                        GitHub/GitLab markdown comment or a slide
  --tone blunt          blunter, pattern-mocking messages (opt-in)
  --verbose             show all findings
  --scope changed       only findings on new/changed lines vs merge-base
  --base <ref>          base ref for --scope changed (default: main, then
                        master, then origin/HEAD); uncommitted local
                        changes are always included
  --max-duration <sec>  stop analysis after N seconds (partial results flagged)
  --width <cols>        override terminal width for box/gauge wrapping
                        (defaults to the detected terminal width, or 80)
  --ascii               force plain-ASCII glyphs/box-drawing (auto-detected
                        for cmd.exe/legacy consoles; use this to force it
                        anywhere, e.g. an unrecognized CI log renderer)
  --no-ascii            force Unicode box-drawing even where auto-detection
                        would have chosen ASCII
  --strict              include quarantine-tier rules (higher FP risk) in scan
  --debug               print errors swallowed by rule crash isolation
                        (display-only; exit codes unchanged)
  --record-milestones   allow this scan to write .mjolnir/stats.json for
                        milestone tracking (default: scans never write)
  -v, --version         print the installed version and exit
  -h, --help            show this help

Subcommands — everyday:
  ci install [--gate advisory|error|warning] [--force]
                                   generate the PR workflow; --force overwrites
                                   a hand-customized one (default: refuse)
  explain <RULE-ID> [--fixtures-root <dir>]     what/why/fix + measured FP rate
  rules [--md] [--unmeasured|--measured]        rule catalog with trust metadata
  suppressions                                  list suppressed findings

Subcommands — when something's flaky:
  forensics <dir|file> [--no-flaky-md]          runtime evidence: retries, flakes
  triage <dir|file> [--no-md]                   flaky-triage proposal + TRIAGE.md
  pw-report <dir|file>                          Playwright run summary
  doctor:playwright                             Playwright deep scan + Selector Health

Subcommands — occasional / reporting:
  fix [--dry-run]                               apply safe auto-fixes with proof
  baseline / diff                               snapshot findings, then new/worsened only
  impact [--since <ref>]                        what changed since a prior commit
  debt                                          test-debt register with a cost model
  handover                                      new-QA onboarding map of the suite
  stats                                         all-time local counters of fixes seen
  badge                                         shields.io endpoint JSON + snippet
  pr-comment                                    render a scoped PR comment (Markdown)
  init [--interactive]                          detect frameworks + setup checklist
  create-rule <ID> --title "..."                scaffold a new rule + fixtures
  doctor                                        self-audit of the rule base

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
  // Top-level await: main() is async since the Phase 0.5 parse stage.
  process.exitCode = await main();
}
