/**
 * Python/pytest adapter (Upgrade-Plan-v2 R2).
 *
 * Pure regex adapter — no AST enrichment. The header comment previously
 * claimed tree-sitter usage; that was never true for this adapter.
 * tree-sitter-ast.ts exists for Java/C# but is async and not wired here.
 *
 * Test discovery: test_*.py / *_test.py (pytest convention).
 * Frameworks: pytest (config files), unittest (detected via imports).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ScanContext,
} from "../engine/adapter.js";

const PYTHON_TEST_RE = /(?:^|[\\/])(?:test_[^\\/]*|[^\\/]*_test)\.py$/;

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  extensions: [".py"],
  testFileGlobs: ["test_*.py", "*_test.py"],
  dirSkips: ["venv", ".venv", "env", "__pycache__", "site-packages"],

  isTestFile(path: string): boolean {
    return PYTHON_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks: string[] = [];
    const hasPytestConfig =
      existsSync(join(root, "pytest.ini")) ||
      existsSync(join(root, "conftest.py")) ||
      existsSync(join(root, "setup.cfg"));
    if (hasPytestConfig) frameworks.push("pytest");

    // pyproject.toml [tool.pytest] section.
    const pyproject = join(root, "pyproject.toml");
    if (existsSync(pyproject)) {
      try {
        const text = readText(pyproject);
        if (/\[tool\.pytest/i.test(text) && !frameworks.includes("pytest")) {
          frameworks.push("pytest");
        }
      } catch {
        /* unreadable — skip */
      }
    }

    if (frameworks.length === 0) {
      // unittest is stdlib; presence of TestCase-using tests implies it,
      // but that requires parsing — report unknown honestly instead.
      return { frameworks: [], unknown: true };
    }
    return { frameworks, unknown: false };
  },

  discoverTestFiles(ctx: ScanContext): void {
    sharedWalk({
      root: ctx.workspace.root,
      deadline: ctx.deadline,
      ignoreMatcher: ctx.ignoreMatcher,
      onSkipped: ctx.onSkippedFile,
      onTruncated: (reason) =>
        ctx.onDiscoveryTruncated(
          reason === "file-cap" ? "file-cap:python" : reason,
        ),
      skipDirs: ["venv", ".venv", "env", "__pycache__", "site-packages"],
      isTestFile: (name) => PYTHON_TEST_RE.test(name),
      onTestFile: (f) => ctx.testFiles.push(f),
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Phase 1 (Tempering): lazy codeText — computed on first access.
    let cachedCodeText: string | undefined;
    const enriched = Object.defineProperty({ ...file }, "codeText", {
      get() {
        if (cachedCodeText === undefined) {
          cachedCodeText = computeCodeText(file, "python");
        }
        return cachedCodeText;
      },
      enumerable: true,
      configurable: true,
    });
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
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

function readText(p: string): string {
  return readFileSync(p, "utf8");
}
