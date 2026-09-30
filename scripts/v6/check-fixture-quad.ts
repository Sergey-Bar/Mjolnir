/**
 * `npm run rules:quad:check` — the fixture-quad census.
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
 * every run; pass `--write` to also persist the census to
 * `docs/FIXTURE-QUAD.json` so a backfill in progress is visible in a diff
 * rather than only in a terminal.
 *
 * Usage: node scripts/v6/check-fixture-quad.ts [--root=<dir>]
 * Exit codes: 0 = no over-claim, 1 = a capability claims M3 without its legs.
 */

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

const report = {
  status: overClaims.length === 0 ? "PASS" : "FAIL",
  gate: "rules:quad:check",
  rules: census.length,
  rulesWithCompleteQuad: complete.length,
  presentByLeg: byLeg,
  /** The work list, per leg. A maintainer adding a leg only reads this. */
  missingByLeg,
  /** Per-capability coverage, as a ratio, so `some` is visible. */
  capabilityCoverage,
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
    "own fixture (`npm run corpus:quad:verdicts`), never by a tick. What that " +
    "proves is that the rule is WIRED and directional: it fires on the case built " +
    "for it, and is silent on the clean case. What it does NOT prove is the " +
    "false-positive rate on real code — that is `MEASURED_FP`, a separate axis, " +
    "and the core tier needs BOTH. A fixture-authored quad is a wiring proof, " +
    "not an accuracy proof, and the two are reported separately for that reason.",
};

if (process.argv.includes("--write")) {
  mkdirSync(dirname(REPORT), { recursive: true });
  const next = JSON.stringify(report, null, 2) + "\n";
  if (existsSync(REPORT) && readFileSync(REPORT, "utf8") === next) {
    console.log(`fixture-quad: unchanged (${report.rules} rules)`);
  } else {
    writeFileSync(REPORT, next, "utf8");
    console.log(`fixture-quad: wrote ${REPORT}`);
  }
}

console.log(JSON.stringify(report, null, 2));
if (report.status === "FAIL") {
  console.error(
    `\nrules:quad:check: ${overClaims.length} capability/capabilities advertise M3 ` +
      "without a complete fixture quad. M3 is a claim about behaviour; the fixture " +
      "directories are a claim about files.",
  );
  process.exit(1);
}
