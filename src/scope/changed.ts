/**
 * Changed-scope engine (Sprint-Plan W6, Product-MVP §9 `--scope changed`).
 *
 * Compares the current branch against its merge-base and reports only
 * findings on NEW/CHANGED lines. Handles: new files, modified files,
 * renames (treated as modified), shallow clones (graceful fallback to
 * full-file attribution), and detached HEAD.
 *
 * Audits H-9/H-10: the changed-file predicate is derived from the real
 * adapter registry (isKnownTestFile) so Python, Java, C#, and workflow
 * changes are not silently dropped; the default base falls back
 * main → master → origin/HEAD, an explicit --base is honored, and the
 * WORKING TREE (uncommitted + untracked files) is included so running
 * locally before committing still sees the change.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { LIMITS } from "../discovery/ignores.js";
import { isKnownTestFile } from "../discovery/scan-adapters.js";
import type { Finding } from "../types.js";

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
    return execFileSync("git", ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15_000,
    });
  } catch {
    return null;
  }
}

/** Candidates for the default base branch, in fallback order (H-10). */
const DEFAULT_BASE_CANDIDATES = [
  "main",
  "master",
  "origin/main",
  "origin/master",
  "origin/HEAD",
] as const;

function resolveMergeBase(root: string, baseBranch?: string): string | null {
  const candidates = baseBranch
    ? [baseBranch, `origin/${baseBranch}`]
    : DEFAULT_BASE_CANDIDATES;
  for (const candidate of candidates) {
    const mergeBase = git(root, ["merge-base", "HEAD", candidate])?.trim();
    if (mergeBase) return mergeBase;
  }
  return null;
}

/** Parse `git diff --name-status -z` output → changed file paths. */
function collectNameStatus(output: string): string[] {
  const entries = output.split("\0").filter(Boolean);
  const files: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    const status = entries[i];
    if (status === "R" || status === "C") i++; // old-path element
    const file = entries[i + 1];
    if (file && isKnownTestFile(file)) files.push(file);
  }
  return files;
}

export function computeChangedScope(
  root: string,
  baseBranch?: string,
): DiffResult {
  if (!existsSync(join(root, ".git"))) {
    return { changed: {}, degraded: true, reason: "not-a-git-repo" };
  }

  const mergeBase = resolveMergeBase(root, baseBranch);
  if (!mergeBase) {
    return { changed: {}, degraded: true, reason: "no-merge-base" };
  }

  const committed = git(root, [
    "diff",
    "--name-status",
    "-z",
    "--diff-filter=AMR",
    mergeBase,
    "HEAD",
  ]);
  if (committed === null) {
    return { changed: {}, degraded: true, reason: "diff-failed" };
  }

  // Working tree: staged + unstaged changes vs HEAD, plus untracked
  // files — a local run before `git add`/`git commit` must not report
  // nothing (H-10).
  const workingTree = git(root, [
    "diff",
    "--name-status",
    "-z",
    "--diff-filter=AMR",
    "HEAD",
  ]);
  if (workingTree === null) {
    return { changed: {}, degraded: true, reason: "diff-failed" };
  }
  const untracked = git(root, [
    "ls-files",
    "-z",
    "--others",
    "--exclude-standard",
  ]);
  if (untracked === null) {
    return { changed: {}, degraded: true, reason: "diff-failed" };
  }

  const untrackedSet = new Set(
    untracked.split("\0").filter((f) => f && isKnownTestFile(f)),
  );

  const changedFiles = [
    ...new Set([
      ...collectNameStatus(committed),
      ...collectNameStatus(workingTree),
      ...untrackedSet,
    ]),
  ].sort();

  const changed: ChangedLines = {};
  for (const file of changedFiles) {
    const committedDiff = git(root, [
      "diff",
      "--unified=0",
      mergeBase,
      "HEAD",
      "--",
      file,
    ]);
    const workingDiff = git(root, ["diff", "--unified=0", "HEAD", "--", file]);
    const lines = parseChangedLines(
      `${committedDiff ?? ""}\n${workingDiff ?? ""}`,
    );
    if (untrackedSet.has(file)) {
      const all = allLinesOf(root, file);
      if (all === null) {
        return {
          changed: {},
          degraded: true,
          reason: "untracked-file-unreadable",
        };
      }
      for (const l of all) lines.add(l);
    }
    changed[file] = lines;
  }

  return { changed, degraded: false };
}

/** Every 1-based line number of an untracked file (it is all new). */
function allLinesOf(root: string, file: string): number[] | null {
  const full = join(root, file);
  try {
    if (statSync(full).size > LIMITS.maxFileBytes) return null;
    const lineCount = readFileSync(full, "utf8").split("\n").length;
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  } catch {
    return null;
  }
}

/** Parse unified diff → line numbers ADDED in the new version. */
export function parseChangedLines(diff: string): Set<number> {
  const lines = new Set<number>();
  let newLine = 0;
  for (const raw of diff.split("\n")) {
    const hunk = /^@@\s*-\d+(?:,\d+)?\s*\+(\d+)(?:,(\d+))?\s*@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (newLine === 0) continue; // still in file header
    if (raw.startsWith("+")) {
      lines.add(newLine);
      newLine++;
    } else if (raw.startsWith("-")) {
      // removed line — does not advance newLine
    } else {
      newLine++; // context line
    }
  }
  return lines;
}

/** Filter findings to those touching changed lines (or all, when degraded). */
export function filterToChanged(
  findings: Finding[],
  diff: DiffResult,
): Finding[] {
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
