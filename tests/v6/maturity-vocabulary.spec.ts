/**
 * Two maturity ladders, and the gate that keeps them apart.
 *
 * `docs/adr/0001` fixed CAPABILITY maturity to `M0`–`M5` and it is DERIVED:
 * `src/v6/maturity.ts` states that deriving from evidence is the only way a
 * capability gets a level. The framework inventory carries a second ladder,
 * `F0`–`F5`, which is DECLARED — a hand-maintained target scored from a
 * scorecard.
 *
 * Both were called "maturity", and both had a type called `MaturityLevel`. Two
 * vocabularies for one word is how a hand-declared F-level gets quoted beside a
 * derived M-level as though they were the same measurement, and only one of
 * them is. `docs/adr/0007` mandates one inventory; this is its enforcement.
 *
 * What is asserted here is that the two can never be swapped in a position —
 * by name, by letter, or by accident. A comment saying "F is declared, M is
 * derived" is a promise; this is the check.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";
import { MATURITY_LEVELS } from "../../src/v6/maturity.js";

const ROOT = join(import.meta.dirname, "..", "..");

/** The declared `F` ladder, read from the inventory's own type. */
const FRAMEWORK_LEVELS = ["F0", "F1", "F2", "F3", "F4", "F5"] as const;

describe("the two maturity ladders are different vocabularies", () => {
  it("the capability ladder is M0–M5 and the framework ladder is F0–F5", () => {
    expect(MATURITY_LEVELS.every((l) => l.startsWith("M"))).toBe(true);
    expect(FRAMEWORK_LEVELS.every((l) => l.startsWith("F"))).toBe(true);
    // A shared member would make `M3` mean two things depending on which file
    // a reader opened.
    expect(
      MATURITY_LEVELS.filter((l) =>
        (FRAMEWORK_LEVELS as readonly string[]).includes(l),
      ),
    ).toEqual([]);
  });

  it("the framework inventory's declared levels are F-levels, never M-levels", () => {
    // The check that would have caught the confusion: a hand-edited inventory
    // row that pastes an `M3` in from the census, and every reader thereafter
    // quotes it as a derived level.
    for (const framework of FRAMEWORK_INVENTORY) {
      // `toContain` on a readonly tuple needs the element typed as that tuple's
      // member; the inventory's own `FrameworkSupportLevel` IS the tuple, so
      // widening the tuple to `readonly string[]` is what makes the assertion
      // compile without a cast on each field.
      expect(FRAMEWORK_LEVELS, `${framework.frameworkId}.maturity`).toContain(
        framework.maturity,
      );
      expect(
        FRAMEWORK_LEVELS,
        `${framework.frameworkId}.targetMaturity`,
      ).toContain(framework.targetMaturity);
    }
  });

  it("the framework ladder's type is named for what it is", () => {
    // Asserted on the SOURCE, deliberately: the rename is the fix and a type
    // import would prove nothing about whether the name still says `Maturity`.
    const source = readFileSync(
      join(ROOT, "src", "frameworks", "framework-inventory.ts"),
      "utf8",
    );
    expect(source).toMatch(/export type FrameworkSupportLevel\s*=\s*"F0"/);
    // And the old name survives only as an explicitly deprecated alias.
    // `[\\s\\S]` rather than `.` because the doc comment and the export are
    // separated by a blank line, and `[^]` would be the useless-flag warning
    // all over again.
    const alias = source.match(
      /\*\*[^*]*\*\/[\s\S]*?export type MaturityLevel =/,
    );
    expect(
      alias,
      "`MaturityLevel` still exists without a deprecation note — a reader cannot tell it is an alias",
    ).not.toBeNull();
  });

  it("the framework ladder says in its own source that it is DECLARED, not derived", () => {
    // The property that actually matters, and the one a rename cannot convey
    // on its own: which of the two numbers is a measurement.
    const source = readFileSync(
      join(ROOT, "src", "frameworks", "framework-inventory.ts"),
      "utf8",
    );
    expect(source).toMatch(/DECLARED/);
    expect(source).toMatch(/only way a capability gets a level/i);
  });

  it("`src/v6/maturity.ts` is the only place a capability is assigned an M level", () => {
    // The census derives; the inventory declares. Asserted on the DERIVER's
    // file so the claim "M is derived" is checked where the derivation lives.
    // The phrase is split across a line wrap in the source, so the whitespace
    // is normalised before matching — a test that pins the source's line
    // breaking is a test of the source's formatting.
    const source = readFileSync(
      join(ROOT, "src", "v6", "maturity.ts"),
      "utf8",
    ).replace(/\s+/g, " ");
    // Matched on the words around the line wrap, not across it: the source
    // says "the only way a capability gets a * level", with an emphasis marker
    // inside the phrase, so a single-span match on the sentence tests the
    // source's markdown rather than the claim.
    expect(source).toMatch(/the only way a capability gets a \* level/i);
  });
});
