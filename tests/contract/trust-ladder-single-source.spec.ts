/**
 * The trust ladder is declared once (solo-maintenance rule).
 *
 * `TRUST_ORDER` lived in `src/types.ts` and was re-listed LITERALLY in four
 * other modules — `trust-summary` twice, `report-io`, and `milestone`. A
 * ladder with four copies is not one truth plus three projections; it is four
 * vocabularies that agree until someone adds a rung. And the failure mode is
 * silent: a module that missed the update reports the wrong level rather than
 * failing.
 *
 * For a solo maintainer this is the highest-leverage cleanup available. It
 * deletes a class of bug rather than adding a feature, and it costs one grep
 * rule to keep it deleted.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import { TRUST_ORDER, type TrustLevel } from "../../src/types.js";

const ROOT = join(import.meta.dirname, "..", "..");

function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts")) out.push(full);
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

const SPELLINGS = [
  /\[\s*"L0"\s*,\s*"L1"\s*,\s*"L2"\s*,\s*"L3"\s*,\s*"L4"\s*,\s*"L5"\s*\]/,
  /new Set\(\s*\[\s*"L0"\s*,\s*"L1"\s*,\s*"L2"\s*,\s*"L3"\s*,\s*"L4"\s*,\s*"L5"/,
];

describe("the trust ladder is declared exactly once", () => {
  it("no module re-lists the whole ladder", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles()) {
      const rel = relative(ROOT, file).replace(/\\/g, "/");
      // The declaration itself is the one legitimate spelling.
      if (rel === "src/types.ts") continue;
      const text = readFileSync(file, "utf8");
      if (SPELLINGS.some((pattern) => pattern.test(text))) offenders.push(rel);
    }
    expect(
      offenders,
      `these modules spell the ladder out instead of importing TRUST_ORDER: ${offenders.join(", ")}`,
    ).toEqual([]);
  });

  it("the ladder is contiguous and starts at L0", () => {
    expect(TRUST_ORDER[0]).toBe("L0");
    for (let i = 0; i < TRUST_ORDER.length; i++) {
      expect(TRUST_ORDER[i], `rung ${i}`).toBe(`L${i}`);
    }
  });

  it("the type is derived from the ladder, so adding a rung is a one-line change", () => {
    const declared: TrustLevel = "L3";
    expect(TRUST_ORDER).toContain(declared);
  });

  it("no test re-lists the ladder either", () => {
    // Tests are where a second vocabulary is most likely to appear and most
    // damaging: a test asserting against its own copy of the ladder passes
    // even after the ladder changed. Zero, not "rare" — a loose bound is one
    // more place for a copy to hide.
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          // Fixture corpora are data, not assertions, and they are large.
          if (entry.name === "corpus" || entry.name === "fixtures") continue;
          walk(full);
        } else if (
          entry.name.endsWith(".spec.ts") ||
          entry.name.endsWith(".test.ts")
        ) {
          if (SPELLINGS.some((p) => p.test(readFileSync(full, "utf8")))) {
            offenders.push(relative(ROOT, full).replace(/\\/g, "/"));
          }
        }
      }
    };
    walk(join(ROOT, "tests"));
    expect(
      offenders,
      `these tests spell the ladder out: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
