import { describe, expect, it } from "vitest";

import {
  FRAMEWORK_INVENTORY,
  getFrameworkById,
  getFrameworksByMaturity,
  FRAMEWORK_SCORECARDS,
  validateScorecard,
  getAllGapIds,
} from "../../src/frameworks/index.js";

describe("Framework maturity tracking — Playwright", () => {
  it("Playwright exists in the framework inventory with F4 maturity", () => {
    const pw = getFrameworkById("playwright");
    expect(pw).toBeDefined();
    expect(pw?.maturity).toBe("F4");
    expect(pw?.entityType).toBe("E2E_FRAMEWORK");
    expect(pw?.supportStatus).toBe("OFFICIAL_PARTIAL");
    expect(pw?.targetMaturity).toBe("F5");
  });

  it("Playwright has a valid target maturity higher than current", () => {
    const pw = getFrameworkById("playwright");
    expect(pw).toBeDefined();
    if (!pw) return;
    const maturityOrder = ["F0", "F1", "F2", "F3", "F4", "F5"];
    const currentIdx = maturityOrder.indexOf(pw.maturity);
    const targetIdx = maturityOrder.indexOf(pw.targetMaturity);
    expect(targetIdx).toBeGreaterThan(currentIdx);
  });

  it("Playwright scorecard exists and has all required dimensions", () => {
    const pwScorecard = FRAMEWORK_SCORECARDS.find(
      (s) => s.frameworkId === "playwright",
    );
    expect(pwScorecard).toBeDefined();
    const dimensions = pwScorecard?.entries.map((e) => e.dimension);
    expect(dimensions?.length).toBeGreaterThan(0);
    expect(dimensions?.includes("discovery")).toBe(true);
    expect(dimensions?.includes("parallelismWorkerSafety")).toBe(true);
  });

  it("Playwright scorecard entries have valid current and target ratings", () => {
    const pwScorecard = FRAMEWORK_SCORECARDS.find(
      (s) => s.frameworkId === "playwright",
    );
    expect(pwScorecard).toBeDefined();
    for (const entry of pwScorecard?.entries ?? []) {
      expect([
        "EXCELLENT",
        "GOOD",
        "PARTIAL",
        "WEAK",
        "MISSING",
        "NOT_APPLICABLE",
        "CURRENT",
      ]).toContain(entry.current);
      expect([
        "EXCELLENT",
        "GOOD",
        "PARTIAL",
        "WEAK",
        "MISSING",
        "NOT_APPLICABLE",
        "CURRENT",
      ]).toContain(entry.target);
    }
  });

  it("Playwright has gap IDs for dimensions that need improvement", () => {
    const pwScorecard = FRAMEWORK_SCORECARDS.find(
      (s) => s.frameworkId === "playwright",
    );
    expect(pwScorecard).toBeDefined();
    const gaps = pwScorecard?.entries.filter((e) => e.gapId !== null);
    expect(gaps?.length).toBeGreaterThan(0);
    const gapIds = gaps?.map((g) => g.gapId);
    expect(gapIds).toContain("GAP-PW-001");
  });

  it("validateScorecard returns no errors for all frameworks", () => {
    const result = validateScorecard();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("getAllGapIds returns sorted unique gap IDs", () => {
    const gaps = getAllGapIds();
    expect(gaps.length).toBeGreaterThan(0);
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]! >= gaps[i - 1]!).toBe(true);
    }
  });

  it("Playwright gaps follow the GAP-PW-00N naming convention", () => {
    const pwScorecard = FRAMEWORK_SCORECARDS.find(
      (s) => s.frameworkId === "playwright",
    );
    expect(pwScorecard).toBeDefined();
    const pwGaps = pwScorecard?.entries
      .filter((e) => e.gapId !== null)
      .map((e) => e.gapId);
    for (const gapId of pwGaps ?? []) {
      expect(gapId).toMatch(/^GAP-PW-\d{3}$/);
    }
  });
});

describe("Framework inventory — maturity queries", () => {
  it("getFrameworksByMaturity returns frameworks at the specified level", () => {
    const f4 = getFrameworksByMaturity("F4");
    expect(f4.some((f) => f.frameworkId === "playwright")).toBe(true);
    expect(f4.some((f) => f.frameworkId === "github-actions")).toBe(false);
  });

  it("Playwright is not at F5 yet", () => {
    const f5 = getFrameworksByMaturity("F5");
    expect(f5.some((f) => f.frameworkId === "playwright")).toBe(false);
  });

  it("every framework in the inventory has a target maturity higher than current", () => {
    const maturityOrder = ["F0", "F1", "F2", "F3", "F4", "F5"];
    for (const fw of FRAMEWORK_INVENTORY) {
      const currentIdx = maturityOrder.indexOf(fw.maturity);
      const targetIdx = maturityOrder.indexOf(fw.targetMaturity);
      expect(targetIdx).toBeGreaterThan(currentIdx);
    }
  });
});
