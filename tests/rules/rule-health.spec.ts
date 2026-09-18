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
