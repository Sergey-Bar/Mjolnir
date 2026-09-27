/**
 * The skip budget: skipped and expected-fail tests may FALL, never rise.
 *
 * The defect this closes is the absence of a gate, and the absence is the
 * whole point. A repo can go from 0 skipped tests to 300, and every other
 * signal stays green: the suite passes, coverage holds its ratchet, no gate
 * moves. A skip is the cheapest way to make a red test disappear, and once
 * the number is not counted anywhere, nothing distinguishes "we fixed it"
 * from "we stopped running it".
 *
 * `docs/SKIP-BUDGET.json` is the committed count, read by this script at
 * every certify. The same shape `scripts/check-property-runs.mjs` uses for the
 * shared property seed: a committed constant, so raising the bar is a visible
 * diff in review rather than a quiet edit in a test file.
 *
 * Falling is always allowed and needs no commit. RISING fails, and the failure
 * names the new tests — the only way to spend budget is to write down what you
 * spent it on.
 *
 * The measurement is the JSONL stream
 * `scripts/vitest-skip-budget-reporter.mjs` appends while the run proceeds.
 * Aggregating it here rather than trusting one end-of-run summary is
 * deliberate: a lost write then costs one observation instead of the whole
 * measurement, and a missing stream is still a hard failure here.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
/**
 * Both paths are overridable so the checker can be exercised against a
 * synthetic budget and measurement in a temp directory — the same seam the
 * coverage-exemption ledger uses. A gate whose rules have only ever been seen
 * in the passing direction is not known to work.
 */
const BUDGET_PATH =
  process.env.MJOLNIR_SKIP_BUDGET ?? join(ROOT, "docs", "SKIP-BUDGET.json");
const ACTUAL_PATH =
  process.env.MJOLNIR_SKIP_BUDGET_OUT ??
  join(ROOT, "coverage", "skip-budget.actual.jsonl");

function readBudget() {
  try {
    return JSON.parse(readFileSync(BUDGET_PATH, "utf8"));
  } catch (e) {
    return {
      __error: `the committed budget is missing or unreadable (${
        e instanceof Error ? e.message : String(e)
      })`,
    };
  }
}

/** Aggregate the reporter's JSONL stream into the three measured counts. */
function readActual() {
  if (!existsSync(ACTUAL_PATH)) {
    return {
      __error: `the skip-budget measurement is missing or unreadable (no ${ACTUAL_PATH}) — add scripts/vitest-skip-budget-reporter.mjs to the run's reporters, or the budget measures nothing`,
    };
  }
  const skippedTests = new Set();
  const skippedFiles = new Set();
  const expectedFailures = new Set();
  const errors = [];
  let total = 0;
  for (const line of readFileSync(ACTUAL_PATH, "utf8").split("\n")) {
    if (line.trim() === "") continue;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      return {
        __error: `the skip-budget measurement has a malformed line: ${line.slice(0, 120)}`,
      };
    }
    if (record.kind === "skippedTest") skippedTests.add(record.name);
    else if (record.kind === "skippedFile") skippedFiles.add(record.name);
    else if (record.kind === "expectedFailure")
      expectedFailures.add(record.name);
    else if (record.kind === "error") errors.push(record);
    else if (record.kind === "runEnd") total += record.total;
  }
  // The reporter could not record something it saw, so the measurement is
  // incomplete — and an incomplete measurement that happens to be SMALLER
  // than the budget is the exact false-green this gate exists to prevent.
  // A partial write must fail, not compare.
  if (errors.length > 0) {
    return {
      __error: `the reporter failed to record ${errors.length} observation(s), so the measurement is incomplete: ${errors
        .slice(0, 5)
        .map((e) => `${e.where}: ${e.message}`)
        .join("; ")}`,
    };
  }
  if (total === 0) {
    return {
      __error:
        "the skip-budget measurement contains no completed run — the reporter never finished, so the numbers would be a guess",
    };
  }
  return {
    total,
    skippedTests: skippedTests.size,
    skippedFiles: skippedFiles.size,
    expectedFailures: expectedFailures.size,
    names: {
      skippedTests: [...skippedTests].sort(),
      skippedFiles: [...skippedFiles].sort(),
      expectedFailures: [...expectedFailures].sort(),
    },
  };
}

const budget = readBudget();
const actual = readActual();

const problems = [];
if (budget.__error) {
  problems.push(
    `${budget.__error} — the committed budget is the only thing that can say what a skip costs, so its absence is a failure, not a warning`,
  );
}
if (actual.__error) problems.push(actual.__error);

if (problems.length === 0) {
  for (const counter of ["skippedTests", "skippedFiles", "expectedFailures"]) {
    const limit = budget[counter];
    const measured = actual[counter];
    if (typeof limit !== "number") {
      problems.push(
        `docs/SKIP-BUDGET.json: ${counter} must be a number, got ${JSON.stringify(limit)}`,
      );
      continue;
    }
    if (typeof measured !== "number") {
      problems.push(`the measurement has no ${counter}`);
      continue;
    }
    if (measured > limit) {
      const names = actual.names[counter] ?? [];
      problems.push(
        `${counter}: ${measured} is over the budget of ${limit}. ` +
          `A skip is a defect that stopped running, so raising the budget is a deliberate act: write down what you spent it on. ` +
          `Over budget:\n  - ${names.slice(0, 20).join("\n  - ")}` +
          (names.length > 20 ? `\n  … and ${names.length - 20} more` : ""),
      );
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`skip-budget: ${problem}`);
  console.error(
    "skip-budget: a skip count is the number of defects the suite stopped looking at.",
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    measured: {
      skippedTests: actual.skippedTests,
      skippedFiles: actual.skippedFiles,
      expectedFailures: actual.expectedFailures,
    },
    budget: {
      skippedTests: budget.skippedTests,
      skippedFiles: budget.skippedFiles,
      expectedFailures: budget.expectedFailures,
    },
    total: actual.total,
    summary: `skippedTests=${actual.skippedTests}/${budget.skippedTests} skippedFiles=${actual.skippedFiles}/${budget.skippedFiles} expectedFailures=${actual.expectedFailures}/${budget.expectedFailures} of ${actual.total} tests`,
  }),
);
