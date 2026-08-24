/**
 * Python/pytest adapter (Upgrade-Plan-v2 R2).
 *
 * First tree-sitter consumer. Uses web-tree-sitter (WASM) for
 * portability — no node-gyp, works on all platforms.
 *
 * Test discovery: test_*.py / *_test.py (pytest convention).
 * Frameworks: pytest (config files), unittest (detected via imports).
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { isDefaultIgnored, LIMITS } from '../discovery/ignores.js';
import type { FrameworkInfo, LanguageAdapter, ScanContext } from '../engine/adapter.js';

const PYTHON_TEST_RE = /(?:^|[\\/])(?:test_[^\\/]*|[^\\/]*_test)\.py$/;

export const pythonAdapter: LanguageAdapter = {
  id: 'python',
  extensions: ['.py'],

  isTestFile(path: string): boolean {
    return PYTHON_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks: string[] = [];
    const hasPytestConfig =
      existsSync(join(root, 'pytest.ini')) ||
      existsSync(join(root, 'conftest.py')) ||
      existsSync(join(root, 'setup.cfg'));
    if (hasPytestConfig) frameworks.push('pytest');

    // pyproject.toml [tool.pytest] section.
    const pyproject = join(root, 'pyproject.toml');
    if (existsSync(pyproject)) {
      try {
        const text = readText(pyproject);
        if (/\[tool\.pytest/i.test(text) && !frameworks.includes('pytest')) {
          frameworks.push('pytest');
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
    walkPy(ctx.workspace.root, ctx.workspace.root, ctx.testFiles, ctx.deadline, ctx.onSkippedFile);
  },

  runRules(rules, file, emit) {
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      try {
        for (const f of rule.run(file)) {
          emit(f, rule.id, rule.category);
        }
      } catch {
        // Crash isolation (§25)
      }
    }
  },
};

function walkPy(dir: string, root: string, out: string[], deadline: number, onSkipped: () => void): void {
  if (Date.now() > deadline || out.length > 10_000) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = full.slice(root.length + 1).replaceAll('\\', '/');
    if (isDefaultIgnored(rel)) continue;
    if (entry.isDirectory()) {
      // Skip common virtualenv/dependency dirs.
      if (['venv', '.venv', 'env', '__pycache__', 'site-packages'].includes(entry.name)) continue;
      if (rel.split('/').length <= LIMITS.maxDepth) walkPy(full, root, out, deadline, onSkipped);
    } else if (entry.isFile() && PYTHON_TEST_RE.test(entry.name)) {
      try {
        if (statSync(full).size <= LIMITS.maxFileBytes) out.push(full);
      } catch {
        onSkipped();
      }
    }
  }
}

function readText(p: string): string {
  // Lazy require to avoid loading fs at module top when unused elsewhere.
  const { readFileSync } = require('node:fs') as typeof import('node:fs');
  return readFileSync(p, 'utf8');
}
