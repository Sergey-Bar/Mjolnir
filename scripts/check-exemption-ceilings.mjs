/**
 * The exemption ledger's two ceilings, and why they are ceilings rather than
 * targets.
 *
 * `SHIPPED_SURFACE` and `CONTRACT_ONLY` are the two classes a wiring is
 * supposed to shrink. Both are ratchets: the count may FALL and may never
 * RISE, and a rise is a failure that names the file which caused it.
 *
 * The direction is the whole mechanism. A count that a team tries to hit is a
 * target, and a target is either trivially met (ratchet it up) or blocking
 * forever (delete the work). A count that may only go down is neither: it
 * records what has already been finished and refuses the next regression, and
 * a maintainer who legitimately needs one more entry has to write down why in
 * the same file, which is a diff a reviewer sees.
 *
 * `CONTRACT_ONLY` is new. Its 13 entries are, one for one, the contracts the
 * unwired-contract work targets — `m40-language-expansion-contract.ts`,
 * `universal-pack-contract.ts`, `provider-capability-contract.ts` and ten
 * others — so the number IS that backlog, and stating it as a CI value rather
 * than as a sentence is what makes it fall.
 *
 * Usage: node scripts/check-exemption-ceilings.mjs
 * Exit codes: 0 = both ceilings hold, 1 = one was exceeded, 2 = setup error.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LEDGER = join(ROOT, "docs", "COVERAGE-EXEMPTIONS.json");

/**
 * @typedef {{ path: string, classification: string }} Entry
 * @typedef {{
 *   entries: Entry[],
 *   policy: {
 *     shippedSurfaceCeiling: number,
 *     contractOnlyCeiling?: number,
 *   },
 * }} Ledger
 */

/** @returns {Ledger} */
function readLedger() {
  return JSON.parse(readFileSync(LEDGER, "utf8"));
}

function main() {
  /** @type {Ledger} */
  let ledger;
  try {
    ledger = readLedger();
  } catch (error) {
    console.error(
      `exemption ceilings: cannot read ${LEDGER} (${error instanceof Error ? error.message : String(error)})`,
    );
    process.exit(2);
  }

  /** @type {string[]} */
  const failures = [];

  const shipped = ledger.entries.filter(
    (e) => e.classification === "SHIPPED_SURFACE",
  );
  if (shipped.length > ledger.policy.shippedSurfaceCeiling) {
    failures.push(
      `SHIPPED_SURFACE is ${shipped.length}, above the ceiling of ${ledger.policy.shippedSurfaceCeiling}: ` +
        `${shipped
          .slice(ledger.policy.shippedSurfaceCeiling)
          .map((e) => e.path)
          .join(", ")}. ` +
        "Add a test, delete the file, or reclassify it with a reason — raising the " +
        "ceiling is a separate edit a reviewer can see.",
    );
  }

  // The `contractOnly` ceiling is OPTIONAL so a ledger written before this rule
  // does not fail on the day it lands. Absent means "not ratcheted yet", and
  // that is reported rather than treated as zero — a missing ceiling must not
  // read as a passing one.
  if (ledger.policy.contractOnlyCeiling === undefined) {
    console.error(
      "exemption ceilings: policy.contractOnlyCeiling is absent — the CONTRACT_ONLY " +
        "ratchet is not enforced. Set it to the current count to start the ratchet.",
    );
    process.exit(1);
  }
  const ceiling = ledger.policy.contractOnlyCeiling;
  const contractOnly = ledger.entries.filter(
    (e) => e.classification === "CONTRACT_ONLY",
  );
  if (contractOnly.length > ceiling) {
    failures.push(
      `CONTRACT_ONLY is ${contractOnly.length}, above the ceiling of ${ceiling}: ` +
        `${contractOnly
          .slice(ceiling)
          .map((e) => e.path)
          .join(", ")}. ` +
        "Wiring a contract or deleting it lowers this; adding one raises it, and the " +
        "raising must be a visible edit rather than a quiet consequence of new code.",
    );
  }

  if (failures.length > 0) {
    console.error("Exemption ceilings failed:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        shippedSurface: {
          now: shipped.length,
          ceiling: ledger.policy.shippedSurfaceCeiling,
        },
        contractOnly: {
          now: ledger.entries.filter(
            (e) => e.classification === "CONTRACT_ONLY",
          ).length,
          ceiling: ledger.policy.contractOnlyCeiling,
        },
        unimplementedSpecs: {
          now: ledger.entries.filter(
            (e) => e.classification === "UNIMPLEMENTED_SPEC",
          ).length,
          declared: ledger.policy.unimplementedSpecs,
        },
      },
      null,
      2,
    ),
  );
}

main();
