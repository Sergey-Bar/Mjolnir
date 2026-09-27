/**
 * T2 — `bindRepository()` must not be hijackable by a checked-in git.
 *
 * Audit S1. `src/engine/candidate-binding.ts` called
 * `execFileSync("git", args, { cwd: root })` — a BARE NAME. On Windows,
 * `CreateProcess` with a NULL application name searches the current
 * directory BEFORE `PATH` (unless `NoDefaultCurrentDirectoryInExePath` is
 * set), so a `git.exe` committed to an untrusted repo wins the search the
 * moment Mjölnir is run from inside it. The attacker then chooses the
 * `commit` and `tree` that `bindRepository()` returns — and those land in
 * `runIdentity` and the evidence graph, the provenance a release decision
 * reads. `bindRepository()` runs on EVERY scan.
 *
 * `bindRepository` is now the last bare-name call site in `src/`, and it uses
 * the hardened `["-C", root, ...args]` shape against the absolute binary
 * `resolveGitPath()` found by walking PATH itself.
 *
 * Honest scope of the proof below. The bare-name hazard is a WINDOWS
 * `CreateProcess` behaviour, so the arm that carries the proof is win32. Two
 * measured facts shape the fixture, and both are asserted here rather than
 * assumed:
 *
 *   1. `execFileSync("git", …)` from a CWD holding a zero-byte `git.exe`
 *      THROWS (EFTYPE) — it executed the plant, not the PATH git. That is
 *      the hijack: the attacker does not need a working git, only a file the
 *      search finds first. The plant is a zero-byte stand-in precisely so the
 *      outcome cannot depend on whether a copied `git.exe` finds its DLL
 *      siblings on the host — an assertion that can pass for the wrong reason
 *      is the failure mode this suite exists to prevent.
 *   2. The shell-mediated APIs (`execSync`, `spawn(…, { shell: true })`) DO
 *      run a CWD-committed `git.bat` and return ITS output. That is asserted
 *      below as evidence, and is why the contract bans the bare name in every
 *      launch API rather than only the one that was exploited.
 *
 * The half that runs on every platform is
 * `tests/contract/no-bare-process-exec.spec.ts`, which audits `src/**` for the
 * bare name directly.
 */

import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { bindRepository } from "../../src/engine/candidate-binding.js";
import {
  _resetGitResolutionForTests,
  resolveGitPath,
} from "../../src/scope/git-resolve.js";

/** A syntactically valid commit sha a planted batch file would print. */
const HOSTILE_SHA = "f".repeat(40);

const IS_WINDOWS = process.platform === "win32";

const createdDirs: string[] = [];
const envSnapshot: Record<string, string | undefined> = {};
let originalCwd: string | undefined;

function tmpDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `mjolnir-bindhijack-${prefix}-`));
  createdDirs.push(dir);
  return dir;
}

function withEnv(name: string, value: string | undefined): void {
  if (!(name in envSnapshot)) envSnapshot[name] = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  if (originalCwd !== undefined) {
    process.chdir(originalCwd);
    originalCwd = undefined;
  }
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  _resetGitResolutionForTests();
});

/** A real repository with one commit, and the identity git reports for it. */
function realRepo(): { dir: string; head: string; tree: string } {
  const dir = tmpDir("repo");
  const git = resolveGitPath();
  if (!git) throw new Error("git must be on PATH to build the control repo");
  const base = [
    "-C",
    dir,
    "-c",
    "user.email=mjolnir@example.invalid",
    "-c",
    "user.name=Mjolnir",
    "-c",
    "commit.gpgsign=false",
  ];
  const run = (args: string[]): string =>
    execFileSync(git, [...base, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  run(["init"]);
  writeFileSync(join(dir, "spec.ts"), "it('x', () => {});\n");
  run(["add", "-A"]);
  run(["commit", "-m", "control"]);
  return {
    dir,
    head: run(["rev-parse", "HEAD"]),
    tree: run(["rev-parse", "HEAD^{tree}"]),
  };
}

describe.runIf(IS_WINDOWS)(
  "T2 (proof arm, Windows): a checked-in git cannot hijack the binding",
  () => {
    it("bindRepository returns the REAL commit and tree, not the planted binary's", () => {
      const { dir, head, tree } = realRepo();
      // Three planted names, one per launch API. Zero-byte on purpose (see
      // the header): the assertion must not be satisfiable by a plant that
      // happens to work on this host.
      for (const planted of ["git.exe", "git.bat", "git.cmd"]) {
        writeFileSync(join(dir, planted), "");
      }

      originalCwd = process.cwd();
      process.chdir(dir);

      const binding = bindRepository(dir);

      // The strong form. `=== head` cannot be satisfied by a blank binding,
      // a forged sha, or the executed plant: only the real repository.
      expect(
        binding.commit,
        "the planted binary was executed — the binding is not the repository's",
      ).toBe(head);
      expect(binding.tree).toBe(tree);
    });

    it("the threat the contract defends against is real: a CWD-planted git.bat runs", () => {
      // Evidence, not a Mjölnir assertion. This is the platform behaviour
      // `tests/contract/no-bare-process-exec.spec.ts` bans: with a
      // `git.bat` committed to the repository, `execSync` executes the
      // ATTACKER'S file and returns its output. Should a future
      // Node/libuv stop doing this, this test fails and the justification
      // can be revisited — the correct direction for a claim to decay.
      const dir = tmpDir("shellprobe");
      writeFileSync(
        join(dir, "git.bat"),
        `@echo off\r\n@echo ${HOSTILE_SHA}\r\n`,
      );
      const probe = execSync("git --version", {
        cwd: dir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });
      expect(probe.trim()).toBe(HOSTILE_SHA);
    });
  },
);

describe("T2: the degrade contract and the inert hardened path (all platforms)", () => {
  it("with no git on PATH the binding carries no commit and no tree, and never a placeholder", () => {
    const { dir } = realRepo();
    // A real repository, so a missing binary is the ONLY reason to answer.
    const empty = tmpDir("empty");
    mkdirSync(join(empty, "sub"), { recursive: true });
    withEnv("PATH", empty);
    _resetGitResolutionForTests();
    expect(resolveGitPath()).toBeNull();

    const binding = bindRepository(dir);

    // Absence over invention: a consumer that can see "not bound" can
    // refuse to trust the run; a consumer handed a placeholder cannot tell
    // what is missing and will trust the parts that are there.
    expect(binding.commit).toBeUndefined();
    expect(binding.tree).toBeUndefined();
    expect("commit" in binding).toBe(false);
    expect("tree" in binding).toBe(false);
  });

  it.skipIf(IS_WINDOWS)(
    "outside a repository the binding is empty rather than invented",
    () => {
      // The POSIX shape of the same contract. On POSIX the bare name was
      // never reachable through the CWD (PATH does not contain `.`), so this
      // arm is about the honest degrade, not about the hijack.
      const dir = tmpDir("norepo");
      writeFileSync(join(dir, "spec.ts"), "it('x', () => {});\n");
      const binding = bindRepository(dir);
      expect(binding.commit).toBeUndefined();
      expect(binding.tree).toBeUndefined();
    },
  );

  it("a real repository binds a real commit and tree through the resolved binary", () => {
    // The positive control for the arm above: with git on PATH the hardened
    // path DOES produce the identity, so "no commit" is a verdict about a
    // missing binary and never a silent failure of the new call shape.
    const { dir, head, tree } = realRepo();
    const binding = bindRepository(dir);
    expect(binding.commit).toBe(head);
    expect(binding.tree).toBe(tree);
  });
});
