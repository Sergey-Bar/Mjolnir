/**
 * `docs/QUARANTINE-OWNERSHIP.json` — the exit ramp, drift-locked.
 *
 * The point of the registry is that a quarantined rule is never SILENT: it
 * carries either a `quarantinePromotion` on the rule or a typed disposition
 * here. `checkQuarantineOwnership` fails on silence, and this file is what it
 * fails on — so the two halves have to be kept honest together. A disposition
 * that goes stale, loses its owner, or drifts from the registry is exactly the
 * failure the ramp was built to end.
 *
 * Every assertion is a property of the data, not a snapshot of its counts. A
 * test pinning "26 pending-samples" passes again after a rule is promoted and
 * the register becomes wrong; a test pinning "every entry has a rationale that
 * mentions its own measurement" fails when it does.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { RULES } from "../../src/rules/index.js";
import {
  CORE_FP_CEILING,
  QUARANTINE_FP_FLOOR,
  effectiveTier,
  measurementInterval,
} from "../../src/rules/measurement.js";
import { checkQuarantineOwnership } from "../../src/commands/doctor.js";
import { renderOwnership } from "../../scripts/generate-quarantine-ledger.js";

const ROOT = join(import.meta.dirname, "..", "..");
const OWNERSHIP_PATH = join(ROOT, "docs", "QUARANTINE-OWNERSHIP.json");

interface OwnershipEntry {
  ruleId: string;
  disposition: string;
  rationale: string;
  measured: string;
  owner: string;
  expiresOn: string;
  evidenceRefs: string[];
}

interface Ownership {
  schemaVersion: number;
  count: number;
  byKind: Record<string, number>;
  entries: OwnershipEntry[];
  note: string;
}

const COMMITTED = JSON.parse(readFileSync(OWNERSHIP_PATH, "utf8")) as Ownership;
const QUARANTINED = RULES.filter((r) => effectiveTier(r) === "quarantine");

describe("quarantine ownership register: drift-locked", () => {
  it("equals a fresh derivation (regenerate with `npm run docs:quarantine-ledger`)", () => {
    expect(`${JSON.stringify(COMMITTED, null, 2)}\n`).toBe(renderOwnership());
  });

  it("covers exactly the live quarantine set — no gaps, no strays", () => {
    const recorded = COMMITTED.entries.map((e) => e.ruleId).sort();
    const live = QUARANTINED.map((r) => r.id).sort();
    expect(recorded).toEqual(live);
    expect(COMMITTED.count).toBe(live.length);
  });
});

describe("quarantine ownership register: every entry is a decision", () => {
  it("names a typed disposition from the closed set the generator can emit", () => {
    const kinds = new Set([
      "pending-measurement",
      "pending-rework",
      "pending-remeasure",
      "pending-promotion",
      "pending-samples",
      "structural",
    ]);
    for (const entry of COMMITTED.entries) {
      expect(kinds.has(entry.disposition), entry.ruleId).toBe(true);
    }
  });

  it("gives every entry an owner, a review date and a rationale with evidence", () => {
    for (const entry of COMMITTED.entries) {
      expect(entry.owner.trim(), entry.ruleId).not.toBe("");
      expect(entry.rationale.trim().length, entry.ruleId).toBeGreaterThan(40);
      expect(entry.expiresOn, entry.ruleId).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.evidenceRefs.length, entry.ruleId).toBeGreaterThan(0);
    }
  });

  it("cites paths that exist", () => {
    for (const entry of COMMITTED.entries) {
      for (const ref of entry.evidenceRefs) {
        expect(() => readFileSync(join(ROOT, ref), "utf8"), ref).not.toThrow();
      }
    }
  });

  it("has not lapsed — a lapsed disposition is a promise nobody kept", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const entry of COMMITTED.entries) {
      expect(
        entry.expiresOn >= today,
        `${entry.ruleId} lapsed ${entry.expiresOn}`,
      ).toBe(true);
    }
  });
});

describe("quarantine ownership register: the disposition matches the evidence", () => {
  it("claims pending-samples only for a rule whose interval really straddles", () => {
    // The disposition is derived from the interval, so asserting the derivation
    // is what stops a hand-edited register from quietly mislabelling a rule.
    // A register that says "needs samples" for a rule at 0/35 would send the
    // next maintainer to sample a rule that is already measured.
    for (const entry of COMMITTED.entries) {
      if (entry.disposition !== "pending-samples") continue;
      const rule = RULES.find((r) => r.id === entry.ruleId);
      if (rule === undefined) throw new Error(`no such rule ${entry.ruleId}`);
      const interval = measurementInterval(rule);
      expect(interval, entry.ruleId).toBeDefined();
      if (interval === undefined) continue;
      expect(
        interval.ciLow < QUARANTINE_FP_FLOOR,
        `${entry.ruleId} claims pending-samples but its interval is confidently bad`,
      ).toBe(true);
      expect(
        interval.ciHigh > CORE_FP_CEILING,
        `${entry.ruleId} claims pending-samples but its interval already clears core`,
      ).toBe(true);
    }
  });

  it("records the measurement the disposition was derived from", () => {
    for (const entry of COMMITTED.entries) {
      const rule = RULES.find((r) => r.id === entry.ruleId);
      if (rule === undefined) throw new Error(`no such rule ${entry.ruleId}`);
      const expected = measurementInterval(rule);
      if (expected === undefined) {
        expect(entry.measured, entry.ruleId).toBe("unmeasured");
      } else {
        expect(entry.measured, entry.ruleId).toContain("n=");
      }
    }
  });
});

describe("checkQuarantineOwnership enforces the ramp", () => {
  it("passes against the real registry — every quarantined rule is accounted for", () => {
    const result = checkQuarantineOwnership();
    expect(result.details.join("\n")).not.toContain("NO disposition");
    expect(result.ok, result.details.join("\n")).toBe(true);
  });

  it("FAILS on a quarantined rule that has neither record", () => {
    // Armed with a planted rule rather than asserted against the real registry:
    // a gate that has only ever seen a passing registry cannot be shown to fail,
    // and this one is the whole mechanism.
    const quarantined = RULES.find((r) => effectiveTier(r) === "quarantine");
    if (quarantined === undefined)
      throw new Error("no quarantined rule to clone");
    const clone = {
      ...quarantined,
      id: "QA-PROBE-999",
      quarantinePromotion: undefined,
    };
    const result = checkQuarantineOwnership([
      ...RULES.filter((r) => r.id !== quarantined.id),
      clone,
    ] as never);
    expect(result.ok).toBe(false);
    expect(result.details.join("\n")).toContain("QA-PROBE-999");
    expect(result.details.join("\n")).toContain("NO disposition");
  });
});
