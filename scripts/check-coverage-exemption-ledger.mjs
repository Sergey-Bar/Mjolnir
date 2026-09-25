/**
 * Coverage exemption truth ledger gate (plan V5-000).
 *
 * Usage: node scripts/check-coverage-exemption-ledger.mjs [repo-root]
 *
 * Exits non-zero on any disagreement between docs/COVERAGE-EXEMPTIONS.json,
 * the committed vitest coverage `exclude` list, and the real import graph.
 */

import {
  LEDGER_PATH,
  readLedger,
  validateCoverageExemptionLedger,
} from "./lib/coverage-exemption-ledger.mjs";

const root = process.argv[2] ?? process.cwd();
const ledger = readLedger(root);
const problems = validateCoverageExemptionLedger(root);

if (problems.length > 0) {
  for (const problem of problems)
    console.error(`coverage-exemptions: ${problem}`);
  console.error(
    `coverage-exemptions: ${problems.length} problem(s). Every exclusion is an owned, expiring, classified debt entry in ${LEDGER_PATH}.`,
  );
  process.exit(1);
}

const shippedDebt = ledger.entries.filter(
  (entry) =>
    entry.shippedSurface && entry.classification !== "PERMANENT_STRUCTURAL",
).length;

console.log(
  JSON.stringify({
    status: "PASS",
    exclusions: ledger.entries.length,
    shippedSurfaceDebt: shippedDebt,
    ceiling: ledger.policy.shippedSurfaceCeiling,
  }),
);
