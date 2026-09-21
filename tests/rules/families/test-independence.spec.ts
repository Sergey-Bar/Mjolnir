/**
 * Test Independence Analysis (INTEL-003) — test suite.
 */

import { describe, expect, it } from "vitest";

import {
  INDEPENDENCE_ANTI_PATTERNS,
  detectIndependenceAntiPatterns,
} from "../../../src/rules/families/test-independence.js";

describe("INDEPENDENCE_ANTI_PATTERNS", () => {
  it("is a non-empty array", () => {
    expect(INDEPENDENCE_ANTI_PATTERNS.length).toBeGreaterThan(0);
  });

  it("each pattern has required fields", () => {
    for (const ap of INDEPENDENCE_ANTI_PATTERNS) {
      expect(ap.id).toBeTruthy();
      expect(ap.description).toBeTruthy();
      expect(["LEXICAL", "AST", "SEMANTIC"]).toContain(ap.detectionStrategy);
      expect(ap.frameworks.length).toBeGreaterThan(0);
      expect(ap.patterns.length).toBeGreaterThan(0);
    }
  });

  it("all IDs are unique", () => {
    const ids = INDEPENDENCE_ANTI_PATTERNS.map((ap) => ap.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("detectIndependenceAntiPatterns", () => {
  it("detects shared mutable state (TI-001)", () => {
    const text = `let counter = 0;`;
    const results = detectIndependenceAntiPatterns(text);
    const ti001 = results.filter((r) => r.antiPatternId === "TI-001");
    expect(ti001.length).toBeGreaterThan(0);
  });

  it("detects order dependency hints (TI-002)", () => {
    const text = `it("should handle step 2 after setup", () => {});`;
    const results = detectIndependenceAntiPatterns(text);
    const ti002 = results.filter((r) => r.antiPatternId === "TI-002");
    expect(ti002.length).toBeGreaterThan(0);
  });

  it("detects array push mutation (TI-003)", () => {
    const text = `items.push(newItem);`;
    const results = detectIndependenceAntiPatterns(text);
    const ti003 = results.filter((r) => r.antiPatternId === "TI-003");
    expect(ti003.length).toBeGreaterThan(0);
  });

  it("detects Object.assign mutation (TI-003)", () => {
    const text = `Object.assign(config, overrides);`;
    const results = detectIndependenceAntiPatterns(text);
    const ti003 = results.filter((r) => r.antiPatternId === "TI-003");
    expect(ti003.length).toBeGreaterThan(0);
  });

  it("detects global state mutation (TI-004)", () => {
    const text = `process.env.API_KEY = "test";`;
    const results = detectIndependenceAntiPatterns(text);
    const ti004 = results.filter((r) => r.antiPatternId === "TI-004");
    expect(ti004.length).toBeGreaterThan(0);
  });

  it("detects globalThis mutation (TI-004)", () => {
    const text = `globalThis["myVar"] = 42;`;
    const results = detectIndependenceAntiPatterns(text);
    const ti004 = results.filter((r) => r.antiPatternId === "TI-004");
    expect(ti004.length).toBeGreaterThan(0);
  });

  it("detects filesystem side effects (TI-005)", () => {
    const text = `writeFileSync("/tmp/test.json", data);`;
    const results = detectIndependenceAntiPatterns(text);
    const ti005 = results.filter((r) => r.antiPatternId === "TI-005");
    expect(ti005.length).toBeGreaterThan(0);
  });

  it("detects mkdirSync (TI-005)", () => {
    const text = `mkdirSync("/tmp/test-dir", { recursive: true });`;
    const results = detectIndependenceAntiPatterns(text);
    const ti005 = results.filter((r) => r.antiPatternId === "TI-005");
    expect(ti005.length).toBeGreaterThan(0);
  });

  it("returns index and match text", () => {
    const text = `let counter = 0;`;
    const results = detectIndependenceAntiPatterns(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.index).toBeGreaterThanOrEqual(0);
    expect(results[0]?.match.length).toBeGreaterThan(0);
  });

  it("returns empty for clean code", () => {
    const text = `const result = add(1, 2);\nexpect(result).toBe(3);`;
    const results = detectIndependenceAntiPatterns(text);
    expect(results).toEqual([]);
  });
});
