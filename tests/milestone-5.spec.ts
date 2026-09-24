import { describe, it, expect } from "vitest";
import {
  getPlaywrightMaturity,
  getPlaywrightMaturityReport,
  getFrameworkMaturity,
  getAllFrameworkMaturity,
  renderPlaywrightMaturityReport,
} from "../src/engine/framework-maturity.js";

describe("M5: Framework Maturity Tracking for Playwright", () => {
  it("should get Playwright maturity progress", () => {
    const progress = getPlaywrightMaturity();
    expect(progress.frameworkId).toBe("playwright");
    expect(progress.currentMaturity).toBeDefined();
    expect(progress.targetMaturity).toBe("F5");
    expect(progress.progressPercentage).toBeGreaterThanOrEqual(0);
    expect(progress.progressPercentage).toBeLessThanOrEqual(100);
  });

  it("should get Playwright maturity report with recommendations", () => {
    const report = getPlaywrightMaturityReport();
    expect(report.frameworkId).toBe("playwright");
    expect(report.recommendations).toBeInstanceOf(Array);
    expect(report.scorecardEntries).toBeInstanceOf(Array);
    expect(report.scorecardEntries.length).toBeGreaterThan(0);
  });

  it("should get framework maturity for any framework", () => {
    const progress = getFrameworkMaturity("playwright");
    expect(progress).toBeDefined();
    expect(progress?.frameworkId).toBe("playwright");
  });

  it("should return undefined for unknown framework", () => {
    const progress = getFrameworkMaturity("nonexistent-framework");
    expect(progress).toBeUndefined();
  });

  it("should get all framework maturity", () => {
    const all = getAllFrameworkMaturity();
    expect(all.length).toBeGreaterThan(0);
    expect(all.some((m) => m.frameworkId === "playwright")).toBe(true);
  });

  it("should render Playwright maturity report as string", () => {
    const report = getPlaywrightMaturityReport();
    const rendered = renderPlaywrightMaturityReport(report);
    expect(typeof rendered).toBe("string");
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered).toContain("Playwright");
  });

  it("should calculate maturity score within valid range", () => {
    const progress = getPlaywrightMaturity();
    expect(progress.maturityScore).toBeGreaterThanOrEqual(0);
    expect(progress.maturityScore).toBeLessThanOrEqual(100);
  });
});
