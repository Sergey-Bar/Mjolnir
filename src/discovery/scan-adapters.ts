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
import { relative } from "node:path";
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
  // Bug-audit QA-2026-08-30 QA-2: this used to walk with the UNION of
  // every adapter's dirSkips, so a Python convention ("env" = virtualenv)
  // or a Java one ("build" = Gradle output) silently hid directories from
  // every other language — withastro/astro's packages/astro/test/units/env/
  // (real TS tests) and …/units/build/ disappeared from scans, and the
  // corpus count-lock caught the rules going silent. dirSkips are
  // per-language naming conventions that legitimately collide across
  // languages, so the shared walk descends into every non-ignored
  // directory and the OWNING adapter's dirSkips are applied per file
  // below — preserving each language's pre-single-walk discovery exactly.
  const walkSkips = languageAdapters.reduce<readonly string[]>(
    (common, a) => common.filter((name) => a.dirSkips.includes(name)),
    languageAdapters[0]?.dirSkips ?? [],
  );
  sharedWalk({
    root: ctx.workspace.root,
    deadline: ctx.deadline,
    ignoreMatcher: ctx.ignoreMatcher,
    onSkipped: ctx.onSkippedFile,
    onTruncated: ctx.onDiscoveryTruncated,
    skipDirs: walkSkips,
    isTestFile: (name) => languageAdapters.some((a) => a.isTestFile(name)),
    onTestFile: (abs) => {
      for (const a of languageAdapters) {
        if (!a.isTestFile(abs)) continue;
        // The claiming adapter's own dirSkips decide here, per language.
        if (isInsideSkippedDir(ctx.workspace.root, abs, a.dirSkips)) continue;
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

/** True when any path segment (relative to the scan root) is a skip name. */
function isInsideSkippedDir(
  root: string,
  absPath: string,
  skipNames: readonly string[],
): boolean {
  if (skipNames.length === 0) return false;
  const rel = relative(root, absPath).replaceAll("\\", "/");
  return rel
    .split("/")
    .slice(0, -1)
    .some((seg) => skipNames.includes(seg));
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
