/**
 * Shared git utilities (Task 18). The `currentCommit` / `targetCommit`
 * pattern was duplicated between cli.ts and commands/trust-report.ts.
 * Single definition site.
 */
import { execFileSync } from "node:child_process";
import { resolveGitPath } from "../scope/git-resolve.js";

/**
 * Resolve the HEAD commit of a git repo. Returns `"unknown"` (or
 * `null` when `nullable` is true) when git is unavailable or the root
 * is not a repo. Uses the absolute git path (audit S1) so a hostile
 * repo cannot intercept the call.
 */
export function currentCommit(
  root: string,
  opts: { nullable?: boolean } = {},
): string | null {
  try {
    return execFileSync(
      resolveGitPath() ?? "git",
      ["-C", root, "rev-parse", "HEAD"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return opts.nullable ? null : "unknown";
  }
}
