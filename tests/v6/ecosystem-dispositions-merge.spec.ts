/**
 * The disposition ledger survives regeneration.
 *
 * `docs:ecosystem` rebuilt `docs/ECOSYSTEM-DISPOSITIONS.json` from the corpus
 * probe alone, so every recorded decision was erased the next time anyone ran
 * `docs:regen`, and on a machine without the corpus clones the file came out
 * empty. These pin the merge that replaced it.
 */
import { describe, expect, it } from "vitest";

import { mergeDispositions } from "../../scripts/v6/ecosystem-census.js";
import type { UnrecognizedDisposition } from "../../src/v6/ecosystem-census.js";

const entry = (
  name: string,
  disposition: UnrecognizedDisposition["disposition"],
  owner = "maintainer",
): UnrecognizedDisposition => ({ name, disposition, note: "n", owner });

describe("mergeDispositions", () => {
  it("keeps a recorded decision over the derived placeholder for the same tool", () => {
    const merged = mergeDispositions(
      [entry("mocha", "ACCEPTED_AS_TARGET")],
      [entry("mocha", "PENDING_ADJUDICATION", "ecosystem-census")],
    );
    expect(merged).toEqual([entry("mocha", "ACCEPTED_AS_TARGET")]);
  });

  it("adds a derived entry for a newly observed tool", () => {
    const merged = mergeDispositions(
      [entry("nyc", "NOT_APPLICABLE")],
      [entry("ava", "PENDING_ADJUDICATION", "ecosystem-census")],
    );
    expect(merged.map((d) => d.name)).toEqual(["ava", "nyc"]);
  });

  it("does not drop a recorded decision when the probe sees nothing", () => {
    // No corpus clones on this machine: the probe derives zero entries.
    const recorded = [entry("tox", "NOT_APPLICABLE")];
    expect(mergeDispositions(recorded, [])).toEqual(recorded);
  });
});
