/**
 * C#/.NET adapter (Upgrade-Plan-v3 Phase 5).
 *
 * Regex-layer adapter: rules run over the file text (and the masked
 * code-text view), same discipline as the Java adapter. The
 * tree-sitter-c_sharp WASM grammar ships in the dependency set and
 * `src/engine/tree-sitter-ast.ts` exposes an async `parseCSharpAst`
 * seam, but it is not yet wired into the synchronous scan pipeline
 * (Verification Trust Evolution Plan defect D1, Phase 0.5 wires the
 * parse stage).
 *
 * Test discovery: *Tests.cs / *Test.cs / *IT.cs under typical NUnit/
 * xUnit/MSTest conventions.
 * Frameworks: detected via .csproj content.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { sharedWalk } from "../discovery/shared-walk.js";
import { computeCodeText } from "../engine/code-text.js";
import type {
  FrameworkInfo,
  LanguageAdapter,
  ScanContext,
} from "../engine/adapter.js";

const CS_TEST_RE = /(?:^|[\\/])\w+(?:Tests?|IT)\.cs$/;

export const csharpAdapter: LanguageAdapter = {
  id: "csharp",
  extensions: [".cs"],
  testFileGlobs: ["*Test.cs", "*Tests.cs", "*IT.cs"],
  dirSkips: ["bin", "obj"],

  isTestFile(path: string): boolean {
    return CS_TEST_RE.test(path);
  },

  detectFrameworks(root: string): FrameworkInfo {
    const frameworks: string[] = [];
    // Find a .csproj and inspect its PackageReferences.
    let csproj: string | null = null;
    try {
      for (const e of readdirSync(root)) {
        if (e.endsWith(".csproj")) {
          csproj = join(root, e);
          break;
        }
      }
    } catch {
      /* unreadable — skip */
    }
    if (csproj) {
      try {
        const text = readText(csproj);
        if (/NUnit/i.test(text)) frameworks.push("nunit");
        if (/xunit/i.test(text)) frameworks.push("xunit");
        if (/MSTest/i.test(text)) frameworks.push("mstest");
        if (/Microsoft\.Playwright/i.test(text)) frameworks.push("playwright");
      } catch {
        /* unreadable — skip */
      }
    }
    if (frameworks.length === 0) return { frameworks: [], unknown: true };
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
          reason === "file-cap" ? "file-cap:csharp" : reason,
        ),
      skipDirs: ["bin", "obj"],
      isTestFile: (name) => CS_TEST_RE.test(name),
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
          cachedCodeText = computeCodeText(file, "csharp");
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

function readText(path: string): string {
  return readFileSync(path, "utf8");
}
