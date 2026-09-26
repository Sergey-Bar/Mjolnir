#!/usr/bin/env node

import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const SUMMARY = join(process.cwd(), "coverage", "coverage-summary.json");

/**
 * TWO different numbers, doing two different jobs. Conflating them is what
 * made this gate a nuisance instead of a tool.
 *
 * 1. THE FLOOR — a catastrophe guard, at the industry-standard 80%.
 *
 *    This is the number the market gates on, and it is not a statement about
 *    this repository. It exists so that a change which removes most of the
 *    suite, or excludes the source from instrumentation, or breaks coverage
 *    collection entirely, cannot pass. 98% floors were never the point and
 *    made the gate fail for ordinary reasons — which is how a gate gets
 *    deleted.
 *
 * 2. THE RATCHET — the high-water marks, with a tolerance.
 *
 *    This is what this project actually wanted: coverage must not quietly
 *    erode. The marks are the highest values measured, and the tolerance
 *    absorbs the platform spread (a Windows run and an ubuntu run differ by
 *    ~0.04 here) plus the ordinary churn of adding a function. A 0.5-point
 *    tolerance means a real regression fails and an ordinary change does not.
 *
 * Both numbers move in one direction only, and every movement is a deliberate
 * act recorded in `docs/COVERAGE-GATE.md`. Neither can be raised
 * silently.
 */

/** The catastrophe guard. The conventional minimum. */
const FLOOR = 80.0;

/**
 * Highest measured values. A metric must stay within TOLERANCE of its mark.
 * Update a mark only when coverage has genuinely risen, and only in the same
 * change that raised it.
 */
const HIGH_WATER = {
  statements: 98.28,
  branches: 95.58,
  functions: 99.17,
  lines: 98.64,
};

/**
 * How far below a high-water mark a run may land. Absorbs platform spread and
 * ordinary churn; a real regression is bigger than this.
 */
const TOLERANCE = 0.5;

if (!existsSync(SUMMARY)) {
  console.error(
    `coverage ratchet: missing ${SUMMARY}; run npm run test:coverage first`,
  );
  process.exit(1);
}

const summary = JSON.parse(readFileSync(SUMMARY, "utf8"));
const total = summary.total;

const metrics = Object.keys(HIGH_WATER);
const rows = metrics.map((metric) => {
  const pct = Number(total?.[metric]?.pct);
  const mark = HIGH_WATER[metric];
  const ratchet = mark - TOLERANCE;
  return {
    metric,
    pct,
    mark,
    ratchet,
    aboveFloor: Number.isFinite(pct) && pct >= FLOOR,
    withinRatchet: Number.isFinite(pct) && pct >= ratchet,
    ok: Number.isFinite(pct) && pct >= FLOOR && pct >= ratchet,
  };
});

const fmt = (n) => (Number.isFinite(n) ? `${n.toFixed(2)}%` : "missing");

const lines = [
  "## Coverage",
  "",
  `Floor ${FLOOR.toFixed(2)}% (catastrophe guard) · ratchet = high-water mark − ${TOLERANCE} point`,
  "",
  "| Metric | Measured | Ratchet | Floor | Verdict |",
  "| --- | ---: | ---: | ---: | --- |",
  ...rows.map(
    ({ metric, pct, ratchet, aboveFloor, withinRatchet }) =>
      `| ${metric} | ${fmt(pct)} | ${fmt(ratchet)} | ${FLOOR.toFixed(2)}% | ${
        aboveFloor && withinRatchet
          ? "PASS"
          : !aboveFloor
            ? "BELOW FLOOR"
            : "RATCHET DROPPED"
      } |`,
  ),
  "",
  `High-water marks: ${metrics
    .map((m) => `${m} ${HIGH_WATER[m].toFixed(2)}%`)
    .join(" · ")}`,
  "",
];

console.log(lines.join("\n"));

if (process.env["GITHUB_STEP_SUMMARY"]) {
  appendFileSync(process.env["GITHUB_STEP_SUMMARY"], `${lines.join("\n")}\n`);
}

const failures = rows.filter((row) => !row.ok);
if (failures.length > 0) {
  console.error(
    `coverage gate failed: ${failures
      .map(({ metric, pct, mark, ratchet }) =>
        pct < FLOOR
          ? `${metric} ${pct}% is below the ${FLOOR}% floor`
          : `${metric} ${pct}% has fallen ${(ratchet - pct).toFixed(2)} points below its high-water mark of ${mark.toFixed(2)}%`,
      )
      .join("; ")}`,
  );
  console.error(
    "\nA drop above the floor but below the mark is real erosion, not noise: " +
      "cover the new code, or record a deliberate decision in " +
      "docs/COVERAGE-GATE.md.",
  );
  process.exit(1);
}
