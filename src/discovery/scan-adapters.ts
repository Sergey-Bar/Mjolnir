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
import { azurePipelinesAdapter } from "../adapters/azure-pipelines.js";
import { jenkinsAdapter } from "../adapters/jenkins.js";
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
  azurePipelinesAdapter,
  jenkinsAdapter,
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
  const walkSkips = [
    ...new Set([
      ...languageAdapters.reduce<readonly string[]>(
        (common, a) => common.filter((name) => a.dirSkips.includes(name)),
        languageAdapters[0]?.dirSkips ?? [],
      ),
      ".mjolnir",
    ]),
  ];
  sharedWalk({
    root: ctx.workspace.root,
    deadline: ctx.deadline,
    ignoreMatcher: ctx.ignoreMatcher,
    onSkipped: ctx.onSkippedFile,
    onTruncated: ctx.onDiscoveryTruncated,
    skipDirs: walkSkips,
    isTestFile: (name) => languageAdapters.some((a) => a.isTestFile(name)),
    onTestFile: (abs) => {
      // Audit (scan-adapters): the claiming adapter's isTestFile may be
      // a gate on the FULL PATH (regexes anchored to path segments,
      // e.g. the workflow adapter's `\.github[\\/]workflows[\\/].+`),
      // not just a basename — gate and claim must see the SAME string,
      // so the gate here receives the walk-relative path, exactly what
      // the scan pipeline feeds back. Gating on the walk-time basename
      // only could admit a file whose relative shape the adapter's own
      // discovery later rejects (latent drop), or vice versa.
      const rel = relative(ctx.workspace.root, abs).replaceAll("\\", "/");
      for (const a of languageAdapters) {
        if (!a.isTestFile(rel)) continue;
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
    // R4c Scope Integrity: the walk's exclusion accounting feeds the
    // scope verdict (claimed scope ≡ analyzed scope).
    onIgnored: (path) => {
      if (isScopeRelevantIgnored(path)) ctx.onIgnored?.(path);
    },
    onUnrecognized: (path) => {
      if (typeof path === "string" && isUnrecognizedSourceCandidate(path)) {
        ctx.onUnrecognized?.(path);
      }
    },
  });
}

/**
 * Would ignoring this file have removed it from the scanned surface?
 *
 * The bug this fixes, reproduced: a repo containing a real test file plus
 * `vendor.min.js` and `pnpm-lock.yaml` reported
 *
 *   discovered: 1, analyzed: 1, ignored: 2, scopeVerdict: "PARTIAL"
 *
 * Every discovered test file HAD been analyzed. The surface was complete. But
 * DEFAULT_IGNORES matches minified bundles and lockfiles, and the ignored
 * counter accepted any path with a source extension — so a minified bundle and
 * a lockfile downgraded a finished scan to "unverified".
 *
 * That is not a conservative bias, it is a broken signal. The terminal tells
 * the reader "some files were not analyzed, so the surface is unverified" —
 * which was false. And because minified bundles and lockfiles exist in
 * essentially every real repository, a PROVEN scan was unreachable in
 * practice, so the corpus regression guard failed 23 of 37 repositories on
 * exactly this. A gate that cannot pass teaches people to ignore it.
 *
 * The asymmetry is the tell. `isUnrecognizedSourceCandidate` below applies a
 * test-relevance test before counting a file; this one did not. Both count
 * against the same verdict, so both must ask the same question.
 *
 * An ignored file that IS a test file still downgrades the verdict. That is
 * the case the honesty law exists for, and this does not touch it.
 */
function isScopeRelevantIgnored(path: string): boolean {
  const name = path.replaceAll("\\", "/").split("/").pop() ?? path;
  if (!/\.(?:[cm]?[jt]sx?|py|java|cs|ya?ml|min\.js)$/i.test(name)) {
    return false;
  }
  // Would a shipped adapter have claimed this as a test file had it not been
  // ignored? If not, ignoring it removed nothing from the scanned surface.
  return isKnownTestFile(path);
}

function isUnrecognizedSourceCandidate(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const name = normalized.split("/").pop() ?? normalized;
  if (
    normalized.includes(".github/workflows/") ||
    name === "azure-pipelines.yml" ||
    name === "Jenkinsfile"
  ) {
    return false;
  }
  const extensionIndex = name.lastIndexOf(".");
  const stem = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  if (
    name === "mjolnir.config.json" ||
    name === ".mjolnir.json" ||
    name === "package.json" ||
    name === "package-lock.json" ||
    name === "pnpm-lock.yaml" ||
    name === "yarn.lock" ||
    ["playwright", "vitest", "vite", "eslint", "tsconfig", "jsconfig"].some(
      (prefix) => stem === prefix || stem.startsWith(`${prefix}.`),
    )
  ) {
    return false;
  }
  const testLike =
    /(?:^|\/)__tests__\//i.test(normalized) ||
    /\.(?:spec|test)\.[cm]?[jt]sx?$/i.test(name);
  return /\.(?:[cm]?[jt]sx?|py|java|cs|ya?ml)$/i.test(name) && testLike;
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
  {
    id: "azure-pipelines",
    label: "Azure DevOps pipelines",
    globs: azurePipelinesAdapter.testFileGlobs,
  },
  {
    id: "jenkins",
    label: "Jenkinsfiles",
    globs: jenkinsAdapter.testFileGlobs,
  },
];
