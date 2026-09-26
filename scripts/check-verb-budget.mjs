/**
 * `verbs:budget` — the 5.x law: one new verb requires one removal or merge.
 *
 * Usage: node scripts/check-verb-budget.mjs [repo-root]
 *
 * BITTERSWEET `BW-112`. The command surface reached 50 verbs with no
 * ceiling, and six of them (`business-case`, `enterprise`, `maturity`,
 * `release-report`, `report-playwright`, `quarantine`) are scheduled for
 * removal in 5.0 — four because they are redundant, two because they
 * fabricated values.
 *
 * WHY THIS IS A RATCHET AND NOT THE 5.0 TARGET
 *
 * The target is 44 after those six removals, but the removals are
 * deliberately sequenced behind a 4.1 deprecation cycle: the tree is
 * 4.0.0-rc.1, and dropping a verb without a deprecation window breaks
 * every consumer with no notice. A gate that fails the build on a planned,
 * correctly-sequenced task is a gate that gets deleted within a week.
 *
 * So the gate holds the CURRENT count and only fails on GROWTH, and the
 * 5.0 target is recorded beside it as the number the ratchet tightens to
 * when the removals actually land. Lowering `CEILING` is part of BW-110,
 * not a separate decision.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Today's count. Lowering this is part of BW-110. */
const CEILING = 50;
/** Where the surface lands after the 5.0 removals. Not enforced yet. */
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
    // The 5.0 target, not yet enforced: the six removals land after a
    // 4.1 deprecation cycle. BW-110 lowers `ceiling` to this number.
    target5_0: TARGET_5_0,
    removalsPending: Math.max(0, names.length - TARGET_5_0),
  }),
);
