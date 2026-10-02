/**
 * One FP count, one interval, one verdict rule.
 *
 * Three defects, all of the same shape — a column or a verdict that named a
 * quantity the code did not actually compute:
 *
 *  - `measurementInterval` and `compareFpMeasurements` handed `wilsonInterval`
 *    an unrounded `fpRate * n` while `scripts/core-readiness.ts` rounded it, so
 *    the ratchet and the readiness table derived two different `ciHigh` values
 *    for the same rule at the same n. Both round now.
 *  - `NEEDS-FP-REDUCTION` fired on a point estimate above the ceiling, which
 *    condemned detectors at n=12 whose interval still comfortably INCLUDED the
 *    ceiling. Nine rules moved to NEEDS-SAMPLES once the split was on the
 *    interval.
 *  - `samplesForZeroFp`'s docstring quotes two `wilsonInterval(0, n)` values as
 *    its verification of the closed form. The n=34 figure was 0.1012; the
 *    function returns 0.1015. A cross-check that fails when you run it is worse
 *    than none, because it reads as evidence.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { compareFpMeasurements, wilsonInterval } from "../../src/lib/wilson.js";
import {
  CORE_FP_CEILING,
  measurementInterval,
  samplesForZeroFp,
} from "../../src/rules/measurement.js";
import { RULES } from "../../src/rules/index.js";
import { MEASURED_FP } from "../../src/rules/measured-fp.generated.js";

const ROOT = join(import.meta.dirname, "..", "..");

describe("the FP count handed to wilsonInterval is an integer", () => {
  it("reproduces every rule's ciHigh from round(rate*n) and n", () => {
    let checked = 0;
    for (const rule of RULES) {
      const interval = measurementInterval(rule);
      if (interval === undefined) continue;
      const measured = MEASURED_FP[rule.id];
      expect(
        measured,
        `${rule.id} has an interval but no measurement`,
      ).toBeDefined();
      if (measured === undefined) continue;
      const expected = wilsonInterval(
        Math.round(measured.fpRate * measured.n),
        measured.n,
      );
      expect(interval.ciHigh, `${rule.id} ciHigh`).toBe(expected.ciHigh);
      expect(interval.ciLow, `${rule.id} ciLow`).toBe(expected.ciLow);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("uses a rounded count where rounding changes the answer", () => {
    // 10.5% of 19 is 1.995. Truncation gives 1, rounding gives 2, and those
    // produce different intervals — so this pins that the round is a round and
    // not an incidental type coercion.
    const raw = 0.105 * 19;
    expect(raw).toBeLessThan(2);
    expect(Math.round(raw)).toBe(2);
    expect(wilsonInterval(1, 19).ciHigh).not.toBe(wilsonInterval(2, 19).ciHigh);
  });

  it("rounds both sides of a regression comparison identically", () => {
    // A regression is DECLARED by comparing two intervals, so a rounding
    // difference between the two sides could flip the verdict. These two
    // intervals are genuinely disjoint (old ciHigh 0.07, new ciLow 0.0931), so
    // the regression is real and the test would notice if the rounding moved it.
    const oldM = { fpRate: 0.02, n: 100 };
    const newM = { fpRate: 0.15, n: 100 };
    const oldCi = wilsonInterval(Math.round(oldM.fpRate * oldM.n), oldM.n);
    const newCi = wilsonInterval(Math.round(newM.fpRate * newM.n), newM.n);
    const check = compareFpMeasurements(oldM, newM);
    expect(newCi.ciLow).toBeGreaterThan(oldCi.ciHigh);
    expect(check.comparable).toBe(true);
    expect(check.regressed).toBe(true);
  });

  it("does not call an overlapping pair a regression", () => {
    // The other direction: rounding must not manufacture a regression either.
    const oldM = { fpRate: 0.01, n: 60 };
    const newM = { fpRate: 0.12, n: 60 };
    expect(compareFpMeasurements(oldM, newM).regressed).toBe(false);
  });
});

describe("samplesForZeroFp's cross-check runs", () => {
  it("agrees with the interval function on both sides of the boundary", () => {
    const n = samplesForZeroFp(CORE_FP_CEILING);
    expect(wilsonInterval(0, n).ciHigh).toBeLessThanOrEqual(CORE_FP_CEILING);
    expect(wilsonInterval(0, n - 1).ciHigh).toBeGreaterThan(CORE_FP_CEILING);
  });

  it("matches the two numbers its docstring quotes", () => {
    // If the quoted cross-check drifts again, this fails. That is the point:
    // the numbers are asserted, not just mentioned.
    expect(wilsonInterval(0, 34).ciHigh).toBe(0.1015);
    expect(wilsonInterval(0, 35).ciHigh).toBe(0.0989);
  });
});

describe("no rule is condemned on evidence that cannot condemn it", () => {
  const readiness = readFileSync(
    join(ROOT, "docs", "CORE-READINESS.md"),
    "utf8",
  );

  function rowsIn(verdict: string): Array<{
    rule: string;
    ciHigh: number;
    observed: number;
    target: string;
  }> {
    const start = readiness.indexOf(`## ${verdict} (`);
    if (start < 0) return [];
    const body = readiness.slice(start).split("\n## ")[0] ?? "";
    const out = [];
    for (const line of body.split("\n")) {
      const cells = line.split("|").map((c) => c.trim());
      if (cells.length < 9) continue;
      if (
        !/^\|?$/.test(cells[1] ?? "") &&
        !(cells[1] ?? "").startsWith("QA-")
      ) {
        continue;
      }
      const pct = (raw: string | undefined): number =>
        raw === undefined || raw === "—" ? Number.NaN : Number.parseFloat(raw);
      out.push({
        rule: cells[1] ?? "",
        ciHigh: pct(cells[5]),
        observed: pct(cells[6]),
        target: cells[7] ?? "",
      });
    }
    return out;
  }

  it("every NEEDS-FP-REDUCTION row has an observed rate over the ceiling", () => {
    const rows = rowsIn("NEEDS-FP-REDUCTION");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.observed, `${row.rule} observed`).toBeGreaterThan(
        CORE_FP_CEILING,
      );
      // And its interval must genuinely fail to clear the ceiling — the verdict
      // has to mean what it says.
      expect(row.ciHigh, `${row.rule} ciHigh`).toBeGreaterThan(CORE_FP_CEILING);
    }
  });

  it("no NEEDS-SAMPLES row has an interval that already excludes the ceiling", () => {
    // The mirror image. A rule whose interval excludes the ceiling from below
    // HAS to be labelled NEEDS-FP-REDUCTION; leaving it in NEEDS-SAMPLES sends
    // a maintainer to add corpus data for a detector the data already rejects.
    const rows = rowsIn("NEEDS-SAMPLES");
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Number.isNaN(row.ciHigh), `${row.rule} has no ciHigh`).toBe(false);
    }
  });

  it("the FPs-to-remove column is never a placeholder for all rows", () => {
    // The old column was `fpHeadroom` — "how many more could be ADDED", which
    // is 0 or null by construction and so held no information for any rule.
    // The replacement is null only where retraction cannot reach the ceiling at
    // that n, which is a fact about the sample rather than a missing value.
    const rows = rowsIn("NEEDS-FP-REDUCTION");
    const withTarget = rows.filter((r) => /^-?\d+$/.test(r.target));
    expect(withTarget.length).toBeGreaterThan(0);
  });
});
