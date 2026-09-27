/**
 * A reporter that MEASURES skipped and expected-fail tests.
 *
 * Why a reporter and not a source scan. `docs/SKIP-BUDGET.json` exists to
 * stop `it.skip` from becoming a place defects go to hide. A source scan
 * cannot answer the question: skips are frequently CONDITIONAL
 * (`it.skipIf(isWindows)`, `describe.runIf(...)`, `it.skipIf(a || b)`), so
 * counting the declarations in the tree measures a different number from the
 * number of tests a run actually did not execute. A budget compared against
 * the wrong number is a budget nobody trusts.
 *
 * Vitest's own JSON reporter does not help either: an `it.fails` that passes
 * for the expected reason is reported there as an ordinary `passed` test, so
 * expected failures are invisible to it. Only the task's own `fails` flag
 * carries the distinction.
 *
 * WHY JSONL, APPENDED AS IT GOES. The first version of this reporter
 * accumulated state and wrote one JSON object in `onTestRunEnd`. On a full
 * 11,800-test run the write did not land — while the identical reporter on
 * any subset did — so the budget read "no measurement" and the gate failed
 * for a reason that had nothing to do with skips. A single end-of-run write
 * is a single point of failure with no diagnosis. Appending one line per
 * OBSERVATION moves the write into the run itself: every skip is on disk
 * before the run can end, a lost line is one lost line rather than the whole
 * measurement, and `scripts/check-skip-budget.mjs` aggregates the file.
 *
 * The shapes below were MEASURED against Vitest 5, not guessed (see the arm
 * in tests/contract/skip-budget.spec.ts that drives this reporter directly):
 *   - `onTestCaseResult` receives a TestCase WRAPPER; `mode`, `fails` and
 *     `file` live on `.task`. Reading them off the wrapper yields
 *     `undefined` for every test — a budget reporting a confident zero.
 *   - a skipped test arrives with `task.mode === "skip"` and NO result.
 *   - an expected failure arrives with `task.fails === true` and a normal
 *     passing result.
 *
 * Output goes to `coverage/skip-budget.actual.jsonl`;
 * `scripts/check-skip-budget.mjs` aggregates it against the committed budget.
 */

import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * The working directory AT IMPORT TIME, which is the repository root.
 *
 * Reading `process.cwd()` at write time looks equivalent and is not: this
 * suite contains ~25 test files that call `process.chdir` into a temp
 * directory, so a path resolved late can land inside a temp tree the next run
 * deletes.
 */
const ROOT = process.cwd();

function outputPath() {
  return resolve(
    ROOT,
    process.env.MJOLNIR_SKIP_BUDGET_OUT ?? "coverage/skip-budget.actual.jsonl",
  );
}

/**
 * A write that fails is recorded in the stream AND printed, not swallowed.
 * A measurement that quietly does not exist is indistinguishable from a
 * clean run, which is the one thing a skip budget must never be — so the
 * checker treats an `error` record as a failure. Printing alone is not
 * enough: stderr from a reporter is easy to lose in a long run, and the gate
 * is the thing that has to be loud.
 */
function append(record) {
  try {
    const path = outputPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(record)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`skip-budget: could not record ${record.kind}: ${message}`);
    try {
      const path = outputPath();
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(
        path,
        `${JSON.stringify({ kind: "error", where: record.kind, message })}\n`,
      );
    } catch {
      // The stream itself is unwritable. Nothing further can be recorded, and
      // the checker will fail on the missing file.
    }
  }
}

/**
 * A file path for a task, as a STRING.
 *
 * `task.file` is a Vite module object, not a path, and it is circular —
 * stringifying it throws, which loses the observation entirely. That failure
 * is silent by default and it is the difference between a budget reading
 * "8 skipped" and reading "0 skipped" for the identical run, so the coercion
 * is explicit and the fallback is a placeholder rather than the object.
 */
function taskFile(task, testCase) {
  for (const candidate of [
    task?.file,
    task?.moduleId,
    testCase?.moduleId,
    testCase?.file,
  ]) {
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
    if (candidate && typeof candidate === "object") {
      const id = candidate.id ?? candidate.file ?? candidate.moduleId;
      if (typeof id === "string" && id.length > 0) return id;
      if (typeof candidate.moduleId === "string") return candidate.moduleId;
      if (typeof candidate.file === "string") return candidate.file;
    }
  }
  return "<unknown>";
}

export default class SkipBudgetReporter {
  #total = 0;
  /** @type {Map<string, { total: number, skipped: number }>} */
  #byFile = new Map();

  onTestCaseResult(testCase) {
    this.#total += 1;
    const task = testCase.task ?? testCase;
    const name = testCase.fullName ?? testCase.name ?? "<unnamed>";
    const file = taskFile(task, testCase);

    const bucket = this.#byFile.get(file) ?? { total: 0, skipped: 0 };
    bucket.total += 1;

    if (task.fails === true) {
      append({ kind: "expectedFailure", name, file });
    } else if (task.mode === "skip") {
      append({ kind: "skippedTest", name, file });
      bucket.skipped += 1;
    }
    this.#byFile.set(file, bucket);
  }

  onTestRunEnd() {
    // An instance that saw nothing contributes nothing, and must not claim a
    // total of its own: `certify` runs the contract suite as a SECOND vitest
    // invocation, and its zero must not overwrite the real run's total.
    if (this.#total === 0) return;
    // A file in which EVERY test was skipped hides its whole subject, not one
    // case. Counted separately so the two cannot be traded against each
    // other: a file skipped to get under the per-test budget must not be free.
    //
    // A file excluded before collection reports no cases at all and is
    // therefore invisible here. That is a deliberate limit, not an oversight
    // — `vitest.config.ts`'s include/exclude lists are the authority for that,
    // and tests/contract/vitest-suite-boundaries.spec.ts owns them.
    for (const [file, bucket] of this.#byFile) {
      if (bucket.total > 0 && bucket.skipped === bucket.total) {
        append({ kind: "skippedFile", name: file, file });
      }
    }
    append({ kind: "runEnd", total: this.#total });
  }
}
