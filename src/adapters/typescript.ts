/**
 * TypeScript/JavaScript adapter (R1).
 * Wraps the proven regex-based engine behind the LanguageAdapter
 * interface. Tree-sitter migration happens later without touching rules.
 *
 * Framework dimension (Verification Trust Evolution Plan §15.1, D7):
 * per-file tags come from the file's own import lines (the ts-morph
 * parse in runRules, or a cheap import scan for discovery) — a file
 * importing `@playwright/test` is tagged "playwright", `cypress` →
 * "cypress", `@jest/globals` → "jest", `vitest` → "vitest". Config
 * gating is rule-declared (`configFiles`), not hard-coded here.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { detectFrameworks as detectFrameworksLegacy } from "../discovery/frameworks.js";
import type { Workspace } from "../discovery/workspace.js";
import { parseTsFile } from "../engine/ts-ast.js";
import { computeCodeText } from "../engine/code-text.js";
import {
  frameworkFilterApplies,
  type FrameworkInfo,
  type LanguageAdapter,
  type ParsedFile,
  type ScanContext,
  type UniversalRule,
} from "../engine/adapter.js";

const TEST_FILE_RE =
  /\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs)$|\.cy\.(?:js|jsx|ts|tsx)$/;
const PW_CONFIG_RE = /^playwright\.config\.(?:ts|js|mjs|cts)$/;

/**
 * Fallback config list for `configOnly` rules that do not declare
 * `configFiles` (the legacy playwright.config.* gating, preserved
 * byte-identically for the existing five config rules).
 */
const ADAPTER_CONFIG_FILES = [PW_CONFIG_RE.source];

/** Import-path → framework tag (plan §15.1 vocabulary). */
const IMPORT_TAG_RULES: Array<{ re: RegExp; tag: string }> = [
  { re: /(?:^|\/)@playwright\/test(?:$|\/)/, tag: "playwright" },
  { re: /(?:^|\/)playwright(?:\/|$)/, tag: "playwright" },
  { re: /(?:^|\/)cypress(?:\/|$)/, tag: "cypress" },
  { re: /(?:^|\/)vitest(?:$|\/)/, tag: "vitest" },
  { re: /(?:^|\/)@jest\/globals(?:$|\/)/, tag: "jest" },
  { re: /(?:^|\/)@vue\/test-utils(?:$|\/)/, tag: "vitest" },
  { re: /(?:^|\/)selenium-webdriver(?:\/|$)/, tag: "selenium" },
  { re: /(?:^|\/)webdriverio(?:\/|$)/, tag: "webdriverio" },
  { re: /(?:^|\/)puppeteer(?:\/|$)/, tag: "puppeteer" },
];

/**
 * Per-file framework tags from import lines — a cheap single-pass scan
 * that needs no AST (works for discovery-time and for files ts-morph
 * declines to parse). The AST path (tagFromTsImports) yields the same
 * vocabulary with higher precision.
 */
export function frameworkTagsFromImports(text: string): string[] {
  const tags = new Set<string>();
  // `import … from "spec"`, `import "spec"`, `require("spec")` — the
  // three real specifier forms (named-import braces skipped via [^"']*).
  const importRe = /(?:\bimport\b|\brequire\b)[^"']*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(text)) !== null) {
    // The quoted-specifier capture is mandatory — always defined on a
    // match (a quote-less import produces no match at all).
    const specifier = m[1] as string;
    for (const { re, tag } of IMPORT_TAG_RULES) {
      if (re.test(specifier)) tags.add(tag);
    }
  }
  return [...tags];
}

export const typescriptAdapter: LanguageAdapter = {
  id: "typescript",
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  testFileGlobs: [
    "*.test.{js,jsx,ts,tsx,mjs,cjs}",
    "*.spec.{js,jsx,ts,tsx,mjs,cjs}",
    "*.cy.{js,jsx,ts,tsx}",
    "playwright.config.{ts,js,mjs,cts}",
    "cypress.config.{js,ts,mjs}",
  ],
  dirSkips: [],

  isTestFile(path: string): boolean {
    // Separator-agnostic basename: Windows callers pass raw backslash
    // paths — the ^-anchored config regex never matches a full path, and
    // path.basename is platform-dependent (a backslash path on POSIX
    // comes back whole). Same class of bug explain.ts documents for
    // filename-gated rules.
    const base = baseName(path);
    return TEST_FILE_RE.test(path) || ADAPTER_CONFIG_RE.test(base);
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
      isTestFile: (name) =>
        TEST_FILE_RE.test(name) || ADAPTER_CONFIG_RE.test(name),
      onTestFile: (f) => ctx.testFiles.push(f),
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Phase 3: populate the AST seam once per file; rules that opt in use
    // it via getTsSourceFile, everything else stays on the regex path.
    const withAst: ParsedFile = { ...file, ast: parseTsFile(file) };
    // Phase 5 (§15.1): per-file framework tags from the file's own
    // import lines. Empty when the file imports nothing framework-y —
    // filtering is then OPEN for every rule (unknown ≠ skip).
    const withTags: ParsedFile = {
      ...withAst,
      frameworkTags: frameworkTagsFromImports(withAst.text),
    };
    // Phase 1 (Tempering): lazy codeText — computed on first access.
    let cachedCodeText: string | undefined;
    const enriched: ParsedFile = Object.defineProperty(
      { ...withTags },
      "codeText",
      {
        get() {
          if (cachedCodeText === undefined) {
            cachedCodeText = computeCodeText(withTags, "typescript");
          }
          return cachedCodeText;
        },
        enumerable: true,
        configurable: true,
      },
    );
    const base = baseName(file.path);
    const isConfig = ADAPTER_CONFIG_RE.test(base);
    for (const rule of rules) {
      if (!rule.appliesTo.includes(this.id)) continue;
      // §15.2: config rules run only on the config files THEY declare
      // (configFiles), and never on test files; test rules never run on
      // configs. Rules without configFiles that are configOnly keep the
      // legacy playwright.config.* gating (ADAPTER_CONFIG_FILES).
      if (isConfig !== (rule.configOnly === true)) continue;
      if (isConfig && !configGateMatches(rule, base)) continue;
      // §15.1: framework opt-in filtering (open-when-unknown).
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

const ADAPTER_CONFIG_RE = new RegExp(
  `^(?:${ADAPTER_CONFIG_FILES.map((re) => `(?:${re})`).join("|")})$`,
);

/** §15.2: does this config rule's declared configFiles match the file? */
function configGateMatches(
  rule: Pick<UniversalRule, "configOnly" | "configFiles">,
  base: string,
): boolean {
  if (rule.configFiles === undefined || rule.configFiles.length === 0) {
    return ADAPTER_CONFIG_FILES.some((re) => new RegExp(re).test(base));
  }
  return rule.configFiles.some((re) => new RegExp(re).test(base));
}

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
