/**
 * Docs-vs-registry consistency (Master-Stabilization-Plan Sprint 3,
 * Task 15).
 *
 * README.md's rule tables are an explicitly curated sample ("the full
 * live catalog is generated from the registry" — it links to
 * `qa-doctor rules --md` for completeness), not a claim of covering
 * every rule. What must never happen is a listed ID that doesn't exist,
 * or a listed severity that doesn't match the registry — that's a
 * silent lie a reader has no way to catch themselves. This test makes
 * that class of drift fail CI instead of sitting undetected (guards
 * the class of bug in Master-Stabilization-Plan findings #3 and #10).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RULES } from "../src/rules/index.js";

const ROOT = join(import.meta.dirname, "..");
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const STATE = readFileSync(join(ROOT, ".planning", "STATE.md"), "utf8");

/** Extracts `| QA-XXX-000 | ... | severity |` rows from a markdown table row. */
function extractRuleTableRows(
  markdown: string,
): Array<{ id: string; severity: string }> {
  const rows: Array<{ id: string; severity: string }> = [];
  const lineRe = /^\|\s*(QA-[A-Z]+-\d{3})\s*\|.*\|\s*([a-z]+)\s*\|\s*$/gm;
  for (const m of markdown.matchAll(lineRe)) {
    const id = m[1];
    const severity = m[2];
    if (id && severity) rows.push({ id, severity });
  }
  return rows;
}

describe("README.md rule tables match the actual registry", () => {
  const rows = extractRuleTableRows(README);
  const byId = new Map(RULES.map((r) => [r.id, r]));

  it("found at least one rule row to check (sanity — regex didn't silently match nothing)", () => {
    expect(rows.length).toBeGreaterThan(10);
  });

  it.each(rows)("$id: exists in the registry", ({ id }) => {
    expect(
      byId.has(id),
      `README.md lists "${id}" as a shipped rule, but it is not in ` +
        `src/rules/index.ts's RULES array — either the rule was removed ` +
        `without updating the README, or the ID has a typo.`,
    ).toBe(true);
  });

  it.each(rows)(
    "$id: README severity matches the registry (or is a documented dynamic-severity floor)",
    ({ id, severity }) => {
      const rule = byId.get(id);
      if (!rule) return; // already failed by the existence check above
      if (severity === rule.severity) return;
      // Some rules compute severity per-occurrence rather than declaring
      // a single static one (e.g. QA-TEST-002: a justified skip is a
      // warning, an unjustified one escalates to error). README rows
      // documenting BOTH observed severities for the same ID are
      // accurate to real runtime behavior, not stale — but a row
      // claiming a severity that is neither the registry's declared
      // floor nor one this allowlist has reviewed as a real dynamic
      // outcome is still a bug.
      const reviewedDynamicSeverities: Record<string, string[]> = {
        "QA-TEST-002": ["error", "warning"],
      };
      const allowed = reviewedDynamicSeverities[id];
      expect(
        allowed,
        `README.md claims "${id}" is severity "${severity}", but the ` +
          `registry has it as "${rule.severity}" and this isn't a ` +
          `reviewed dynamic-severity rule — a reader deciding whether ` +
          `this rule would block their CI is reading a false claim.`,
      ).toBeDefined();
      expect(allowed).toContain(severity);
    },
  );
});

describe("no doc claims a gap that source contradicts", () => {
  // Two concrete stale-gap claims found by direct source inspection
  // (Master-Stabilization-Plan finding #10): the Windows tar bug was
  // already fixed, and ci.yml already runs all three OSes. Guard both
  // so a future revert of either fix doesn't silently un-fix the docs
  // claim along with it, and so a *new* stale claim of this shape gets
  // caught by extending this describe block rather than by accident.
  it("STATE.md does not claim the Windows tar --force-local bug is still open", () => {
    expect(STATE).not.toMatch(
      /Windows.{0,40}(tar --force-local|force-local).{0,60}(still open|unresolved|known gap)/i,
    );
  });

  it("ci.yml actually runs the OS matrix STATE.md credits it with", () => {
    const ci = readFileSync(
      join(ROOT, ".github", "workflows", "ci.yml"),
      "utf8",
    );
    for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) {
      expect(
        ci,
        `STATE.md and Master-Stabilization-Plan.md credit ci.yml with ` +
          `running ${os}, but it is not in the workflow's matrix.`,
      ).toContain(os);
    }
  });
});
