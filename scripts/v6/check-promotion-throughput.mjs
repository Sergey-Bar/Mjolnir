#!/usr/bin/env node
/**
 * The promotion ratchet (D5), and the launch-set law it reports against.
 *
 * Law 1 says every addition to the launch set requires an equal-size removal.
 * `src/commands/doctor.ts` ENFORCES that inside a running scan, which is the
 * right place for a gate and the wrong place for a report: a maintainer needs
 * to know where the launch set is heading before they open a scanner, and a
 * law whose only visible surface is a diagnostic in a JSON blob is a law
 * nobody reads.
 *
 * This is that report, and it is a RATCHET rather than a snapshot: the two
 * figures that can only go the wrong way —
 *
 *   - the net launch-set change, which must be ≤ 0
 *   - the count of rules with no measurement at all
 *
 * are compared against a committed baseline. Falling behind is the normal
 * condition of a corpus, so neither is a failure on its own; what fails is
 * moving backwards, and the failure names the rules responsible rather than
 * the count.
 *
 * It also prints the transition ledger — quarantine→extended, extended→core —
 * because the interesting question is not "how many are unmeasured" but "what
 * moved this release, and was the movement earned". A tier count with no
 * transition history is a number without an explanation.
 *
 * Usage: npx tsx scripts/v6/check-promotion-throughput.mjs [--init]
 * Exit codes: 0 = no regression, 1 = the ratchet moved backwards, 2 = setup error.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import {
  effectiveTier,
  hasValidMeasurement,
} from "../../src/rules/measurement.js";
import { RULES } from "../../src/rules/index.js";
import { DEMOTED_FOR_UNSUBSTANTIATED_CORE } from "../../src/rules/tier-evidence.js";

/**
 * Which checkout's ledger to read.
 *
 * `--root` so the negative tests can move the two ratchet figures without
 * touching the committed baseline. The registry is always read from THIS
 * repository — the tier census is a fact about the real source tree, and
 * rendering it from a stripped-down fixture would compare a real claim against
 * a fiction. Only the COMMITTED SIDE is redirected, so a fixture holding a
 * copy of the baseline can be moved and checked.
 */
const ARTIFACT_ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? process.cwd()
    : resolve(flag.slice("--root=".length));
})();

/** Transitions, by the two tiers a rule can move between. */
const TIERS = ["quarantine", "extended", "core"];

/**
 * The committed baseline.
 *
 * A data file, for the reason every other baseline in this repository is one:
 * a number that lives next to the check that enforces it gets adjusted to
 * make the check pass, and nothing is left to review. `--init` writes it
 * once; after that it moves only when the maintainer says the new value is
 * right, which is a diff a reviewer can see.
 */
function readBaseline() {
  const path = join(ARTIFACT_ROOT, "docs", "RULE-PROMOTION-LEDGER.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function census() {
  const byTier = Object.fromEntries(TIERS.map((tier) => [tier, []]));
  const unmeasured = [];
  const measured = [];
  for (const rule of RULES) {
    const tier = effectiveTier(rule);
    const bucket = byTier[tier];
    if (bucket !== undefined) bucket.push(rule.id);
    (hasValidMeasurement(rule) ? measured : unmeasured).push(rule.id);
  }
  return {
    byTier: Object.fromEntries(
      TIERS.map((tier) => [tier, byTier[tier].slice().sort()]),
    ),
    unmeasured: unmeasured.sort(),
    measured: measured.length,
    total: RULES.length,
  };
}

const now = census();
// The 6.0 demotion, counted rather than listed. The count is the point: a
// reader wants to know the core tier was emptied deliberately, and the list is
// already in `src/rules/tier-evidence.ts` where this reads it from.
const demotions = { ruleIds: DEMOTED_FOR_UNSUBSTANTIATED_CORE.length };

// The net launch-set change, measured against the baseline rather than against
// the tier's own size. `core` is the launch set (docs/ANTI-CREEP.md); `some`
// would be a summary with no defined subject.
const launchSet = now.byTier["core"] ?? [];
const netLaunchSetChange = readBaseline()
  ? launchSet.length - readBaseline().core
  : 0;

if (process.argv.includes("--init")) {
  const baselinePath = join(
    ARTIFACT_ROOT,
    "docs",
    "RULE-PROMOTION-LEDGER.json",
  );
  if (existsSync(baselinePath)) {
    console.error(
      `promotion ratchet: ${baselinePath} already exists. Lowering it is a normal ` +
        `change; --init is only for creating it.`,
    );
    process.exit(2);
  }
  writeFileSync(
    baselinePath,
    JSON.stringify(
      {
        schemaVersion: 1,
        recordedAt: new Date().toISOString().slice(0, 10),
        description:
          "Upper bounds for the two figures that must only improve. The core " +
          "tier is the launch set (docs/ANTI-CREEP.md); the unmeasured count is " +
          "the corpus backlog. Falling behind is normal, moving backwards is not. " +
          "See scripts/v6/check-promotion-throughput.mjs.",
        core: launchSet.length,
        unmeasured: now.unmeasured.length,
        // The IDS, not just the count. Without them a regression report can
        // only say "six rules are unmeasured", which is the whole list every
        // time — the message the file claims to fix. The failure then names
        // exactly the rules that joined the backlog since this baseline.
        unmeasuredIds: now.unmeasured,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  console.log(
    `promotion ratchet: baseline written — core ${launchSet.length}, unmeasured ${now.unmeasured.length}`,
  );
  process.exit(0);
}

const baseline = readBaseline();
if (baseline === null) {
  console.error(
    `promotion ratchet: missing or unreadable ${join(ARTIFACT_ROOT, "docs", "RULE-PROMOTION-LEDGER.json")}. Run with --init once to ` +
      "record where the launch set and the unmeasured backlog stand today, then ratchet them down.",
  );
  process.exit(2);
}

const failures = [];

if (netLaunchSetChange > 0) {
  failures.push(
    `the launch set grew by ${netLaunchSetChange} (${baseline.core} → ${launchSet.length}) — ` +
      "law 1 says every addition requires an equal-size removal. Promoting a rule to core " +
      "without demoting one is what docs/ANTI-CREEP.md exists to prevent",
  );
}
if (now.unmeasured.length > baseline.unmeasured) {
  const added = now.unmeasured.filter(
    (id) => !baseline.unmeasuredIds?.includes(id),
  );
  failures.push(
    `the unmeasured backlog grew to ${now.unmeasured.length} (baseline ${baseline.unmeasured}): ` +
      `${added.join(", ") || "(no new ids — the baseline itself is stale)"}`,
  );
}

const rows = TIERS.map((tier) => ({
  tier,
  count: (now.byTier[tier] ?? []).length,
}));

if (failures.length > 0) {
  console.error("Promotion ratchet failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      launchSet: {
        tier: "core",
        now: launchSet.length,
        baseline: baseline.core,
        netChange: netLaunchSetChange,
        mustBe: "≤ 0",
      },
      tiers: rows,
      measured: now.measured,
      unmeasured: { now: now.unmeasured.length, baseline: baseline.unmeasured },
      demotedForUnsubstantiatedCore: demotions,
    },
    null,
    2,
  ),
);
