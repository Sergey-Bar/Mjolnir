/**
 * Coverage exclusion truth ledger (plan V5-000, replaces the F10 snapshot).
 *
 * The vitest coverage `exclude` list is a hand-maintained escape hatch: every
 * entry lets real source escape the per-file ratchet. The previous guard
 * snapshot-locked the list, which stopped silent growth but recorded nothing
 * about WHY each file is exempt or who owns removing it — a list that can
 * only grow, with no expiry, is a ratchet with the brake released.
 *
 * The ledger (docs/COVERAGE-EXEMPTIONS.json) is the record: one classified,
 * owned, expiring entry per exclusion. This spec checks the ledger against the
 * committed list AND against the real import graph, so a classification that
 * stops being true (a dead module gains a caller, a shipped verb quietly
 * stops shipping) fails here rather than rotting in a JSON file.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  committedExclusions,
  readLedger,
  shippedReachableModules,
  validateCoverageExemptionLedger,
  // Imported by its .mjs path so the typed declaration is used directly
  // rather than through a re-export shim that can fall behind the module.
} from "../../scripts/lib/coverage-exemption-ledger.mjs";

const ROOT = join(import.meta.dirname, "..", "..");

describe("coverage exclusion truth ledger (V5-000)", () => {
  it("passes its own gate: ledger, committed list, and import graph agree", () => {
    expect(validateCoverageExemptionLedger(ROOT)).toEqual([]);
  });

  it("the gate finishes fast enough to be trusted", () => {
    // A guard that times out reports itself as a failure, and a guard people
    // learn to ignore is worse than no guard. The first implementation
    // re-walked the whole import graph once per ledger entry — O(entries ×
    // tree) — and pushed this very suite past the 30 s per-test timeout while
    // passing on its own. The budget is generous but far below that, so a
    // return to per-entry walks fails here rather than intermittently in CI.
    const started = Date.now();
    validateCoverageExemptionLedger(ROOT);
    const elapsed = Date.now() - started;
    expect(
      elapsed,
      `the ledger gate took ${elapsed}ms — it must read the tree once per pass, not once per entry`,
    ).toBeLessThan(10_000);
  });

  it("the ledger and the committed coverage exclude list are the same set, in order", () => {
    const ledger = readLedger(ROOT);
    expect(ledger.entries.map((entry) => entry.path)).toEqual(
      committedExclusions(ROOT),
    );
  });

  it("every exclusion is classified, owned, justified, and dated", () => {
    const ledger = readLedger(ROOT);
    for (const entry of ledger.entries) {
      expect(entry.classification, entry.path).toMatch(
        /^(PERMANENT_STRUCTURAL|DEAD_CODE|CONTRACT_ONLY|SHIPPED_SURFACE)$/,
      );
      expect(entry.owner?.length, entry.path).toBeGreaterThan(0);
      expect(entry.justification?.length, entry.path).toBeGreaterThan(0);
      expect(typeof entry.shippedSurface, entry.path).toBe("boolean");
    }
  });

  it("a non-structural exclusion carries a review deadline and a removal plan", () => {
    const ledger = readLedger(ROOT);
    for (const entry of ledger.entries) {
      if (entry.classification === "PERMANENT_STRUCTURAL") {
        expect(entry.structuralReason?.length, entry.path).toBeGreaterThan(0);
        expect(entry.reviewBy, entry.path).toBeUndefined();
        continue;
      }
      expect(entry.reviewBy, entry.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.removalPlan?.length, entry.path).toBeGreaterThan(0);
    }
  });

  it("the shipped-surface exemption ratchet may fall but never rise", () => {
    const ledger = readLedger(ROOT);
    const debt = ledger.entries.filter(
      (entry) =>
        entry.shippedSurface && entry.classification !== "PERMANENT_STRUCTURAL",
    ).length;
    expect(debt).toBeLessThanOrEqual(ledger.policy.shippedSurfaceCeiling);
  });

  it("classifies by reachability from a shipped surface, not by having an importer", () => {
    // The first version of this rule asked only "does anything import it?".
    // That is wrong the moment one prototype imports another: a
    // provider-capability contract consumed solely by an unwired census module
    // acquires an importer and would be reclassified SHIPPED_SURFACE, quietly
    // inflating the shipped-surface count with a file no user can reach.
    const reachable = shippedReachableModules(ROOT);
    expect(reachable.has("src/cli.ts")).toBe(true);
    expect(reachable.has("src/mcp/server.ts")).toBe(true);
    // A gate-only module is shipped surface: `certify` runs it every commit.
    expect(reachable.has("src/ledger/m26-validators.ts")).toBe(true);
    expect(reachable.has("src/release/version-surface.ts")).toBe(true);
    // A contract nothing reaches is not.
    expect(reachable.has("src/engine/m50-release-proof-contract.ts")).toBe(
      false,
    );
    expect(reachable.has("src/agent/decision-receipt.ts")).toBe(false);
  });

  it("the ledger is a record of reality, not a claim: a misclassified entry fails", () => {
    // A DEAD_CODE entry that gains a production caller must be reported, not
    // silently tolerated — that is exactly the drift the ledger exists to catch.
    const problems = validateCoverageExemptionLedger(ROOT, {
      now: new Date("2999-01-01T00:00:00Z"),
    });
    expect(problems.some((problem) => problem.includes("review date"))).toBe(
      true,
    );
  });

  it("the vitest config still carries the committed exclusions verbatim", () => {
    const text = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
    const committed = committedExclusions(ROOT);
    for (const entry of committed) {
      expect(text, entry).toContain(`"${entry}"`);
    }
  });
});
