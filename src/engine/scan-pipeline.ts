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

import { existsSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

import {
  compareFindings,
  SCHEMA_VERSION,
  type Finding,
  type ScanResult,
} from "../types.js";
import { discoverWorkspace, type Workspace } from "../discovery/workspace.js";
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
import type { UniversalRule, ParsedAst, ParsedFile } from "./adapter.js";
import { stampRuntimeCorroboration } from "./runtime-corroboration.js";
import { classifyProvenance, computeAgenticProfile } from "./provenance.js";
import { releaseTreeSitterResources } from "./tree-sitter-ast.js";
import { applyOverlapDedup, type OverlapMeta } from "./overlap-dedup.js";
import {
  computeRulesDigest,
  createScanCache,
  disabledScanCache,
  fileCacheKey,
  type ScanCache,
} from "./scan-cache.js";
import { typescriptAdapter } from "../adapters/typescript.js";
import { githubActionsAdapter } from "../adapters/github-actions.js";
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
   * Audit C2: --enable-plugins opens the plugin trust gate for THIS
   * invocation — npm-plugin and JS-module rule sources may load (and
   * execute). Default OFF; MJOLNIR_ENABLE_PLUGINS=1 is the env
   * equivalent. JSON rule manifests are unaffected (no code by design).
   */
  enablePlugins?: boolean;
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
 * Plan §16: locate a runtime run report next to the scan target, using
 * the exact conventions the forensics ingestion already accepts —
 * `mjolnir.report.json` (the packages/playwright-reporter default
 * output) or a `test-results/` directory. Returns the path for
 * `runForensics`, or undefined when neither convention is present
 * ("no runtime evidence" — never guessed).
 */
export function discoverRuntimeReport(scanRoot: string): string | undefined {
  const reportFile = join(scanRoot, "mjolnir.report.json");
  if (existsSync(reportFile)) return reportFile;
  const resultsDir = join(scanRoot, "test-results");
  if (existsSync(resultsDir) && statSync(resultsDir).isDirectory()) {
    return resultsDir;
  }
  return undefined;
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
  // M5.2 (A-2): local content-addressed cache. Opened BEFORE the rules
  // digest — it needs the fully-active rule set (core + plugins + local,
  // post-quarantine-filter) so any detector change invalidates.
  const cache: ScanCache = args.cache
    ? createScanCache(workspace.root)
    : disabledScanCache;
  const rulesDigest = computeRulesDigest(activeRules);
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
  hooks.onProgress?.({
    phase: "discover",
    done: ctx.testFiles.length,
    total: ctx.testFiles.length,
  });

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
    let fileBudgetExceeded = false;
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
      // Plan §17.1: per-file provenance for the Agentic Trust Profile.
      // Metadata only (§17.4) — it never affects rules or scoring.
      fileProvenance.push({
        path: relPath,
        provenance: classifyProvenance({ text }),
      });
    }
    // M5.2: content-addressed cache lookup — the key covers the file's
    // exact post-normalization bytes, the active rule set (ids +
    // detectorRevisions + run-source hashes), and the file's own
    // identity (rel path + adapter id + parse mode — audit C1/W9), so a
    // hit reproduces the rule-loop output for THIS file byte-for-byte
    // and a regex-fallback verdict can never be served as an AST one.
    // Denominators and provenance above stay live: a cached scan must
    // count identically to a fresh one.
    const adapter = isWorkflow
      ? githubActionsAdapter
      : isPython
        ? pythonAdapter
        : isJava
          ? javaAdapter
          : isCs
            ? csharpAdapter
            : typescriptAdapter;
    // Parse-mode token, decided BEFORE the lookup from what this scan
    // intends: AST when the adapter has a parse hook and the deadline
    // allows it, regex otherwise. After the parse below, the ACTUAL mode
    // is re-derived — a fallback (parse returned nothing) re-keys the
    // lookup/store so fallback verdicts land under the fallback token.
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
    if (cachedFindings) {
      for (const f of cachedFindings) findings.push(f);
      continue;
    }
    hooks.onProgress?.({
      phase: "parse",
      done: scanned,
      total: ctx.testFiles.length,
      detail: relPath,
    });
    // Phase 0.5 parse stage (§10): discovery and rule execution stay
    // where they were; the awaited parse sits between them. `runRules`
    // and rules remain synchronous and consume `file.ast`. Every
    // dispose path below runs in a finally-equivalent position — tree
    // release must never depend on rules completing successfully
    // (§10.3): normal completion, rule crash, per-file budget expiry,
    // and adapter throw all pass through `finally`.
    const parsedFile: ParsedFile = { path: relPath, text };
    let parsed: ParsedAst | undefined;
    const findingsStart = findings.length;
    try {
      if (adapter.parseAst && wantsAst) {
        hooks.onProgress?.({
          phase: "rules",
          done: scanned,
          total: ctx.testFiles.length,
          detail: relPath,
        });
        parsed = await adapter.parseAst(parsedFile);
      }
      // Audit W9: the actual mode — a parse hook that returned nothing
      // (grammar unavailable, parser declined) means the rules ran on
      // the regex path, and the verdicts must be stored/looked-up as
      // such, never merged with AST-mode entries.
      const actualMode: "ast" | "regex" = parsed ? "ast" : "regex";
      if (wantsAst && actualMode === "regex") {
        cacheKey = fileCacheKey(rulesDigest, text, identity(actualMode));
        const fallbackFindings = cache.lookup(cacheKey);
        if (fallbackFindings) {
          for (const f of fallbackFindings) findings.push(f);
          continue;
        }
      }
      const fileForRules: ParsedFile = parsed
        ? { ...parsedFile, ast: parsed.ast }
        : parsedFile;
      adapter.runRules(
        activeRules,
        fileForRules,
        (f, ruleId, category) => {
          // Audit W10: the rule→Finding boundary is validated at
          // runtime. Internal rules are typed, but plugin/JSON-manifest
          // rules are external data — a malformed record (missing
          // severity/line/message, or a severity outside the enum) is
          // routed to the crash channel with a diagnostic instead of
          // being silently scored.
          if (!isValidFindingRecord(f)) {
            ctx.onRuleCrash?.(
              ruleId,
              relPath,
              new Error(
                `malformed finding record rejected (severity/line/message must be present, severity ∈ error|warning|info): ${JSON.stringify(f)}`,
              ),
            );
            return;
          }
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
            fileBudgetExceeded = true;
          },
        },
      );
      // M5.2: cache the file's raw rule-loop output (the slice produced
      // by THIS file). A truncated analysis is never cached — see
      // store()'s guard and the fileBudgetExceeded flag above.
      cache.store(cacheKey, findings.slice(findingsStart), fileBudgetExceeded);
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
  const { config, warnings } = loadConfig(workspace.root, {
    knownRuleIds: KNOWN_RULE_IDS,
  });
  for (const w of warnings) hooks.onConfigWarning?.(w);
  applySeverityOverrides(findings, config);
  const suppressions = loadSuppressions(workspace.root);
  const active = suppressions.entries.filter((e) => e.status === "active");
  const suppressionCount = active.length;
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
  // Plan §16 — Runtime Evidence: when a real run report sits next to
  // the scan target (the same ingestion `mjolnir forensics` uses:
  // `mjolnir.report.json` or a `test-results/` directory), findings get
  // stamped with runtime corroboration + the L0–L5 trust ladder.
  // Absent report → findings unchanged (honest "no runtime evidence").
  const runtimeReportPath = discoverRuntimeReport(scanRoot.root);
  if (runtimeReportPath) {
    try {
      const fr = runForensics(runtimeReportPath, {
        writeFlakyMd: false,
      });
      stampRuntimeCorroboration(findings, fr.report);
    } catch {
      // A hostile/corrupt report must not fail the scan — the run simply
      // carries no runtime evidence (same degrade posture as forensics).
    }
  }
  hooks.onProgress?.({ phase: "score", done: findings.length });
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
    // Plan §17.2: Agentic Trust Profile — provenance metadata only.
    agenticProfile: computeAgenticProfile(fileProvenance, findings),
    // M5.2: present only under --cache. Hit/miss counts make the cache
    // auditable — a report must be able to say how much of its analysis
    // was reused (additive JSON field, within the v1 additive-only policy).
    ...(args.cache
      ? {
          cache: {
            hits: cache.stats.hits,
            misses: cache.stats.misses,
            file: cache.stats.file,
          },
        }
      : {}),
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
  // M5.2: flush new verdicts to the local cache before reporting. Never
  // fatal — a persist failure degrades to a cold cache next run.
  cache.persist();
  // §10.3: every per-file tree was already disposed in the loop's
  // finally; tearing the memoized parsers down here releases the
  // grammar-level WASM state so a long-lived process (library consumer,
  // test runner) doesn't pin it between scans. The next scan
  // transparently re-creates them.
  await releaseTreeSitterResources();
  return result;
}
