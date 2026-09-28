/**
 * Engine version, as a leaf module: `runIdentity` (R4c) needs the engine
 * version inside scan-pipeline WITHOUT importing cli.ts (a cycle — cli
 * imports the pipeline). The literal follows the same discipline as
 * CLI_VERSION and SARIF's driver.version: kept in sync on release by
 * scripts/sync-sarif-version.cjs and guarded by the version-consistency
 * spec. cli.ts re-exports this as CLI_VERSION.
 */
import { execFileSync } from "node:child_process";

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

function resolveBuildId(): string | undefined {
  const git = (args: string[]): string | undefined => {
    try {
      return execFileSync("git", args, {
        encoding: "utf8",
        timeout: 2_000,
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      return undefined;
    }
  };

  const sha = git(["rev-parse", "--short=12", "HEAD"]);
  if (!sha) return undefined;
  // An unstaged or staged change means the build is not the commit it claims
  // to be. Saying so is the whole value: a clean-looking hash on a dirty tree
  // is a hash that will not reproduce.
  const status = git(["status", "--porcelain"]);
  return status ? `${sha}-dirty` : sha;
}
