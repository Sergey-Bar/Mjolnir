/**
 * LanguageAdapter interface (Upgrade-Plan-v2 R1).
 *
 * The seam that makes QA Doctor multi-language. Each adapter owns:
 * file discovery, framework detection, and (later) AST parsing for its
 * language. Rules declare which adapters they apply to.
 *
 * R1 note: TypeScriptAdapter keeps the proven regex engine internally.
 * Tree-sitter arrives in R2 with Python, where it's actually required.
 */

import type { Finding } from "../types.js";
import type { Workspace } from "../discovery/workspace.js";

/** Semantic operations a parsed file exposes to rules. */
export interface ParsedFile {
  path: string;
  text: string;
  /** Adapter-specific AST; typed loosely until tree-sitter unifies it. */
  ast?: unknown;
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
  onSkippedFile: () => void;
}

export interface LanguageAdapter {
  readonly id: string;
  readonly extensions: readonly string[];
  /** Canonical test-file check per ecosystem conventions. */
  isTestFile(path: string): boolean;
  detectFrameworks(root: string): FrameworkInfo;
  discoverTestFiles(ctx: ScanContext): void;
  /** Run all rules this adapter hosts against one file. */
  runRules(
    rules: readonly UniversalRule[],
    file: ParsedFile,
    emit: (
      f: Omit<Finding, "ruleId" | "category">,
      ruleId: string,
      category: string,
    ) => void,
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
  run(file: ParsedFile): Array<Omit<Finding, "ruleId" | "category">>;
}
