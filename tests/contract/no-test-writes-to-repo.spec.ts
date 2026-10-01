/**
 * No test may write to the repository it runs in.
 *
 * `npm test` is part of `certify`, and the candidate trust manifest is bound to
 * a fingerprint of the working tree. A test that writes a tracked file, or
 * deletes one, mutates that tree — so the manifest gate fails on a checkout
 * that is, in every sense a user can see, clean. The failure message says
 * "workingTreeSha256 drift" and names no cause, which is the worst possible
 * report: correct, and useless.
 *
 * This is not hypothetical. `tests/cli/agent-handoff-coverage2.spec.ts` ran
 * `mjolnir install --force` against `process.cwd()`, which rewrote the tracked
 * `.claude/commands/mjolnir.md`, and then "cleaned up" with an `rmSync` that
 * reached into the repository too. It is now sandboxed; this spec is what stops
 * the next one from doing the same.
 *
 * The rule is about the PATH, not the verb. Writing inside a `mkdtemp`
 * sandbox is the correct pattern and appears throughout the suite. What is
 * forbidden is a write whose target is the checkout itself.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const TESTS = join(ROOT, "tests");

/**
 * Directories that are not part of this repository's source, however deep
 * they sit under `tests/`.
 *
 * `tests/corpus/.cache/` holds CHECKED-OUT THIRD-PARTY REPOSITORIES — the
 * Vitest and Vite trees the corpus re-samples against. It is gitignored, so
 * nothing in it can ever be reviewed or committed, and it is thousands of
 * files of other people's code that happen to use `process.cwd()`. Scanning it
 * produced eight violations, none of them this repository's, and it made the
 * gate fail on any machine that has run `npm run corpus:audit` while
 * passing on one that has not — the exact "green here, red in CI" split this
 * guard exists to prevent, pointed the other way.
 *
 * `tests/corpus/review/` is NOT gitignored, so it is listed separately rather
 * than swept in with the cache: it holds seven tracked Markdown review sheets.
 * The rationale is the same — a human's notes about a fixture are not source —
 * and stating it on its own line is what stops the exclusion from quietly
 * growing to cover code nobody intended to skip.
 */
const NOT_OUR_SOURCE = ["tests/corpus/.cache/", "tests/corpus/review/"];

/** Every test file, recursively, without a third-party glob. */
function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return testFiles(full);
    return entry.endsWith(".ts") ? [full] : [];
  });
}

/** Tracked files under a directory, by `git ls-files`. Empty on a non-checkout. */
function trackedUnder(relPrefix: string): string[] {
  try {
    return execFileSync("git", ["ls-files", "--", relPrefix], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => file.endsWith(".ts"));
  } catch {
    return [];
  }
}

/** Repo-relative path in the same form the tables below are written in. */
function repoRelative(absolute: string): string {
  return absolute
    .slice(ROOT.length + 1)
    .split(/[\\/]/)
    .join("/");
}

/**
 * Strip comments so a prose mention of the rule is not a violation. Also
 * strips string contents, because a test may legitimately name a tracked path
 * when it asserts that the path is read-only.
 */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const WRITE_CALLS = [
  "writeFileSync",
  "appendFileSync",
  "rmSync",
  "unlinkSync",
  "rmdirSync",
  "renameSync",
  "copyFileSync",
  "mkdirSync",
  "symlinkSync",
  "cpSync",
];

/**
 * Roots that unambiguously mean "the checkout", as opposed to a temporary
 * directory.
 *
 * Deliberately limited to expressions, not identifiers. Plenty of suites bind
 * a local `ROOT` to `join(tmpdir(), ...)` — `tests/plugins/plugins.spec.ts` is
 * one — and a bare `\bROOT\b` marker flags those as violations, which is how a
 * guard teaches people to ignore it. A suite that writes to the checkout
 * through a repository-root constant is a real risk, but it is better to miss
 * that than to cry wolf on the sandboxed ones.
 */
const CHECKOUT_MARKERS = [
  "process\\.cwd\\(\\)",
  "import\\.meta\\.dirname",
  "process\\.argv\\[1\\]",
];

/**
 * Match a write call that reaches the checkout within the same statement.
 *
 * The window cannot cross a `;`, so a marker in an unrelated later statement
 * does not count. It must be permissive across parentheses, because the shape
 * that actually occurred was `rmSync(join(process.cwd(), ".kilo", "..."))` — and
 * a pattern that refuses to look inside `join(` cannot see it.
 */
function writeCallPattern(call: string): RegExp {
  return new RegExp(
    `${call}\\s*\\([^;]{0,240}?(?:${CHECKOUT_MARKERS.join("|")})`,
  );
}

/** This spec necessarily contains the shape it forbids, as a fixture. */
const SELF = "tests/contract/no-test-writes-to-repo.spec.ts";

/**
 * Reviewed exceptions: a checkout-rooted filesystem call that does not write to
 * the checkout, with the reason. Keyed by "<file>:<call>".
 *
 * The same discipline as `docs/COVERAGE-EXEMPTIONS.json` — an exemption has to
 * state its failure direction, so a reader can tell a deliberate one from a
 * stale one. An allowlist with no reasons would be a way to switch the guard
 * off without looking like it.
 */
const REVIEWED_EXCEPTIONS: Record<string, string> = {
  "tests/commands/trust-report-from.spec.ts:cpSync":
    "copies FROM the repository's examples INTO a mkdtemp sandbox — the first argument is the source, not the destination",
};

describe("no test writes to the repository it runs in", () => {
  const files = testFiles(TESTS);
  const violations: string[] = [];

  for (const file of files) {
    const rel = repoRelative(file);
    if (rel === SELF) continue;
    if (NOT_OUR_SOURCE.some((prefix) => rel.startsWith(prefix))) continue;
    const source = code(readFileSync(file, "utf8"));
    for (const call of WRITE_CALLS) {
      if (writeCallPattern(call).test(source)) {
        const reason = REVIEWED_EXCEPTIONS[`${rel}:${call}`];
        if (reason) continue;
        violations.push(
          `${rel}: ${call}() reaches the checkout root — write inside a mkdtemp sandbox instead`,
        );
      }
    }
  }

  it("finds test files to audit", () => {
    // A silently empty scan would make every assertion below vacuous.
    expect(files.length).toBeGreaterThan(100);
  });

  it("every reviewed exception still states why it is safe", () => {
    for (const [key, reason] of Object.entries(REVIEWED_EXCEPTIONS)) {
      expect(reason.length, `${key} needs a stated reason`).toBeGreaterThan(20);
    }
  });

  it("no filesystem call writes to the checkout root", () => {
    expect(violations).toEqual([]);
  });

  it("no excluded directory holds tracked TypeScript", () => {
    // An exclusion has to EARN its place. `add "tests/corpus/review/"` and
    // every test file written there afterwards is invisible to this guard, with
    // no diff to review and nothing to notice — the same shape as an exemption
    // for a deleted file. Both current exclusions are checked-out
    // third-party trees and Markdown review sheets, and this assertion is what
    // keeps them that way.
    for (const prefix of NOT_OUR_SOURCE) {
      expect(trackedUnder(prefix), prefix).toEqual([]);
    }
  });

  it("the scanner detects the shape that actually occurred", () => {
    // The negative control. A guard that cannot fail is not a guard, and this
    // spec's whole value is that it would catch the defect it was written for.
    const pattern = writeCallPattern("rmSync");
    expect(
      pattern.test(
        'rmSync(join(process.cwd(), ".kilo", "command", "m.md"), {})',
      ),
    ).toBe(true);
    expect(pattern.test("rmSync(join(dir, '.kilo'), {})")).toBe(false);
    expect(pattern.test('writeFileSync(join(sandbox, "a.md"), "x")')).toBe(
      false,
    );
  });
});
