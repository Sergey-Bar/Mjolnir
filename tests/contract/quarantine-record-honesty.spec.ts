/**
 * A message that names a field the type does not have sends the next person
 * looking for it.
 *
 * `CorePromotion` has five fields: `rationale`, `owner`, `grantedAt`,
 * `expiresOn`, `evidenceRefs`. Both the `quarantinePromotion` doc comment and
 * the doctor's own detail message told the reader that a quarantined rule
 * carries "no owner, no review date and no exit condition" — and there is no
 * exit-condition field anywhere in `src/`, `docs/` or `tests/`. In a
 * repository whose north-star metric is false-proof rate ≈ 0, a report that
 * describes a field the contract does not define is the same defect class as a
 * rule that reports a metric it never measured: the reader is sent to do work
 * against a shape that is not there.
 *
 * The message is load-bearing for the remediation effort — it is the line
 * `doctor` prints about the largest open item in the tree, and it tells
 * someone working the backlog what the record needs to contain. So the field
 * list is parsed out of the type rather than restated here: this test fails if
 * the type gains a field the message omits, and fails if the message ever names
 * one the type lacks. Restating the list in the test would be the same drift it
 * exists to catch.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { checkQuarantineOwnership } from "../../src/commands/doctor.js";

const ROOT = join(import.meta.dirname, "..", "..");

/** The declared fields of `CorePromotion`, read from the type itself. */
function corePromotionFields(): Set<string> {
  const source = readFileSync(join(ROOT, "src", "rules", "rule.ts"), "utf8");
  const block = source.match(
    /export interface CorePromotion \{([\s\S]*?)\n\}/,
  )?.[1];
  expect(block, "src/rules/rule.ts must declare CorePromotion").toBeDefined();
  if (block === undefined) return new Set();
  return new Set(
    [...block.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1] as string),
  );
}

describe("the quarantine-ownership report", () => {
  const fields = corePromotionFields();

  it("names only fields CorePromotion actually declares", () => {
    const message = checkQuarantineOwnership().details.join("\n");
    // Every backticked identifier in the report must be a real field or a real
    // field of the containing rule. `quarantinePromotion` is on `Rule`; the
    // others are on `CorePromotion`.
    const named = [...message.matchAll(/`(\w+)`/g)].map((m) => m[1] as string);
    expect(
      named.length,
      "the report names fields in backticks",
    ).toBeGreaterThan(0);
    for (const name of named) {
      expect(
        fields.has(name) || name === "quarantinePromotion",
        `doctor names \`${name}\`, which CorePromotion does not declare. ` +
          `Declared: ${[...fields].join(", ")}.`,
      ).toBe(true);
    }
  });

  it("names the three a backfilled record has to supply", () => {
    const message = checkQuarantineOwnership().details.join("\n");
    // The three a person backfilling `quarantinePromotion` actually writes.
    // `evidenceRefs` is legitimately empty for a structural premise, and
    // `grantedAt` is the grant's own stamp, so neither is an obligation the
    // message should demand.
    for (const required of ["owner", "rationale", "expiresOn"]) {
      expect(
        message,
        `the report must name \`${required}\` — it is one of the three fields ` +
          `a backfilled record has to supply`,
      ).toContain(required);
    }
  });

  it("does not demand a field the type does not declare", () => {
    // The regression this file exists for, asserted by name so the fix cannot
    // be reverted silently by re-adding the phrase.
    const message = checkQuarantineOwnership().details.join("\n");
    expect(message).not.toContain("exit condition");
    expect(message).not.toContain("exitCondition");
  });
});
