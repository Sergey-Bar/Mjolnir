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
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";
import { DEMOTED_FOR_UNSUBSTANTIATED_CORE } from "../../src/rules/tier-evidence.js";
import { exceptionInUnreleasedChangelog } from "../../src/commands/doctor.js";

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

/**
 * Whether THIS change carries an `ANTI-CREEP-EXCEPTION`.
 *
 * Read through `src/commands/doctor.ts`'s own parser rather than a second
 * implementation of "the unreleased section", because this file and
 * `checkAntiCreep` are the SAME Law 1 and were disagreeing about whether it has
 * an escape. Doctor honoured the marker; this gate did not, so the promotion
 * `docs/ANTI-CREEP.md` explicitly calls legal — "promoting `QA-PW-117` and
 * demoting `QA-JV-105` is legal in one commit with no paperwork", or condition
 * 2, an `ANTI-CREEP-EXCEPTION` with its reason — was reported here as a
 * regression.
 *
 * Two implementations of one law is how a law becomes "whatever the stricter
 * one says". This one is now the same call, and the marker is read with the
 * scoping that keeps it from a past release switching the ratchet off forever.
 */
function readChangelogIfPresent() {
  try {
    return readFileSync(join(ARTIFACT_ROOT, "CHANGELOG.md"), "utf8");
  } catch {
    // Absent changelog means no marker was recorded, which is the answer the
    // check needs. Reading it unconditionally instead made every synthetic tree
    // that does not model the whole repository die with ENOENT —
    // `tests/contract/promotion-ratchet.spec.ts` builds five of them to exercise
    // the baseline arms, and a fixture that lacks one file is not a failure of
    // the thing under test.
    //
    // It matches `readChangelog()` in `src/commands/doctor.ts`, which has
    // returned "" on a missing file all along.
    return "";
  }
}

const exceptionRecorded = exceptionInUnreleasedChangelog(
  readChangelogIfPresent(),
);

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

if (netLaunchSetChange > 0 && !exceptionRecorded) {
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

/**
 * Per-core-rule certification: a rule may not hold core without a record in
 * docs/CORE-CERTIFICATION.json, and a record must still describe the rule it
 * certifies.
 *
 * Placed HERE rather than in a new gate for two reasons. It is the promotion
 * gate, so this is where a promotion is checked — and Law 0 charges for a new
 * gate id, so extending the existing one is free where a sibling would not be.
 *
 * The measurement block is compared against the LIVE MEASURED_FP row field by
 * field. That is the part that matters: it makes a certification expire when
 * its evidence moves rather than when somebody remembers to revisit it. Add a
 * false positive, change the detector, or let the verdict corpus drift, and
 * this fails until a person re-certifies and says why.
 */
const CERTIFICATION_PATH = join(
  ARTIFACT_ROOT,
  "docs",
  "CORE-CERTIFICATION.json",
);
let certification = { status: "SKIPPED", reason: "no records file", rules: [] };
if (existsSync(CERTIFICATION_PATH)) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(CERTIFICATION_PATH, "utf8"));
  } catch (err) {
    failures.push(
      `${CERTIFICATION_PATH} is unreadable: ${err.message}. A certification ` +
        "record that cannot be parsed certifies nothing",
    );
    parsed = { records: {} };
  }
  const records = parsed.records ?? {};
  const live = (now.byTier.core ?? []).slice().sort();
  const certProblems = [];

  for (const id of live) {
    const record = records[id];
    if (record === undefined) {
      certProblems.push(
        `${id} holds core with no entry in docs/CORE-CERTIFICATION.json — a ` +
          "promotion that lands with no artifact is a promotion nobody reviewed",
      );
      continue;
    }
    const rule = RULES.find((r) => r.id === id);
    const measured = rule === undefined ? undefined : MEASURED_FP[id];
    if (rule === undefined || measured === undefined) {
      certProblems.push(
        `${id} has a certification but no live measurement to certify`,
      );
      continue;
    }
    if (record.measurement?.detectorRevision !== measured.detectorRevision) {
      certProblems.push(
        `${id} was certified at detector revision ${record.measurement?.detectorRevision} ` +
          `but the live measurement is at ${measured.detectorRevision} — the detector moved, ` +
          `so the certification describes a rule that no longer exists`,
      );
    }
    if (record.measurement?.n !== measured.n) {
      certProblems.push(
        `${id} was certified at n=${record.measurement?.n} but the live measurement ` +
          `is n=${measured.n} — the verdict corpus moved under the record`,
      );
    }
    if (record.measurement?.observedFalsePositives !== (measured.fp ?? 0)) {
      certProblems.push(
        `${id} was certified with ${record.measurement?.observedFalsePositives} observed ` +
          `false positive(s) but the live corpus has ${measured.fp ?? 0}`,
      );
    }
    for (const path of [
      ...(record.evidence?.mustFire ?? []),
      ...(record.evidence?.mustNotFire ?? []),
      ...(record.evidence?.corpusVerdicts ?? []).map((v) => v.file),
    ]) {
      if (!existsSync(join(ARTIFACT_ROOT, path))) {
        certProblems.push(
          `${id} cites ${path}, which does not exist — a certification may not ` +
            "rest on evidence that is not in the tree",
        );
      }
    }
    const rows = (record.evidence?.corpusVerdicts ?? []).reduce(
      (sum, v) => sum + (v.rows ?? 0),
      0,
    );
    if (rows !== measured.n) {
      certProblems.push(
        `${id} cites ${rows} corpus verdict row(s) but the measurement is n=${measured.n} ` +
          "— the cited evidence does not account for the sample it claims to certify",
      );
    }
  }

  for (const id of Object.keys(records)) {
    if (!live.includes(id)) {
      certProblems.push(
        `${id} has a certification record but does not hold core — a record for a ` +
          "rule that lost the tier is history, not certification; the tier evidence " +
          "ledger is where a demotion belongs",
      );
    }
  }

  certification = {
    status: certProblems.length === 0 ? "PASS" : "FAIL",
    path: "docs/CORE-CERTIFICATION.json",
    rules: live,
    problems: certProblems,
  };
  failures.push(...certProblems);
}

/**
 * Tier transitions as state, checked against the live registry.
 *
 * The lesson this encodes: QA-JV-101 was promoted, demoted, and re-promoted,
 * and the only place that history could live was three stacked and mutually
 * contradictory comments in the rule file — which is how a later audit read a
 * single batch of its verdicts, concluded the promotion was fabricated, and
 * nearly reverted a rule that had earned the tier.
 *
 * The obvious fix was new `Tier` values (`demoted`, `deprecated`,
 * `experimental`). Rejected on blast radius: `tier` is read in ~15 non-rule
 * modules, and a value that falls through unhandled in any of them changes
 * finding behaviour silently. Recording history touches none of that.
 *
 * So this checks a claim, not a permission. A record whose last transition says
 * `core` does not make a rule core; the registry does. This only fails when the
 * file and the registry disagree — which is the one error worth failing on.
 */
const TIER_HISTORY_PATH = join(ARTIFACT_ROOT, "docs", "TIER-HISTORY.json");
let tierHistory = { status: "SKIPPED", reason: "no ledger", problems: [] };
if (existsSync(TIER_HISTORY_PATH)) {
  const problems = [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(TIER_HISTORY_PATH, "utf8"));
  } catch (err) {
    failures.push(
      `${TIER_HISTORY_PATH} is unreadable: ${err.message}. A ledger that ` +
        "cannot be parsed records nothing",
    );
    parsed = { records: {} };
  }
  const records = parsed.records ?? {};

  for (const claim of DEMOTED_FOR_UNSUBSTANTIATED_CORE) {
    if (records[claim.ruleId] === undefined) {
      problems.push(
        `${claim.ruleId} was demoted from core and has no entry in ` +
          `docs/TIER-HISTORY.json — a demotion recorded only in a source ` +
          `comment is a demotion the next reader can contradict`,
      );
    }
  }

  for (const [id, record] of Object.entries(records)) {
    const rule = RULES.find((r) => r.id === id);
    if (rule === undefined) {
      problems.push(`${id} has tier history but is not a live rule`);
      continue;
    }
    const transitions = record.transitions;
    if (!Array.isArray(transitions) || transitions.length === 0) {
      problems.push(`${id} has a tier-history record with no transitions`);
      continue;
    }
    for (const t of transitions) {
      if (!t.date || !t.from || !t.to || !t.reason) {
        problems.push(
          `${id} has an incomplete transition — a tier change with no date, ` +
            `direction or reason is not a record`,
        );
      }
    }
    // The load-bearing check: the ledger's last word must be the registry's.
    const last = transitions[transitions.length - 1];
    const live = effectiveTier(rule);
    if (last.to !== live) {
      problems.push(
        `${id} history ends at "${last.to}" but the rule is "${live}" — the ` +
          `ledger and the registry disagree, so one of them is a false claim`,
      );
    }
    // And the chain must be continuous: a gap means an unrecorded transition.
    for (let i = 1; i < transitions.length; i++) {
      if (transitions[i].from !== transitions[i - 1].to) {
        problems.push(
          `${id} history has a gap: "${transitions[i - 1].to}" -> ` +
            `"${transitions[i].from}" is not a transition anyone made`,
        );
      }
    }
    for (const path of record.evidence ?? []) {
      const file = path.split("#")[0];
      if (file.includes("*")) continue;
      if (!existsSync(join(ARTIFACT_ROOT, file))) {
        problems.push(
          `${id} cites ${file}, which does not exist — history may not rest ` +
            `on evidence that is not in the tree`,
        );
      }
    }
  }

  failures.push(...problems);
  tierHistory = {
    status: problems.length === 0 ? "PASS" : "FAIL",
    path: "docs/TIER-HISTORY.json",
    rulesRecorded: Object.keys(records).length,
    demotionsRequired: DEMOTED_FOR_UNSUBSTANTIATED_CORE.length,
    problems,
  };
}

/**
 * The rule constitution: principles, and whether every departure from one is
 * named.
 *
 * The failure this prevents is the one this repository already shipped. `core`
 * was described as empty for a release after two rules held it, because the
 * claim lived in prose and nothing compared it to the registry. The census
 * sentinels fixed that instance; this generalises it. A principle with no
 * enforcement path is a slogan, so every P-article must name the code that
 * enforces it — and a known departure must be an exemption with a reason, not
 * an absence.
 *
 * Note what is deliberately NOT here: two candidate principles that would have
 * read well and would have been wrong. Both are recorded under
 * `explicitNonPrinciples` with the measurement that refutes them, because a
 * constitution that only lists things it agrees with is marketing.
 */
const CONSTITUTION_PATH = join(ARTIFACT_ROOT, "docs", "RULE-CONSTITUTION.json");
let constitution = {
  status: "SKIPPED",
  reason: "no constitution",
  problems: [],
};
if (existsSync(CONSTITUTION_PATH)) {
  const problems = [];
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(CONSTITUTION_PATH, "utf8"));
  } catch (err) {
    failures.push(
      `${CONSTITUTION_PATH} is unreadable: ${err.message}. An unreadable ` +
        "constitution constrains nothing",
    );
    parsed = { principles: [], exemptions: {} };
  }

  const principles = parsed.principles ?? [];
  if (principles.length === 0) {
    problems.push("the constitution states no principles");
  }
  const ids = new Set();
  for (const p of principles) {
    if (!p.id || !p.statement) {
      problems.push("a principle has no id or no statement");
      continue;
    }
    if (ids.has(p.id)) problems.push(`duplicate principle id ${p.id}`);
    ids.add(p.id);
    // The load-bearing requirement: a principle nothing enforces is a wish.
    if (!Array.isArray(p.enforcedBy) || p.enforcedBy.length === 0) {
      problems.push(
        `${p.id} names no enforcing check — a principle with no gate is a ` +
          "slogan, and a slogan cannot be departed from deliberately",
      );
    }
    for (const enforced of p.enforcedBy ?? []) {
      // A command reference ("npm run docs:staleness") is checked by that
      // command, not by a file on disk. Test for that BEFORE splitting, or
      // "npm" is read as a filename and reported as a missing check.
      if (enforced.startsWith("npm ")) continue;
      const file = enforced.split(" ")[0];
      if (file.includes("*")) continue;
      if (!existsSync(join(ARTIFACT_ROOT, file))) {
        problems.push(
          `${p.id} claims enforcement by ${file}, which does not exist — a ` +
            `principle resting on a check that is not there is worse than no ` +
            `principle, because it reads as covered`,
        );
      }
    }
  }

  for (const [name, exemption] of Object.entries(parsed.exemptions ?? {})) {
    if (!exemption.reason || !Array.isArray(exemption.evidence)) {
      problems.push(
        `exemption "${name}" has no reason or no evidence list — an exemption ` +
          "without a reason is just a hole with a label",
      );
    }
    for (const path of exemption.evidence ?? []) {
      const file = path.split("#")[0];
      if (file.includes("*")) continue;
      if (!existsSync(join(ARTIFACT_ROOT, file))) {
        problems.push(
          `exemption "${name}" cites ${file}, which does not exist`,
        );
      }
    }
  }

  for (const n of parsed.explicitNonPrinciples ?? []) {
    if (!n.rejected || !n.measuredReason || !n.whatWouldChangeThis) {
      problems.push(
        `non-principle ${n.id ?? "(unnamed)"} does not carry a measured ` +
          "refutation and a falsifier — a rejected principle with no reason " +
          "will be re-proposed by the next person who had the same idea",
      );
    }
  }

  failures.push(...problems);
  constitution = {
    status: problems.length === 0 ? "PASS" : "FAIL",
    path: "docs/RULE-CONSTITUTION.json",
    principles: principles.length,
    nonPrinciples: (parsed.explicitNonPrinciples ?? []).length,
    exemptions: Object.keys(parsed.exemptions ?? {}).length,
    problems,
  };
}

if (failures.length > 0) {
  console.error("Promotion ratchet failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      certification,
      tierHistory,
      constitution,
      launchSet: {
        tier: "core",
        now: launchSet.length,
        baseline: baseline.core,
        netChange: netLaunchSetChange,
        mustBe: "≤ 0",
        /**
         * Whether the growth above is LICENSED, and why.
         *
         * Reported rather than inferred, because the alternative is a gate that
         * exits 0 while printing `netChange: 1` against a `mustBe: ≤ 0` — a
         * reader who sees a violation and a pass learns to read past both. The
         * exit code says the change was claimed; these two fields say whether
         * the claim was honoured.
         */
        licensed: netLaunchSetChange > 0 ? exceptionRecorded : null,
        license: exceptionRecorded
          ? "the unreleased CHANGELOG.md entry carries an ANTI-CREEP-EXCEPTION with its reason"
          : null,
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
