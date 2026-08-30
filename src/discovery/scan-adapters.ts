/**
 * The canonical adapter registry (audits H-6/H-9).
 *
 * Single source of truth for "which adapters run and what counts as a
 * test file". `--scope changed` derives its changed-file predicate from
 * `isKnownTestFile` here (previously a duplicated TS/JS-only literal
 * that dropped every Python/Java/C#/workflow finding), and the
 * empty-state reporter derives its "searched for" list from
 * SEARCHED_FOR, so the two can never drift from real discovery.
 */

import { typescriptAdapter } from "../adapters/typescript.js";
import { pythonAdapter } from "../adapters/python.js";
import { javaAdapter } from "../adapters/java.js";
import { csharpAdapter } from "../adapters/csharp.js";
import { githubActionsAdapter } from "../adapters/github-actions.js";
import type { LanguageAdapter } from "../engine/adapter.js";

import { sharedWalk } from "./shared-walk.js";
import type { ScanContext } from "../engine/adapter.js";

export const SCAN_ADAPTERS: readonly LanguageAdapter[] = [
  typescriptAdapter,
  pythonAdapter,
  javaAdapter,
  csharpAdapter,
  githubActionsAdapter,
];

/**
 * ONE tree walk for every language adapter (audit P-2): the production
 * pipeline previously readdirSynced every directory four times (plus a
 * lint-fixture probe each). Each discovered file lands in the bucket of
 * the adapter that claims it; per-adapter caps still apply.
 */
export function discoverAllTestFiles(
  ctx: ScanContext,
  languageAdapters: readonly LanguageAdapter[],
  buckets: Map<string, string[]>,
  fixtureDirMemo: Map<string, boolean>,
): void {
  const unionSkips = [...new Set(languageAdapters.flatMap((a) => a.dirSkips))];
  sharedWalk({
    root: ctx.workspace.root,
    deadline: ctx.deadline,
    ignoreMatcher: ctx.ignoreMatcher,
    onSkipped: ctx.onSkippedFile,
    onTruncated: ctx.onDiscoveryTruncated,
    skipDirs: unionSkips,
    isTestFile: (name) => languageAdapters.some((a) => a.isTestFile(name)),
    onTestFile: (abs) => {
      for (const a of languageAdapters) {
        if (!a.isTestFile(abs)) continue;
        const bucket = buckets.get(a.id) ?? [];
        // The per-adapter budget (audit H-8) is enforced HERE, not only
        // by isFull() below: isFull is an every() checked once per
        // directory, so without this a single language would keep
        // filling past its cap for as long as any other bucket has room.
        if (bucket.length >= ctx.maxFiles) {
          ctx.onDiscoveryTruncated(`file-cap:${a.id}`);
          return;
        }
        bucket.push(abs);
        buckets.set(a.id, bucket);
        return;
      }
    },
    isFull: () =>
      languageAdapters.every(
        (a) => (buckets.get(a.id)?.length ?? 0) >= ctx.maxFiles,
      ),
    fixtureDirMemo,
  });
}

/** Whether ANY shipped adapter would discover this path as a test file. */
export function isKnownTestFile(path: string): boolean {
  return SCAN_ADAPTERS.some((a) => a.isTestFile(path));
}

export interface SearchedForEntry {
  id: string;
  label: string;
  globs: readonly string[];
}

/** What discovery actually looks for, per adapter — display contract. */
export const SEARCHED_FOR: readonly SearchedForEntry[] = [
  {
    id: "typescript",
    label: "TypeScript/JavaScript",
    globs: typescriptAdapter.testFileGlobs,
  },
  {
    id: "python",
    label: "Python (pytest)",
    globs: pythonAdapter.testFileGlobs,
  },
  {
    id: "java",
    label: "Java (JUnit/TestNG)",
    globs: javaAdapter.testFileGlobs,
  },
  {
    id: "csharp",
    label: "C# (NUnit/xUnit/MSTest)",
    globs: csharpAdapter.testFileGlobs,
  },
  {
    id: "github-actions",
    label: "GitHub Actions workflows",
    globs: githubActionsAdapter.testFileGlobs,
  },
];
