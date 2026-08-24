/**
 * Repository discovery (Sprint-Plan W1-03).
 * Finds project root, parses package.json, detects npm/yarn/pnpm workspaces.
 * Monorepo depth beyond workspaces is a documented launch cut (§29.1).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname as pathDirname, join, parse, resolve } from 'node:path';

export interface Workspace {
  /** Absolute path of the workspace/project root. */
  root: string;
  name: string;
  packageJson: Record<string, unknown>;
  /** Glob patterns from the root package.json workspaces field. */
  workspaceGlobs: string[];
}

export function findProjectRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  // parse().root gives "C:\" on Windows and "/" on POSIX.
  const fsRoot = parse(dir).root;

  // Walk upward until we find a package.json or hit the filesystem root.
  // The loop is guaranteed to terminate because path.dirname("C:\") === "C:\"
  // (and path.dirname("/") === "/"), so dir stops changing at the root.
  while (true) {
    if (existsSync(join(dir, 'package.json'))) return dir;
    const parent = pathDirname(dir);
    if (parent === dir) return null; // reached the filesystem root
    dir = parent;
  }
}

export function discoverWorkspace(rootDir: string): Workspace | null {
  const root = findProjectRoot(rootDir);
  if (!root) return null;

  let pkg: Record<string, unknown> = {};
  try {
    pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<string, unknown>;
  } catch {
    // Unreadable package.json — still scan, but with no metadata.
  }

  const rawWorkspaces = pkg['workspaces'];
  let globs: string[] = [];
  if (Array.isArray(rawWorkspaces)) {
    globs = rawWorkspaces.filter((w): w is string => typeof w === 'string');
  } else if (
    rawWorkspaces &&
    typeof rawWorkspaces === 'object' &&
    Array.isArray((rawWorkspaces as { packages?: unknown }).packages)
  ) {
    globs = ((rawWorkspaces as { packages: unknown[] }).packages).filter(
      (w): w is string => typeof w === 'string',
    );
  }

  return {
    root,
    name: typeof pkg['name'] === 'string' ? (pkg['name'] as string) : basename(root),
    packageJson: pkg,
    workspaceGlobs: globs,
  };
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] ?? p;
}
