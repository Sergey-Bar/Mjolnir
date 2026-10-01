/**
 * `check-changelog` — a user-visible change without a release note.
 *
 * 6.0 shipped `--require-full-coverage`, an exit-2 coverage path, and fifteen
 * removed verbs, and `CHANGELOG.md` carried an empty `## [Unreleased]` for a
 * release. Nothing failed, because nothing compared the working tree to the
 * changelog.
 *
 * Every negative arm below is a fixture CHANGELOG in a temp directory, run
 * through the real script with `cwd` set to it — the script reads the
 * repository it is standing in, which is the only shape that works for a
 * `git status` comparison. So the shipped tree exercises only the pass path
 * and a reader cannot mistake "the check passed once" for "the check works".
 * That is the same discipline the rest of this change set used, and the same
 * one the first version of this gate violated: it counted `package.json` in
 * the change list as a version bump, so it passed on exactly the changes it
 * was written to catch.
 *
 * The `dirty()` helper COMMITS the source file and leaves only a `dirty.tmp`
 * uncommitted, so `git status` has something to report. Naming that
 * explicitly, because the test names below say "a dirty source file" and the
 * source file is not what is dirty — the point is the CHANGE SET, and the
 * porcelain line is what the gate reads.
 */

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECK = join(ROOT, "scripts", "check-unreleased-entry.mjs");

const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

interface CheckerResult {
  code: number;
  output: string;
}

/**
 * A checkout-shaped fixture: a changelog, a package.json, a git repository
 * with one commit, and a dirty working tree holding `dirty`.
 *
 * The git repository is not ceremony. The check compares `package.json`'s
 * version against `HEAD:package.json` and reads the change list from
 * `git status`, so a fixture without a commit history answers every question
 * with a "no" and the negative arms pass for the wrong reason.
 */
function fixture(changelog: string, version: string): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-changelog-"));
  scratch.push(dir);
  writeFileSync(join(dir, "CHANGELOG.md"), changelog, "utf8");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", version }, null, 2) + "\n",
    "utf8",
  );
  execFileSync("git", ["init", "-q", "--initial-branch=main", "."], {
    cwd: dir,
    stdio: "pipe",
  });
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync(
    "git",
    [
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "commit",
      "-q",
      "-m",
      "fixture",
    ],
    { cwd: dir, stdio: "pipe" },
  );
  return dir;
}

function dirty(
  dir: string,
  path: string,
  body = "export const x = 1;\n",
): void {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), body, "utf8");
  execFileSync("git", ["add", "-A"], { cwd: dir, stdio: "pipe" });
  execFileSync(
    "git",
    [
      "-c",
      "user.email=t@example.com",
      "-c",
      "user.name=t",
      "commit",
      "-q",
      "-m",
      "change",
    ],
    { cwd: dir, stdio: "pipe" },
  );
  // Leave one file uncommitted so `git status` has something to report.
  writeFileSync(join(dir, path, "..", "dirty.tmp"), "x\n", "utf8");
}

function runCheck(dir: string): CheckerResult {
  try {
    const stdout = execFileSync(process.execPath, [CHECK], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

const EMPTY_UNRELEASED =
  "# Changelog\n\n## [Unreleased]\n\n## [5.0.0] — 2026-09-27\n\n### Added\n\n- something\n";
const FILLED_UNRELEASED =
  "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- a real release note\n\n## [5.0.0] — 2026-09-27\n\n### Added\n\n- something\n";

describe("a user-visible change needs a release note", () => {
  it("a dirty source file with an empty Unreleased section fails", () => {
    const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
    dirty(dir, "src/engine/new-thing.ts");
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("no `## [Unreleased]` entry");
    // The message names the files, so the reader is not left guessing.
    expect(run.output).toContain("dirty.tmp");
  });

  it("the same change passes once the section has content", () => {
    const dir = fixture(FILLED_UNRELEASED, "5.0.0");
    dirty(dir, "src/engine/new-thing.ts");
    const run = runCheck(dir);
    expect(run.code, run.output).toBe(0);
    const report = JSON.parse(run.output) as {
      unreleasedEntryPresent: boolean;
    };
    expect(report.unreleasedEntryPresent).toBe(true);
  });

  it("a real version bump satisfies it, so a release commit needs no separate block", () => {
    const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
    dirty(dir, "src/engine/new-thing.ts");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture", version: "5.1.0" }, null, 2) + "\n",
      "utf8",
    );
    const run = runCheck(dir);
    expect(run.code, run.output).toBe(0);
    expect(
      (JSON.parse(run.output) as { versionBumped: boolean }).versionBumped,
    ).toBe(true);
  });

  it("re-writing package.json at the SAME version is not a bump", () => {
    // The shipped first version asked whether `package.json` appeared in the
    // change list, so it passed on every PR that touched a script — including
    // this change set, whose `capability-manifest.json` drift fix looked like
    // a version move. The VALUE has to differ.
    const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
    dirty(dir, "src/engine/new-thing.ts");
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture-renamed", version: "5.0.0" }, null, 2) +
        "\n",
      "utf8",
    );
    const run = runCheck(dir);
    expect(run.code).toBe(1);
    expect(run.output).toContain("no `## [Unreleased]` entry");
  });

  it("a marker in a RELEASED section does not satisfy it", () => {
    // An append-only file searched for a marker anywhere is the same defect as
    // the anti-creep exception: the first use disables the check for good, so
    // the second release needs no entry either. Scoped to the named section.
    const dir = fixture(
      "# Changelog\n\n## [Unreleased]\n\n## [5.0.0] — 2026-09-27\n\n### Added\n\n- ANTI-CREEP-EXCEPTION: an old note\n",
      "5.0.0",
    );
    dirty(dir, "src/engine/new-thing.ts");
    expect(runCheck(dir).code).toBe(1);
  });

  it("a docs-only change needs no entry", () => {
    // 102 generated rule pages exist. A gate that fires on each regeneration
    // teaches the flag to be set mechanically, which is worse than no gate.
    for (const path of [
      "docs/rules/QA-CI-001.md",
      "docs/adr/0012-hosted-enterprise-boundary.md",
      ".github/workflows/ci.yml",
      "gates/pr.json",
    ]) {
      const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
      dirty(dir, path);
      expect(runCheck(dir).code, path).toBe(0);
    }
  });

  it("a clean tree passes whatever the changelog says", () => {
    const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
    expect(runCheck(dir).code).toBe(0);
  });

  it("a thematic break or a comment in the empty section is not a body", () => {
    // Two one-character bypasses of the first version, which read "the first
    // non-blank, non-`#` line" as a release note. Both are reproduced, and
    // both are the same defect the anti-creep marker has: a line that reads
    // as content without being one, disabling the check for good.
    for (const filler of ["---", "<!-- nothing -->", "***", "[x]: https://e"]) {
      const dir = fixture(
        `# Changelog\n\n## [Unreleased]\n\n${filler}\n\n## [5.0.0] — 2026-09-27\n\n- x\n`,
        "5.0.0",
      );
      dirty(dir, "src/engine/new-thing.ts");
      expect(runCheck(dir).code, filler).toBe(1);
    }
  });

  it("a top section that is NOT `[Unreleased]` does not satisfy it", () => {
    // The error message names `## [Unreleased]`; the first version never
    // checked for that token and accepted whatever heading came first.
    const dir = fixture(
      "# Changelog\n\n## [9.9.9] — 2030-01-01\n\n- not an unreleased entry\n",
      "5.0.0",
    );
    dirty(dir, "src/engine/new-thing.ts");
    expect(runCheck(dir).code).toBe(1);
  });

  it("a rename's NEW path is judged, not its old one", () => {
    // `git status` renders a rename as one porcelain line,
    // `docs/rules/x.md -> src/x.ts`. Matching the whole string against the
    // exclusion prefixes exempted it, so a new SOURCE file hid behind a
    // deleted doc page.
    const dir = fixture(EMPTY_UNRELEASED, "5.0.0");
    mkdirSync(join(dir, "docs", "rules"), { recursive: true });
    writeFileSync(join(dir, "docs", "rules", "x.md"), "x\n", "utf8");
    execFileSync("git", ["add", "docs/rules/x.md"], {
      cwd: dir,
      stdio: "pipe",
    });
    execFileSync(
      "git",
      [
        "-c",
        "user.email=t@example.com",
        "-c",
        "user.name=t",
        "commit",
        "-q",
        "-m",
        "doc",
      ],
      { cwd: dir, stdio: "pipe" },
    );
    // The rename is STAGED BUT UNCOMMITTED, which is what makes git render it
    // as the single porcelain line the gate has to parse. Leaving the new path
    // untracked reports `?? src/` — a directory — and the arrow never appears,
    // so the test would pass without exercising the parse at all.
    execFileSync("git", ["mv", "docs/rules/x.md", "src-moved.ts"], {
      cwd: dir,
      stdio: "pipe",
    });
    const run = runCheck(dir);
    expect(run.code, run.output).toBe(1);
    expect(run.output).toContain("src-moved.ts");
  });

  it("the shipped changelog carries a release note for the current version", () => {
    // The premise of the gate: a user-visible change is recorded. This used
    // to assert the `[Unreleased]` section specifically, which contradicts the
    // checker's own law — `check-unreleased-entry.mjs` states that "a version
    // bump IS the release record, and demanding a separate `[Unreleased]`
    // block on the commit that sets the new version would make the two
    // disagree on purpose." On a release commit the section is empty *by
    // design* and the note lives under the version heading.
    //
    // So the invariant is the one the gate enforces: the changelog names the
    // current version, and that section has a body. Asserting Unreleased
    // specifically made this test fail on every legitimate release and
    // train a reader to keep a stale Unreleased section open.
    const text = readFileSync(join(ROOT, "CHANGELOG.md"), "utf8");
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { version: string };
    const heading = new RegExp(
      `^## \\[${pkg.version.replace(/\./g, "\\.")}\\]`,
      "m",
    ).exec(text);
    expect(
      heading,
      `the changelog has no section for the current version ${pkg.version}`,
    ).not.toBeNull();
    if (heading === null) return;
    const rest = text.slice(heading.index + heading[0].length);
    const next = /^## /m.exec(rest);
    const section = next === null ? rest : rest.slice(0, next.index);
    const body = section
      .split("\n")
      .filter(
        (line) =>
          line.trim() !== "" &&
          !line.startsWith("#") &&
          !/^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim()) &&
          !/^<!--/.test(line.trim()),
      );
    expect(
      body.length,
      `the ${pkg.version} section is empty: a release with no note is ` +
        "indistinguishable from a release with nothing in it",
    ).toBeGreaterThan(0);
  });
});
