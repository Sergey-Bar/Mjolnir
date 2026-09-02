/**
 * Python/pytest adapter (Upgrade-Plan-v2 R2).
 *
 * Pure regex adapter — no AST enrichment. The header comment previously
 * claimed tree-sitter usage; that was never true for this adapter.
 * tree-sitter-ast.ts exists for Java/C# but is async and not wired here.
 *
 * Test discovery: test_*.py / *_test.py (pytest convention).
 * Frameworks (plan §15.1, D7): pytest (config files), unittest
 * (detected via test-file imports). Per-file tags come from the file's
 * own import lines: `import pytest` / `from playwright.sync_api` →
 * "pytest"/"playwright", `import unittest` → "unittest", `import
 * selenium` → "selenium".
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import {
  frameworkFilterApplies,
  type FrameworkInfo,
  type LanguageAdapter,
  type ParsedFile,
  type ScanContext,
} from "../engine/adapter.js";

const PYTHON_TEST_RE = /(?:^|[\\/])(?:test_[^\\/]*|[^\\/]*_test)\.py$/;

/** Python import-line → framework tag (plan §15.1 vocabulary). */
const PY_IMPORT_TAGS: Array<{ re: RegExp; tag: string }> = [
  { re: /(?:^|\.)pytest(?:\.|$)/, tag: "pytest" },
  { re: /(?:^|\.)unittest(?:\.|$)/, tag: "unittest" },
  { re: /playwright/, tag: "playwright" },
  { re: /(?:^|\.)selenium/, tag: "selenium" },
];

/** Per-file tags from `import X` / `from X import …` lines. */
export function pythonFileTags(file: ParsedFile): string[] {
  const tags = new Set<string>();
  const importRe = /^[ \t]*(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)/gm;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(file.text)) !== null) {
    const mod = m[1] ?? m[2] ?? "";
    for (const { re, tag } of PY_IMPORT_TAGS) {
      if (re.test(mod)) tags.add(tag);
    }
  }
  return [...tags];
}

export const pythonAdapter: LanguageAdapter = {
  id: "python",
  extensions: [".py"],
  testFileGlobs: ["test_*.py", "*_test.py"],
  dirSkips: ["venv", ".venv", "env", "__pycache__", "site-packages"],

  isTestFile(path: string): boolean {
    return PYTHON_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks = new Set<string>();
    const hasPytestConfig =
      existsSync(join(root, "pytest.ini")) ||
      existsSync(join(root, "conftest.py")) ||
      existsSync(join(root, "setup.cfg"));
    if (hasPytestConfig) frameworks.add("pytest");

    // pyproject.toml [tool.pytest] section.
    const pyproject = join(root, "pyproject.toml");
    if (existsSync(pyproject)) {
      try {
        const text = readText(pyproject);
        if (/\[tool\.pytest/i.test(text)) frameworks.add("pytest");
      } catch {
        /* unreadable — skip */
      }
    }

    // requirements*.txt / pyproject dependency parsing (D7): declared
    // selenium/playwright deps tag the repo even without pytest config.
    for (const reqFile of [
      "requirements.txt",
      "requirements-dev.txt",
      "requirements-test.txt",
    ]) {
      const p = join(root, reqFile);
      if (!existsSync(p)) continue;
      try {
        const text = readText(p);
        if (/^selenium\b/im.test(text)) frameworks.add("selenium");
        if (/^playwright\b/im.test(text)) frameworks.add("playwright");
      } catch {
        /* unreadable — skip */
      }
    }

    if (frameworks.size === 0) {
      // unittest is stdlib; presence of TestCase-using tests implies it,
      // but that requires parsing — report unknown honestly instead.
      return { frameworks: [], unknown: true };
    }
    return { frameworks: [...frameworks], unknown: false };
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
    const enriched = Object.defineProperty(
      { ...file, frameworkTags: pythonFileTags(file) },
      "codeText",
      {
        get() {
          if (cachedCodeText === undefined) {
            cachedCodeText = computeCodeText(file, "python");
          }
          return cachedCodeText;
        },
        enumerable: true,
        configurable: true,
      },
    );
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // §15.1: framework opt-in filtering (open-when-unknown — a file
      // with no import-derived tags is analyzed by every rule).
      if (!frameworkFilterApplies(rule, enriched)) continue;
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
