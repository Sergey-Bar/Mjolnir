/**
 * Engine version, as a leaf module: `runIdentity` (R4c) needs the engine
 * version inside scan-pipeline WITHOUT importing cli.ts (a cycle — cli
 * imports the pipeline). The literal follows the same discipline as
 * CLI_VERSION and SARIF's driver.version: kept in sync on release by
 * scripts/archive/sync-sarif-version.cjs (archived; superseded by the release
 * workflow's own version stamping) and guarded by the version-consistency
 * spec. cli.ts re-exports this as CLI_VERSION.
 */
import { execFileSync } from "node:child_process";
import { resolveGitPath } from "../scope/git-resolve.js";

export const ENGINE_VERSION = "5.0.0";

/**
 * Build identity — WHICH BUILD IS RUNNING, as distinct from WHICH RELEASE IS
 * PUBLISHED.
 *
 * These are two different questions and conflating them is what makes a bug
 * unreproducible. `ENGINE_VERSION` answers "what should I install?", and it is
 * the npm coordinate, so it only moves when something is published. This
 * answers "what exactly ran?", and it moves on every commit.
 *
 * A version number cannot do that job. Three local builds all called 5.0.0,
 * two of them different code, and a bug report saying "I'm on 5.0.0" identifies
 * nothing. A short commit hash identifies the build exactly, survives being
 * written into a report, and can be handed to `git show` with no ceremony —
 * which is the point: git already tracks this, and duplicating it in a
 * hand-maintained counter would only create a second thing to keep in sync.
 *
 * The value is resolved at runtime from git, so it cannot drift from the
 * checkout. When there is no git — an npm install, a packed tarball — this is
 * `undefined` rather than a guess, because a build identity that is invented is
 * worse than none: it looks like evidence and is not.
 */
export const BUILD_ID: string | undefined = resolveBuildId();

/** What `runGit` must do: answer a git query, or `undefined` if it cannot. */
export type GitQuery = (args: string[]) => string | undefined;

/**
 * The decision, with the process boundary already behind `runGit`.
 *
 * Separated so every branch is reachable from a test: a runner that throws and
 * a runner that answers are both things that happen, and both are what this
 * function exists to survive. What it must never do is invent an answer.
 */
export function buildIdFrom(runGit: GitQuery): string | undefined {
  const sha = runGit(["rev-parse", "--short=12", "HEAD"]);
  if (!sha) return undefined;
  // An unstaged or staged change means the build is not the commit it claims
  // to be. Saying so is the whole value: a clean-looking hash on a dirty tree
  // is a hash that will not reproduce.
  const status = runGit(["status", "--porcelain"]);
  // `undefined` and `""` are not the same answer, and collapsing them is the
  // bug this branch exists to catch. `""` is a clean tree, measured. `undefined`
  // is a query that failed, unmeasured — and an unmeasured tree must not be
  // reported as a clean one.
  if (status === undefined) return `${sha}-dirty`;
  return status ? `${sha}-dirty` : sha;
}

function resolveBuildId(): string | undefined {
  // The ABSOLUTE path, never the bare name. On Windows `CreateProcess` searches
  // the current directory before PATH, so a `git.exe` or `git.bat` sitting in
  // an untrusted checkout would answer `rev-parse` with whatever it liked and
  // this function would print it as a build identity.
  const git = resolveGitPath();
  if (!git) return undefined;
  const runGit: GitQuery = (args) => {
    try {
      return execFileSync(git, args, {
        encoding: "utf8",
        timeout: 2_000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return undefined;
    }
  };
  return buildIdFrom(runGit);
}
