/**
 * TypeScript/JavaScript adapter (R1).
 * Wraps the proven regex-based engine behind the LanguageAdapter
 * interface. Tree-sitter migration happens later without touching rules.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { isDefaultIgnored, LIMITS } from "../discovery/ignores.js";
import { detectFrameworks as detectFrameworksLegacy } from "../discovery/frameworks.js";
import type { Workspace } from "../discovery/workspace.js";
import { parseTsFile } from "../engine/ts-ast.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ParsedFile,
  ScanContext,
} from "../engine/adapter.js";

const TEST_FILE_RE = /(?:\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs))$/;

export const typescriptAdapter: LanguageAdapter = {
  id: "typescript",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],

  isTestFile(path: string): boolean {
    return TEST_FILE_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    // Delegate to the existing (now wired) detector.
    const ws = loadWorkspaceShim(root);
    return ws ? detectFrameworksLegacy(ws) : { frameworks: [], unknown: true };
  },

  discoverTestFiles(ctx: ScanContext): void {
    walk(
      ctx.workspace.root,
      ctx.workspace.root,
      ctx.testFiles,
      ctx.deadline,
      ctx.onSkippedFile,
    );
  },

  runRules(rules, file, emit) {
    // Phase 3: populate the AST seam once per file; rules that opt in use
    // it via getTsSourceFile, everything else stays on the regex path.
    const withAst: ParsedFile = { ...file, ast: parseTsFile(file) };
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      try {
        for (const f of rule.run(withAst)) {
          emit(f, rule.id, rule.category);
        }
      } catch {
        // Crash isolation (§25)
      }
    }
  },
};

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

function walk(
  dir: string,
  root: string,
  out: string[],
  deadline: number,
  onSkipped: () => void,
): void {
  if (Date.now() > deadline || out.length > 10_000) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    const rel = full.slice(root.length + 1).replaceAll("\\", "/");
    if (isDefaultIgnored(rel)) continue;
    // Symlinks are never followed: a link can point outside the repo
    // (scanning files we have no business reading) or create cycles.
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (rel.split("/").length <= LIMITS.maxDepth)
        walk(full, root, out, deadline, onSkipped);
    } else if (entry.isFile() && TEST_FILE_RE.test(entry.name)) {
      try {
        if (statSync(full).size <= LIMITS.maxFileBytes) out.push(full);
      } catch {
        onSkipped();
      }
    }
  }
}
