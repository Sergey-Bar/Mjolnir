/**
 * Absolute-path git resolution (audit S1).
 *
 * `execFileSync("git", …)` resolves through PATH — including the CWD on
 * Windows (CreateProcess searches the current directory before PATH for
 * extension-less names depending on NoDefaultCurrentDirectoryInExePath).
 * Scanning an UNTRUSTED repo therefore let a checked-in `git.exe` (or
 * `git.bat`/`git.cmd`) hijack Mjölnir's own git invocations: the attacker
 * controls the diff output, the merge-base decision, and
 * `--scope changed`'s "what is new" answer — the exact data CI gates on.
 *
 * The fix: resolve git ONCE per process to an ABSOLUTE path by walking
 * the PATH directly (never consulting the CWD), verify the candidate is
 * an existing file, and pass that path to execFileSync. Resolution is
 * memoized; a failure to find a real git anywhere on PATH degrades to
 * the plain name (previous behavior) with the resolution error recorded
 * — degraded git data already means full-file attribution, never a
 * crash.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

let resolvedGit: string | null | undefined = undefined;
let resolutionError: string | undefined;

/**
 * The absolute path of the git binary Mjölnir will invoke, or null when
 * PATH carries no executable `git` at all (S1 degradation: callers fall
 * back to the bare name and their own try/catch — same honest degrade
 * as before, minus the CWD-hijack surface).
 */
export function resolveGitPath(): string | null {
  if (resolvedGit !== undefined) return resolvedGit;
  const exe = process.platform === "win32" ? "git.exe" : "git";
  // PATHEXT extensions on Windows (git.bat/git.cmd are equally hijackable
  // when invoked bare from an attacker's CWD).
  const candidates = [exe];
  if (process.platform === "win32") {
    const pathExt = process.env["PATHEXT"]?.split(";").filter(Boolean) ?? [];
    for (const ext of pathExt) {
      candidates.push(`git${ext.toLowerCase()}`);
    }
  }
  const pathValue = process.env["PATH"] ?? "";
  for (const dir of pathValue.split(delimiter)) {
    if (dir === "") continue;
    if (!isAbsolute(dir)) continue; // a relative PATH entry IS a CWD anchor
    for (const candidate of candidates) {
      const full = join(dir, candidate);
      try {
        if (existsSync(full)) {
          resolvedGit = full;
          return resolvedGit;
        }
      } catch {
        // unreadable PATH entry — skip it
      }
    }
  }
  resolutionError = `no executable "git" found on PATH (${pathValue.length} chars scanned)`;
  resolvedGit = null;
  return resolvedGit;
}

/** The recorded resolution error, for diagnostics (empty when resolved). */
export function gitResolutionError(): string | undefined {
  return resolutionError;
}

/** Test hook: forget the memoized resolution. */
export function _resetGitResolutionForTests(): void {
  resolvedGit = undefined;
  resolutionError = undefined;
}

export interface GitRunOptions {
  cwd: string;
  timeoutMs?: number;
}

/**
 * Run git with the S1-resolved absolute binary path. Returns stdout, or
 * null when git is missing or the command fails — the same contract as
 * the previous inline `git()` helpers, with the hijack surface closed.
 */
export function runGit(root: string, args: string[]): string | null {
  const exe = resolveGitPath() ?? "git";
  try {
    return execFileSync(exe, ["-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 15_000,
    });
  } catch {
    return null;
  }
}
