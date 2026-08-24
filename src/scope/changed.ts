/**
 * Changed-scope engine (Sprint-Plan W6, Product-MVP §9 `--scope changed`).
 *
 * Compares the current branch against its merge-base and reports only
 * findings on NEW/CHANGED lines. Handles: new files, modified files,
 * renames (treated as modified), shallow clones (graceful fallback to
 * full-file attribution), and detached HEAD.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Finding } from '../types.js';

export interface ChangedLines {
  /** repo-relative path → set of changed line numbers (1-based). */
  [file: string]: Set<number>;
}

export interface DiffResult {
  changed: ChangedLines;
  /** True when git data was unavailable — findings fall back to full files. */
  degraded: boolean;
  reason?: string;
}

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
    });
  } catch {
    return null;
  }
}

export function computeChangedScope(root: string, baseBranch = 'main'): DiffResult {
  if (!existsSync(join(root, '.git'))) {
    return { changed: {}, degraded: true, reason: 'not-a-git-repo' };
  }

  // Resolve merge-base; on shallow clones or detached HEAD this can fail.
  let mergeBase = git(root, ['merge-base', 'HEAD', baseBranch])?.trim();
  if (!mergeBase) {
    // Fallback: try origin/baseBranch, then just the branch itself.
    mergeBase =
      git(root, ['merge-base', 'HEAD', `origin/${baseBranch}`])?.trim() ??
      git(root, ['rev-parse', baseBranch])?.trim();
  }
  if (!mergeBase) {
    return { changed: {}, degraded: true, reason: 'no-merge-base' };
  }

  const nameStatus = git(root, [
    'diff',
    '--name-status',
    '-z',
    '--diff-filter=AMR',
    mergeBase,
    'HEAD',
  ]);
  if (nameStatus === null) {
    return { changed: {}, degraded: true, reason: 'diff-failed' };
  }

  const entries = nameStatus.split('\0').filter(Boolean);
  const changedFiles: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const status = entries[i];
    if (status === 'R') i++; // skip the old-path element of renames
    const file = entries[i + 1];
    if (file && /\.(spec|test)\.(ts|js|tsx|jsx|mjs|cjs)$/.test(file)) {
      changedFiles.push(file);
    }
  }

  const changed: ChangedLines = {};
  for (const file of changedFiles) {
    const unified = git(root, ['diff', '--unified=0', mergeBase, 'HEAD', '--', file]);
    changed[file] = parseChangedLines(unified ?? '');
  }

  return { changed, degraded: false };
}

/** Parse unified diff → line numbers ADDED in the new version. */
export function parseChangedLines(diff: string): Set<number> {
  const lines = new Set<number>();
  let newLine = 0;
  for (const raw of diff.split('\n')) {
    const hunk = /^@@\s*-\d+(?:,\d+)?\s*\+(\d+)(?:,(\d+))?\s*@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (newLine === 0) continue; // still in file header
    if (raw.startsWith('+')) {
      lines.add(newLine);
      newLine++;
    } else if (raw.startsWith('-')) {
      // removed line — does not advance newLine
    } else {
      newLine++; // context line
    }
  }
  return lines;
}

/** Filter findings to those touching changed lines (or all, when degraded). */
export function filterToChanged(findings: Finding[], diff: DiffResult): Finding[] {
  if (diff.degraded) return findings;
  return findings.filter((f) => {
    const lines = diff.changed[f.file];
    if (!lines) return false; // file unchanged → pre-existing debt
    // A finding counts as "new" if its line, or any line within a small
    // context window above it (multi-line statements), is changed.
    for (let l = Math.max(1, f.line - 3); l <= f.line; l++) {
      if (lines.has(l)) return true;
    }
    return false;
  });
}
