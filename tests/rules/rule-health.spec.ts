/**
 * Rule-health metrics (WAVE 2 — Empirical Measurement).
 *
 * The stats/health views are a PROJECTION of the shipped measurement
 * registry (RULES + MEASURED_FP via getMeasurementStatus) — these tests
 * pin that the projection never contradicts the registry: counts are
 * internally consistent, retired rules are excluded from the census,
 * and the health queue is worst-first and deterministic.
 */

import { describe, expect, it } from "vitest";

import {
  buildRuleHealth,
  computeRuleStats,
  sortHealthQueue,
  renderRuleStats,
  renderRuleHealth,
  type RuleHealthRow,
} from "../../src/commands/rule-health.js";
import { RULES, RETIRED_RULE_IDS } from "../../src/rules/index.js";
import { getMeasurementStatus } from "../../src/rules/measurement-status.js";

describe("buildRuleHealth", () => {
  const rows = buildRuleHealth();

  it("excludes retired rules from the census", () => {
    const retired = new Set(RETIRED_RULE_IDS);
    for (const r of rows) {
      expect(retired.has(r.ruleId)).toBe(false);
    }
  });

  it("covers every active (non-retired) registry rule", () => {
    const activeIds = RULES.map((r) => r.id).filter(
      (id) => !RETIRED_RULE_IDS.includes(id),
    );
    const rowIds = new Set(rows.map((r) => r.ruleId));
    for (const id of activeIds) {
      expect(rowIds.has(id)).toBe(true);
    }
    expect(rows.length).toBe(activeIds.length);
  });

  it("agrees with getMeasurementStatus for every rule (single source)", () => {
    const byId = new Map(
      getMeasurementStatus().map((e) => [e.ruleId, e] as const),
    );
    for (const r of rows) {
      const entry = byId.get(r.ruleId);
      expect(entry).toBeDefined();
      expect(r.status).toBe(entry?.status);
      expect(r.tier).toBe(entry?.tier);
    }
  });

  it("omits absent metadata and excludes retired rules supplied explicitly", () => {
    const minimal = {
      id: "QA-ACME-001",
      title: "Minimal rule",
      category: "QA-TEST" as const,
      severity: "info" as const,
      confidence: "low" as const,
      findingType: "observation" as const,
      qaImpact: "HYGIENE" as const,
      appliesTo: "test-files" as const,
      run: () => [],
    };
    const retiredId = RETIRED_RULE_IDS[0];
    if (!retiredId) throw new Error("expected a retired rule in the registry");
    const rows = buildRuleHealth([minimal, { ...minimal, id: retiredId }]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ruleId: minimal.id, status: "UNMEASURED" });
    expect(rows[0]).not.toHaveProperty("falsePositiveRisk");
    expect(rows[0]).not.toHaveProperty("measuredFpRate");
    expect(rows[0]).not.toHaveProperty("measuredFpN");
    expect(rows[0]).not.toHaveProperty("measuredDetectorRevision");
  });

  it("is deterministic (two builds are byte-identical)", () => {
    expect(JSON.stringify(buildRuleHealth())).toBe(
      JSON.stringify(buildRuleHealth()),
    );
  });
});

describe("computeRuleStats", () => {
  it("counts partition the row set exactly", () => {
    const rows = buildRuleHealth();
    const s = computeRuleStats(rows);
    expect(s.total).toBe(rows.length);
    expect(s.byTier.core + s.byTier.extended + s.byTier.quarantine).toBe(
      s.total,
    );
    expect(
      s.byStatus.MEASURED +
        s.byStatus.PROVISIONAL +
        s.byStatus.UNMEASURED +
        s.byStatus.STALE,
    ).toBe(s.total);
  });

  it("measured equals the MEASURED status count and coverage follows", () => {
    const rows = buildRuleHealth();
    const s = computeRuleStats(rows);
    expect(s.measured).toBe(s.byStatus.MEASURED);
    expect(s.needingMeasurement).toBe(
      s.byStatus.UNMEASURED + s.byStatus.STALE + s.byStatus.PROVISIONAL,
    );
    expect(s.coverage).toBeCloseTo(s.measured / s.total, 10);
  });

  it("reports the retired count from the canonical list", () => {
    const s = computeRuleStats(buildRuleHealth());
    expect(s.retired).toBe(RETIRED_RULE_IDS.length);
  });

  it("empty input yields zero coverage, never NaN", () => {
    const s = computeRuleStats([]);
    expect(s.total).toBe(0);
    expect(s.coverage).toBe(0);
  });
});

describe("sortHealthQueue", () => {
  const mk = (over: Partial<RuleHealthRow>): RuleHealthRow => ({
    ruleId: "QA-XX-001",
    title: "t",
    category: "QA-TEST",
    tier: "core",
    status: "MEASURED",
    detectorRevision: 1,
    ...over,
  });

  it("orders UNMEASURED < STALE < PROVISIONAL < MEASURED", () => {
    const sorted = sortHealthQueue([
      mk({ ruleId: "QA-A-001", status: "MEASURED" }),
      mk({ ruleId: "QA-B-001", status: "PROVISIONAL" }),
      mk({ ruleId: "QA-C-001", status: "STALE" }),
      mk({ ruleId: "QA-D-001", status: "UNMEASURED" }),
    ]);
    expect(sorted.map((r) => r.status)).toEqual([
      "UNMEASURED",
      "STALE",
      "PROVISIONAL",
      "MEASURED",
    ]);
  });

  it("sorts measured rules by descending FP rate", () => {
    const sorted = sortHealthQueue([
      mk({ ruleId: "QA-A-001", measuredFpRate: 0.05, measuredFpN: 10 }),
      mk({ ruleId: "QA-B-001", measuredFpRate: 0.4, measuredFpN: 10 }),
      mk({ ruleId: "QA-C-001", measuredFpRate: 0.2, measuredFpN: 10 }),
    ]);
    expect(sorted.map((r) => r.ruleId)).toEqual([
      "QA-B-001",
      "QA-C-001",
      "QA-A-001",
    ]);
  });

  it("breaks ties by ruleId (stable, deterministic)", () => {
    const sorted = sortHealthQueue([
      mk({ ruleId: "QA-Z-001", status: "UNMEASURED" }),
      mk({ ruleId: "QA-A-001", status: "UNMEASURED" }),
    ]);
    expect(sorted.map((r) => r.ruleId)).toEqual(["QA-A-001", "QA-Z-001"]);
  });

  it("uses zero for absent measured rates and preserves equal-id duplicates", () => {
    const first = mk({ title: "first" });
    const second = mk({ title: "second" });
    const zero = mk({ ruleId: "QA-ZZ-001", measuredFpRate: 0 });
    const worse = mk({ ruleId: "QA-AA-001", measuredFpRate: 0.2 });
    expect(sortHealthQueue([zero, first, worse, second])).toEqual([
      worse,
      first,
      second,
      zero,
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [
      mk({ ruleId: "QA-B-001", status: "UNMEASURED" }),
      mk({ ruleId: "QA-A-001", status: "MEASURED" }),
    ];
    const before = input.map((r) => r.ruleId);
    sortHealthQueue(input);
    expect(input.map((r) => r.ruleId)).toEqual(before);
  });
});

describe("renderers", () => {
  it("reports full measurement coverage without an assumption warning", () => {
    const row: RuleHealthRow = {
      ruleId: "QA-ACME-001",
      title: "Measured rule",
      category: "QA-TEST",
      tier: "core",
      status: "MEASURED",
      detectorRevision: 2,
      measuredDetectorRevision: 2,
      measuredFpRate: 0.04,
      measuredFpN: 25,
    };
    const text = renderRuleStats([row]);
    expect(text).toContain("Measured coverage: 100% (1/1)");
    expect(text).toContain("Needing measurement: 0");
    expect(text).toContain("Every active rule carries a valid measurement.");
    expect(text).not.toContain("ship on assumption");
  });

  it("renders measured rates, sample sizes and stale detector revisions distinctly", () => {
    const measured: RuleHealthRow = {
      ruleId: "QA-ACME-001",
      title: "Measured rule",
      category: "QA-TEST",
      tier: "core",
      status: "MEASURED",
      detectorRevision: 2,
      measuredDetectorRevision: 2,
      measuredFpRate: 0.04,
      measuredFpN: 25,
    };
    const stale: RuleHealthRow = {
      ...measured,
      ruleId: "QA-ACME-002",
      title: "Stale rule",
      status: "STALE",
      detectorRevision: 3,
    };
    const text = renderRuleHealth([measured, stale]);
    expect(text).toMatch(
      /STALE\s+QA-ACME-002\s+core\s+4%\s+25\s+3<-2\s+Stale rule/,
    );
    expect(text).toMatch(
      /MEASURED\s+QA-ACME-001\s+core\s+4%\s+25\s+2\s+Measured rule/,
    );
    expect(text.indexOf(stale.ruleId)).toBeLessThan(
      text.indexOf(measured.ruleId),
    );
    expect(text).not.toContain("more (raise --limit");
  });

  it("renderRuleStats states coverage against the full registry", () => {
    const rows = buildRuleHealth();
    const text = renderRuleStats(rows);
    expect(text).toContain(`Active rules:      ${rows.length}`);
    expect(text).toContain("Measured coverage:");
    expect(text).toContain("Retired rules:");
  });

  it("renderRuleHealth honours the limit and reports hidden rows", () => {
    const rows = buildRuleHealth();
    const text = renderRuleHealth(rows, 5);
    expect(text).toContain("Rule health");
    if (rows.length > 5) {
      expect(text).toContain("more (raise --limit to see them)");
    }
  });

  it("renderRuleHealth of an empty registry is honest, not a crash", () => {
    expect(renderRuleHealth([])).toContain("No active rules.");
  });
});
