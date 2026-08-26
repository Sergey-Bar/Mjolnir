/**
 * Rule registry contract tests: unique frozen IDs, getRule lookup.
 */

import { describe, expect, it } from "vitest";
import { RULES, getRule } from "../src/rules/index.js";

describe("RULES registry", () => {
  it("contains no duplicate rule IDs", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule has required metadata and a run function", () => {
    for (const rule of RULES) {
      // QA-PY-* ships with the Python adapter (Upgrade-Plan-v2 §1.3);
      // QA-ENV-* is the Tier-5 environment-coupling family;
      // QA-JV-*/QA-CS-* ship with the Java/.NET adapters (v3 Phases 4-5).
      expect(rule.id).toMatch(/^QA-(TEST|TQUAL|PW|CI|PY|ENV|JV|CS)-\d{3}$/);
      expect(rule.title.length).toBeGreaterThan(0);
      expect(["error", "warning", "info"]).toContain(rule.severity);
      expect(typeof rule.run).toBe("function");
    }
  });
});

describe("getRule", () => {
  it("finds rules by ID", () => {
    expect(getRule("QA-TEST-001")?.id).toBe("QA-TEST-001");
    expect(getRule("QA-CI-001")?.id).toBe("QA-CI-001");
  });

  it("returns undefined for unknown IDs", () => {
    expect(getRule("QA-NOPE-999")).toBeUndefined();
  });
});
