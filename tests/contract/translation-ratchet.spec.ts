/**
 * P0-12 / P0-5 — the translation ratchet, and the defect it exists for.
 *
 * `docs:translations` is advisory and always exits 0. The maintainer chose
 * that on purpose: 22 translations are ~12 sections behind and no machine can
 * close that gap, so a build failure would be a build failure with no fix.
 *
 * The honest cost of advisory is that nothing notices when the gap WIDENS.
 * This gate closes that half only: the gap may shrink, and it may not grow
 * past the committed baseline without a visible edit to a data file.
 *
 * The checker runs against fixture trees (`--root`) rather than the
 * repository. A negative test that edited `README.<code>.md` in place, or
 * `docs/TRANSLATION-RATCHET.json`, would dirty the working tree while
 * `tests/certification/candidate-manifest.spec.ts` was hashing it — the same
 * cross-test interference that made this repo's gate-tier spec rewrite itself.
 */

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { TRANSLATED_LANGS } from "../../scripts/lib/readme-translation-status.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-translation-ratchet.mjs");

interface CheckerResult {
  code: number;
  output: string;
}

/** Temp directories to clean up, one per fixture. */
const scratch: string[] = [];

afterEach(() => {
  while (scratch.length > 0) {
    const dir = scratch.pop();
    if (dir !== undefined) rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A throwaway copy of what the checker reads: README.md, every translation,
 * the baseline, and a `.git` directory holding exactly one commit that
 * touched README.md — because the checker derives its fixed input from git
 * history and must refuse to guess when that history is absent.
 */
function fixtureTree(): string {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-translation-ratchet-"));
  scratch.push(dir);
  for (const name of [
    "README.md",
    ...TRANSLATED_LANGS.map((c) => `README.${c}.md`),
  ]) {
    cpSync(join(ROOT, name), join(dir, name));
  }
  mkdirSync(join(dir, "docs"), { recursive: true });
  cpSync(
    join(ROOT, "docs", "TRANSLATION-RATCHET.json"),
    join(dir, "docs", "TRANSLATION-RATCHET.json"),
  );
  stageChecker(dir);
  execFileSync("git", ["init", "-q", "--initial-branch=main", "."], {
    cwd: dir,
    stdio: "pipe",
  });
  writeFileSync(join(dir, "README.md"), "fresh\n", "utf8");
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

function stageChecker(dir: string) {
  mkdirSync(join(dir, "scripts"), { recursive: true });
  mkdirSync(join(dir, "scripts", "lib"), { recursive: true });
  cpSync(CHECKER, join(dir, "scripts", "check-translation-ratchet.mjs"));
  for (const name of ["readme-translation-status.mjs"]) {
    cpSync(
      join(ROOT, "scripts", "lib", name),
      join(dir, "scripts", "lib", name),
    );
  }
}

function runChecker(dir: string, extra: string[] = []): CheckerResult {
  try {
    const stdout = execFileSync(
      process.execPath,
      [join(dir, "scripts", "check-translation-ratchet.mjs"), ...extra],
      { cwd: dir, encoding: "utf8" },
    );
    return { code: 0, output: stdout };
  } catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      code: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  }
}

/** A fixture tree with a modified committed baseline. */
function setBaseline(dir: string, value: number) {
  const path = join(dir, "docs", "TRANSLATION-RATCHET.json");
  const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<
    string,
    unknown
  >;
  parsed.translationsNotFresh = value;
  writeFileSync(path, JSON.stringify(parsed, null, 2) + "\n", "utf8");
}

describe("the translation gap may shrink and may not widen", () => {
  it("the committed tree passes at its recorded baseline", () => {
    const { code, output } = runChecker(fixtureTree());
    expect(code, output).toBe(0);
    expect(output).toContain("not fresh (baseline");
  });

  it("a translation that falls further behind fails the gate", () => {
    // The shipped defect: the strict report has said "22 not fresh" every day
    // and nothing fails. Make a previously-fresh translation stale and the
    // count rises above the baseline — the gate must notice.
    const dir = fixtureTree();
    setBaseline(dir, 21);
    // One language is fresh, so 21 are not: at the ceiling. Corrupt that one.
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    expect(readme).toBeTruthy();
    // Bumping README.md's date makes every translation a day stale.
    writeFileSync(join(dir, "README.md"), `${readme}\nchanged\n`, "utf8");
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
        "bump",
        "--date=2030-01-01T00:00:00Z",
      ],
      { cwd: dir, stdio: "pipe" },
    );
    const run = runChecker(dir);
    expect(run.code, run.output).toBe(1);
    expect(run.output).toContain("above the committed baseline");
  });

  it("a lower baseline is a normal change, not a failure", () => {
    // The reason this is a ratchet and not a fixed number: closing the gap
    // must not require an edit to the gate.
    const dir = fixtureTree();
    setBaseline(dir, 22);
    const run = runChecker(dir);
    expect(run.code, run.output).toBe(0);
  });

  it("a missing baseline fails closed rather than reporting a green", () => {
    const dir = fixtureTree();
    rmSync(join(dir, "docs", "TRANSLATION-RATCHET.json"));
    const run = runChecker(dir);
    expect(run.code).toBe(2);
    expect(run.output).toContain("--init");
  });

  it("a baseline with no readable number fails closed", () => {
    const dir = fixtureTree();
    writeFileSync(
      join(dir, "docs", "TRANSLATION-RATCHET.json"),
      JSON.stringify(
        { schemaVersion: 1, translationsNotFresh: "twenty" },
        null,
        2,
      ),
      "utf8",
    );
    const run = runChecker(dir);
    expect(run.code).toBe(2);
    expect(run.output).toContain("is not a ratchet");
  });

  it("a missing translation file counts against the ratchet, not as a clean row", () => {
    // A hole in the claim is not a passing row. If it were free, deleting a
    // translation would make the report look better.
    const dir = fixtureTree();
    rmSync(join(dir, "README.ar.md"));
    const run = runChecker(dir);
    expect(run.output).toContain('"missingMarkers"');
    expect(run.output).toContain("ar");
  });

  it("without git history the gate refuses rather than inventing an input", () => {
    // The date comparison's fixed input is the last commit touching README.md.
    // With no git there is no input, and a ratchet that guesses is not one.
    const dir = fixtureTree();
    rmSync(join(dir, ".git"), { recursive: true, force: true });
    const run = runChecker(dir);
    expect(run.code).toBe(2);
    expect(run.output).toContain("fails rather than reporting a green");
  });

  it("--init refuses to overwrite an existing baseline", () => {
    // Otherwise --init is how a widened gap is made legal in one command.
    const dir = fixtureTree();
    const run = runChecker(dir, ["--init"]);
    expect(run.code).toBe(2);
    expect(run.output).toContain("already exists");
  });

  it("leaves the committed tree untouched", () => {
    const before = readFileSync(
      join(ROOT, "docs", "TRANSLATION-RATCHET.json"),
      "utf8",
    );
    setBaseline(fixtureTree(), 1);
    expect(
      readFileSync(join(ROOT, "docs", "TRANSLATION-RATCHET.json"), "utf8"),
    ).toBe(before);
  });
});

describe("the ratchet and the advisory report measure the same thing", () => {
  it("every tracked translation exists in the repository", () => {
    for (const code of TRANSLATED_LANGS) {
      expect(existsSync(join(ROOT, `README.${code}.md`)), code).toBe(true);
    }
  });

  it("the shared list is the one both consumers import", () => {
    // There was a test here that regex-parsed `const LANGS = [` out of
    // `check-readme-translations.mjs` — a test of that file's formatting, kept
    // alive only because the list was duplicated in two places. The list, the
    // two marker regexes and the two readers now live in
    // `scripts/lib/readme-translation-status.mjs`, and both consumers import
    // them, so there is nothing left to keep in step. What is asserted here is
    // that the list still exists, is not empty, and has no duplicate — the
    // three ways a shared list rots.
    expect(TRANSLATED_LANGS.length).toBeGreaterThan(20);
    expect(new Set(TRANSLATED_LANGS).size).toBe(TRANSLATED_LANGS.length);
    for (const code of TRANSLATED_LANGS) {
      expect(code, code).toMatch(/^[a-z]{2,3}$/);
    }
  });
});
