import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import { buildRuleCensus } from "../../src/rules/registry-census.js";
import {
  effectiveTier,
  hasStaleMeasurement,
} from "../../src/rules/measurement.js";

const rule = RULES[0];
if (!rule) throw new Error("rule registry is empty");

describe("rule registry census", () => {
  it("keeps measured, unmeasured, stale, and retired populations separate", () => {
    const census = buildRuleCensus();
    expect(census.active.length).toBeGreaterThan(0);
    expect(census.retired).toContain("QA-PW-005");
    expect(census.duplicateActiveIds).toEqual([]);
    expect(census.retiredActiveIntersections).toEqual([]);
    expect(census.measuredCount + census.unmeasuredCount).toBe(
      census.active.length,
    );
    expect(
      census.active
        .filter((entry) => !entry.measured)
        .every((entry) => ["PROVISIONAL", "UNMEASURED"].includes(entry.status)),
    ).toBe(true);
  });

  it("reports duplicate and unknown retired IDs without changing scan behavior", () => {
    const census = buildRuleCensus(
      [rule, { ...rule, id: "QA-CENSUS-DUPLICATE" }, rule],
      ["QA-CENSUS-DUPLICATE"],
    );
    expect(census.duplicateActiveIds).toEqual([rule.id]);
    expect(census.retiredActiveIntersections).toEqual(["QA-CENSUS-DUPLICATE"]);
    expect(census.measuredCount).toBe(2);
    expect(census.unmeasuredCount).toBe(1);
  });

  // A1: the census is the only surface that used to re-derive the tier ladder
  // and the stale predicate locally, so it was the only surface that disagreed
  // with doctor, the capability matrix and the anti-creep baseline. The
  // assertions below restate the fix as a property of every rule rather than as
  // a count, because a count would pass again the moment a rule is added.
  it("reports tier exactly as effectiveTier resolves it, for every rule", () => {
    const census = buildRuleCensus();
    const byId = new Map(census.active.map((entry) => [entry.id, entry]));
    for (const r of RULES) {
      expect(byId.get(r.id)?.tier, r.id).toBe(effectiveTier(r));
    }
  });

  it("reports stale exactly as hasStaleMeasurement answers it, for every rule", () => {
    const census = buildRuleCensus();
    const byId = new Map(census.active.map((entry) => [entry.id, entry]));
    for (const r of RULES) {
      expect(byId.get(r.id)?.stale, r.id).toBe(hasStaleMeasurement(r));
    }
    // `stale` is read from the RAW map precisely because MEASURED_FP is
    // revision-filtered. If that ever changes, the count below is the tell.
    expect(census.staleCount).toBe(RULES.filter(hasStaleMeasurement).length);
  });

  it("keeps measured and stale mutually exclusive", () => {
    // A row cannot be both: `hasValidMeasurement` and `hasStaleMeasurement`
    // read different revision filters over the same RAW rows. A rule counted in
    // both populations means one of them stopped reading RAW.
    const census = buildRuleCensus();
    for (const entry of census.active) {
      expect(entry.measured && entry.stale, entry.id).toBe(false);
    }
  });
});
