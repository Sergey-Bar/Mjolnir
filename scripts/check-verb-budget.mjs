/**
 * `verbs:budget` — the 5.x law: one new verb requires one removal or merge.
 *
 * Usage: node scripts/check-verb-budget.mjs [repo-root]
 *
 * BITTERSWEET `BW-112`. The command surface reached 50 verbs with no
 * ceiling, and six of them (`business-case`, `enterprise`, `maturity`,
 * `release-report`, `report`, `quarantine`) were scheduled for removal in
 * 5.0 — four because they are redundant, two because they fabricated
 * values.
 *
 * THE REMOVALS HAVE LANDED
 *
 * The 4.1 deprecation cycle those six were sequenced behind is over, and
 * the six are gone: four because they duplicated a covered surface, two
 * because the numbers they printed had no provenance. `CEILING` is
 * therefore 44 — the count the ratchet was always tightening toward, now
 * the count the gate holds. There is no pending-removal headroom left to
 * give away, so a 45th verb fails the build the day it is added.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The count the surface must not exceed. Lowering it is a deliberate act. */
const CEILING = 44;
/** Where the surface landed once the 5.0 removals landed. Now the ceiling. */
const TARGET_5_0 = 44;

const root = process.argv[2] ?? process.cwd();

const source = readFileSync(
  join(root, "src", "engine", "cli-command-names.ts"),
  "utf8",
);

const names = [...source.matchAll(/^\s*"([^"]+)",\s*$/gm)].map((m) => m[1]);

if (names.length === 0) {
  console.error(
    "verbs:budget: could not parse CLI_COMMAND_NAMES from " +
      "src/engine/cli-command-names.ts — the gate must fail rather than " +
      "pass on an empty list.",
  );
  process.exit(1);
}

const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
if (duplicates.length > 0) {
  console.error(
    `verbs:budget: duplicate verbs: ${[...new Set(duplicates)].join(", ")}`,
  );
  process.exit(1);
}

if (names.length > CEILING) {
  console.error(
    `verbs:budget: ${names.length} verbs, ceiling is ${CEILING}. ` +
      `The 5.x law: one new verb requires one removal or a merge. ` +
      `Over by ${names.length - CEILING}.`,
  );
  process.exit(1);
}

console.log(
  JSON.stringify({
    status: "PASS",
    verbs: names.length,
    ceiling: CEILING,
    headroom: CEILING - names.length,
    // The 5.0 target, which the 5.0 removals made the ceiling. Kept as a
    // named fact so a future tightening has something to compare against.
    target5_0: TARGET_5_0,
    // Zero by construction: the six 5.0 removals have landed, so nothing
    // is left to take off before the next ratchet step.
    removalsPending: 0,
  }),
);
