/**
 * Canonical scan pipeline (M6 — blueprint §9.2).
 *
 * THE one scan path: every scan-producing surface (scan, fix, diff,
 * baseline, pr-comment, summary, badge, debt, impact, triage-adjacent,
 * handover, future MCP) funnels through `runScan` here. Commands parse
 * arguments and render; this module owns all scan semantics — discovery,
 * adapters, rules, suppressions, dedup, evidence, scoring. No consumer
 * may re-implement any of it (module boundary law §9.1, Contract D).
 *
 * Behavioral-preservation note (§9.3): this is a byte-faithful extraction
 * from `cli.ts` — the function bodies are unchanged; only their home
 * module moved. Re-exports in cli.ts keep the historical import surface.
 */

import { existsSync, lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, relative, resolve, sep } from "node:path";

import {
  compareFindings,
  SCHEMA_VERSION,
  type Finding,
  type ForensicVerdictSummary,
  type RuleCategory,
  type ScanResult,
} from "../types.js";
import { deriveCompletion } from "./completion.js";
import { buildTrustSummary } from "./trust-summary.js";
import { buildEvidenceGraph, buildRunIdentity } from "./run-identity.js";
import {
  createExecutor,
  executeFiles,
  type FileOutcome,
} from "./file-executor.js";
import { bindRepository, readCandidateBinding } from "./candidate-binding.js";
import { ENGINE_VERSION } from "./version.js";
import {
  TRUST_MODEL_VERSION,
  SCORING_MODEL_VERSION,
  FRAMEWORK_SUPPORT_MATRIX_VERSION,
  EVIDENCE_SCHEMA_VERSION,
} from "./contract-versions.js";
import { discoverEvidenceCandidates } from "../discovery/evidence-discovery.js";
import { discoverWorkspace, type Workspace } from "../discovery/workspace.js";
import { computeStagedFiles } from "../scope/changed.js";
import { detectFrameworks } from "../discovery/frameworks.js";
import {
  SCAN_ADAPTERS as ADAPTERS,
  discoverAllTestFiles,
} from "../discovery/scan-adapters.js";
import { createIgnoreMatcher, LIMITS } from "../discovery/ignores.js";
import { RULES } from "../rules/index.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import {
  computeDimensions,
  computeTotal,
  countTestDeclarations,
  deductionFor,
  stampEvidenceLevels,
} from "../scorer/scorer.js";
import { computeChangedScope, filterToChanged } from "../scope/changed.js";
import { asUniversal } from "./rule-runner.js";
import { enforceTierPolicy, type Tier } from "./tier-policy.js";
import type { QADoctorRule } from "../rules/rule.js";
import type {
  UniversalRule,
  ParsedAst,
  ParsedFile,
  ScanContext,
  LanguageAdapter,
} from "./adapter.js";
import { stampRuntimeCorroboration } from "./runtime-corroboration.js";
import {
  buildEvidenceRecords,
  countEvidence,
  type EvidenceRecord,
} from "./evidence-core.js";
import { classifyProvenance, computeAgenticProfile } from "./provenance.js";
import { releaseTreeSitterResources } from "./tree-sitter-ast.js";
import { resetTsMorphProject } from "./ts-ast.js";
import { applyOverlapDedup, type OverlapMeta } from "./overlap-dedup.js";
import { correlateFindings } from "./correlation-engine.js";
import { buildDependencyGraph } from "./dependency-graph.js";
import { isIncrementalSafe } from "./incremental-analysis.js";
import { analyzeMonorepo } from "./monorepo-analysis.js";
import { getCodeTextForCounting } from "./code-text.js";
import { readFileBounded } from "../lib/fs-bounded.js";
import {
  computeRulesDigest,
  createScanCache,
  disabledScanCache,
  fileCacheKey,
  type ScanCache,
} from "./scan-cache.js";
import { typescriptAdapter } from "../adapters/typescript.js";
import { githubActionsAdapter } from "../adapters/github-actions.js";
import { azurePipelinesAdapter } from "../adapters/azure-pipelines.js";
import { jenkinsAdapter } from "../adapters/jenkins.js";
import { pythonAdapter } from "../adapters/python.js";
import { javaAdapter } from "../adapters/java.js";
import { csharpAdapter } from "../adapters/csharp.js";
import { runForensics } from "../forensics/run.js";
import { loadSuppressions } from "../config/suppressions.js";
import { loadConfig, applySeverityOverrides } from "../config/config.js";
import { loadPlugins } from "../plugins/load.js";
import { loadLocalRules, LOCAL_RULES_DIR } from "../plugins/local-rules.js";
import {
  pluginsGateOpen,
  renderGateNotice,
  type SkippedRuleSource,
} from "../plugins/trust-gate.js";

const UNIVERSAL_RULES = RULES.map(asUniversal);
const DEFAULT_MAX_DURATION_MS = 600_000;
const MAX_DURATION_MS = 3_600_000;

/** Registered rule IDs — used to warn on unknown severityOverrides keys (M4). */
export const KNOWN_RULE_IDS: ReadonlySet<string> = new Set(
  RULES.map((r) => r.id),
);

/**
 * R6 (Bug Map M-02): per-rule overlap metadata, built from RULES the
 * same way tierByRuleId is — `asUniversal` drops `overlapWith`, so the
 * dedup map must come from the registry directly.
 */
export const OVERLAP_META_BY_RULE_ID: ReadonlyMap<string, OverlapMeta> =
  new Map(
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
// Plan §18 (Local Extensibility): workspace-local `mjolnir-rules/` files
// load alongside npm plugins — folder-based, zero network.
// Audit C2 (locked decision): code-executing rule sources (npm plugins,
// JS modules) load ONLY behind the plugin trust gate (--enable-plugins /
// MJOLNIR_ENABLE_PLUGINS=1, default OFF). JSON manifests stay
// declarative-safe and load without the gate.
export async function buildUniversalRules(
  root: string,
  strict?: boolean,
  opts: {
    /** CLI trust-gate flag (`--enable-plugins`) for this scan. */
    enablePlugins?: boolean;
    /** Called with the gate notice when code sources were skipped. */
    onGateNotice?: (notice: string) => void;
  } = {},
): Promise<{
  rules: UniversalRule[];
  pluginErrors: string[];
  tierByRuleId: Map<string, Tier>;
  pluginMeta: Array<{ name: string; rules: number }>;
  externalRules: QADoctorRule[];
}> {
  const gateOpen = pluginsGateOpen(opts.enablePlugins);
  const { plugins, errors, skipped } = loadPlugins(root, gateOpen);
  const local = await loadLocalRules(root, gateOpen);
  // Audit C2: when rule sources are present but the gate is off, say so
  // loudly on stderr — a silent boundary looks like a bug, not a policy.
  if (!gateOpen && opts.onGateNotice) {
    const skippedSources: SkippedRuleSource[] = [
      ...skipped.map((name) => ({
        kind: "plugin-package" as const,
        name,
      })),
      ...local.skipped.map((name) => ({ kind: "js-module" as const, name })),
    ];
    if (skippedSources.length > 0) {
      opts.onGateNotice(renderGateNotice(skippedSources));
    }
  }
  const allErrors = [...errors, ...local.errors];
  const externalRules = [
    ...plugins.map((p) => ({ name: p.name, rules: p.rules })),
    { name: LOCAL_RULES_DIR, rules: local.rules },
  ].flatMap((p) => p.rules.map(asUniversal));
  const tierByRuleId = new Map<string, Tier>();
  for (const r of RULES) {
    if (r.tier) tierByRuleId.set(r.id, r.tier);
  }
  for (const p of plugins) {
    for (const r of p.rules) {
      if (r.tier) tierByRuleId.set(r.id, r.tier);
    }
  }
  for (const r of local.rules) {
    if (r.tier) tierByRuleId.set(r.id, r.tier);
  }
  let rules = [...UNIVERSAL_RULES, ...externalRules];
  // Phase 4 (Tempering): exclude quarantine-tier rules unless --strict.
  // §18: the tier map covers EXTERNAL rules too — a workspace-local
  // quarantine rule is excluded exactly like a core one.
  if (!strict) {
    rules = rules.filter((r) => tierByRuleId.get(r.id) !== "quarantine");
  }
  const pluginMeta = [
    ...plugins.map((p) => ({
      name: p.name,
      rules: p.rules.length,
    })),
    ...(local.rules.length > 0
      ? [
          {
            name: `${LOCAL_RULES_DIR}/ (workspace-local external rules)`,
            rules: local.rules.length,
          },
        ]
      : []),
  ];
  return {
    rules,
    pluginErrors: allErrors,
    tierByRuleId,
    pluginMeta,
    externalRules: local.rules,
  };
}

/** Rule-declared evidence-level overrides (Honesty Core). */
export const EVIDENCE_OVERRIDES: ReadonlyMap<string, string> = new Map(
  RULES.filter((r) => r.evidenceLevel !== undefined).map((r) => [
    r.id,
    r.evidenceLevel as string,
  ]),
);

/**
 * Rules whose findings void the suite's pass claim (RuleMeta.suiteInvalidating).
 * Built from the registry so the scorer never has to import it.
 */
export const SUITE_INVALIDATING_RULE_IDS: ReadonlySet<string> = new Set(
  RULES.filter((r) => r.suiteInvalidating === true).map((r) => r.id),
);

export interface CliArgs {
  target: string;
  json: boolean;
  verbose: boolean;
  maxDurationMs: number;
  scopeChanged: boolean;
  format: "terminal" | "json" | "sarif" | "mermaid" | "codequality";
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
  /**
   * --cache: reuse per-file rule verdicts from the local content-addressed
   * cache (M5.2). Post-loop processing always re-runs; the cache only
   * short-circuits the read+parse+rule loop for byte-identical files
   * under an unchanged rule set. Local-only, never leaves the machine.
   */
  cache?: boolean;
  /**
   * --no-progress: never render the live scan-progress line, even on an
   * interactive TTY (plan M3, additive flag). Progress is stderr-only
   * and auto-disabled in CI/machine formats; this flag is the manual off.
   */
  noProgress?: boolean;
  /**
   * --staged: scan-surface restriction (plan §5.7) — intersect the
   * discovered test files with the git staged file list. Does NOT
   * change rule semantics; score implications come only from the
   * narrowed surface (labeled as such in the report).
   */
  staged?: boolean;
  /**
   * --blocking error|warning|none (plan §5.8): invocation-level gate
   * override. Controls PROCESS EXIT BEHAVIOR ONLY via the existing
   * exitForFindings mechanism — detection, rendering, JSON and score
   * are identical under all three values. Overrides config.gate.
   */
  blocking?: "error" | "warning" | "none";
  /**
   * --category <cat> (repeatable): presentation filter — narrows the
   * TERMINAL findings display (and handoff/why output) to the given
   * rule categories. NEVER filters the scan, the JSON/SARIF output,
   * or the score (agent-handoff plan §5.5).
   */
  categories?: RuleCategory[];
  /**
   * --score: print only the numeric score (or `unknown` when the repo
   * has no tests) instead of the full report. Pure rendering flag:
   * scan semantics and exit codes are unchanged (plan §5.6).
   */
  scoreOnly?: boolean;
  /**
   * Audit C2: --enable-plugins opens the plugin trust gate for THIS
   * invocation — npm-plugin and JS-module rule sources may load (and
   * execute). Default OFF; MJOLNIR_ENABLE_PLUGINS=1 is the env
   * equivalent. JSON rule manifests are unaffected (no code by design).
   */
  enablePlugins?: boolean;
  /**
   * --classic (plan §26 WI-5): escape hatch back to the pre-Trust-Report
   * terminal render. Rendering flag only — scan semantics, exit codes
   * and JSON are identical under both surfaces. Default OFF: the Trust
   * Report is the hero output.
   */
  classic?: boolean;
  /**
   * --monorepo: per-package trust analysis (ECO-003). When enabled, the
   * scan discovers packages and computes per-package scores with
   * configurable aggregation. Additive flag; absent means "single-project
   * mode" (no monorepo analysis).
   */
  monorepo?: boolean;
}

export interface ScanHooks {
  /** Invoked when a rule throws on a file (audit R-9). */
  onRuleCrash?: (ruleId: string, file: string, error: unknown) => void;
  /** Invoked for non-fatal config warnings (bug-audit M4). */
  onConfigWarning?: (message: string) => void;
  /**
   * Live-progress feed (plan M3, additive). Fired from the per-file
   * parse+rules loop and the phase boundaries. Render-on-event only —
   * the scan never waits on a timer, and output contracts are
   * unchanged when the hook is absent.
   */
  onProgress?: (e: {
    phase: "discover" | "parse" | "rules" | "score";
    done?: number | undefined;
    total?: number | undefined;
    detail?: string | undefined;
  }) => void;
  /**
   * Audit C2: invoked when code-executing rule sources were skipped
   * because the plugin trust gate is closed. Default (no hook): the
   * gate notice is written straight to stderr — loud in every verb,
   * never on the stdout machine contracts.
   */
  onGateNotice?: (notice: string) => void;
  onTestFilesDiscovered?: (files: readonly string[]) => void;
  onPreSuppressionFindings?: (findings: readonly Finding[]) => void;
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
 * Minimal glob match for suppression `files` patterns, with gitignore
 * `**` semantics (bug-audit M5). Supports:
 *   "tests/**"             — everything inside tests/
 *   "tests" + "/**\/*.spec.ts" — any depth UNDER tests/ (including none) ending in .spec.ts
 *   "**" + "/*.spec.ts"    — any depth including root-level files
 *   "tests/foo.spec.ts"    — exact path
 *   "*" within a segment never crosses "/".
 *
 * Forward slashes only (findings always use normalized paths). `?`,
 * character classes and `!` negation are not metacharacters here — same
 * as before this rewrite.
 */
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
  // glob segments are escape-quoted line-by-line above — no unescaped
  // regex metacharacters reach the RegExp.
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`${re}$`).test(p);
}

/**
 * Plan §16 + WI-11: locate a runtime run report next to the scan
 * target, using the exact conventions the forensics ingestion already
 * accepts. Zero-config search over conventional artifact names at
 * depth ≤ 2 (src/discovery/evidence-discovery.ts). The FIRST parsable
 * candidate with `totalTests > 0` is kept as a fallback; the loop
 * continues and returns a later candidate when one with
 * `analysisComplete === true` is found. Returns the parsed report
 * alongside the path to avoid double-parsing.
 */
export function discoverAndParseRuntimeReport(
  scanRoot: string,
):
  | { path: string; report: import("../forensics/types.js").ForensicsReport }
  | undefined {
  let fallback:
    | { path: string; report: import("../forensics/types.js").ForensicsReport }
    | undefined;
  for (const c of discoverEvidenceCandidates(scanRoot)) {
    try {
      const fr = runForensics(c.path, { writeFlakyMd: false });
      if (fr.report.totalTests <= 0) continue;
      if (!fallback) fallback = { path: c.path, report: fr.report };
      if (fr.report.analysisComplete === true) {
        return { path: c.path, report: fr.report };
      }
    } catch {
      // corrupt or unparsable → try next candidate
    }
  }
  return fallback;
}

/**
 * Audit W10 — runtime shape validation at the rule→Finding boundary.
 * A finding record coming out of a rule (plugin/JSON-manifest rules are
 * external data, not trusted internal code) must carry the fields the
 * whole downstream pipeline indexes on: severity within the enum,
 * integer line ≥ 1, non-empty message, and a file path. Malformed
 * records are rejected (routed to the crash/plugin-error channel by the
 * caller) — never silently scored.
 */
export function isValidFindingRecord(
  f: unknown,
): f is Omit<Finding, "ruleId" | "category"> {
  if (typeof f !== "object" || f === null) return false;
  const rec = f as Record<string, unknown>;
  if (
    rec["severity"] !== "error" &&
    rec["severity"] !== "warning" &&
    rec["severity"] !== "info"
  ) {
    return false;
  }
  if (
    typeof rec["line"] !== "number" ||
    !Number.isInteger(rec["line"]) ||
    rec["line"] < 1
  ) {
    return false;
  }
  if (typeof rec["message"] !== "string" || rec["message"] === "") {
    return false;
  }
  if (typeof rec["file"] !== "string" || rec["file"] === "") return false;
  return true;
}

/**
 * Replace 7-way nested ternary with a linear probe.
 * Returns the adapter whose `isTestFile` matches the path, falling
 * back to the TypeScript adapter (the default language).
 */
export function selectAdapter(path: string): LanguageAdapter {
  if (githubActionsAdapter.isTestFile(path)) return githubActionsAdapter;
  if (azurePipelinesAdapter.isTestFile(path)) return azurePipelinesAdapter;
  if (jenkinsAdapter.isTestFile(path)) return jenkinsAdapter;
  if (pythonAdapter.isTestFile(path)) return pythonAdapter;
  if (javaAdapter.isTestFile(path)) return javaAdapter;
  if (csharpAdapter.isTestFile(path)) return csharpAdapter;
  return typescriptAdapter;
}

export interface DiscoveryResult {
  testFiles: string[];
  stagedSurface: boolean;
}

export function discoverTestFilesPhase(
  workspace: Workspace,
  args: CliArgs,
  hooks: ScanHooks,
  scanRoot: Workspace,
  ctx: ScanContext,
): DiscoveryResult {
  const languageAdapters = ADAPTERS.filter(
    (a) =>
      a.id !== "github-actions" &&
      a.id !== "azure-pipelines" &&
      a.id !== "jenkins",
  );
  const buckets = new Map<string, string[]>(
    languageAdapters.map((a) => [a.id, [] as string[]]),
  );
  const fixtureDirMemo = new Map<string, boolean>();
  discoverAllTestFiles(ctx, languageAdapters, buckets, fixtureDirMemo);
  for (const bucket of buckets.values()) {
    ctx.testFiles.push(...bucket);
  }
  const wfBucket: string[] = [];
  githubActionsAdapter.discoverTestFiles({ ...ctx, testFiles: wfBucket });
  ctx.testFiles.push(...wfBucket);
  const azBucket: string[] = [];
  azurePipelinesAdapter.discoverTestFiles({ ...ctx, testFiles: azBucket });
  ctx.testFiles.push(...azBucket);
  const jfBucket: string[] = [];
  jenkinsAdapter.discoverTestFiles({ ...ctx, testFiles: jfBucket });
  ctx.testFiles.push(...jfBucket);
  let stagedSurface = false;
  if (args.staged) {
    const staged = computeStagedFiles(scanRoot.root);
    if (staged === null) {
      hooks.onConfigWarning?.(
        "mjolnir: --staged ignored — not a git repository (scanning the full surface).",
      );
    } else {
      const stagedSet = new Set(staged.map((s) => s.replace(/\\/g, "/")));
      ctx.testFiles = ctx.testFiles.filter((f) =>
        stagedSet.has(relative(scanRoot.root, f).replace(/\\/g, "/")),
      );
      stagedSurface = true;
      if (ctx.testFiles.length === 0) {
        hooks.onConfigWarning?.(
          "mjolnir: --staged — no staged files match the scan surface.",
        );
      }
    }
  }
  hooks.onProgress?.({
    phase: "discover",
    done: ctx.testFiles.length,
    total: ctx.testFiles.length,
  });
  return { testFiles: ctx.testFiles, stagedSurface };
}

export interface FileAnalysisResult {
  skippedFiles: number;
  testFileCount: number;
  testDeclarationCount: number;
  rulesPartial: boolean;
  parseFailed: number;
  parseFallbacks: number;
  scanned: number;
  analyzed: number;
}

export async function runFileAnalysisPhase(
  findings: Finding[],
  testFiles: string[],
  workspace: Workspace,
  activeRules: UniversalRule[],
  hooks: ScanHooks,
  cache: ScanCache,
  rulesDigest: string,
  deadline: number,
  truncationReasons: Set<string>,
  declarationsByFile: Map<string, number>,
  fileProvenance: Array<{
    path: string;
    provenance: ReturnType<typeof classifyProvenance>;
  }>,
  onRuleCrash: (ruleId: string, file: string, error: unknown) => void,
): Promise<FileAnalysisResult> {
  let skippedFiles = 0;
  let testFileCount = 0;
  let testDeclarationCount = 0;
  let rulesPartial = false;
  let parseFailed = 0;
  let parseFallbacks = 0;
  let scanned = 0;
  let analyzed = 0;

  for (const path of testFiles) {
    if (Date.now() > deadline) {
      rulesPartial = true;
      skippedFiles += testFiles.length - scanned;
      truncationReasons.add("rule-loop-deadline");
      break;
    }
    scanned++;
    const adapter = selectAdapter(path);
    const isCiAdapter =
      adapter.id === "github-actions" ||
      adapter.id === "azure-pipelines" ||
      adapter.id === "jenkins";
    if (!isCiAdapter) testFileCount++;
    let text: string;
    try {
      const readResult = readFileBounded(path, LIMITS.maxFileBytes);
      if (!readResult.ok) {
        skippedFiles++;
        continue;
      }
      text = readResult.data
        .toString("utf8")
        .replace(/^\uFEFF/, "")
        .replace(/\r\n?/g, "\n");
    } catch {
      // intentional: unreadable file between discovery and analysis — skip, counted
      skippedFiles++;
      continue;
    }
    const relPath = relative(workspace.root, path).replaceAll("\\", "/");
    if (!isCiAdapter) {
      const langMap: Record<
        string,
        "typescript" | "python" | "java" | "csharp"
      > = {
        typescript: "typescript",
        python: "python",
        java: "java",
        csharp: "csharp",
      };
      const lang = langMap[adapter.id] ?? "typescript";
      const codeView = getCodeTextForCounting(text, lang);
      const decls = countTestDeclarations(text, codeView);
      testDeclarationCount += decls;
      declarationsByFile.set(relPath, decls);
      fileProvenance.push({
        path: relPath,
        provenance: classifyProvenance({ text }),
      });
    }
    const wantsAst = adapter.parseAst !== undefined && Date.now() <= deadline;
    const identity = (mode: "ast" | "regex") => ({
      relPath,
      adapterId: adapter.id,
      parseMode: mode,
    });
    let cacheKey = fileCacheKey(
      rulesDigest,
      text,
      identity(wantsAst ? "ast" : "regex"),
    );
    const cachedFindings = cache.lookup(cacheKey);

    // V5-020: the per-file analysis now goes through the FileExecutor seam.
    // This is the boundary that made the execution strategy untestable before:
    // the parse, the rule run, the containment and the cache write all happen
    // behind `execute`, so a different strategy is a different executor object
    // rather than an edit to the pipeline.
    //
    // The outer loop still walks files sequentially because the accumulators it
    // maintains (declaration counts, provenance, the truncation flags) are
    // per-file observations in file order. The ANALYSIS is what the seam owns,
    // and the seam guarantees it returns findings in input order and contains a
    // failure to the file that caused it.
    const executor = createExecutor(
      "sequential",
      1,
      async (job): Promise<FileOutcome> => {
        if (job.cacheHit !== undefined) {
          return {
            path: job.path,
            status: "CACHE_HIT",
            findings: [...job.cacheHit],
            parseFallback: false,
          };
        }
        let parseFallback = false;
        let fileRuleFailed = false;
        let fileBudgetExceeded = false;
        let parsedAst: ParsedAst | undefined;
        try {
          if (adapter.parseAst && job.wantsAst) {
            hooks.onProgress?.({
              phase: "rules",
              done: scanned,
              total: testFiles.length,
              detail: job.path,
            });
            parsedAst = await adapter.parseAst({
              path: job.path,
              text: job.text,
            });
          }
          const actualMode: "ast" | "regex" = parsedAst ? "ast" : "regex";
          if (job.wantsAst && actualMode === "regex") {
            parseFallback = true;
            parseFallbacks++;
            cacheKey = fileCacheKey(
              rulesDigest,
              job.text,
              identity(actualMode),
            );
            const fallbackFindings = cache.lookup(cacheKey);
            if (fallbackFindings) {
              return {
                path: job.path,
                status: "CACHE_HIT",
                findings: [...fallbackFindings],
                parseFallback: true,
              };
            }
          }
          const fileForRules: ParsedFile = parsedAst
            ? { path: job.path, text: job.text, ast: parsedAst.ast }
            : { path: job.path, text: job.text };
          const produced: Finding[] = [];
          adapter.runRules(
            activeRules,
            fileForRules,
            (f, ruleId, category) => {
              if (!isValidFindingRecord(f)) {
                fileRuleFailed = true;
                onRuleCrash?.(
                  ruleId,
                  job.path,
                  new Error(
                    `malformed finding record rejected (severity/line/message must be present, severity ∈ error|warning|info): ${JSON.stringify(f)}`,
                  ),
                );
                return;
              }
              produced.push({ ...f, ruleId, category } as Finding);
            },
            (ruleId, error) => {
              fileRuleFailed = true;
              onRuleCrash?.(ruleId, job.path, error);
            },
            {
              deadline: Math.min(
                deadline,
                Date.now() + LIMITS.maxFileAnalysisMs,
              ),
              onExceeded: () => {
                rulesPartial = true;
                skippedFiles++;
                truncationReasons.add("file-budget");
                fileBudgetExceeded = true;
              },
            },
          );
          if (!fileRuleFailed && !fileBudgetExceeded) analyzed++;
          if (!fileRuleFailed) {
            cache.store(cacheKey, produced, fileBudgetExceeded);
          }
          return {
            path: job.path,
            status: "OK",
            findings: produced,
            parseFallback,
          };
        } catch {
          // Containment, not propagation: a file that fails to analyze is
          // counted, and the run continues. The executor turns a THROW into a
          // FAILED outcome; the counters below are what keep the failure
          // visible in the report.
          if (job.wantsAst) parseFallbacks++;
          skippedFiles++;
          parseFailed++;
          return {
            path: job.path,
            status: "FAILED",
            findings: [],
            parseFallback,
          };
        } finally {
          parsedAst?.dispose();
        }
      },
    );

    const outcomes = await executeFiles(
      [
        {
          path: relPath,
          text,
          wantsAst,
          ...(cachedFindings !== undefined ? { cacheHit: cachedFindings } : {}),
        },
      ],
      executor,
    );
    const outcome = outcomes[0];
    if (outcome?.status === "CACHE_HIT" || outcome?.status === "OK") {
      // Findings are appended in the executor's (input) order, which for a
      // single-job batch is the file order the loop is already walking.
      for (const f of outcome.findings) findings.push(f);
      if (cachedFindings !== undefined && outcome.status === "CACHE_HIT") {
        analyzed++;
      }
    }
  }

  return {
    skippedFiles,
    testFileCount,
    testDeclarationCount,
    rulesPartial,
    parseFailed,
    parseFallbacks,
    scanned,
    analyzed,
  };
}

export interface PostScanResult {
  testDeclarationCount: number;
  scopeInfo: { scope: "all" | "changed"; degraded?: string | undefined };
  suppressionCount: number;
  frameworks: ReturnType<typeof detectFrameworks>;
  runtimeReportPath: string | undefined;
  runtimeIncomplete: boolean;
  /**
   * The normalized evidence core (V5-011). Persisted rather than discarded,
   * so every post-ingest projection reads records instead of re-parsing a
   * report that may have changed underneath it.
   */
  evidenceRecords: EvidenceRecord[];
  /** Aggregate forensic classifications from the ingested runtime report. */
  forensicVerdicts: ForensicVerdictSummary | undefined;
  config: ReturnType<typeof loadConfig>["config"];
}

/**
 * Summarize forensic classifications from an ingested runtime report
 * (plan §10.4, WAVE 5). Returns undefined when no verdict carries a
 * classification — the machine contract slot stays absent rather than
 * reporting all-zero counts.
 */
export function summarizeForensicVerdicts(
  report: import("../forensics/types.js").ForensicsReport,
): ForensicVerdictSummary | undefined {
  if (report.analysisComplete !== true) return undefined;
  const byVerdict: Record<string, number> = {};
  let classifications = 0;
  let inconclusive = 0;
  for (const v of report.verdicts) {
    if (!v.forensic) continue;
    classifications++;
    const label = v.forensic.verdict;
    byVerdict[label] = (byVerdict[label] ?? 0) + 1;
    if (label === "inconclusive") inconclusive++;
  }
  if (classifications === 0) return undefined;
  return { classifications, byVerdict, inconclusive };
}

export function applyPostScanProcessing(
  findings: Finding[],
  workspace: Workspace,
  args: CliArgs,
  hooks: ScanHooks,
  scanRoot: Workspace,
  declarationsByFile: Map<string, number>,
  testDeclarationCount: number,
  tierByRuleId: Map<string, Tier>,
  REVISION_BY_RULE_ID: Map<string, number>,
): PostScanResult {
  let scopeInfo: {
    scope: "all" | "changed";
    degraded?: string | undefined;
  } = { scope: "all" };
  if (args.scopeChanged) {
    const diff = computeChangedScope(workspace.root, args.base);
    const filtered = filterToChanged(findings, diff);
    findings.length = 0;
    for (const f of filtered) findings.push(f);
    scopeInfo = diff.degraded
      ? { scope: "changed", degraded: diff.reason }
      : { scope: "changed" };
    if (!diff.degraded) {
      testDeclarationCount = [...Object.keys(diff.changed)].reduce(
        (sum, file) => sum + (declarationsByFile.get(file) ?? 0),
        0,
      );
    }
  }
  const frameworks = detectFrameworks(workspace);
  const { config, warnings } = loadConfig(workspace.root, {
    knownRuleIds: KNOWN_RULE_IDS,
  });
  for (const w of warnings) hooks.onConfigWarning?.(w);
  applySeverityOverrides(findings, config);
  const suppressions = loadSuppressions(workspace.root);
  const active = suppressions.entries.filter((e) => e.status === "active");
  hooks.onPreSuppressionFindings?.([...findings]);
  let suppressionCount = 0;
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
    suppressionCount = findings.length - kept.length;
    findings.length = 0;
    for (const f of kept) findings.push(f);
  }
  const deduped = applyOverlapDedup(findings, OVERLAP_META_BY_RULE_ID);
  findings.length = 0;
  for (const f of deduped) findings.push(f);
  findings.sort(compareFindings);
  stampEvidenceLevels(findings, EVIDENCE_OVERRIDES);
  for (const f of findings) {
    const m = MEASURED_FP[f.ruleId];
    if (m) {
      f.measuredFpRate = m.fpRate;
      f.measuredFpN = m.n;
    }
  }
  for (const f of findings) {
    const rev = REVISION_BY_RULE_ID.get(f.ruleId);
    if (rev !== undefined) f.detectorRevision = rev;
  }
  enforceTierPolicy(findings, tierByRuleId);
  for (const f of findings) {
    f.fixGroupId = f.ruleId;
  }
  const discoveredReport = discoverAndParseRuntimeReport(scanRoot.root);
  const runtimeReportPath = discoveredReport?.path;
  const runtimeIncomplete =
    discoveredReport !== undefined &&
    discoveredReport.report.analysisComplete !== true;
  let forensicVerdicts: ForensicVerdictSummary | undefined;
  // V5-011 (G-V5-031): these records used to be built and thrown away on the
  // floor, so the normalized evidence core existed only as a throwaway value
  // while corroboration re-derived the same facts from the raw report. They
  // are persisted on the result and consumed from here on.
  let evidenceRecords: EvidenceRecord[] = [];
  if (discoveredReport && discoveredReport.report.analysisComplete === true) {
    try {
      evidenceRecords = buildEvidenceRecords(
        discoveredReport.report,
        discoveredReport.path,
      );
      stampRuntimeCorroboration(
        findings,
        discoveredReport.report,
        workspace.root,
      );
      forensicVerdicts = summarizeForensicVerdicts(discoveredReport.report);
    } catch {
      /* corrupt report — no runtime evidence */
      evidenceRecords = [];
    }
  }
  return {
    evidenceRecords,
    testDeclarationCount,
    scopeInfo,
    suppressionCount,
    frameworks,
    runtimeReportPath,
    runtimeIncomplete,
    forensicVerdicts,
    config,
  };
}

export interface AssembleScanResultInput {
  findings: Finding[];
  testFileCount: number;
  testDeclarationCount: number;
  declarationsByFile: Map<string, number>;
  skippedFiles: number;
  rulesCrashed: number;
  truncationReasons: Set<string>;
  discoveryTruncated: boolean;
  rulesPartial: boolean;
  scopeIgnored: number;
  scopeUnrecognized: number;
  parseFailed: number;
  parseFallbacks?: number;
  scanned: number;
  analyzed?: number;
  testFiles: string[];
  workspace: Workspace;
  scanRoot: Workspace;
  args: CliArgs;
  hooks: ScanHooks;
  cache: ScanCache;
  REVISION_BY_RULE_ID: Map<string, number>;
  pluginsLoaded: Array<{ name: string; rules: number }>;
  scopeInfo: { scope: "all" | "changed"; degraded?: string | undefined };
  suppressionCount: number;
  frameworks: ReturnType<typeof detectFrameworks>;
  runtimeReportPath: string | undefined;
  runtimeIncomplete?: boolean;
  evidenceRecords?: EvidenceRecord[];
  forensicVerdicts: ForensicVerdictSummary | undefined;
  config: ReturnType<typeof loadConfig>["config"];
  fileProvenance: Array<{
    path: string;
    provenance: ReturnType<typeof classifyProvenance>;
  }>;
  started: number;
  stagedSurface: boolean;
  /** ECO-005: dependency graph built from project manifests. */
  dependencyGraph?: import("./dependency-graph.js").DependencyGraph;
}

/**
 * ECO-003: Partition findings by package for monorepo analysis.
 * Uses the dependency graph to assign findings to their nearest package
 * manifest, falling back to the workspace root.
 */
function partitionFindingsByPackage(
  findings: readonly Finding[],
  depGraph: import("./dependency-graph.js").DependencyGraph,
  workspaceRoot: string,
  declarationsByFile: ReadonlyMap<string, number>,
  analysisComplete: boolean,
): Array<{
  packageName: string;
  path: string;
  findings: Finding[];
  score: number | null;
}> {
  const packageMap = new Map<
    string,
    {
      packageName: string;
      path: string;
      findings: Finding[];
      testDeclarations: number;
      testFileCount: number;
    }
  >();
  const addPackage = (path: string) => {
    const entry = {
      packageName: path === "" ? "root" : basename(path),
      path: path || ".",
      findings: [] as Finding[],
      testDeclarations: 0,
      testFileCount: 0,
    };
    packageMap.set(path, entry);
    return entry;
  };
  for (const manifestPath of depGraph.allPaths) {
    const path = relative(workspaceRoot, dirname(manifestPath)).replaceAll(
      "\\",
      "/",
    );
    if (path === ".." || path.startsWith("../")) continue;
    if (!packageMap.has(path)) addPackage(path);
  }
  const packageForFile = (file: string) => {
    const normalizedFile = file.replaceAll("\\", "/");
    let bestPath = "";
    for (const path of packageMap.keys()) {
      if (
        path.length > bestPath.length &&
        normalizedFile.startsWith(path + "/")
      ) {
        bestPath = path;
      }
    }
    return packageMap.get(bestPath) ?? addPackage("");
  };
  for (const f of findings) packageForFile(f.file).findings.push(f);
  for (const [file, declarations] of declarationsByFile) {
    const target = packageForFile(file);
    target.testDeclarations += declarations;
    target.testFileCount++;
  }
  return [...packageMap.values()].map((p) => ({
    packageName: p.packageName,
    path: p.path,
    findings: p.findings,
    score:
      analysisComplete && p.testDeclarations > 0 && p.testFileCount > 0
        ? computeTotal(computeDimensions(p.findings), p.findings, {
            testDeclarations: p.testDeclarations,
            testFileCount: p.testFileCount,
            suiteInvalidatingRuleIds: SUITE_INVALIDATING_RULE_IDS,
          })
        : null,
  }));
}

export function assembleScanResult(o: AssembleScanResultInput): ScanResult {
  o.hooks.onProgress?.({ phase: "score", done: o.findings.length });
  const dimensions = computeDimensions(o.findings);
  const rawDeductions = o.findings.reduce((sum, f) => sum + deductionFor(f), 0);
  const effectiveDeductions = rawDeductions;
  const total = computeTotal(dimensions, o.findings, {
    testDeclarations: o.testDeclarationCount,
    testFileCount: o.testFileCount,
    suiteInvalidatingRuleIds: SUITE_INVALIDATING_RULE_IDS,
  });
  const elapsed = Date.now() - o.started;
  const scopeReasons: string[] = [];
  if (o.scopeIgnored > 0) scopeReasons.push(`ignored:${o.scopeIgnored}`);
  if (o.scopeUnrecognized > 0) {
    scopeReasons.push(`unrecognized:${o.scopeUnrecognized}`);
  }
  if (o.parseFailed > 0) scopeReasons.push(`parseFailed:${o.parseFailed}`);
  if (o.skippedFiles > 0) scopeReasons.push(`skipped:${o.skippedFiles}`);
  if (o.scopeInfo.degraded) {
    scopeReasons.push(`degraded:${o.scopeInfo.degraded}`);
  }
  if (o.runtimeIncomplete) scopeReasons.push("runtime-incomplete");
  for (const reason of o.truncationReasons)
    scopeReasons.push(`truncated:${reason}`);
  const scopeIntegrity = {
    discovered: o.testFiles.length,
    analyzed: Math.max(0, o.analyzed ?? o.scanned),
    ignored: o.scopeIgnored,
    unrecognized: o.scopeUnrecognized,
    parseFailed: o.parseFailed,
    truncated: o.truncationReasons.size,
    scopeVerdict: scopeReasons.length === 0 ? "PROVEN" : "PARTIAL",
    ...(scopeReasons.length > 0 ? { reasons: scopeReasons } : {}),
  } as const;
  const scopeAdjustedTotal =
    scopeReasons.length > 0 && total >= 100 ? 99 : total;
  let identityIncomplete = false;
  const inputSnapshot = o.testFiles.map((p) => {
    const relPath = relative(o.workspace.root, p).replaceAll("\\", "/");
    try {
      const read = readFileBounded(
        resolve(o.workspace.root, p),
        LIMITS.maxFileBytes,
      );
      if (!read.ok) {
        if (existsSync(o.workspace.root)) identityIncomplete = true;
        return { path: relPath, size: 0, hash: "UNAVAILABLE" };
      }
      const hash = createHash("sha256").update(read.data).digest("hex");
      return { path: relPath, size: read.data.length, hash };
    } catch {
      if (existsSync(o.workspace.root)) identityIncomplete = true;
      return { path: relPath, size: 0, hash: "UNAVAILABLE" };
    }
  });
  let reportDigest: string | undefined;
  if (o.runtimeReportPath) {
    try {
      const reportPath = resolve(o.workspace.root, o.runtimeReportPath);
      if (lstatSync(reportPath).isFile()) {
        const read = readFileBounded(reportPath, LIMITS.maxFileBytes);
        if (!read.ok) {
          identityIncomplete = true;
        } else {
          reportDigest = createHash("sha256").update(read.data).digest("hex");
        }
      }
    } catch {
      identityIncomplete = true;
    }
  }
  const completion = deriveCompletion({
    discoveryTruncated: o.discoveryTruncated,
    rulesPartial: o.rulesPartial,
    skippedFiles: o.skippedFiles,
    rulesCrashed: o.rulesCrashed,
    truncationReasons: o.truncationReasons,
    scopeIgnored: o.scopeIgnored,
    scopeUnrecognized: o.scopeUnrecognized,
    parseFailed: o.parseFailed,
    parseFallbacks: o.parseFallbacks ?? 0,
    ...(o.scopeInfo.degraded !== undefined
      ? { scopeDegraded: o.scopeInfo.degraded }
      : {}),
    ...(o.runtimeIncomplete !== undefined
      ? { runtimeIncomplete: o.runtimeIncomplete }
      : {}),
    identityIncomplete,
  });
  // The repository binding (V5-010). Before this, `commit` was declared on
  // RunIdentity for the project's whole life and never populated: a run could
  // not be traced to the tree it analysed, so two runs over identical bytes
  // from different commits shared an identity. All of it is optional — a scan
  // outside a repository is a legitimate scan, and its identity must not
  // claim a binding it does not have.
  const repository = bindRepository(o.scanRoot.root);
  const candidate = readCandidateBinding(o.scanRoot.root);
  const runIdentity = buildRunIdentity({
    files: inputSnapshot,
    rules: [...o.REVISION_BY_RULE_ID.entries()].map(
      ([id, detectorRevision]) => ({ id, detectorRevision }),
    ),
    config: o.config ?? null,
    engineVersion: ENGINE_VERSION,
    reportDigest,
    trustModelVersion: TRUST_MODEL_VERSION,
    scoringModelVersion: SCORING_MODEL_VERSION,
    frameworkSupportMatrixVersion: FRAMEWORK_SUPPORT_MATRIX_VERSION,
    evidenceSchemaVersions: [EVIDENCE_SCHEMA_VERSION],
    ...repository,
    ...(candidate !== null ? { candidate } : {}),
  });
  const evidenceGraph = buildEvidenceGraph({
    runId: runIdentity,
    ...(candidate !== null
      ? {
          candidate: {
            manifestId: candidate.manifestId,
            candidateSha: candidate.candidateSha,
          },
        }
      : {}),
  });
  const hasTests = o.testFileCount > 0 && o.testDeclarationCount > 0;
  const suiteInvalidatedBy = [
    ...new Set(
      o.findings
        .filter((f) => SUITE_INVALIDATING_RULE_IDS.has(f.ruleId))
        .map((f) => f.ruleId),
    ),
  ].sort();
  const finalScore = hasTests
    ? completion.partial && scopeAdjustedTotal >= 100
      ? 99
      : scopeAdjustedTotal
    : null;
  const result: ScanResult = {
    schemaVersion: SCHEMA_VERSION,
    partial: completion.partial,
    scopeIntegrity,
    runIdentity,
    evidenceGraph,
    // V5-011: the normalized evidence core is persisted, not discarded. It is
    // the input to `finalizeScanResult`, which re-derives the trust
    // projections after ingest — so a re-derivation reads records rather than
    // re-parsing a report that may have changed underneath it.
    evidence: {
      records: o.evidenceRecords ?? [],
      counts: countEvidence(o.evidenceRecords ?? []),
      artifact: o.runtimeReportPath ?? null,
    },
    score: finalScore,
    ...(hasTests ? {} : { reason: "no-tests-found" as const }),
    frameworks: o.frameworks.frameworks,
    frameworkDetectionUnknown: o.frameworks.unknown,
    ...(o.args.scopeChanged
      ? {
          scope: o.scopeInfo.scope,
          ...(o.scopeInfo.degraded
            ? { scopeDegraded: o.scopeInfo.degraded }
            : {}),
        }
      : {}),
    ...(o.stagedSurface ? { staged: { files: o.testFileCount } } : {}),
    dimensions,
    findings: o.findings,
    testFileCount: o.testFileCount,
    testDeclarationCount: o.testDeclarationCount,
    rawDeductions,
    effectiveDeductions,
    suppressionCount: o.suppressionCount,
    ...(o.pluginsLoaded.length > 0 ? { plugins: o.pluginsLoaded } : {}),
    ...(suiteInvalidatedBy.length > 0 ? { suiteInvalidatedBy } : {}),
    agenticProfile: computeAgenticProfile(o.fileProvenance, o.findings),
    ...(o.forensicVerdicts !== undefined
      ? { forensicVerdicts: o.forensicVerdicts }
      : {}),
    ...(o.args.cache
      ? {
          cache: {
            hits: o.cache.stats.hits,
            misses: o.cache.stats.misses,
            file: o.cache.stats.file,
          },
        }
      : {}),
    analysisStatus: {
      ...completion.analysisStatus,
      durationMs: elapsed,
    },
    scoringModelVersion: SCORING_MODEL_VERSION,
  };
  result.trustSummary = buildTrustSummary(result, o.declarationsByFile);
  // INTEL-005: Cross-Rule Evidence Correlation. Pure, deterministic,
  // non-mutating — runs on the final findings array after all processing.
  if (o.findings.length > 0) {
    result.correlationConclusions = correlateFindings(o.findings);
  }
  // ECO-005: Dependency graph metadata (additive within schemaVersion 1).
  if (o.dependencyGraph && o.dependencyGraph.size > 0) {
    let edges = 0;
    for (const p of o.dependencyGraph.allPaths) {
      edges += o.dependencyGraph.getDependencies(p).length;
    }
    result.dependencyGraph = {
      nodes: o.dependencyGraph.size,
      edges,
    };
  }
  // ECO-003: Monorepo analysis (additive within schemaVersion 1).
  // When --monorepo is requested, partition findings by package and
  // compute per-package trust scores.
  if (o.args.monorepo && o.dependencyGraph && o.dependencyGraph.size > 1) {
    const packages = partitionFindingsByPackage(
      o.findings,
      o.dependencyGraph,
      o.workspace.root,
      o.declarationsByFile,
      !result.partial && scopeReasons.length === 0 && !o.args.scopeChanged,
    );
    if (packages.length > 1) {
      const monorepoResult = analyzeMonorepo(packages, {
        weightingStrategy: "worst-package",
      });
      result.monorepoAnalysis = {
        packages: monorepoResult.packages.map((p) => ({
          packageName: p.packageName,
          path: p.path,
          findings: p.findings.length,
          score: p.score,
          verdict: p.verdict,
        })),
        overallScore: monorepoResult.overallScore,
        overallVerdict: monorepoResult.overallVerdict,
        strategy: monorepoResult.strategy,
        ...(monorepoResult.blockerPackage
          ? { blockerPackage: monorepoResult.blockerPackage }
          : {}),
      };
    }
  }
  o.cache.persist();
  return result;
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
  const requestedDuration = Number.isFinite(args.maxDurationMs)
    ? args.maxDurationMs
    : DEFAULT_MAX_DURATION_MS;
  const boundedDuration = Math.min(
    Math.max(1, requestedDuration),
    MAX_DURATION_MS,
  );
  const deadline = started + boundedDuration;
  // package.json workspace OR non-JS repo (Python etc.) — fall back to the
  // target dir itself so language adapters can still discover their files.
  // Audit S3: the explicit scan target is the anchor. Config,
  // .mjolnirignore, plugins, and local rules resolve from the target or
  // ABOVE the target only when the target sits inside the discovered
  // project — never from an unrelated ancestor of the CWD. Concretely:
  // `mjolnir scan C:\other\repo` while CWD is a hostile checkout of our
  // own monorepo must not read the hostile repo's mjolnir.config.json.
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
  // Audit S3: verbose mode states the resolved root — operators can SEE
  // which config/ignore anchor the scan is honoring.
  if (args.verbose) {
    hooks.onConfigWarning?.(
      `verbose: scan root (config/ignore anchor): ${workspace.root}`,
    );
  }
  const findings: Finding[] = [];
  let skippedFiles = 0;
  // eslint-disable-next-line no-useless-assignment -- initial values are read if analysis phase is skipped
  let testFileCount = 0;
  // eslint-disable-next-line no-useless-assignment -- initial values are read if analysis phase is skipped
  let testDeclarationCount = 0;
  // Bug-audit L3: per-file declaration counts, so a changed-scope scan can
  // score against the files it actually judged instead of the whole repo.
  const declarationsByFile = new Map<string, number>();
  let rulesCrashed = 0;
  // Audits H-3/H-8: honest analysis status. Each phase reports what
  // actually happened; truncation carries named reasons.
  const truncationReasons = new Set<string>();
  let discoveryTruncated = false;
  // eslint-disable-next-line no-useless-assignment -- initial value is read if analysis phase is skipped
  let rulesPartial = false;
  // R4c Scope Integrity: the claimed-vs-analyzed accounting — the walk's
  // matcher exclusions, files no adapter claims, and files whose
  // parse/analysis threw (each counted at its own site).
  let scopeIgnored = 0;
  let scopeUnrecognized = 0;
  // eslint-disable-next-line no-useless-assignment -- initial value is read if analysis phase is skipped
  let parseFailed = 0;

  // Plan §17.1: per-file provenance for the Agentic Trust Profile.
  const fileProvenance: Array<{
    path: string;
    provenance: ReturnType<typeof classifyProvenance>;
  }> = [];
  // R1: dispatch through language adapters. Rules stay unchanged; the
  // adapters own discovery, parsing, and rule application.
  const {
    rules: activeRules,
    pluginErrors,
    tierByRuleId: tiers,
    pluginMeta,
  } = await buildUniversalRules(workspace.root, args.strict, {
    ...(args.enablePlugins !== undefined
      ? { enablePlugins: args.enablePlugins }
      : {}),
    // Audit C2: default destination is stderr — the notice must be loud
    // in every verb and never contaminate the stdout machine contracts
    // (--json/--format sarif/mermaid). Single-string console.error is
    // byte-equivalent to the CLI's variadic default err sink.
    onGateNotice: (notice) =>
      hooks.onGateNotice ? hooks.onGateNotice(notice) : console.error(notice),
  });
  const tierByRuleId = tiers;
  const pluginsLoaded = pluginMeta;
  // Blueprint §13: detector revisions for the active rule set. Sources
  // in priority order: the rule's own declared revision, the measured-FP
  // sidecar (a measured rule is always pinned to its measured
  // revision), and the documented default 1 for first-generation
  // detectors (RuleMeta — omitted means 1).
  const REVISION_BY_RULE_ID = new Map<string, number>(
    activeRules.map((r) => [
      r.id,
      r.detectorRevision ?? MEASURED_FP[r.id]?.detectorRevision ?? 1,
    ]),
  );
  // M5.2 (A-2): local content-addressed cache. Opened BEFORE the rules
  // digest — it needs the fully-active rule set (core + plugins + local,
  // post-quarantine-filter) so any detector change invalidates.
  const cache: ScanCache = args.cache
    ? createScanCache(workspace.root)
    : disabledScanCache;
  // ECO-005: Build dependency graph once per scan. Used for:
  // 1. Dependency-aware cache invalidation (--cache mode)
  // 2. Monorepo analysis (--monorepo mode)
  // 3. Dependency graph metadata in ScanResult
  const depGraph = buildDependencyGraph(workspace.root);
  const rulesDigest = `complete-file-v1:${computeRulesDigest(activeRules)}`;
  // ECO-004: When --cache is active, log incremental safety status.
  // The dependency graph's presence signals that dependency-aware
  // invalidation is possible — cache keys already include rulesDigest
  // which covers detector changes. Config/package changes trigger
  // the SEMANTIC_INPUT_PATTERNS check in `isIncrementalSafe`.
  if (args.cache && args.verbose) {
    const safety = isIncrementalSafe([]);
    if (!safety.safe) {
      hooks.onConfigWarning?.(`incremental: ${safety.reasons.join("; ")}`);
    }
  }
  for (const perr of pluginErrors) {
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
      message: `Plugin problem: ${perr}`,
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
    onSkippedFile: (reason: string) => {
      skippedFiles++;
      truncationReasons.add(reason);
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
    // R4c Scope Integrity: the walk's exclusion accounting feeds the
    // scope verdict (claimed scope ≡ analyzed scope).
    onIgnored: () => {
      scopeIgnored++;
    },
    onUnrecognized: () => {
      scopeUnrecognized++;
    },
  };

  const { testFiles, stagedSurface } = discoverTestFilesPhase(
    workspace,
    args,
    hooks,
    scanRoot,
    ctx,
  );
  hooks.onTestFilesDiscovered?.(testFiles);

  const analysis = await runFileAnalysisPhase(
    findings,
    testFiles,
    workspace,
    activeRules,
    hooks,
    cache,
    rulesDigest,
    deadline,
    truncationReasons,
    declarationsByFile,
    fileProvenance,
    (ruleId, file, error) => {
      rulesCrashed++;
      hooks.onRuleCrash?.(ruleId, file, error);
    },
  );
  skippedFiles += analysis.skippedFiles;
  testFileCount = analysis.testFileCount;
  testDeclarationCount = analysis.testDeclarationCount;
  rulesPartial = analysis.rulesPartial;
  parseFailed = analysis.parseFailed;
  const parseFallbacks = analysis.parseFallbacks;
  const scanned = analysis.scanned;
  const analyzed = analysis.analyzed;

  const postScan = applyPostScanProcessing(
    findings,
    workspace,
    args,
    hooks,
    scanRoot,
    declarationsByFile,
    testDeclarationCount,
    tierByRuleId,
    REVISION_BY_RULE_ID,
  );
  testDeclarationCount = postScan.testDeclarationCount;

  const result = assembleScanResult({
    findings,
    testFileCount,
    testDeclarationCount,
    declarationsByFile,
    skippedFiles,
    rulesCrashed,
    truncationReasons,
    discoveryTruncated,
    rulesPartial,
    scopeIgnored,
    scopeUnrecognized,
    parseFailed,
    parseFallbacks,
    scanned,
    analyzed,
    testFiles,
    workspace,
    scanRoot,
    args,
    hooks,
    cache,
    REVISION_BY_RULE_ID,
    pluginsLoaded,
    scopeInfo: postScan.scopeInfo,
    suppressionCount: postScan.suppressionCount,
    frameworks: postScan.frameworks,
    runtimeReportPath: postScan.runtimeReportPath,
    runtimeIncomplete: postScan.runtimeIncomplete,
    forensicVerdicts: postScan.forensicVerdicts,
    config: postScan.config,
    fileProvenance,
    started,
    stagedSurface,
    dependencyGraph: depGraph,
  });

  await releaseTreeSitterResources();
  resetTsMorphProject();
  return result;
}
