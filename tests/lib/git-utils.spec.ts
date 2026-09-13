import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { currentCommit } from "../../src/lib/git-utils.js";
import { _resetGitResolutionForTests } from "../../src/scope/git-resolve.js";

describe("currentCommit", () => {
  let tempDir: string;

  afterEach(() => {
    _resetGitResolutionForTests();
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns HEAD commit hash in a git repo", () => {
    tempDir = mkdtempSync(join(tmpdir(), "git-utils-"));
    execFileSync("git", ["init"], { cwd: tempDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], {
      cwd: tempDir,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tempDir });
    execFileSync("git", ["commit", "--allow-empty", "-m", "init"], {
      cwd: tempDir,
    });
    const commit = currentCommit(tempDir);
    expect(commit).not.toBeNull();
    expect(commit).toMatch(/^[0-9a-f]{40}$/);
  });

  it("returns 'unknown' (non-nullable default) for non-git directory", () => {
    tempDir = mkdtempSync(join(tmpdir(), "git-utils-no-git-"));
    const commit = currentCommit(tempDir);
    expect(commit).toBe("unknown");
  });

  it("returns null when nullable option is set for non-git directory", () => {
    tempDir = mkdtempSync(join(tmpdir(), "git-utils-nullable-"));
    const commit = currentCommit(tempDir, { nullable: true });
    expect(commit).toBeNull();
  });

  it("trims whitespace from commit hash", () => {
    tempDir = mkdtempSync(join(tmpdir(), "git-utils-trim-"));
    execFileSync("git", ["init"], { cwd: tempDir });
    execFileSync("git", ["config", "user.email", "test@test.com"], {
      cwd: tempDir,
    });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tempDir });
    execFileSync("git", ["commit", "--allow-empty", "-m", "init"], {
      cwd: tempDir,
    });
    const commit = currentCommit(tempDir);
    expect(commit).not.toMatch(/\s/);
  });
});
