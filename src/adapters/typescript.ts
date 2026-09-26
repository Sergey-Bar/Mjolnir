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
import { getProject, parseTsFile } from "../engine/ts-ast.js";
import { computeCodeText } from "../engine/code-text.js";
import {
  frameworkFilterApplies,
  type FrameworkInfo,
  type LanguageAdapter,
  type ParsedAst,
  type ParsedFile,
  type ScanContext,
  type UniversalRule,
} from "../engine/adapter.js";

/**
 * `.test.` / `.spec.` filenames, plus the Cypress `.cy.` convention.
 *
 * `mts` and `cts` are TypeScript's Node-native ESM/CJS extensions. They were
 * missing here, and the omission was invisible in the worst way — not a wrong
 * answer, but an ABSENCE.
 *
 * Reproduced: a repo containing two byte-identical tests, one at
 * `tests/control.spec.ts` and one at `tests/slow.spec.mts`, each with a
 * `QA-TEST-004` hard sleep:
 *
 *   discovered: 1, analyzed: 1, unrecognized: 1, scopeVerdict: "PARTIAL"
 *
 * The `.ts` test produced the finding. The `.mts` test produced nothing at
 * all — it was never scanned, so every rule that could have caught it was
 * silent on it, with no finding, no low-evidence note, and no indication that
 * a test file had been skipped. A test scanner that cannot see a whole file
 * extension has a false green that is invisible by construction: the reader
 * has nothing to distrust, because there is nothing there.
 *
 * The corroboration that this was an oversight rather than a decision sits
 * four lines below: PW_CONFIG_RE already accepted `cts`. The config regex knew
 * about the Node-native extensions; the test-file regex did not.
 *
 * `discovery/scan-adapters.ts:isUnrecognizedSourceCandidate` already counted
 * these paths as uncovered surface, so the scope accounting had been reporting
 * the hole the whole time — it was being read as a known limitation rather than
 * as a defect.
 */
const TEST_FILE_RE =
  /\.(?:test|spec)\.(?:js|jsx|ts|tsx|mjs|cjs|mts|cts)$|\.cy\.(?:js|jsx|ts|tsx)$/;
const PW_CONFIG_RE = /^playwright\.config\.(?:ts|js|mjs|cts)$/;
// Audit C4: configOnly rules may declare configFiles the ADAPTER must be
// able to discover. QA-CYP-003 declared ^cypress\.config\.(?:js|ts|mjs)$
// while ADAPTER_CONFIG_FILES only carried the playwright pattern — the
// rule could never fire (a dead rule presenting as coverage). The
// cypress glob joins the adapter's compile-time literal list, and the
// registry reachability test (tests/audit) locks the invariant: every
// configOnly rule's configFiles must be matchable by its adapter.
const CYPRESS_CONFIG_RE_SOURCE = "^cypress\\.config\\.(?:js|ts|mjs)$";

/**
 * Fallback config list for `configOnly` rules that do not declare
 * `configFiles` (the legacy playwright.config.* gating, preserved
 * byte-identically for the existing five config rules).
 */
const ADAPTER_CONFIG_FILES = [PW_CONFIG_RE.source, CYPRESS_CONFIG_RE_SOURCE];

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
      onIgnored: ctx.onIgnored,
      onUnrecognized: ctx.onUnrecognized,
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  /**
   * The ONE AST seam (plan V5-021).
   *
   * This adapter used to parse inside `runRules`, on the synchronous path,
   * while Java and C# exposed the async `parseAst` hook. Two seams meant two
   * sets of consequences, both of them bad:
   *
   *   - the pipeline computes `wantsAst` as `adapter.parseAst !== undefined`,
   *     so a TypeScript file never took the AST path through the pipeline at
   *     all, and its parse failures were invisible to the pipeline's
   *     fallback counters;
   *   - nothing called `dispose()` for the ts-morph path, so a scan held
   *     every parsed SourceFile for its whole lifetime.
   *
   * Parsing now happens here, once, through the same contract every other
   * adapter uses. `dispose()` drops this file's SourceFile from the shared
   * project; ts-morph caches per file path, so removing it is what keeps
   * memory proportional to one file rather than to the whole scan.
   */
  parseAst(file: ParsedFile): ParsedAst | undefined {
    const sourceFile = parseTsFile(file);
    if (sourceFile === undefined) return undefined;
    return {
      ast: sourceFile,
      dispose: () => {
        try {
          getProject().removeSourceFile(sourceFile);
        } catch {
          // Disposal is best-effort: a file already evicted (or a project
          // reset by another test) is not a failure of the scan.
        }
      },
    };
  },

  runRules(rules, file, emit, onCrash, budget) {
    // The AST arrives on the seam. A direct caller that did not go through the
    // pipeline gets one parsed here so the adapter behaves identically either
    // way — the alternative is a rule that only works on one of two paths.
    const withAst: ParsedFile =
      file.ast === undefined ? { ...file, ast: parseTsFile(file) } : file;
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

// ADAPTER_CONFIG_FILES are compile-time literals joined into one pattern.
// eslint-disable-next-line security/detect-non-literal-regexp
const ADAPTER_CONFIG_RE = new RegExp(
  `^(?:${ADAPTER_CONFIG_FILES.map((re) => `(?:${re})`).join("|")})$`,
);

/** §15.2: does this config rule's declared configFiles match the file? */
function configGateMatches(
  rule: Pick<UniversalRule, "configOnly" | "configFiles">,
  base: string,
): boolean {
  if (rule.configFiles === undefined || rule.configFiles.length === 0) {
    // Compile-time literal glob list.
    // eslint-disable-next-line security/detect-non-literal-regexp
    return ADAPTER_CONFIG_FILES.some((re) => new RegExp(re).test(base));
  }
  // configFiles come from the typed §09 rule contract — declared by rule
  // authors (registry or plugin manifest), never extracted from scan input.
  // eslint-disable-next-line security/detect-non-literal-regexp
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
