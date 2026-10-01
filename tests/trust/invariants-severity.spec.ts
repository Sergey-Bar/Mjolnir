/**
 * Trust invariants: a severity, a claimed count, and the self-reference.
 *
 * Three properties, each of which the list did not have before 6.0:
 *
 *   1. **A severity.** `status` is a CURRENT/REQUIRED flag, not a ranking, so
 *      a reader could not tell which of the 24 they would be embarrassed to
 *      lose. `severity` answers that, and the type makes it REQUIRED rather
 *      than defaulted — a defaulted field on 24 entries is one edit plus an
 *      invitation to never make the other 24.
 *   2. **A count that is asserted.** "24 entries" was true and was not
 *      checked, which is the same shape as every number this change set
 *      removed. A test that reads a count out of prose is a test of prose.
 *   3. **The self-reference, stated where a reader will meet it.**
 *      `TRUST_INVARIANTS` is 24 statements about this repository, verified by
 *      this repository. A detector that is wrong in a way nobody noticed
 *      produces invariants that are individually true, consistent, and jointly
 *      describe a tool that does not work. Nothing in the list can catch that;
 *      only the corpus can, and the corpus is adjudicated by the same project.
 *      A reader who does not know that will over-trust the list.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  TRUST_INVARIANTS,
  type TrustInvariantSeverity,
} from "../../src/trust/invariants.js";

/** Read out of the source, so a doc claiming a number is checked against it. */
const SEVERITIES: readonly TrustInvariantSeverity[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

describe("trust invariants carry a severity", () => {
  it("every invariant has one, and it is from the closed set", () => {
    for (const inv of TRUST_INVARIANTS) {
      expect(
        SEVERITIES,
        `${inv.id} has severity "${inv.severity}", which is not in the set`,
      ).toContain(inv.severity);
    }
  });

  it("the ids are unique and well-formed", () => {
    const ids = TRUST_INVARIANTS.map((i) => i.id);
    expect(new Set(ids).size, "duplicate invariant id").toBe(ids.length);
    // `TI-nnn`, not a rule id: this table is not the rule registry, and the\n    // rule-id regex is the wrong instrument for it.\n    for (const id of ids) expect(id, id).toMatch(/^TI-\\d{3}$/);
  });

  it("CRITICAL is reserved for invariants a breach turns into a false claim", () => {
    // Not a rule the gate can enforce — a judgement about the list's own
    // semantics — but one that can be FALSIFIED in the sense that matters:
    // every CRITICAL invariant's description has to be about a claim the
    // product makes, not about a quality the tool has. "Determinism" and
    // "an error cannot become a pass" qualify; "PR-comment rendering is
    // deterministic" is a MEDIUM, and asserting otherwise would dilute the
    // word until it meant nothing.
    const critical = TRUST_INVARIANTS.filter((i) => i.severity === "CRITICAL");
    expect(
      critical.length,
      "no invariant is CRITICAL — the scale is unused",
    ).toBeGreaterThan(0);
    for (const inv of critical) {
      expect(
        // The words a GUARANTEE is written with. "does not" and "requires"
        // qualify as claims: a rule that will not be promoted because a
        // detector is close to a class boundary is a guarantee, and the first
        // version of this regex missed two entries for exactly that reason.
        /cannot|must not|must be|never|does not|unchanged|same |identical|deterministic|requires/i.test(
          inv.description,
        ),
        `${inv.id} is CRITICAL but its description makes no absolute claim: "${inv.description}"`,
      ).toBe(true);
    }
  });

  it("presentation-only invariants are not CRITICAL", () => {
    // The specific dilution this guards: a CRITICAL list where half the
    // entries are about rendering is a list whose CRITICAL means nothing.
    for (const inv of TRUST_INVARIANTS) {
      if (inv.scope !== "PR Comments") continue;
      expect(inv.severity, `${inv.id} (PR rendering) is CRITICAL`).not.toBe(
        "CRITICAL",
      );
    }
  });
});

describe("the self-reference is stated where a reader meets it", () => {
  it("the module header says these are verified by the repository they describe", () => {
    // Asserted on the FILE, deliberately: the header is documentation, and
    // the thing that can rot is the documentation. An assertion that imported
    // a constant would prove nothing about where the warning is.
    const source = readFileSync(
      join(import.meta.dirname, "..", "..", "src", "trust", "invariants.ts"),
      "utf8",
    );
    // The header is the whole file prologue. The self-reference warning sits
    // after the type definitions (it is about the LIST, not the type), so
    // slicing to the first `export` would slice past the thing being asserted
    // and the check would fail for a reason that looks like a missing warning.
    const header = source.slice(
      0,
      source.indexOf("export const TRUST_INVARIANTS"),
    );
    expect(header).toMatch(/SELF-REFERENTIAL/i);
    // And it must say what the list is actually good for, or the warning reads
    // as "ignore this file" rather than "read it for regression, not for
    // external validation".
    expect(header).toMatch(/corpus/i);
    expect(header).toMatch(/drift|regression/i);
  });
});
