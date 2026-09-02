/**
 * Rule registry contract tests: unique frozen IDs, getRule lookup.
 */

import { describe, expect, it } from "vitest";
import { RULES, getRule, RETIRED_RULE_IDS } from "../src/rules/index.js";
import {
  effectiveTier,
  hasValidMeasurement,
} from "../src/rules/measurement.js";

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

  it("declares an enforced-enum detection strategy on every rule (Verification Trust Evolution Plan §12.1, D6 closed)", () => {
    // D6: `detectionStrategy` used to be free text. Phase 2 migrated
    // every registry entry to the §09.6 enum and this ratchet keeps it
    // that way — a new rule without a valid enum value fails CI, so the
    // "free text" drift class cannot reintroduce itself.
    const VALID: readonly string[] = [
      "LEXICAL",
      "AST",
      "SEMANTIC",
      "FRAMEWORK",
      "RUNTIME",
    ];
    for (const rule of RULES) {
      expect(
        VALID,
        `${rule.id}: detectionStrategy must be one of the §09.6 enum values`,
      ).toContain(rule.detectionStrategy);
    }
  });

  it("omitted tiers resolve measurement-dependently, never to unmeasured core (Phase 1 D3 Steps 1+2)", () => {
    // Step 1 generated explicit `tier` declarations for all rules from
    // their then-effective tier; Step 2 made the omitted-tier default
    // measurement-dependent (plan §11.2). Both hold at once: a rule may
    // omit tier ONLY when Step 2's default resolves it to extended
    // (displayed PROVISIONAL); every validly-measured implicit-core rule
    // keeps its explicit core declaration.
    for (const rule of RULES) {
      if (rule.tier === undefined) {
        expect(
          hasValidMeasurement(rule),
          `${rule.id}: omitted tier with no valid measurement must resolve to extended, never core`,
        ).toBe(false);
        expect(effectiveTier(rule), rule.id).toBe("extended");
      } else {
        expect(["core", "extended", "quarantine"]).toContain(rule.tier);
      }
    }
  });
});

describe("RETIRED_RULE_IDS (docs/RULE-LIFECYCLE.md)", () => {
  it("never reissues a retired ID to an active rule", () => {
    const activeIds = new Set(RULES.map((r) => r.id));
    for (const retired of RETIRED_RULE_IDS) {
      expect(
        activeIds.has(retired),
        `"${retired}" is listed as retired but is also an active rule ID — ` +
          `the frozen-contracts law forbids reissuing a retired ID, even ` +
          `to a conceptually different rule.`,
      ).toBe(false);
    }
  });

  it("has no duplicate entries", () => {
    expect(new Set(RETIRED_RULE_IDS).size).toBe(RETIRED_RULE_IDS.length);
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
