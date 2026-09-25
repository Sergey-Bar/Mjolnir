import { describe, expect, it } from "vitest";
import { RULES } from "../../src/rules/index.js";
import { buildRuleCensus } from "../../src/rules/registry-census.js";

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
});
