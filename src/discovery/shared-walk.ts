/**
 * Shared directory walker (audit P-2).
 *
 * One traversal implementation for every language adapter, replacing
 * four near-identical walkers. Two optimizations over the old code:
 *   - compiled ignore regexes arrive via the per-scan IgnoreMatcher
 *     (previously recompiled per pattern per path, per walk);
 *   - the lint-fixture directory probe (readdirSync per directory) is
 *     memoized across ALL walks of one scan via the shared memo map.
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { isLintFixtureDir, LIMITS, type IgnoreMatcher } from "./ignores.js";

export interface SharedWalkOptions {
  root: string;
  deadline: number;
  ignoreMatcher: IgnoreMatcher;
  onSkipped: () => void;
  onTruncated: (reason: string) => void;
  /** Directory names never entered (dependency/output dirs per adapter). */
  skipDirs: readonly string[];
  isTestFile: (name: string) => boolean;
  onTestFile: (absPath: string) => void;
  /**
   * True when discovery for this walk is complete (per-adapter file cap)
   * — checked at each directory entry so a full bucket stops traversal.
   */
  isFull: () => boolean;
  /** Memo map shared across every walk of one scan (audit P-2). */
  fixtureDirMemo: Map<string, boolean>;
}

export function sharedWalk(options: SharedWalkOptions): void {
  const walk = (dir: string): void => {
    if (Date.now() > options.deadline) {
      options.onTruncated("deadline");
      return;
    }
    if (options.isFull()) {
      options.onTruncated("file-cap");
      return;
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = full.slice(options.root.length + 1).replaceAll("\\", "/");
      if (options.ignoreMatcher.isIgnored(rel)) continue;
      // Symlinks are never followed: a link can point outside the repo
      // (scanning files we have no business reading) or create cycles.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (options.skipDirs.includes(entry.name)) continue;
        if (rel.split("/").length > LIMITS.maxDepth) continue;
        let fixture = options.fixtureDirMemo.get(full);
        if (fixture === undefined) {
          fixture = isLintFixtureDir(full);
          options.fixtureDirMemo.set(full, fixture);
        }
        if (fixture) continue;
        walk(full);
      } else if (entry.isFile() && options.isTestFile(entry.name)) {
        try {
          if (statSync(full).size <= LIMITS.maxFileBytes)
            options.onTestFile(full);
        } catch {
          options.onSkipped();
        }
      }
    }
  };
  walk(options.root);
}
