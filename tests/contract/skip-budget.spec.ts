/**
 * T9 — a skip must cost something.
 *
 * The defect this closes is the ABSENCE of a gate. Nothing in the repository
 * counted skipped or expected-fail tests, so the count could go from zero to
 * three hundred with every other signal still green: the suite passes,
 * coverage holds its ratchet, no gate moves. A skip is the cheapest way to
 * make a red test disappear, and once the number is recorded nowhere, nothing
 * distinguishes "we fixed it" from "we stopped running it".
 *
 * Three pieces, and each is load-bearing:
 *
 *   docs/SKIP-BUDGET.json         — the committed counts. A ratchet, in the
 *     same shape `scripts/check-property-runs.mjs` uses for the shared seed:
 *     a constant in a file, so raising the bar is a visible review diff
 *     rather than a quiet edit inside a spec.
 *   scripts/vitest-skip-budget-reporter.mjs — the MEASUREMENT. A reporter,
 *     because a run is the only place the truth exists. Skips are routinely
 *     conditional (`it.skipIf`, `describe.runIf`), so a source scan counts
 *     declarations rather than what executed; and Vitest's own JSON reporter
 *     records a passing `it.fails` as an ordinary passed test, so expected
 *     failures are invisible to it. Only the task's `mode` carries it.
 *   scripts/check-skip-budget.mjs — the comparison, run by `certify` right
 *     after the suite.
 *
 * The arms below exist because a gate nobody has seen fail is not known to
 * work: the checker is invoked against mutated budget and measurement files,
 * so each rule is exercised in the direction that matters.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");
const CHECKER = join(ROOT, "scripts", "check-skip-budget.mjs");
const BUDGET = join(ROOT, "docs", "SKIP-BUDGET.json");
const REPORTER = join(ROOT, "scripts", "vitest-skip-budget-reporter.mjs");

const created: string[] = [];

/** The reporter's JSONL stream for a synthetic run. */
function stream(
  skippedTests: string[],
  skippedFiles: string[],
  expectedFailures: string[],
  total = 100,
): string {
  return [
    ...skippedTests.map((name) => ({
      kind: "skippedTest",
      name,
      file: "a.spec.ts",
    })),
    ...skippedFiles.map((name) => ({ kind: "skippedFile", name, file: name })),
    ...expectedFailures.map((name) => ({
      kind: "expectedFailure",
      name,
      file: "a.spec.ts",
    })),
    { kind: "runEnd", total },
  ]
    .map((record) => JSON.stringify(record))
    .join("\n");
}

/**
 * Run the checker against a synthetic budget and measurement, in a temp
 * working directory so the real files are never touched.
 */
function runChecker(
  budget: unknown,
  actual: string | undefined,
): {
  status: number;
  output: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "mjolnir-skipbudget-"));
  created.push(dir);
  // `undefined` means "the stream is not there at all", which is a distinct
  // case from "the stream is there and says the wrong thing" — a reporter
  // that stopped being wired in must not read as a clean run.
  if (budget !== undefined) {
    writeFileSync(join(dir, "budget.json"), JSON.stringify(budget));
  }
  if (actual !== undefined) {
    writeFileSync(join(dir, "actual.jsonl"), actual);
  }
  try {
    const out = execFileSync(process.execPath, [CHECKER], {
      cwd: dir,
      encoding: "utf8",
      env: {
        ...process.env,
        // The checker resolves both paths from its working directory, so the
        // temp dir IS the repo root as far as it is concerned.
        MJOLNIR_SKIP_BUDGET: "budget.json",
        MJOLNIR_SKIP_BUDGET_OUT: "actual.jsonl",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, output: out };
  } catch (e) {
    const err = e as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      status: err.status ?? 1,
      output: `${err.stdout ?? ""}${err.stderr ?? ""}`,
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
    created.pop();
  }
}

afterEach(() => {
  while (created.length > 0) {
    const dir = created.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("T9: the budget is a real measurement, not a number typed to go green", () => {
  it("the committed budget is three counts and a policy", () => {
    const raw = JSON.parse(readFileSync(BUDGET, "utf8")) as Record<
      string,
      unknown
    >;
    for (const counter of [
      "skippedTests",
      "skippedFiles",
      "expectedFailures",
    ]) {
      expect(typeof raw[counter], counter).toBe("number");
      expect(raw[counter] as number, counter).toBeGreaterThanOrEqual(0);
    }
    // A budget with no stated reason is a number somebody invented. The
    // `knownSkips` block is the part a reviewer actually reads.
    expect(typeof raw.policy).toBe("string");
    expect(raw.policy as string).toMatch(/never rise/);
    const known = raw.knownSkips as Record<string, string>;
    expect(Object.keys(known).sort()).toEqual([
      "expectedFailures",
      "skippedFiles",
      "skippedTests",
    ]);
    for (const [key, text] of Object.entries(known)) {
      expect(text.length, key).toBeGreaterThan(40);
    }
  });

  it("the reporter records expected failures, which the JSON reporter cannot see", async () => {
    // The measurement path itself. Driven directly, without a whole suite
    // run, so a change to the reporter's `mode` handling fails here rather
    // than being discovered as a budget that silently stopped noticing
    // `it.fails`.
    const { default: SkipBudgetReporter } = (await import(REPORTER)) as {
      default: new () => Record<string, unknown>;
    };
    const dir = mkdtempSync(join(tmpdir(), "mjolnir-skipreporter-"));
    created.push(dir);
    const out = join(dir, "actual.jsonl");
    // Set BEFORE the first observation: the reporter resolves its path per
    // call, so a redirect applied only before the end-of-run hook would send
    // the observations somewhere else entirely.
    process.env.MJOLNIR_SKIP_BUDGET_OUT = out;
    const reporter = new SkipBudgetReporter();
    const run = reporter as unknown as {
      onTestCaseResult(t: unknown): void;
      onTestRunEnd(): void;
    };
    // The shapes below are the ones MEASURED against Vitest 5, not guessed:
    // `onTestCaseResult` receives a wrapper whose `task` carries `mode` and
    // `fails`, and a skipped test arrives with NO result object. Reading
    // `mode` off the wrapper — the obvious first attempt — yields undefined
    // for every test and a budget that reports a confident zero.
    run.onTestCaseResult({
      fullName: "a passes",
      task: { mode: "run", fails: false, file: "mixed.spec.ts" },
    });
    run.onTestCaseResult({
      fullName: "b is skipped",
      task: { mode: "skip", file: "mixed.spec.ts" },
    });
    run.onTestCaseResult({
      fullName: "c is expected to fail",
      task: { mode: "run", fails: true, file: "mixed.spec.ts" },
    });
    run.onTestCaseResult({
      fullName: "d never runs either",
      task: { mode: "skip", file: "all-skipped.spec.ts" },
    });
    run.onTestRunEnd();
    delete process.env.MJOLNIR_SKIP_BUDGET_OUT;

    // The measurement is a JSONL STREAM, not one summary object: the reporter
    // appends each observation as the run proceeds, so a lost write costs one
    // observation instead of the whole measurement.
    const measured = readFileSync(out, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    const byKind = (kind: string) =>
      measured.filter((record) => record.kind === kind);
    expect(byKind("skippedTest").map((r) => r.name)).toEqual([
      "b is skipped",
      "d never runs either",
    ]);
    expect(byKind("expectedFailure").map((r) => r.name)).toEqual([
      "c is expected to fail",
    ]);
    // A file in which every test was skipped hides its whole subject, and is
    // recorded separately so the two cannot be traded off against each other.
    expect(byKind("skippedFile").map((r) => r.name)).toEqual([
      "all-skipped.spec.ts",
    ]);
    expect(byKind("runEnd")).toEqual([{ kind: "runEnd", total: 4 }]);
  });
});

describe("T9: the gate fails when the count rises, and passes when it falls", () => {
  // The synthetic budget and its matching measurement sit AT the limits, so
  // every arm below changes exactly one number and the direction of the
  // result is unambiguous.
  const budget = { skippedTests: 6, skippedFiles: 1, expectedFailures: 3 };
  const SKIPPED = ["a", "b", "c", "d", "e", "f"].map(
    (id) => `tests/x.spec.ts > ${id}`,
  );
  const FILES = ["tests/y.spec.ts"];
  const FAILS = ["g", "h", "i"].map((id) => `tests/z.spec.ts > ${id}`);
  const atBudget = stream(SKIPPED, FILES, FAILS, 11_004);

  it("a run at the budget passes", () => {
    const { status, output } = runChecker(budget, atBudget);
    expect(output, output).toContain('"status":"PASS"');
    expect(status).toBe(0);
  });

  it("a run BELOW the budget passes without a commit — falling is always free", () => {
    const { status, output } = runChecker(budget, stream([], [], [], 11_004));
    expect(output, output).toContain('"status":"PASS"');
    expect(status).toBe(0);
  });

  it("a repeated run does not double-count: the same name twice is one skip", () => {
    // `certify` runs the suite twice, and the reporter may observe the same
    // test from more than one instance. Without name-level de-duplication the
    // budget would report a rise nobody made.
    const { status, output } = runChecker(
      budget,
      stream(["a > x"], [], [], 500) + "\n" + stream(["a > x"], [], [], 500),
    );
    expect(output, output).toContain('"status":"PASS"');
    expect(status).toBe(0);
  });

  it.each(["skippedTests", "skippedFiles", "expectedFailures"] as const)(
    "a rise in %s fails and NAMES the offender",
    (counter) => {
      const over = stream(
        counter === "skippedTests"
          ? [...SKIPPED, "tests/x.spec.ts > NEW"]
          : SKIPPED,
        counter === "skippedFiles" ? [...FILES, "tests/NEW.spec.ts"] : FILES,
        counter === "expectedFailures"
          ? [...FAILS, "tests/NEW.spec.ts > c"]
          : FAILS,
        11_004,
      );
      const { status, output } = runChecker(budget, over);
      expect(status, output).toBe(1);
      expect(output).toContain(`${counter}:`);
      // The whole value of the gate: it must say WHICH test, not just that
      // the number moved. A budget that only reports a delta leaves the
      // reader to bisect 11,000 tests by hand.
      const named =
        counter === "skippedTests"
          ? "tests/x.spec.ts > NEW"
          : counter === "skippedFiles"
            ? "tests/NEW.spec.ts"
            : "tests/NEW.spec.ts > c";
      expect(output).toContain(named);
    },
  );

  it("a missing budget fails rather than defaulting to unlimited", () => {
    const { status, output } = runChecker(undefined, atBudget);
    expect(status, output).toBe(1);
    expect(output).toMatch(/committed budget is missing or unreadable/);
  });

  it("a missing measurement fails rather than reporting a clean run", () => {
    // The failure mode this most needs to guard: a reporter that stopped
    // being wired in must not read as "zero skips, therefore fine".
    const { status, output } = runChecker(budget, undefined);
    expect(status, output).toBe(1);
    expect(output).toMatch(/measurement is missing or unreadable/);
  });

  it("a stream with no completed run fails rather than reporting a clean run", () => {
    // The half-written case: observations landed, the run never finished.
    // Reporting those as the full measurement would understate the skips.
    const { status, output } = runChecker(
      budget,
      stream(["a > x"], [], [], 0).replace(/\{"kind":"runEnd"[^\n]*\n?/, ""),
    );
    expect(status, output).toBe(1);
    expect(output).toMatch(/no completed run/);
  });

  it("a non-numeric budget is reported, not compared", () => {
    const { status, output } = runChecker(
      { ...budget, skippedTests: "six" },
      atBudget,
    );
    expect(status, output).toBe(1);
    expect(output).toMatch(/skippedTests must be a number/);
  });
});
