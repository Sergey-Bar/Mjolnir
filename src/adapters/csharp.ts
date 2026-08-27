/**
 * C#/.NET adapter (Upgrade-Plan-v3 Phase 5).
 *
 * Third language adapter. Same regex-layer discipline as the Java
 * adapter; the tree-sitter-c-sharp WASM grammar can be added behind the
 * same seam later without touching rules.
 *
 * Test discovery: *Tests.cs / *Test.cs / *IT.cs under typical NUnit/
 * xUnit/MSTest conventions.
 * Frameworks: detected via .csproj content.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  isDefaultIgnored,
  isLintFixtureDir,
  LIMITS,
} from "../discovery/ignores.js";
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
    walkCs(
      ctx.workspace.root,
      ctx.workspace.root,
      ctx.testFiles,
      ctx.deadline,
      ctx.onSkippedFile,
    );
  },

  runRules(rules, file, emit) {
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
      try {
        for (const f of rule.run(enriched)) {
          emit(f, rule.id, rule.category);
        }
      } catch {
        // Crash isolation (§25)
      }
    }
  },
};

function readText(path: string): string {
  return readFileSync(path, "utf8");
}

function walkCs(
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
    if (entry.isSymbolicLink()) continue; // never follow links out of the repo
    if (entry.isDirectory()) {
      if (["bin", "obj"].includes(entry.name)) continue;
      if (rel.split("/").length <= LIMITS.maxDepth)
        if (!isLintFixtureDir(full))
          walkCs(full, root, out, deadline, onSkipped);
    } else if (entry.isFile() && CS_TEST_RE.test(entry.name)) {
      try {
        if (statSync(full).size <= LIMITS.maxFileBytes) out.push(full);
      } catch {
        onSkipped();
      }
    }
  }
}
