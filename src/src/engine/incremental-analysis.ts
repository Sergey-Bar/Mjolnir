/**
 * Incremental Analysis (ECO-004).
 *
 * Content-hash-based file change detection for incremental scans.
 * Computes which files changed between two snapshots and verifies
 * whether an incremental run is safe (no semantic input changes missed).
 *
 * TI-005: incremental/full equivalence contract — when
 * `isIncrementalSafe` returns true, a re-scan of only the changed files
 * MUST produce the same aggregate verdict as a full scan.
 */

import { createHash } from "node:crypto";

export type FileChangeState = "added" | "modified" | "deleted" | "unchanged";

export interface IncrementalConfig {
  cacheDir: string;
  contentHashing: boolean;
}

export interface FileSnapshot {
  path: string;
  content: string;
}

export interface ChangedFile {
  path: string;
  state: FileChangeState;
  previousHash?: string;
  currentHash?: string;
}

/**
 * SHA-256 hex digest of file content.
 */
export function computeContentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Compare two file snapshots by content hash to determine which files
 * changed. Returns a list of ChangedFile entries for every file that
 * differs between snapshots (added, modified, deleted).
 */
export function computeChangedFiles(
  currentSnapshot: ReadonlyArray<FileSnapshot>,
  previousSnapshot: ReadonlyArray<FileSnapshot>,
): ChangedFile[] {
  const prevMap = new Map<string, string>();
  for (const f of previousSnapshot) {
    prevMap.set(f.path, computeContentHash(f.content));
  }

  const currMap = new Map<string, string>();
  for (const f of currentSnapshot) {
    currMap.set(f.path, computeContentHash(f.content));
  }

  const changed: ChangedFile[] = [];

  for (const [path, currHash] of currMap) {
    const prevHash = prevMap.get(path);
    if (prevHash === undefined) {
      changed.push({ path, state: "added", currentHash: currHash });
    } else if (prevHash !== currHash) {
      changed.push({
        path,
        state: "modified",
        previousHash: prevHash,
        currentHash: currHash,
      });
    }
  }

  for (const [path, prevHash] of prevMap) {
    if (!currMap.has(path)) {
      changed.push({ path, state: "deleted", previousHash: prevHash });
    }
  }

  changed.sort((a, b) => a.path.localeCompare(b.path));
  return changed;
}

/**
 * Semantic inputs that affect the full scan beyond individual file content.
 * If any of these changed, an incremental run is NOT safe — a full scan
 * is required for equivalence (TI-005).
 */
const SEMANTIC_INPUT_PATTERNS = [
  "mjolnir.config",
  ".mjolnirignore",
  "package.json",
  "tsconfig",
  "vitest.config",
  "jest.config",
  "playwright.config",
];

/**
 * Verify whether an incremental scan is safe. Returns true when ONLY
 * regular source/test files changed and no semantic config inputs were
 * touched. When false, the caller must fall back to a full scan.
 *
 * TI-005 contract: incremental safety is a prerequisite for equivalence.
 * A safe incremental run re-scans only changed files and merges their
 * results with cached verdicts for unchanged files — the aggregate must
 * match a full scan byte-for-byte.
 */
export function isIncrementalSafe(changedFiles: ReadonlyArray<ChangedFile>): {
  safe: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  for (const f of changedFiles) {
    const lower = f.path.toLowerCase().replace(/\\/g, "/");
    for (const pattern of SEMANTIC_INPUT_PATTERNS) {
      if (lower.includes(pattern)) {
        reasons.push(
          `semantic input changed: ${f.path} matches "${pattern}" pattern`,
        );
      }
    }
  }

  return { safe: reasons.length === 0, reasons };
}
