/**
 * Build identity, as distinct from the published version.
 *
 * `ENGINE_VERSION` answers "what should I install?" and only moves when
 * something is published. `BUILD_ID` answers "what exactly ran?" and moves on
 * every commit. The test exists because the second is only useful if it is
 * true: a build identity that drifts from the checkout is worse than none,
 * because it looks like evidence.
 */
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import {
  BUILD_ID,
  ENGINE_VERSION,
  buildIdFrom,
  type GitQuery,
} from "../../src/engine/version.js";

const sha12 = /^[0-9a-f]{12}(?:-dirty)?$/;

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

describe("build identity, given a git that answers", () => {
  it("is the short commit hash when the tree is clean", () => {
    const runner: GitQuery = (args) =>
      args[0] === "rev-parse" ? "abc123abc123" : "";
    expect(buildIdFrom(runner)).toBe("abc123abc123");
  });

  it("is suffixed when the tree is not clean", () => {
    const runner: GitQuery = (args) =>
      args[0] === "rev-parse" ? "abc123abc123" : " M src/a.ts";
    expect(buildIdFrom(runner)).toBe("abc123abc123-dirty");
  });

  it("is undefined when the commit cannot be read", () => {
    // An npm install has no .git, and `rev-parse` outside a checkout exits
    // non-zero. Absence is the answer; a guess is not.
    expect(buildIdFrom(() => "")).toBeUndefined();
    expect(buildIdFrom(() => undefined)).toBeUndefined();
  });

  it("claims dirty rather than clean when the status query fails", () => {
    // The asymmetry is the point. If `status` cannot be read we do NOT treat
    // the tree as clean: a clean-looking hash off a failed query is a hash
    // that will not reproduce.
    const runner: GitQuery = (args) =>
      args[0] === "rev-parse" ? "abc123abc123" : undefined;
    expect(buildIdFrom(runner)).toBe("abc123abc123-dirty");
  });
});

describe("build identity, in this checkout", () => {
  it("is a short commit hash, suffixed when the tree is not clean", () => {
    if (BUILD_ID === undefined) return; // non-git environment
    expect(BUILD_ID).toMatch(sha12);
  });

  it("names the commit it was built from", () => {
    if (BUILD_ID === undefined) return; // non-git environment
    const expected = git(["rev-parse", "--short=12", "HEAD"]);
    const dirty = git(["status", "--porcelain"]).length > 0;
    expect(BUILD_ID).toBe(dirty ? `${expected}-dirty` : expected);
  });

  it("is a different question from the version, and does not move with it", () => {
    // The point of having both. The version is a release coordinate; the build
    // is a commit coordinate. Asserting the shapes differ is what stops a
    // future change from quietly collapsing one into the other.
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+(-rc\.\d+)?$/);
    if (BUILD_ID !== undefined) {
      expect(BUILD_ID).not.toBe(ENGINE_VERSION);
    }
  });

  it("does not put a build identity into a published surface", () => {
    // `package.json` is the npm coordinate. A build hash in it would mean a
    // different artifact on every commit, which is the opposite of a version.
    const pkg = JSON.parse(
      execFileSync(
        "node",
        ["-p", "JSON.stringify(require('./package.json'))"],
        { encoding: "utf8", maxBuffer: 1 << 24 },
      ),
    ) as Record<string, unknown>;
    expect(Object.keys(pkg)).not.toContain("buildId");
    expect(Object.keys(pkg)).not.toContain("gitHead");
  });
});
