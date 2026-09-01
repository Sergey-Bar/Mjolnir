/**
 * LanguageAdapter interface (Upgrade-Plan-v2 R1).
 *
 * The seam that makes Mjolnir multi-language. Each adapter owns:
 * file discovery, framework detection, and (later) AST parsing for its
 * language. Rules declare which adapters they apply to.
 *
 * Parse-stage status (honest, corrected — an earlier note here claimed
 * tree-sitter arrived with Python, which never happened): the TypeScript
 * adapter parses via ts-morph behind the `SourceFileContext.ast` seam
 * (`src/engine/ts-ast.ts`); Java/C# tree-sitter parsing exists in
 * `src/engine/tree-sitter-ast.ts` but is async and NOT yet wired into the
 * synchronous scan pipeline (Verification Trust Evolution Plan defect
 * D1). Every other adapter is regex-over-text today.
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
}

export interface FrameworkInfo {
  frameworks: string[];
  unknown: boolean;
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
   * these ONLY on playwright.config.* files, and runs every other rule
   * only on test files. Keeps config rules measurable in real scans
   * without letting generic test rules fire nonsense on configs.
   */
  configOnly?: boolean;
  run(file: ParsedFile): Array<Omit<Finding, "ruleId" | "category">>;
}
