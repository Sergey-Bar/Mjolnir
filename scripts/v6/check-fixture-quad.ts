/**
 * `npm run check-fixture-quad` — the fixture-quad census.
 *
 * `M3_FIXTURE_VERIFIED` is unreachable today, and until now "unreachable" was
 * a hardcoded `false` in two places with two different comments. A tier that
 * cannot be reached is a legitimate state; a tier that cannot be reached for a
 * reason nobody can read is a mystery that gets re-litigated every few
 * months.
 *
 * So this gate publishes the reason as data. For every live rule it says which
 * of the four legs are present and which are missing, and it FAILS if any
 * capability claims M3 without them — the same invariant the registry
 * enforces, asserted from the other side so a regression in either resolver
 * shows up here.
 *
 * The failure direction is what makes it useful as a ratchet: this gate does
 * not fail because the legs are missing (they are, and they are the Wave 3
 * backfill's work list, not a defect anyone introduced today). It fails only
 * when a claim outruns its evidence. Missing legs are printed and counted on
 * every run, and the census is WRITTEN to `docs/FIXTURE-QUAD.json` on every run
 * so a backfill in progress is visible in a diff rather than only in a
 * terminal. `--check` verifies the committed artifact instead of writing it.
 *
 * It also enforces the PRECISION ratchet (`docs/PRECISION-RATCHET.json`): the
 * count of live rules with an explicitly classified TN leg may not fall below
 * the recorded floor. Raise it with `--update-precision`, never by editing the
 * file — the flag writes the diff of rules that gained the leg, which is the
 * evidence a hand edit cannot produce.
 *
 * Usage: node scripts/v6/check-fixture-quad.ts [--root=<dir>] [--check] [--verdicts] [--update-precision]
 * Exit codes: 0 = no over-claim and the PRECISION ratchet holds, 1 = a capability
 * claims M3 without its legs OR the ratchet fell below its floor, 2 = `--check`
 * found a stale or missing artifact.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import {
  buildCapabilityRegistry,
  realCapabilityEvidence,
} from "../../src/v6/capability-registry.js";
import {
  countCompleteQuads,
  QUAD_LEGS,
  quadCensus,
  ruleHasCompleteQuad,
} from "../../src/v6/fixture-quad-probe.js";
import { maturityRank } from "../../src/v6/maturity.js";
import {
  check as sensitivityCheck,
  MUTANT_MAX_DIVERGENCE,
  update as updateSensitivity,
} from "../check-fixture-sensitivity.js";

// `../..` and not `..`: this file is two directories below the root
// (`scripts/v6/`), and the first version resolved to `scripts/`, which made
// every leg read as absent — a gate reporting "0 of 79 rules have a
// must-fire fixture" when 55 of them plainly do. A wrong root produces a
// plausible, uniformly-red answer, which is the worst kind.
const DEFAULT_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ROOT = (() => {
  const flag = process.argv.find((arg) => arg.startsWith("--root="));
  return flag === undefined
    ? DEFAULT_ROOT
    : resolve(flag.slice("--root=".length));
})();
const REPORT = join(ROOT, "docs", "FIXTURE-QUAD.json");

/**
 * `--verdicts`: build the RECALL and PRECISION legs by RUNNING the scanner
 * over each rule's own fixture, then fall through to the census.
 *
 * This used to be a second npm name (`corpus:quad:verdicts`) pointing at a
 * second file, and the census doc pointed readers at it. Two names for one
 * subject is the defect the script-name contract exists to remove, so the
 * write step became a flag of the name the docs already named.
 *
 * It is spawned rather than imported because the builder is 250 lines of
 * top-level side effect that owns its own `--dry`; wrapping it in a module
 * boundary would be a refactor of working code to satisfy a naming rule.
 * The path is resolved from this file's location, so the spawn does not
 * depend on the caller's CWD — the same rule the root flag above exists for.
 */
if (process.argv.includes("--verdicts")) {
  execFileSync(
    process.execPath,
    [
      join(ROOT, "node_modules", "tsx", "dist", "cli.mjs"),
      join(ROOT, "scripts", "corpus", "quad-verdicts.ts"),
      ...process.argv.filter((arg) => arg === "--dry"),
    ],
    { cwd: ROOT, stdio: "inherit" },
  );
}

const census = quadCensus(ROOT);
const complete = census.filter((row) => row.complete);
const byLeg = Object.fromEntries(
  QUAD_LEGS.map((leg) => [
    leg,
    census.filter((row) => row.present.includes(leg)).length,
  ]),
);

const missingByLeg = Object.fromEntries(
  QUAD_LEGS.map((leg) => [
    leg,
    census.filter((row) => row.missing.includes(leg)).map((row) => row.ruleId),
  ]),
);

/**
 * Every capability advertising M3, checked against its OWN rules.
 *
 * "Own rules" means at least ONE of them satisfies all four legs, which is the
 * same `some` basis the registry's `hasFixtureQuad` uses. The first version of
 * this check flagged every M3 entry whose rule list was not FULLY complete,
 * which contradicted the registry it exists to cross-check: playwright
 * advertises M3 on the strength of one QA-PW rule, and this gate called that an
 * over-claim while the registry called it earned. Two gates disagreeing about
 * the same capability is the defect this whole task removes.
 */
const registry = buildCapabilityRegistry({
  evidence: realCapabilityEvidence(),
  observedAt: new Date().toISOString().slice(0, 10),
  root: ROOT,
});

const overClaims = registry.entries.filter(
  (entry) =>
    maturityRank(entry.maturity) >= maturityRank("M3_FIXTURE_VERIFIED") &&
    !entry.rules.some((id) => ruleHasCompleteQuad(id, ROOT)),
);

/**
 * Per-capability coverage, as a RATIO.
 *
 * The count comes from `countCompleteQuads`, the SAME helper the probe's
 * `capabilityQuadComplete` decides on — the first version inlined
 * `rules.some(quad)` here, which is the predicate a second time, and a gate
 * that re-implements the rule it checks is a gate that can disagree with it.
 *
 * The registry's `hasFixtureQuad` is `some`: a capability is fixture-verified
 * when at least ONE of its rules demonstrates it. That is the right reading
 * for a capability (a framework is not un-fixtured because one of its thirty
 * rules has no negative fixture) and the wrong reading if a reader assumes
 * `all`. Printing `1/22` makes the choice visible instead of implied, which is
 * the difference between a convention and an accident.
 */
const capabilityCoverage = registry.entries
  .filter((entry) => entry.rules.length > 0)
  .map((entry) => {
    const counts = countCompleteQuads(entry.rules, ROOT);
    return {
      id: entry.id,
      maturity: entry.maturity,
      complete: counts.complete,
      of: counts.total,
      basis: counts.complete === 0 ? "none" : "some",
    };
  })
  .sort((a, b) => a.complete / a.of - b.complete / b.of);

/**
 * THE PRECISION RATCHET — the number of live rules with an explicitly
 * classified TN leg.
 *
 * This is the arm that was missing. RECALL and MUST-FIRE are satisfied by a
 * finding; MUST-NOT-FIRE by the existence of a directory. PRECISION alone
 * requires someone to have CLASSIFIED the detector as silent on a real input —
 * `quadFor` reads it as `tn > 0 && fp === 0`, and the "absence of an
 * accusation is not a finding of innocence" comment above it is the reason.
 * Nothing in the shipped registry had one, so no rule had ever been shown
 * capable of staying quiet, and the ceiling that would have caught that
 * (`M3_FIXTURE_VERIFIED`) was unreachable anyway.
 *
 * It is a RATCHET and not a target, for the same reason the unclassified
 * ceiling and `MAX_UNMEASURED_CORE` are: a gate that went red on all 79 rules
 * on day one would stay red and read as noise, which is exactly how raising
 * `MAX_SAMPLES_PER_RULE` produced 1,121 unadjudicated rows nobody looked at.
 * The floor moves only UP, only via `--update`, and the recorded diff is the
 * evidence.
 *
 * It is deliberately SEPARATE from the over-claim check below. They can fail
 * independently, and collapsing them into one status is how a backfill that
 * adds no TN legs gets reported as a precision failure — a mislabel that would
 * send the next maintainer to the wrong work list. `unsure-ceiling.json` and
 * `MAX_UNMEASURED_CORE` (47 -> 40) are the same pattern in two other places.
 */
const PRECISION_RATCHET = join(ROOT, "docs", "PRECISION-RATCHET.json");

function precisionRatchetFloor(): number {
  if (!existsSync(PRECISION_RATCHET)) return 0;
  const parsed: unknown = JSON.parse(readFileSync(PRECISION_RATCHET, "utf8"));
  const floor = (parsed as { floor?: unknown }).floor;
  if (typeof floor !== "number" || !Number.isInteger(floor) || floor < 0) {
    throw new Error(
      `docs/PRECISION-RATCHET.json: floor must be a non-negative integer, got ${JSON.stringify(floor)}. ` +
        "A ratchet whose own floor is unreadable cannot be enforced, and defaulting it to 0 would " +
        "silently delete the check.",
    );
  }
  return floor;
}

/** Live rules whose PRECISION leg is satisfied by a classified TN. */
const precisionProven = census
  .filter((row) => row.present.includes("PRECISION"))
  .map((row) => row.ruleId)
  .sort();

const precisionFloor = precisionRatchetFloor();
const precisionOk = precisionProven.length >= precisionFloor;

/**
 * The SENSITIVITY arm. `--update-sensitivity` is the deliberate write path,
 * separate from `--update-precision` on purpose: one records a new precision
 * verdict, the other re-baselines a measured fixture pair, and conflating them
 * would let a backfill silently move a measurement floor.
 */
if (process.argv.includes("--update-sensitivity")) {
  updateSensitivity([]);
}
const sensitivity = sensitivityCheck();

if (process.argv.includes("--update-precision")) {
  if (precisionProven.length === precisionFloor) {
    console.log(
      `precision ratchet: unchanged at ${precisionFloor} (${precisionProven.length} rules with a TN leg)`,
    );
  } else {
    // The diff NAMES every rule that gained the leg. A ratchet whose floor can
    // move by any amount to any value, with no record of what moved, is a
    // number somebody typed — so the gained set is computed against the rules
    // the previous recording listed, and written into the file.
    const previous = existsSync(PRECISION_RATCHET)
      ? (
          JSON.parse(readFileSync(PRECISION_RATCHET, "utf8")) as {
            rules?: unknown;
          }
        ).rules
      : undefined;
    const before = new Set(
      Array.isArray(previous)
        ? previous.filter((v) => typeof v === "string")
        : [],
    );
    const gained = precisionProven.filter((id) => !before.has(id));
    mkdirSync(dirname(PRECISION_RATCHET), { recursive: true });
    writeFileSync(
      PRECISION_RATCHET,
      JSON.stringify(
        {
          floor: precisionProven.length,
          note:
            `Live rules whose PRECISION leg holds — an explicitly classified TN row and no FP. ` +
            `Raised from ${precisionFloor} to ${precisionProven.length}. ` +
            `WHAT THIS IS NOT: most of these TN rows were produced by EXECUTING the scanner over ` +
            `the rule's own fixtures (npm run check-fixture-quad --verdicts), so they prove the ` +
            `detector is DIRECTIONAL — it fires on the case built for it and is silent on the ` +
            `clean case. That is a wiring proof, not an accuracy proof, and a self-derived one. ` +
            `The accuracy axis is MEASURED_FP over held-out corpus rows (docs/HOLDOUT-SPLIT.json). ` +
            `Criteria for a HAND-classified leg: tests/corpus/verdicts/README.md.`,
          gained,
          rules: precisionProven,
          updatedAt: process.env.SOURCE_DATE_EPOCH
            ? new Date(
                Number(process.env.SOURCE_DATE_EPOCH) * 1000,
              ).toISOString()
            : new Date().toISOString(),
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    console.log(
      `precision ratchet: ${precisionFloor} -> ${precisionProven.length} (+${precisionProven.length - precisionFloor})`,
    );
  }
}

const report = {
  status:
    overClaims.length === 0 && precisionOk && sensitivity.status === "PASS"
      ? "PASS"
      : "FAIL",
  gate: "check-fixture-quad",
  rules: census.length,
  rulesWithCompleteQuad: complete.length,
  presentByLeg: byLeg,
  /** The work list, per leg. A maintainer adding a leg only reads this. */
  missingByLeg,
  /** Per-capability coverage, as a ratio, so `some` is visible. */
  capabilityCoverage,
  /**
   * The PRECISION arm, kept as its own section rather than folded into
   * `status`, because it fails for a different reason and points at different
   * work. A reader who sees FAIL and looks only at `overClaims` is looking at
   * the wrong list.
   */
  precision: {
    ratchetFloor: precisionFloor,
    proven: precisionProven.length,
    ok: precisionOk,
    rules: precisionProven,
    belowFloor: precisionOk
      ? []
      : [
          `${precisionProven.length} rule(s) have a classified TN leg, below the ratchet floor of ${precisionFloor}. ` +
            "A backfill was reverted, or a verdict row was withdrawn. Classify the TN legs, or " +
            "lower the floor deliberately with --update-precision.",
        ],
  },
  /**
   * The SENSITIVITY arm: is the MUST-NOT-FIRE fixture the must-fire fixture
   * with the defect neutralised, or a different program that merely does not
   * trigger? Kept beside PRECISION rather than inside it because it answers a
   * different question. PRECISION asks whether the detector is silent on clean
   * input. This asks whether the clean input was DERIVED from the dirty one —
   * which is what makes silence evidence about the predicate instead of
   * evidence about an unrelated file.
   *
   * Folded into this gate rather than added beside it: same subject (fixture
   * legs), and Law 0 charges for a new gate id. Reported on its own so a
   * reader who sees FAIL knows which list to read.
   */
  sensitivity: {
    ratchetFloor: sensitivity.floor,
    mutantPairs: sensitivity.live,
    pairedRules: sensitivity.paired,
    ok: sensitivity.status === "PASS",
    rules: sensitivity.recorded,
    threshold: MUTANT_MAX_DIVERGENCE,
    belowFloor:
      sensitivity.status === "PASS"
        ? []
        : sensitivity.details.map(
            (d) =>
              `${d}. The SENSITIVITY ratchet only ratchets UP, so re-running --update-sensitivity will not clear this: lower docs/SENSITIVITY-RATCHET.json by hand, deliberately.`,
          ),
  },
  /** Capabilities that advertise M3 with no complete quad behind it. */
  overClaims: overClaims.map((entry) => ({
    id: entry.id,
    maturity: entry.maturity,
    rules: entry.rules,
  })),
  rule:
    "A capability may advertise M3_FIXTURE_VERIFIED when at least one of its rules " +
    `satisfies all four legs (${QUAD_LEGS.join(", ")}); the report prints the ratio ` +
    "per capability so `some` is visible. A RECALL or PRECISION leg is satisfied by " +
    "a verdict this repository GENERATED BY EXECUTING the scanner over the rule's " +
    "own fixture (`npm run check-fixture-quad --verdicts`), never by a tick. What that " +
    "proves is that the rule is WIRED and directional: it fires on the case built " +
    "for it, and is silent on the clean case. What it does NOT prove is the " +
    "false-positive rate on real code — that is `MEASURED_FP`, a separate axis, " +
    "and the core tier needs BOTH. A fixture-authored quad is a wiring proof, " +
    "not an accuracy proof, and the two are reported separately for that reason.",
};

/**
 * The report is WRITTEN by default, and `--check` is the opt-out.
 *
 * It used to be written only under `--write`, and nothing in this repository
 * passes `--write`. So the gate ran on every pull request, printed a census to
 * a terminal nobody reads, and left no artifact behind — which means a backfill
 * in progress was invisible in a diff, and the only record of the quad state
 * was the last console line of whoever happened to run it. A gate whose output
 * cannot be reviewed after the fact is a gate whose claim is unreviewable.
 *
 * Writing by default makes the artifact drift-gated: CI runs this on every PR
 * and a rule that gains or loses a leg now shows up as a diff in
 * `docs/FIXTURE-QUAD.json` that a reviewer can read, rather than as a number
 * that changed.
 *
 * `--check` is what `--write` was for before it was used: verify the committed
 * artifact matches a fresh render and write nothing. It is deliberately NOT the
 * default, because a check-mode gate is the status quo this change is fixing.
 */
const CHECK_ONLY = process.argv.includes("--check");

/**
 * The artifact is written PRETTIER-CLEAN, and that is load-bearing rather than
 * cosmetic.
 *
 * `JSON.stringify(report, null, 2)` is not what `prettier --check` accepts for
 * this document — prettier collapses the short numeric arrays and reflows some
 * objects. So a plain stringify writes a file that `npm run lint` rejects, and
 * because `lint` runs EARLIER in the certify chain than this gate, the second
 * certify run fails on the file the first one wrote. Two gates fighting over one
 * artifact, where the loser is whichever ran first.
 *
 * `generate-quarantine-ledger.ts` already does this (`renderForCommit` formats
 * through prettier before writing); this follows the same rule for the same
 * reason. When prettier is unavailable the raw stringify is used rather than
 * failing the gate — a missing formatter must not turn the census into a
 * blocker, and `lint` remains the thing that enforces formatting.
 */
async function renderArtifact(): Promise<string> {
  const raw = JSON.stringify(report, null, 2) + "\n";
  try {
    const prettier = await import("prettier");
    return await prettier.format(raw, { parser: "json" });
  } catch {
    return raw;
  }
}

const artifact = await renderArtifact();

if (CHECK_ONLY) {
  if (!existsSync(REPORT)) {
    console.error(
      `fixture-quad: ${REPORT} does not exist. Run \`npm run check-fixture-quad\` ` +
        "once to write it, or drop --check to write it now.",
    );
    process.exit(2);
  }
  if (readFileSync(REPORT, "utf8") !== artifact) {
    console.error(
      `fixture-quad: ${REPORT} is stale — the live census differs. ` +
        "Run `npm run check-fixture-quad` to re-record it and read the diff.",
    );
    process.exit(2);
  }
  console.log(
    `fixture-quad: ${REPORT} matches the live census (${report.rules} rules)`,
  );
} else {
  mkdirSync(dirname(REPORT), { recursive: true });
  if (existsSync(REPORT) && readFileSync(REPORT, "utf8") === artifact) {
    console.log(`fixture-quad: unchanged (${report.rules} rules)`);
  } else {
    writeFileSync(REPORT, artifact, "utf8");
    console.log(`fixture-quad: wrote ${REPORT}`);
  }
}

console.log(JSON.stringify(report, null, 2));
if (report.status === "FAIL") {
  // The two failures are named separately, because they are different defects
  // with different work lists and a reader who is told only "FAIL" has to
  // guess which one they are looking at.
  if (overClaims.length > 0) {
    console.error(
      `\ncheck-fixture-quad: ${overClaims.length} capability/capabilities advertise M3 ` +
        "without a complete fixture quad. M3 is a claim about behaviour; the fixture " +
        "directories are a claim about files.",
    );
  }
  if (!precisionOk) {
    console.error(
      `\ncheck-fixture-quad: PRECISION ratchet — ${precisionProven.length} rule(s) with a ` +
        `classified TN leg, floor is ${precisionFloor}. This is the arm that proves a detector ` +
        "can STAY QUIET, and absence of an accusation is not a finding of innocence.",
    );
  }
  process.exit(1);
}
