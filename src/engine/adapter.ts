/**
 * LanguageAdapter interface (Upgrade-Plan-v2 R1).
 *
 * The seam that makes Mjolnir multi-language. Each adapter owns:
 * file discovery, framework detection, and (later) AST parsing for its
 * language. Rules declare which adapters they apply to.
 *
 * Parse-stage status (Verification Trust Evolution Plan Phase 0.5, §10):
 * an async parse stage now sits between discovery and rule execution.
 * The TypeScript adapter parses via ts-morph behind the
 * `ParsedFile.ast` seam (`src/engine/ts-ast.ts`); Java/C# parse via the
 * awaited `parseAst` hook backed by `src/engine/tree-sitter-ast.ts`
 * (defect D1 closed — previously dead code). Python and GitHub Actions
 * remain regex/YAML-over-text and declare no `parseAst`.
 */

import type { Finding } from "../types.js";
import type { Workspace } from "../discovery/workspace.js";
import type { IgnoreMatcher } from "../discovery/ignores.js";

/** Semantic operations a parsed file exposes to rules. */
export interface ParsedFile {
  path: string;
  text: string;
  /** Adapter-specific AST; typed loosely until tree-sitter unifies it. */
  ast?: unknown;
  /**
   * Code-only text view: string literals and comments blanked to spaces,
   * newlines preserved so line/column indices stay exact. Regex rules
   * that must never fire on prose inside strings or comments use this
   * instead of `text`. Computed lazily per adapter.
   */
  codeText?: string;
  /**
   * Per-file framework tags (Verification Trust Evolution Plan §15.1,
   * defect D7): derived from the file's OWN imports/usings/imports-lines
   * by the adapter ("playwright", "jest", "cypress", "junit", "testng",
   * "selenium", "nunit", "xunit", "mstest", "pytest", …). EMPTY/absent
   * means "no per-file evidence" — framework filtering is then OPEN (a
   * rule declaring `frameworks` still runs), never a silent skip.
   */
  frameworkTags?: readonly string[];
}

export interface FrameworkInfo {
  frameworks: string[];
  unknown: boolean;
}

/**
 * The result of the async parse stage (Verification Trust Evolution Plan
 * Phase 0.5, §10): an AST plus its explicit disposal path. The scan
 * pipeline calls `dispose()` exactly once per file, in a
 * finally-equivalent position that runs whether or not rules completed —
 * normal completion, rule crash, per-file budget expiry, or scan abort.
 */
export interface ParsedAst {
  /** Consumed synchronously by rules via `ParsedFile.ast`. */
  ast: unknown;
  /** Release WASM/AST resources (`tree.delete()` for tree-sitter). */
  dispose(): void;
}

export interface ScanContext {
  workspace: Workspace;
  /** Absolute paths of discovered test files. */
  testFiles: string[];
  deadline: number;
  /** Resolved per-scan ignore matcher (audit R-8) — no module globals. */
  ignoreMatcher: IgnoreMatcher;
  /** Called once per file that could not be read/analyzed. */
  onSkippedFile: (reason?: string) => void;
  /**
   * Called when discovery stops early (audit H-8): deadline expiry or
   * the per-adapter file cap. The reason is named in analysisStatus.
   */
  onDiscoveryTruncated: (reason: string) => void;
  /** Per-adapter discovery budget (audit H-8). One language can no
   * longer consume the whole list and starve the others. */
  maxFiles: number;
  /**
   * Called when a rule throws on a file (audit R-9): crash isolation
   * stays silent by default, but the scan counts it and `--debug`
   * surfaces it.
   */
  onRuleCrash?: (ruleId: string, file: string, error: unknown) => void;
}

export interface LanguageAdapter {
  readonly id: string;
  readonly extensions: readonly string[];
  /** Human-readable patterns this adapter searches for (empty-state UX). */
  readonly testFileGlobs: readonly string[];
  /** Dependency/output directory names this adapter never enters. */
  readonly dirSkips: readonly string[];
  /** Canonical test-file check per ecosystem conventions. */
  isTestFile(path: string): boolean;
  detectFrameworks(root: string): FrameworkInfo;
  discoverTestFiles(ctx: ScanContext): void;
  /**
   * Async parse stage (Verification Trust Evolution Plan Phase 0.5, §10):
   * awaited by the scan pipeline between discovery and rule execution.
   * `runRules` and every rule stay synchronous and consume the produced
   * tree via `ParsedFile.ast` — the engine is NOT async end-to-end, only
   * this one seam is (WASM grammar load is inherently async).
   *
   * Contract: resolve to a ParsedAst on success, `undefined` when this
   * adapter has no AST layer (or parsing failed — rules fall back to the
   * regex path either way). Never throws.
   */
  parseAst?(file: ParsedFile): Promise<ParsedAst | undefined>;
  /**
   * Run all rules this adapter hosts against one file. `onCrash` is
   * invoked when a rule throws (audit R-9) — the crash is still
   * isolated, but never invisible. `budget` (audit P-1) stops rule
   * execution mid-file when a single file is too expensive to analyze
   * in full; the caller reports the skip honestly.
   */
  runRules(
    rules: readonly UniversalRule[],
    file: ParsedFile,
    emit: (
      f: Omit<Finding, "ruleId" | "category">,
      ruleId: string,
      category: string,
    ) => void,
    onCrash?: (ruleId: string, error: unknown) => void,
    budget?: { deadline: number; onExceeded: () => void },
  ): void;
}

/**
 * A rule that declares which adapters it supports. Backward compatible:
 * legacy 'test-files' maps to ['typescript'], 'ci-workflows' to
 * ['github-actions'].
 */
export interface UniversalRule {
  id: string;
  category: string;
  appliesTo: readonly string[];
  /**
   * Config-hygiene rule (see QADoctorRule.configRule): the adapter runs
   * these ONLY on the config files named in `configFiles`, and runs
   * every other rule only on test files. Keeps config rules measurable
   * in real scans without letting generic test rules fire nonsense on
   * configs.
   */
  configOnly?: boolean;
  /**
   * Config filename patterns (regex sources) this config rule gates on
   * (plan §15.2 — replaces the hard-coded playwright.config.* regex
   * that used to live in the TS adapter AND duplicated inside each
   * config rule). Empty/absent + configOnly=true falls back to the
   * adapter's built-in config list.
   */
  configFiles?: readonly string[];
  /**
   * Framework opt-in (plan §15.1, defect D7): when declared, the rule
   * runs on a file only if the file's own `frameworkTags` intersect it.
   * Files without tags are always analyzed (open-when-unknown).
   */
  frameworks?: readonly string[];
  /**
   * Detector implementation revision (§07), threaded through asUniversal
   * so the M5.2 cache digest can fold it in; the stale-measurement
   * machinery reads it from the registry, the cache from this field.
   */
  detectorRevision?: number;
  run(file: ParsedFile): Array<Omit<Finding, "ruleId" | "category">>;
}

/**
 * The §15.1 framework filter, shared by every language adapter: a rule
 * that declares `frameworks` runs on a file only when the file carries
 * at least one of those tags. Rules without `frameworks` and files
 * without tags (unknown detection) are always analyzed — the dimension
 * narrows, it never silently drops evidence.
 */
export function frameworkFilterApplies(
  rule: Pick<UniversalRule, "frameworks">,
  file: Pick<ParsedFile, "frameworkTags">,
): boolean {
  if (rule.frameworks === undefined || rule.frameworks.length === 0) {
    return true;
  }
  const tags = file.frameworkTags;
  if (tags === undefined || tags.length === 0) return true;
  return rule.frameworks.some((f) => tags.includes(f));
}
