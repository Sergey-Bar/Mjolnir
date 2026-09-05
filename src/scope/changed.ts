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
    // Bug-audit QA-2026-08-30 QA-9 (defense in depth): parseArgs rejects
    // `--base` values that look like git options, but a programmatic
    // caller could bypass it — a candidate like "--upload-pack=x" would
    // make git itself run an attacker-chosen command. Skip anything that
    // could parse as an option.
    if (candidate.startsWith("-")) continue;
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
    const status = entries[i] as string;
    // Bug-audit L1: with -z, git emits the status WITH its confidence
    // score for renames/copies (`R100`, `C75`) — an equality check
    // missed them, so the old-path element was consumed as the file and
    // stale old paths leaked into `changed`. Match the family.
    if (status.startsWith("R") || status.startsWith("C")) i++; // old-path element
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
        // Audit (changed.ts): ONE unreadable/oversized untracked file
        // degrades only that file — treat it as fully changed (every
        // line new, the honest superset) and keep walking. The old
        // early-return degraded the ENTIRE scope to full-file
        // attribution, silently discarding precise line data for every
        // other changed file because a single file could not be read.
        changed[file] = new Set(
          Array.from({ length: LIMITS_MAX_LINES }, (_, i) => i + 1),
        );
        continue;
      }
      for (const l of all) lines.add(l);
    }
    changed[file] = lines;
  }

  return { changed, degraded: false };
}

/** Sentinel size for "fully changed" — bounded, mirrors LIMITS.maxFileBytes scale. */
const LIMITS_MAX_LINES = 1_000_000;

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
  // Bug-audit L2: track hunk membership explicitly. Header lines of a
  // FOLLOWING file diff (`diff --git`, `+++ b/…`) and `\ No newline at
  // end of file` markers used to hit the context branch: `+++ b/…` even
  // ADDED a bogus line number, and markers advanced newLine — harmless
  // only by accident of the next @@ resetting it.
  let inHunk = false;
  let newCount = 0;
  // Audit (changed.ts): the header reset applies ONLY outside hunks.
  // Git never emits file headers mid-hunk, but hunk CONTENT can look
  // exactly like one: a source line `++ b/x` added by a hunk renders as
  // `+++ b/x`, and the old unconditional header check abandoned the
  // hunk mid-stream, dropping every later added line of that hunk.
  // Inside a hunk with new-side lines still expected, header-looking
  // lines are consumed as content.
  const headerRe =
    /^(?:diff --git |index |old mode |new mode |rename |copy |similarity |dissimilarity |--- |\+\+\+ )/;
  for (const raw of diff.split("\n")) {
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    const hunk = /^@@\s*-\d+(?:,\d+)?\s*\+(\d+)(?:,(\d+))?\s*@/.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      newCount = hunk[2] === undefined ? 1 : Number(hunk[2]);
      inHunk = true;
      continue;
    }
    if (!inHunk || newCount <= 0) {
      // Outside a hunk (or its new-side lines exhausted): everything is
      // file-header material — never advances, never adds. A following
      // file's diff header (`+++ b/…` starts with `+`) must never be
      // read as an added line.
      if (headerRe.test(raw)) inHunk = false;
      continue;
    }
    if (raw.startsWith("\\")) continue; // "\ No newline at end of file"
    if (raw.startsWith("+")) {
      lines.add(newLine);
      newLine++;
      newCount--;
    } else if (raw.startsWith("-")) {
      // removed line — does not advance newLine
    } else {
      // context line (git emits " "; hand-built diffs may use "")
      newLine++;
      newCount--;
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
