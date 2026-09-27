/**
 * Repository discovery (Sprint-Plan W1-03).
 * Finds project root, parses package.json, detects npm/yarn/pnpm workspaces.
 * Monorepo depth beyond workspaces is a documented launch cut (§29.1).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname as pathDirname, join, resolve } from "node:path";

import { recordDegradation } from "../engine/degradation-ledger.js";

export interface Workspace {
  /** Absolute path of the workspace/project root. */
  root: string;
  name: string;
  packageJson: Record<string, unknown>;
  /** Glob patterns from the root package.json workspaces field. */
  workspaceGlobs: string[];
}

const PROJECT_MARKERS = [
  "package.json",
  "pyproject.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
] as const;

export function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);

  // Walk upward until we find a project marker or hit the filesystem root.
  // The loop is guaranteed to terminate because path.dirname("C:\") === "C:\"
  // (and path.dirname("/") === "/"), so dir stops changing at the root.
  while (true) {
    for (const marker of PROJECT_MARKERS) {
      if (existsSync(join(dir, marker))) return dir;
    }
    const parent = pathDirname(dir);
    if (parent === dir) return null; // reached the filesystem root
    dir = parent;
  }
}

export function discoverWorkspace(rootDir: string): Workspace | null {
  const root = findProjectRoot(rootDir);
  if (!root) return null;

  let pkg: Record<string, unknown> = {};
  // ABSENT is not DEGRADED. A Python, Java, Go or Rust repository has no
  // package.json at all, and "no manifest" is a normal repository shape, not
  // a failure — counting it would mark every non-Node project partial. Only a
  // manifest that EXISTS and cannot be read or parsed is a degradation, so
  // the existence check is the discriminator, not the exception.
  const manifestPath = join(root, "package.json");
  if (existsSync(manifestPath)) {
    try {
      pkg = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
        string,
        unknown
      >;
    } catch {
      // Counted, and the consequence is specific rather than general: the
      // `workspaces` field lives in this file, so an unreadable manifest
      // yields `workspaceGlobs: []`, and the walk then covers the ROOT
      // package only. A monorepo scan silently narrowed to one package is a
      // smaller scan that reports itself as the whole thing — the exact
      // shape this program exists to delete.
      recordDegradation("workspace-manifest-unreadable");
    }
  }

  const rawWorkspaces = pkg["workspaces"];
  let globs: string[] = [];
  if (Array.isArray(rawWorkspaces)) {
    globs = rawWorkspaces.filter((w): w is string => typeof w === "string");
  } else if (
    rawWorkspaces &&
    typeof rawWorkspaces === "object" &&
    Array.isArray((rawWorkspaces as { packages?: unknown }).packages)
  ) {
    globs = (rawWorkspaces as { packages: unknown[] }).packages.filter(
      (w): w is string => typeof w === "string",
    );
  }

  return {
    root,
    name: typeof pkg["name"] === "string" ? pkg["name"] : basename(root),
    packageJson: pkg,
    workspaceGlobs: globs,
  };
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  // split() of any string yields at least one element.
  return parts[parts.length - 1] as string;
}
