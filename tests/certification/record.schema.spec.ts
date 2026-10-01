/**
 * The §6 cell record, and the three things it must never be.
 *
 * 1. **Counts only.** A record carrying `fpWilsonUpper` is rejected by the
 *    schema's `not`/`additionalProperties: false` AND by the validator. The
 *    plan's example — `{fp: 5, n: 250, fpWilsonUpper: 0.02}` — reads as valid
 *    to anything that does not recompute it, so the refusal has to be a rule
 *    rather than a convention.
 *
 * 2. **`n` must equal its own parts.** That is the arithmetic twin of the same
 *    defect: an `n` that disagrees with `tp + fp` asserts something the
 *    evidence beside it does not support, and nothing recomputes an integer.
 *
 * 3. **`standard` is `v6-abcdef`, never `manifest-v5`.** §5.2's whole point is
 *    that the manifest's `CERTIFIED` ("the engine can analyse this") and a
 *    cell's `CERTIFIED` ("the §6 contract passed for this cell") are different
 *    claims. A record that names the wrong standard is the file where a reader
 *    takes one for the other.
 */

import { describe, expect, it } from "vitest";

import {
  CELL_RECORD_SCHEMA,
  CELL_STATES,
  validateCellRecord,
} from "../../src/certification/record.schema.js";

const HASH = `sha256:${"a".repeat(64)}`;

function record(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    concept: "hard-sleep-in-test",
    language: "typescript",
    framework: "vitest",
    detectorHash: HASH,
    state: "v6-CERTIFIED",
    standard: "v6-abcdef",
    precision: { tp: 40, fp: 0, n: 40 },
    sensitivity: { tp: 24, fn: 0, n: 24 },
    regressionFixtures: 3,
    corpusDiversity: { uniqueRepos: 6, maxSingleRepoShare: 0.25 },
    distinctShapes: 5,
    ...over,
  };
}

describe("a cell record", () => {
  it("accepts counts and nothing derived", () => {
    const { valid, problems } = validateCellRecord(record());
    expect(problems.join("\n")).toBe("");
    expect(valid).toBe(true);
  });

  it("rejects a stored Wilson bound, and names the field", () => {
    for (const field of [
      "fpWilsonUpper",
      "recallWilsonLower",
      "fpRate",
      "fnRate",
    ]) {
      const { valid, problems } = validateCellRecord(record({ [field]: 0.02 }));
      expect(valid, `${field} was accepted`).toBe(false);
      expect(problems.join(" ")).toContain(field);
      expect(problems.join(" ")).toContain("Counts are stored");
    }
  });

  it("rejects a derived value nested inside the counts", () => {
    // The plan's counter-example, verbatim. A check that only looked at the
    // top level would pass this — and the top level is not where someone
    // pastes a rate they just computed.
    const { valid, problems } = validateCellRecord(
      record({ precision: { tp: 245, fp: 5, n: 250, fpWilsonUpper: 0.02 } }),
    );
    expect(valid).toBe(false);
    expect(problems.join(" ")).toContain("fpWilsonUpper");
    expect(problems.join(" ")).toContain("not a count");
  });

  it("requires n to equal the counts it summarises", () => {
    const bad = validateCellRecord(
      record({ precision: { tp: 40, fp: 0, n: 41 } }),
    );
    expect(bad.valid).toBe(false);
    expect(bad.problems.join(" ")).toContain("n is 41 but tp+fp is 40");

    const badFn = validateCellRecord(
      record({ sensitivity: { tp: 20, fn: 2, n: 25 } }),
    );
    expect(badFn.valid).toBe(false);
    expect(badFn.problems.join(" ")).toContain("tp+fn");
  });

  it("refuses a bare detector hash", () => {
    const { valid, problems } = validateCellRecord(
      record({ detectorHash: "abc123" }),
    );
    expect(valid).toBe(false);
    expect(problems.join(" ")).toContain("sha256");
    // A bare hash cannot be compared against a rule's current identity, which
    // is what makes §6.4's divergence rule possible at all.
    expect(problems.join(" ")).toContain("divergence");
  });

  it("refuses the manifest's standard", () => {
    const { valid, problems } = validateCellRecord(
      record({ standard: "manifest-v5" }),
    );
    expect(valid).toBe(false);
    expect(problems.join(" ")).toContain("manifest-v5");
  });

  it("only accepts v6-prefixed cell states", () => {
    for (const state of CELL_STATES) {
      expect(validateCellRecord(record({ state })).valid, state).toBe(true);
    }
    // A bare `CERTIFIED` next to the manifest's `CERTIFIED` in the same row is
    // a sentence two readers will contradict each other about — which is why
    // the plan spells a cell state `v6-abcdef`.
    for (const state of ["CERTIFIED", "PENDING", "PARSEABLE", "MEASURED"]) {
      const { valid, problems } = validateCellRecord(record({ state }));
      expect(valid, `bare ${state} was accepted`).toBe(false);
      expect(problems.join(" ")).toContain("v6-");
    }
  });

  it("refuses an unknown property", () => {
    const { valid, problems } = validateCellRecord(record({ notes: "hi" }));
    expect(valid).toBe(false);
    expect(problems.join(" ")).toContain("notes is not a property");
  });

  it("bounds corpusDiversity", () => {
    expect(
      validateCellRecord(
        record({
          corpusDiversity: { uniqueRepos: 6, maxSingleRepoShare: 1.4 },
        }),
      ).valid,
    ).toBe(false);
    expect(
      validateCellRecord(
        record({ corpusDiversity: { uniqueRepos: 6 } }),
      ).problems.join(" "),
    ).toContain("maxSingleRepoShare");
  });

  it("accepts a §6.4 legacy verdict with its arm", () => {
    const { valid, problems } = validateCellRecord(
      record({
        legacyVerdicts: [
          {
            oldRuleId: "TQUAL-001",
            arm: "no-assertion",
            verdict: "FP",
            source: "tests/corpus/verdicts/TQUAL-001.jsonl",
          },
        ],
      }),
    );
    expect(problems.join("\n")).toBe("");
    expect(valid).toBe(true);
  });

  it("refuses a legacy verdict whose polarity is not one of the three", () => {
    const { valid, problems } = validateCellRecord(
      record({
        legacyVerdicts: [{ oldRuleId: "TQUAL-001", verdict: "MAYBE" }],
      }),
    );
    expect(valid).toBe(false);
    expect(problems.join(" ")).toContain("TP, FP or FN");
  });

  it("the schema itself refuses a computed field, not only the validator", () => {
    // Belt and braces on purpose: `additionalProperties: false` already
    // rejects an unknown key, and the `not` clause makes the REJECTION say
    // why — and it survives a future relaxation of the top level, which a
    // legitimate new field would force.
    expect(CELL_RECORD_SCHEMA.additionalProperties).toBe(false);
    expect(CELL_RECORD_SCHEMA.not).toBeDefined();
    // Read the length off the readonly tuple rather than casting it to a
    // mutable array — the cast changed nothing, and the linter was right to
    // say so.
    const branches = CELL_RECORD_SCHEMA.not.anyOf;
    expect(branches.length).toBeGreaterThanOrEqual(4);
  });

  it("every cell state is v6-prefixed", () => {
    for (const state of CELL_STATES) {
      expect(state.startsWith("v6-"), state).toBe(true);
    }
  });
});
