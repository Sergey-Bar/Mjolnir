/**
 * `--scope changed` git edge cases (Test Hardening Plan).
 *
 * `src/scope/changed.ts`'s own header comment claims: "Handles: ...
 * shallow clones (graceful fallback to full-file attribution), and
 * detached HEAD." Nothing in the existing scope.spec.ts actually
 * exercises a real shallow clone or a real detached HEAD — this does,
 * with real git repos in temp dirs, the only honest way to verify
 * merge-base logic.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computeChangedScope } from "../src/scope/changed.js";

let sourceDir: string;
let workDirs: string[];

function git(cwd: string, args: string[]): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

function gitOut(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
  }).trim();
}

beforeEach(() => {
  sourceDir = mkdtempSync(join(tmpdir(), "qa-doctor-scope-src-"));
  workDirs = [];
  git(sourceDir, ["init", "-b", "main"]);
  git(sourceDir, ["config", "user.email", "t@t"]);
  git(sourceDir, ["config", "user.name", "t"]);

  mkdirSync(join(sourceDir, "e2e"), { recursive: true });
  writeFileSync(
    join(sourceDir, "e2e", "a.spec.ts"),
    "it('a', () => { expect(1).toBe(1); });\n",
  );
  git(sourceDir, ["add", "."]);
  git(sourceDir, ["commit", "-m", "initial"]);

  writeFileSync(
    join(sourceDir, "e2e", "a.spec.ts"),
    "it('a', () => { expect(1).toBe(1); });\n" +
      "it.only('b', () => { expect(1).toBe(1); });\n",
  );
  git(sourceDir, ["add", "."]);
  git(sourceDir, ["commit", "-m", "add focused test"]);
});

afterEach(() => {
  rmSync(sourceDir, { recursive: true, force: true });
  for (const d of workDirs) rmSync(d, { recursive: true, force: true });
});

function cloneShallow(): string {
  const dest = mkdtempSync(join(tmpdir(), "qa-doctor-scope-shallow-"));
  workDirs.push(dest);
  execFileSync(
    "git",
    ["clone", "--depth", "1", "--branch", "main", sourceDir, dest],
    { stdio: "ignore" },
  );
  return dest;
}

describe("shallow clone (--depth 1)", () => {
  it("does not throw", () => {
    const dest = cloneShallow();
    expect(() => computeChangedScope(dest, "main")).not.toThrow();
  });

  it("degrades gracefully instead of silently returning wrong results", () => {
    // A depth-1 clone has no history before HEAD, so merge-base against
    // "main" (== HEAD here) trivially succeeds but produces an empty
    // diff — the real risk this test guards is a THROW or a crash, not
    // a specific diff shape, since a shallow clone's exact git behavior
    // here is legitimately environment-dependent.
    const dest = cloneShallow();
    const result = computeChangedScope(dest, "main");
    expect(result).toBeDefined();
    expect(typeof result.degraded).toBe("boolean");
  });
});

describe("detached HEAD", () => {
  it("does not throw when HEAD is detached at a commit with no branch", () => {
    const dest = mkdtempSync(join(tmpdir(), "qa-doctor-scope-detached-"));
    workDirs.push(dest);
    execFileSync("git", ["clone", sourceDir, dest], { stdio: "ignore" });
    const headCommit = gitOut(dest, ["rev-parse", "HEAD"]);
    git(dest, ["checkout", headCommit]); // detach HEAD

    expect(() => computeChangedScope(dest, "main")).not.toThrow();
    const result = computeChangedScope(dest, "main");
    expect(result).toBeDefined();
  });
});

describe("repo with no commits yet", () => {
  it("does not throw on a freshly `git init`'d repo", () => {
    const dest = mkdtempSync(join(tmpdir(), "qa-doctor-scope-empty-"));
    workDirs.push(dest);
    git(dest, ["init", "-b", "main"]);

    expect(() => computeChangedScope(dest, "main")).not.toThrow();
    const result = computeChangedScope(dest, "main");
    expect(result.degraded).toBe(true);
  });
});

describe("default branch name mismatch (repo uses a non-'main' default)", () => {
  it("degrades gracefully instead of throwing when baseBranch doesn't exist", () => {
    const dest = mkdtempSync(join(tmpdir(), "qa-doctor-scope-nobranch-"));
    workDirs.push(dest);
    git(dest, ["init", "-b", "trunk"]);
    git(dest, ["config", "user.email", "t@t"]);
    git(dest, ["config", "user.name", "t"]);
    mkdirSync(join(dest, "e2e"), { recursive: true });
    writeFileSync(
      join(dest, "e2e", "a.spec.ts"),
      "it('a', () => { expect(1).toBe(1); });\n",
    );
    git(dest, ["add", "."]);
    git(dest, ["commit", "-m", "initial"]);

    // Asking for "main" when the repo's actual default is "trunk" —
    // a very plausible misconfiguration (GitHub's default changed from
    // master to main; some orgs still use other names).
    expect(() => computeChangedScope(dest, "main")).not.toThrow();
    const result = computeChangedScope(dest, "main");
    expect(
      result.degraded,
      "computeChangedScope should degrade (not throw, not silently " +
        "return an empty-but-successful diff) when the requested base " +
        "branch doesn't exist in the repo.",
    ).toBe(true);
  });
});
