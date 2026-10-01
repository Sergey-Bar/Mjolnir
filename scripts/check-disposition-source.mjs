/**
 * `npm run gates:disposition-source` — no computed disposition may gate.
 *
 * `GAP-M26-002`: dispositions used to be a pure function of the GitHub `state`
 * field, which carries no engineering judgement at all. A 429-row ledger
 * containing a function and zero decisions was certified as a completed fix,
 * because the script's own output was cited as the evidence.
 *
 * The judgement file fixed the substance — an untriaged issue is CARRY_FORWARD
 * and stays open. This checks the thing that file cannot: that the PROVENANCE
 * is legible, and that a row nobody decided cannot claim a disposition which
 * releases a blocker.
 *
 * The failure direction is what matters. A `default` row that claims a gating
 * disposition is the exact defect: a computation standing in for a person, in
 * the one field a release reads.
 *
 * Usage: node scripts/check-disposition-source.mjs
 * Exit codes: 0 = every gating disposition was decided, 1 = one was not.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const LEDGER = join(ROOT, "docs", "M26-ISSUE-DISPOSITIONS.jsonl");

/**
 * Dispositions that release a blocker.
 *
 * Everything else — CARRY_FORWARD, DEFERRED, CLOSED_NOT_PLANNED — either
 * blocks or is inert, and a fallback to one of those is the safe direction.
 * A fallback to a disposition that says "ship it" is the unsafe one.
 */
const GATING = new Set(["CLOSED_SHIPPED", "ACCEPTED_RISK", "CLOSED_WONTFIX"]);

function main() {
  let rows;
  try {
    // JSONL, not JSON: the artifact is one row per issue and a consumer that
    // parses it as a document gets an error, which is the right shape for a
    // file that is not a document.
    rows = readFileSync(LEDGER, "utf8")
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
  } catch (error) {
    console.error(
      `disposition source: cannot read ${LEDGER} (${error instanceof Error ? error.message : String(error)})`,
    );
    process.exit(2);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error(
      `disposition source: ${LEDGER} has no rows — a schema change must not ` +
        "silently reduce this gate to zero rows",
    );
    process.exit(2);
  }

  const failures = [];
  const counted = { human: 0, default: 0, unlabelled: 0 };

  for (const row of rows) {
    const source = row.disposition_source;
    const disposition = row.canonical_disposition;
    const where = `#${row.issue_number ?? "?"}`;

    if (source === "human") counted.human += 1;
    else if (source === "default") counted.default += 1;
    else counted.unlabelled += 1;

    if (GATING.has(disposition) && source !== "human") {
      failures.push(
        `${where}: ${disposition} with disposition_source ${source ?? "(unlabelled)"} — ` +
          "a disposition that releases a blocker cannot be a fallback. Record a judgement " +
          "in docs/issue-dispositions.json with a reason and a verification",
      );
    }
  }

  if (counted.unlabelled > 0) {
    failures.push(
      `${counted.unlabelled} row(s) carry no disposition_source at all. The field is the ` +
        "provenance; a snapshot produced before it existed must be regenerated rather " +
        "than read",
    );
  }

  if (failures.length > 0) {
    console.error(
      `Disposition provenance failed (${counted.human} decided, ${counted.default} default):`,
    );
    for (const failure of failures.slice(0, 20))
      console.error(`  - ${failure}`);
    if (failures.length > 20)
      console.error(`  … and ${failures.length - 20} more`);
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        rows: rows.length,
        decidedByAHuman: counted.human,
        untriagedDefaults: counted.default,
        gatingDispositions: [...GATING],
      },
      null,
      2,
    ),
  );
}

main();
