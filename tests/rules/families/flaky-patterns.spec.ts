import { describe, expect, it } from "vitest";
import {
  FLAKY_PATTERN_FAMILIES,
  FLAKY_PATTERN_FAMILY_COUNT,
} from "../../../src/rules/families/flaky-patterns.js";

const EXPECTED_FAMILY_IDS = [
  "UNAWAITED_ASYNC",
  "NONDETERMINISTIC_INPUT",
  "UNMOCKED_EXTERNAL_DEPENDENCY",
  "HARD_SLEEP",
] as const;

describe("flaky-patterns", () => {
  it("defines all 4 families", () => {
    expect(FLAKY_PATTERN_FAMILY_COUNT).toBe(4);
    expect(FLAKY_PATTERN_FAMILIES).toHaveLength(4);
  });

  it.each(EXPECTED_FAMILY_IDS)("%s family is defined", (id) => {
    const family = FLAKY_PATTERN_FAMILIES.find((f) => f.id === id);
    expect(family).toBeDefined();
  });

  it("every family has required metadata", () => {
    for (const family of FLAKY_PATTERN_FAMILIES) {
      expect(family.id).toBeTruthy();
      expect(family.description).toBeTruthy();
      expect(family.detectionStrategy).toMatch(
        /^(LEXICAL|AST|SEMANTIC|RUNTIME)$/,
      );
      expect(family.applicableFrameworks.length).toBeGreaterThan(0);
      expect(family.evidenceLevel).toMatch(/^E[012]$/);
      expect(family.patterns.length).toBeGreaterThan(0);
    }
  });

  it("all patterns are valid regex", () => {
    for (const family of FLAKY_PATTERN_FAMILIES) {
      for (const pattern of family.patterns) {
        expect(() => new RegExp(pattern)).not.toThrow();
      }
    }
  });

  it("family IDs are unique", () => {
    const ids = FLAKY_PATTERN_FAMILIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("HARD_SLEEP has evidence level E2", () => {
    const family = FLAKY_PATTERN_FAMILIES.find((f) => f.id === "HARD_SLEEP");
    expect(family).toBeDefined();
    expect(family?.evidenceLevel).toBe("E2");
  });

  it("UNAWAITED_ASYNC uses AST detection", () => {
    const family = FLAKY_PATTERN_FAMILIES.find(
      (f) => f.id === "UNAWAITED_ASYNC",
    );
    expect(family).toBeDefined();
    expect(family?.detectionStrategy).toBe("AST");
  });

  it("NONDETERMINISTIC_INPUT uses LEXICAL detection", () => {
    const family = FLAKY_PATTERN_FAMILIES.find(
      (f) => f.id === "NONDETERMINISTIC_INPUT",
    );
    expect(family).toBeDefined();
    expect(family?.detectionStrategy).toBe("LEXICAL");
  });
});
