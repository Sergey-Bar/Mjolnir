/**
 * C#/.NET adapter (Upgrade-Plan-v3 Phase 5).
 *
 * Regex-layer adapter: rules run over the file text (and the masked
 * code-text view). Since Verification Trust Evolution Phase 0.5 (§10)
 * the adapter also implements the async `parseAst` hook — the file loop
 * awaits `parseCSharpAst` (tree-sitter WASM) and hands the tree to rules
 * via `ParsedFile.ast`; rules stay synchronous. Parse failure or a
 * missing grammar resolves `undefined` and rules fall back to the regex
 * path — never fatal.
 *
 * Test discovery: *Tests.cs / *Test.cs / *IT.cs under typical NUnit/
 * xUnit/MSTest conventions.
 * Frameworks (plan §15.1, D7): repo-level detection parses EVERY
 * .csproj found at the workspace root (the old "first .csproj only"
 * defect is closed) and reads each `<PackageReference Include="…">`
 * attribute. Per-file tags come from the file's own `using` directives.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import { parseCSharpAst } from "../engine/tree-sitter-ast.js";
import {
  frameworkFilterApplies,
  type FrameworkInfo,
  type LanguageAdapter,
  type ParsedAst,
  type ParsedFile,
  type ScanContext,
} from "../engine/adapter.js";

const CS_TEST_RE = /(?:^|[\\/])\w+(?:Tests?|IT)\.cs$/;

/** Package name → framework tag (.csproj PackageReference). */
const CS_PACKAGE_TAGS: Array<{ re: RegExp; tag: string }> = [
  { re: /NUnit/i, tag: "nunit" },
  { re: /xunit/i, tag: "xunit" },
  { re: /MSTest|Microsoft\.NET\.Test\.Sdk/i, tag: "mstest" },
  { re: /Microsoft\.Playwright/i, tag: "playwright" },
  { re: /Selenium\.WebDriver/i, tag: "selenium" },
  { re: /Shouldly|FluentAssertions/i, tag: "shouldly" },
];

export const csharpAdapter: LanguageAdapter = {
  id: "csharp",
  extensions: [".cs"],
  testFileGlobs: ["*Test.cs", "*Tests.cs", "*IT.cs"],
  dirSkips: ["bin", "obj"],

  isTestFile(path: string): boolean {
    return CS_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks = new Set<string>();
    // D7 closed: parse EVERY .csproj at the root, not the first one, and
    // read the PackageReference Include attributes (dependency-element
    // parsing, not a bare file-text regex).
    try {
      for (const e of readdirSync(root)) {
        if (!e.endsWith(".csproj")) continue;
        try {
          const text = readText(join(root, e));
          for (const m of text.matchAll(
            /<PackageReference\s+Include="([^"]+)"/g,
          )) {
            // The capture group is mandatory — always defined on a match.
            const pkg = m[1] as string;
            for (const { re, tag } of CS_PACKAGE_TAGS) {
              if (re.test(pkg)) frameworks.add(tag);
            }
          }
        } catch {
          /* unreadable — skip this csproj */
        }
      }
    } catch {
      /* unreadable — skip */
    }
    if (frameworks.size === 0) return { frameworks: [], unknown: true };
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
          reason === "file-cap" ? "file-cap:csharp" : reason,
        ),
      skipDirs: ["bin", "obj"],
      isTestFile: (name) => CS_TEST_RE.test(name),
      onTestFile: (f) => ctx.testFiles.push(f),
      isFull: () => ctx.testFiles.length >= ctx.maxFiles,
      fixtureDirMemo: new Map(),
    });
  },

  async parseAst(file: ParsedFile): Promise<ParsedAst | undefined> {
    const tree = await parseCSharpAst(file.text);
    if (!tree) return undefined;
    return { ast: tree, dispose: () => tree.delete() };
  },

  runRules(rules, file, emit, onCrash, budget) {
    // Phase 1 (Tempering): lazy codeText — computed on first access.
    let cachedCodeText: string | undefined;
    const enriched = Object.defineProperty(
      { ...file, frameworkTags: csharpFileTags(file) },
      "codeText",
      {
        get() {
          if (cachedCodeText === undefined) {
            cachedCodeText = computeCodeText(file, "csharp");
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
      // with no using-derived tags is analyzed by every rule).
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

/**
 * Per-file tags from `using` directives (D7): NUnit/Xunit/MSTest/
 * Selenium namespaces tag the file. Uses the parsed tree (AST-truth,
 * not raw text), so commented-out usings never tag a file.
 */
function csharpFileTags(file: ParsedFile): string[] {
  const ast = file.ast;
  if (
    !(ast instanceof Object) ||
    !("rootNode" in ast) ||
    !((ast as { rootNode?: unknown }).rootNode instanceof Object)
  ) {
    return [];
  }
  const root = (
    ast as {
      rootNode: {
        // Runtime truth: descendantsOfType yields Nodes (never null at
        // runtime; the nullable typing is a defensive artifact).
        descendantsOfType(t: string): Array<{ text: string } | null>;
      };
    }
  ).rootNode;
  const tags = new Set<string>();
  for (const using of root.descendantsOfType("using_directive")) {
    // A real using_directive always carries text (runtime truth); the
    // nullable entry shape is a cast artifact, not a branch.
    const t = (using as { text: string }).text;
    if (/NUnit/i.test(t)) tags.add("nunit");
    if (/Xunit/i.test(t)) tags.add("xunit");
    if (/MSTest|VisualStudio\.TestTools/i.test(t)) tags.add("mstest");
    if (/Selenium/i.test(t)) tags.add("selenium");
    if (/Playwright/i.test(t)) tags.add("playwright");
    if (/Shouldly|FluentAssertions/i.test(t)) tags.add("shouldly");
  }
  return [...tags];
}

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
