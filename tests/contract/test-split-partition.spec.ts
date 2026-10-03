/**
 * `npm run test:fast` and `npm run test:slow` must PARTITION the suite.
 *
 * The split exists because the full run takes ~108s and an inner loop should not
 * pay for the process-spawning gate suites. Two lists in `package.json` achieve
 * that, and two lists in `package.json` have one obvious failure mode: a new
 * test directory that somebody adds to neither, so it runs in `npm test` and in
 * no half — a suite nobody runs, invisible until it fails.
 *
 * So the partition is asserted here rather than trusted. Every directory under
 * `tests/` that holds a spec file must appear in EXACTLY ONE of the two scripts,
 * which is the property that makes the two halves add up to the whole suite.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { NEITHER_HALF, SLOW_SUITES } from "../../vitest.config.js";

const ROOT = join(import.meta.dirname, "..", "..");

const SCRIPTS = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

/** The `tests/<dir>` arguments a split script passes to vitest. */
function pathsIn(script: string): string[] {
  const command = SCRIPTS.scripts[script];
  if (command === undefined) {
    throw new Error(`package.json has no "${script}" script`);
  }
  return command.split(/\s+/).filter((token) => token.startsWith("tests/"));
}

/** Every directory under `tests/` that actually contains a spec file. */
function testDirectories(): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, "tests"))) {
    const dir = join(ROOT, "tests", name);
    if (!statSync(dir).isDirectory()) continue;
    const hasSpec = readdirSync(dir, { withFileTypes: true }).some(
      (entry) =>
        (entry.isFile() && entry.name.endsWith(".spec.ts")) ||
        (entry.isDirectory() &&
          existsSync(join(dir, entry.name)) &&
          readdirSync(join(dir, entry.name)).some((f) =>
            f.endsWith(".spec.ts"),
          )),
    );
    if (hasSpec) out.push(name);
  }
  return out.sort();
}

describe("the fast/slow split partitions the suite", () => {
  const fast = pathsIn("test:fast");
  const slow = pathsIn("test:slow");
  const dirs = testDirectories();

  it("both scripts exist and pass vitest a path list", () => {
    expect(fast.length, "test:fast must list directories").toBeGreaterThan(0);
    expect(slow.length, "test:slow must list directories").toBeGreaterThan(0);
    for (const script of ["test:fast", "test:slow"]) {
      expect(SCRIPTS.scripts[script], script).toContain("vitest run");
    }
  });

  it("covers every test directory in exactly one half, or names why not", () => {
    const covered = new Set(
      [...fast, ...slow].map((p) => p.replace("tests/", "")),
    );
    const missing = dirs.filter((d) => !covered.has(d) && !(d in NEITHER_HALF));
    expect(
      missing,
      `these directories hold specs but appear in neither test:fast nor test:slow ` +
        `and are not declared in NEITHER_HALF, so they run only in the full ` +
        `\`npm test\`: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("puts no directory in both halves", () => {
    const overlap = fast.filter((p) => slow.includes(p));
    expect(
      overlap,
      `a directory in both halves runs twice per cycle: ${overlap.join(", ")}`,
    ).toEqual([]);
  });

  it("agrees with SLOW_SUITES, the list vitest.config.ts exports", () => {
    // The exported constant is what a future `test.projects` split would read.
    // If it drifts from the script, the two sources of truth disagree and one
    // of them is wrong.
    const slowDirs = slow.map((p) => p.replace("tests/", ""));
    expect([...SLOW_SUITES].sort()).toEqual(slowDirs.sort());
  });

  it("explains every NEITHER_HALF entry, and the claim is checkable", () => {
    // `stress` really does have its own script; `golden` and `helpers` really do
    // hold no suite that only runs there. A justification nobody re-checks is a
    // comment.
    expect(
      SCRIPTS.scripts["test:stress"],
      "NEITHER_HALF.stress claims its own invocation",
    ).toContain("vitest.stress.config.ts");
    for (const [dir, why] of Object.entries(NEITHER_HALF)) {
      expect(why.trim().length, dir).toBeGreaterThan(20);
      expect(existsSync(join(ROOT, "tests", dir)), dir).toBe(true);
      // The directory exists and is named in neither script.
      for (const script of ["test:fast", "test:slow"]) {
        expect(pathsIn(script), `${dir} in ${script}`).not.toContain(
          `tests/${dir}`,
        );
      }
    }
  });

  it("keeps `npm test` running the whole suite in ONE pool", () => {
    // Measured, not asserted in prose: one project, all files, 108s. The
    // same 503 files behind `--project slow` took 433s, because partitioning
    // removes the interleaving that keeps workers busy while the
    // process-spawning suites run. So `npm test` must NOT become a filtered
    // run — that would turn the split into a 4x regression on the gate path.
    const test = SCRIPTS.scripts.test ?? "";
    expect(test, "npm test must still invoke vitest run").toContain(
      "vitest run",
    );
    expect(test).not.toContain("--project");
    // No `tests/<dir>` filter: `vitest run` with no path argument collects
    // everything the include globs match.
    expect(
      test.split(/\s+/).filter((token) => token.startsWith("tests/")),
      "npm test must not pass a tests/ path filter",
    ).toEqual([]);
  });

  it("still carries the slow suites' own exclusions", () => {
    // `tests/fixtures`, `tests/golden/repo`, `tests/corpus/positive-fixtures`
    // and the stress/scope suites hold DATA or have their own invocation.
    // Passing a data directory to `vitest run <path>` is how a fixture corpus
    // starts executing as a test suite.
    for (const dataDir of [
      "tests/fixtures",
      "tests/golden",
      "tests/corpus/positive-fixtures",
      "tests/corpus/negative-fixtures",
      "tests/stress",
    ]) {
      for (const script of ["test:fast", "test:slow"]) {
        for (const token of pathsIn(script)) {
          expect(
            token.startsWith(dataDir),
            `${script} passes ${token}, which is test DATA, not a suite`,
          ).toBe(false);
        }
      }
    }
  });
});
