/**
 * Assertion Quality Analysis (INTEL-002) — test suite.
 */

import { describe, expect, it } from "vitest";

import {
  ASSERTION_ANTI_PATTERNS,
  detectAssertionAntiPatterns,
} from "../../../src/rules/families/assertion-quality.js";

describe("ASSERTION_ANTI_PATTERNS", () => {
  it("is a non-empty array", () => {
    expect(ASSERTION_ANTI_PATTERNS.length).toBeGreaterThan(0);
  });

  it("each pattern has required fields", () => {
    for (const ap of ASSERTION_ANTI_PATTERNS) {
      expect(ap.id).toBeTruthy();
      expect(ap.description).toBeTruthy();
      expect(ap.pattern).toBeInstanceOf(RegExp);
      expect(["error", "warning"]).toContain(ap.severity);
      expect(ap.frameworks.length).toBeGreaterThan(0);
    }
  });

  it("all IDs are unique", () => {
    const ids = ASSERTION_ANTI_PATTERNS.map((ap) => ap.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("detectAssertionAntiPatterns", () => {
  it("detects tautological assertion (AQ-001)", () => {
    const text = `expect(true).toBe(true);`;
    const results = detectAssertionAntiPatterns(text);
    const aq001 = results.filter((r) => r.antiPatternId === "AQ-001");
    expect(aq001.length).toBeGreaterThan(0);
  });

  it("detects tautological assertion with false", () => {
    const text = `expect(false).toBe(false);`;
    const results = detectAssertionAntiPatterns(text);
    const aq001 = results.filter((r) => r.antiPatternId === "AQ-001");
    expect(aq001.length).toBeGreaterThan(0);
  });

  it("detects type-only assertion (AQ-002)", () => {
    const text = `expect(typeof myVar).toBe("string");`;
    const results = detectAssertionAntiPatterns(text);
    const aq002 = results.filter((r) => r.antiPatternId === "AQ-002");
    expect(aq002.length).toBeGreaterThan(0);
  });

  it("detects mock-return assertion (AQ-003)", () => {
    const text = `myFn.mockReturnValue(42);\nexpect(myFn()).toBe(42);`;
    const results = detectAssertionAntiPatterns(text);
    const aq003 = results.filter((r) => r.antiPatternId === "AQ-003");
    expect(aq003.length).toBeGreaterThan(0);
  });

  it("detects truthy-only assertion (AQ-004)", () => {
    const text = `expect(result).toBeTruthy();`;
    const results = detectAssertionAntiPatterns(text);
    const aq004 = results.filter((r) => r.antiPatternId === "AQ-004");
    expect(aq004.length).toBeGreaterThan(0);
  });

  it("detects length-only assertion (AQ-005)", () => {
    const text = `expect(items.length).toBeGreaterThan(0);`;
    const results = detectAssertionAntiPatterns(text);
    const aq005 = results.filter((r) => r.antiPatternId === "AQ-005");
    expect(aq005.length).toBeGreaterThan(0);
  });

  it("returns empty for clean code", () => {
    const text = `expect(user.name).toBe("Alice");`;
    const results = detectAssertionAntiPatterns(text);
    expect(results).toEqual([]);
  });

  it("returns index and match text", () => {
    const text = `expect(true).toBe(true);`;
    const results = detectAssertionAntiPatterns(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.index).toBe(0);
    expect(results[0]?.match.length).toBeGreaterThan(0);
  });
});
