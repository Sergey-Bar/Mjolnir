/**
 * TypeScript/JavaScript adapter (R1).
 * Wraps the proven regex-based engine behind the LanguageAdapter
 * interface. Tree-sitter migration happens later without touching rules.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { detectFrameworks as detectFrameworksLegacy } from "../discovery/frameworks.js";
import type { Workspace } from "../discovery/workspace.js";
import { parseTsFile } from "../engine/ts-ast.js";
import { computeCodeText } from "../engine/code-text.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ParsedFile,
  ScanContext,
} from "../engine/adapter.js";

const TEST_FILE_RE = /\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs)$/;
const PW_CONFIG_RE = /^playwright\.config\.(?:ts|js|mjs|cts)$/;

export const typescriptAdapter: LanguageAdapter = {
  id: "typescript",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  testFileGlobs: [
    "*.test.{js,jsx,ts,tsx,mjs,cjs}",
    "*.spec.{js,jsx,ts,tsx,mjs,cjs}",
    "playwright.config.{ts,js,mjs,cts}",
  ],
  dirSkips: [],

  isTestFile(path: string): boolean {
    // Separator-agnostic basename: Windows callers pass raw backslash
    // paths — the ^-anchored config regex never matches a full path, and
    // path.basename is platform-dependent (a backslash path on POSIX
    // comes back whole). Same class of bug explain.ts documents for
    // filename-gated rules.
    return TEST_FILE_RE.test(path) || PW_CONFIG_RE.test(baseName(path));
  },

  detectFrameworks(root: string): FrameworkInfo {
    // Delegate to the existing (now wired) detector.
    const ws = loadWorkspaceShim(root);
    return ws ? detectFrameworksLegacy(ws) : { frameworks: [], unknown: true };
  },

  discoverTestFiles(ctx: ScanContext): void {
    sharedWalk({
      root: ctx.workspace.root,
      deadline: ctx.deadline,
      ignoreMatcher: ctx.ignoreMatcher,
      onSkipped: ctx.onSkippedFile,
      onTruncated: (reason) =>
        ctx.onDiscoveryTruncated(
          reason === "file-cap" ? "file-cap:typescript" : reason,
        ),
      skipDirs: [],
      isTestFile: (name) => TEST_FILE_RE.test(name) || PW_CONFIG_RE.test(name),
      onTestFile: (f) => ctx.testFiles.push(f),
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Phase 3: populate the AST seam once per file; rules that opt in use
    // it via getTsSourceFile, everything else stays on the regex path.
    const withAst: ParsedFile = { ...file, ast: parseTsFile(file) };
    // Phase 1 (Tempering): lazy codeText — computed on first access.
    let cachedCodeText: string | undefined;
    const enriched: ParsedFile = Object.defineProperty(
      { ...withAst },
      "codeText",
      {
        get() {
          if (cachedCodeText === undefined) {
            cachedCodeText = computeCodeText(withAst, "typescript");
          }
          return cachedCodeText;
        },
        enumerable: true,
        configurable: true,
      },
    );
    const isConfig = PW_CONFIG_RE.test(baseName(file.path));
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // Config rules run only on playwright.config.* and vice versa —
      // generic test rules would fire nonsense on a config file
      // (e.g. QA-TEST-003 "no assertions" on every config).
      if (isConfig !== (rule.configOnly === true)) continue;
      // Audit P-1: a single oversized file must not own the whole budget.
      if (budget && Date.now() > budget.deadline) {
        budget.onExceeded();
        return;
      }
      try {
        for (const f of rule.run(enriched)) {
          emit(f, rule.id, rule.category);
        }
      } catch (error) {
        // Crash isolation (§25) — counted and debuggable (R-9).
        onCrash?.(rule.id, error);
      }
    }
  },
};

/** Separator-agnostic basename — a backslash path on POSIX must still
 * yield its last segment (path.basename is platform-dependent). */
function baseName(p: string): string {
  const norm = p.replace(/\\/g, "/");
  return norm.slice(norm.lastIndexOf("/") + 1);
}

function loadWorkspaceShim(root: string): Workspace | null {
  // Minimal re-parse to satisfy the legacy detector signature without a
  // circular import; full unification lands when cli.ts migrates fully.
  try {
    const pkgPath = join(root, "package.json");
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<
      string,
      unknown
    >;
    return {
      root,
      name: typeof pkg["name"] === "string" ? pkg["name"] : root,
      packageJson: pkg,
      workspaceGlobs: [],
    };
  } catch {
    return null;
  }
}
