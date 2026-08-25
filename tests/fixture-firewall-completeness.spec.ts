/**
 * Fixture firewall completeness (Test Hardening Plan — a permanent guard
 * for the project's own stated law).
 *
 * STATE.md, copilot-instructions.md, and the fixture firewall doc-comment
 * itself all say it the same way: "every rule needs must-fire AND
 * must-not-fire fixtures — no exceptions." `rules.fixtures.spec.ts` runs
 * whatever fixtures exist, but silently does nothing for a rule whose
 * must-fire or must-not-fire directory is simply missing or empty — a
 * rule can ship with only half the firewall and nothing fails.
 *
 * A scan of the actual fixtures directory found exactly this happening
 * right now: QA-PW-105 has no must-fire fixture at all (its finding-
 * producing code path has near-zero test coverage as a direct result),
 * and QA-PY-004 has no must-not-fire fixture.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RULES } from "../src/rules/index.js";

const FIXTURES_ROOT = join(import.meta.dirname, "fixtures");

function nonHiddenFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => !f.startsWith("."));
}

describe("every registered rule has BOTH fixture directions, per the project's own law", () => {
  const rulesWithFixtures = RULES.filter(
    (r) => r.appliesTo === "test-files" || r.appliesTo === ("python" as never),
  );

  it("sanity check: this actually covers a meaningful number of rules", () => {
    expect(rulesWithFixtures.length).toBeGreaterThan(10);
  });

  for (const rule of rulesWithFixtures) {
    const mustFireDir = join(FIXTURES_ROOT, rule.id, "must-fire");
    const mustNotFireDir = join(FIXTURES_ROOT, rule.id, "must-not-fire");

    it(`${rule.id} has at least one must-fire fixture`, () => {
      expect(
        nonHiddenFiles(mustFireDir).length,
        `${rule.id} (${rule.title}) has no must-fire fixture — its ` +
          `finding-producing code path is never exercised by any test, ` +
          `only whatever incidentally touches it from other suites.`,
      ).toBeGreaterThan(0);
    });

    it(`${rule.id} has at least one must-not-fire fixture`, () => {
      expect(
        nonHiddenFiles(mustNotFireDir).length,
        `${rule.id} (${rule.title}) has no must-not-fire fixture — ` +
          `nothing proves this rule doesn't false-positive on legitimate ` +
          `code, which is the entire point of the fixture firewall.`,
      ).toBeGreaterThan(0);
    });
  }
});
