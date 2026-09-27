/**
 * Clear the previous skip-budget measurement, before a run starts.
 *
 * The measurement is written by `scripts/vitest-skip-budget-reporter.mjs`
 * from inside the test run, and a run can create more than one reporter
 * instance. None of them can tell a stale measurement from this run's, so a
 * run boundary has to be established from OUTSIDE the run. This is that
 * boundary, and it is the whole reason it is a separate script rather than a
 * line inside the reporter.
 *
 * A stale measurement would be worse than none: it would report the previous
 * run's skip counts as if they were this run's, and the budget would pass on
 * the strength of numbers nobody just produced.
 * `scripts/check-skip-budget.mjs` treats a MISSING or unterminated
 * measurement as a failure, so if this is ever skipped the gate goes red
 * rather than green.
 */

import { rmSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(
  process.cwd(),
  process.env.MJOLNIR_SKIP_BUDGET_OUT ?? "coverage/skip-budget.actual.jsonl",
);

rmSync(target, { force: true });
console.log(
  JSON.stringify({
    status: "CLEARED",
    path: "coverage/skip-budget.actual.jsonl",
  }),
);
