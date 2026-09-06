/**
 * S1 trust-boundary spec (audit M2, blueprint G-06 lineage): git must
 * resolve to an ABSOLUTE path found directly on PATH — never through
 * the CWD, where a hostile repo can plant git.exe/git.bat/git.cmd.
 *
 * Covers the resolution arms of src/scope/git-resolve.ts: the memoized
 * walk (absolute-only), the PATH-entry guards (empty/relative entries
 * are skipped — they anchor to the CWD), the honest null degrade when
 * no git exists on PATH, the recorded resolution error, and runGit's
 * null-on-failure contract.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  _resetGitResolutionForTests,
  gitResolutionError,
  resolveGitPath,
  runGit,
} from "../../src/scope/git-resolve.js";

const createdDirs: string[] = [];
const envSnapshot: Record<string, string | undefined> = {};

function tmpDir(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-gitresolve-${prefix}-`));
  createdDirs.push(d);
  return d;
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
  for (const [k, v] of Object.entries(envSnapshot)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.unstubAllGlobals();
  _resetGitResolutionForTests();
});

function withEnv(name: string, value: string | undefined): void {
  if (!(name in envSnapshot)) envSnapshot[name] = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe("S1: absolute-path git resolution", () => {
  it("resolves an absolute git.exe/git inside a PATH dir it controls", () => {
    _resetGitResolutionForTests();
    const fake = tmpDir("found");
    const exe = process.platform === "win32" ? "git.exe" : "git";
    writeFileSync(join(fake, exe), "not really git");
    withEnv(
      "PATH",
      process.platform === "win32" ? `C:\\nope;${fake}` : `/nope:${fake}`,
    );
    withEnv("PATHEXT", process.platform === "win32" ? ".COM;.EXE" : undefined);
    const resolved = resolveGitPath();
    expect(resolved).toBe(join(fake, exe));
    // A resolved path is absolute and carries no error.
    expect(gitResolutionError()).toBeUndefined();
  });

  it("skips empty and relative PATH entries (they anchor to the CWD)", () => {
    _resetGitResolutionForTests();
    const fake = tmpDir("skips");
    const exe = process.platform === "win32" ? "git.exe" : "git";
    writeFileSync(join(fake, exe), "x");
    // "" (empty entry) and "relative/dir" are both CWD-anchored and must
    // be skipped; the only absolute entry wins.
    withEnv(
      "PATH",
      process.platform === "win32" ? `;rel\\dir;${fake}` : `:rel/dir:${fake}`,
    );
    const resolved = resolveGitPath();
    expect(resolved).toBe(join(fake, exe));
  });

  it("honors the POSIX candidate name when the process looks non-Windows", () => {
    _resetGitResolutionForTests();
    const fake = tmpDir("posix");
    writeFileSync(join(fake, "git"), "x");
    vi.stubGlobal("process", { ...process, platform: "linux" });
    withEnv("PATH", fake);
    withEnv("PATHEXT", undefined);
    _resetGitResolutionForTests();
    expect(resolveGitPath()).toBe(join(fake, "git"));
  });

  it("walks PATHEXT candidates when the process looks Windows-like", () => {
    _resetGitResolutionForTests();
    const fake = tmpDir("pathext-any");
    writeFileSync(join(fake, "git.bat"), "x");
    vi.stubGlobal("process", { ...process, platform: "win32" });
    withEnv("PATH", fake);
    withEnv("PATHEXT", ".COM;.BAT;.CMD");
    _resetGitResolutionForTests();
    expect(resolveGitPath()).toBe(join(fake, "git.bat"));
  });

  it("treats a missing PATH as an empty scan (no git, recorded error)", () => {
    _resetGitResolutionForTests();
    withEnv("PATH", undefined);
    expect(resolveGitPath()).toBeNull();
    expect(gitResolutionError()).toContain("no executable");
  });

  it("degrades to null with a recorded error when PATH has no git", () => {
    _resetGitResolutionForTests();
    const empty = tmpDir("empty");
    mkdirSync(join(empty, "sub"), { recursive: true });
    withEnv("PATH", empty);
    expect(resolveGitPath()).toBeNull();
    const e = gitResolutionError();
    expect(e).toContain("no executable");
    // Memoized: the second call agrees without re-walking.
    expect(resolveGitPath()).toBeNull();
  });

  it("runGit returns null on failure instead of throwing (honest degrade)", () => {
    _resetGitResolutionForTests();
    // A real git is on PATH in dev/CI; point PATH at an empty dir so the
    // exe falls back to the bare name, then an impossible -C target and a
    // failed command exercise the catch arm.
    const empty = tmpDir("runempty");
    withEnv("PATH", empty);
    const out = runGit("C:\\definitely\\not\\a\\repo", ["status"]);
    expect(out).toBeNull();
  });
});
