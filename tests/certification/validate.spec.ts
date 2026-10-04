/**
 * The §6 contract's first test — and the one that has to exist before any
 * cell is measured.
 *
 * These are not coverage tests. Each pins a NUMBER the plan's thresholds are
 * derived from, so that a change to `Z95`, to the rounding, or to a threshold
 * cannot quietly move the bar. A certification gate whose arithmetic drifts is
 * the failure this product exists to catch, applied to itself.
 */
import { describe, expect, it } from "vitest";

import { CONCEPT_IDS, CONCEPTS } from "../../src/certification/concepts.js";
import { wilsonInterval } from "../../src/lib/wilson.js";
import {
  assertCountsOnly,
  CONCEPT_FP_WILSON_UPPER_MAX,
  CONCEPT_MIN_N,
  CONCEPT_RECALL_WILSON_LOWER_MIN,
  CELL_RECALL_WILSON_LOWER_MIN,
  PRECISION_MAX_SINGLE_REPO_SHARE,
  PRECISION_MIN_UNIQUE_FRAMEWORK_VERSIONS,
  PRECISION_MAX_SINGLE_SIZE_BAND_SHARE,
  PRECISION_MIN_UNIQUE_REPOS,
  validateCell,
  validateConcept,
  type CellEvidence,
} from "../../src/certification/validate.js";

/**
 * A concept with exactly ONE live language binding.
 *
 * Gate D refuses a cell whose concept has several bindings, because
 * certifying one language says nothing about the others. So a fixture that
 * wants a cell passing every gate needs a single-binding concept, and which
 * concept that is changes when the rules change — so it is DISCOVERED from the
 * table rather than hardcoded.
 */
const SINGLE_LANGUAGE_CONCEPT: string =
  CONCEPT_IDS.find((id) => (CONCEPTS[id]?.languages.length ?? 0) === 1) ??
  (() => {
    throw new Error(
      "no concept has exactly one language binding — a concept with no " +
        "languages at all cannot pass gate D either, so the fixture has " +
        "nothing to stand on",
    );
  })();

/** A cell that passes every gate, so a test can break exactly one. */
function passingCell(over: Partial<CellEvidence> = {}): CellEvidence {
  return {
    concept: SINGLE_LANGUAGE_CONCEPT,
    language: CONCEPTS[SINGLE_LANGUAGE_CONCEPT]?.languages[0] ?? "typescript",
    framework: "vitest",
    detectorHash: "sha256:test",
    precision: { tp: 40, fp: 0, n: 40 },
    sensitivity: { tp: 24, fn: 0, n: 24 },
    regressionFixtures: 3,
    corpusDiversity: {
      uniqueRepos: 6,
      maxSingleRepoShare: 0.25,
      uniqueFrameworkVersions: 3,
      maxSingleSizeBandShare: 0.4,
      sizeBand: 1,
    },
    distinctShapes: 5,
    ...over,
  };
}

describe("the thresholds are the numbers they are because of", () => {
  it("n=35 is where a PERFECT cell first clears both concept gates", () => {
    // The plan's justification for the concept bar, in one assertion:
    // wilson(0,35)=0.0989 ≤ 0.10 and wilson(35,35)=0.9011 ≥ 0.90 — the SAME
    // n clears precision AND recall. That coincidence is why 35 and not 30 or
    // 40.
    expect(wilsonInterval(0, 35).ciHigh).toBeLessThanOrEqual(
      CONCEPT_FP_WILSON_UPPER_MAX,
    );
    expect(wilsonInterval(35, 35).ciLow).toBeGreaterThanOrEqual(
      CONCEPT_RECALL_WILSON_LOWER_MIN,
    );
  });

  it("n=34 does NOT clear it, which is what makes 35 a threshold", () => {
    // A threshold nobody fails is not a threshold.
    expect(wilsonInterval(0, 34).ciHigh).toBeGreaterThan(
      CONCEPT_FP_WILSON_UPPER_MAX,
    );
  });

  it("one false positive in 39 breaks the concept bar", () => {
    expect(wilsonInterval(1, 39).ciHigh).toBeGreaterThan(
      CONCEPT_FP_WILSON_UPPER_MAX,
    );
  });

  it("the cell tier is n=20, where wilson(20,20)=0.8389 clears 0.80", () => {
    // The per-cell bar is LOWER ON PURPOSE: a language binding is a vocabulary
    // table, and "this table is wired correctly" is a weaker and more honest
    // claim than "this detector works".
    expect(wilsonInterval(20, 20).ciLow).toBeGreaterThanOrEqual(
      CELL_RECALL_WILSON_LOWER_MIN,
    );
    expect(wilsonInterval(10, 10).ciLow).toBeLessThan(
      CELL_RECALL_WILSON_LOWER_MIN,
    );
  });

  it("reports the bounds it computed rather than reading them", () => {
    const verdict = validateCell(passingCell());
    // 0 FP in 40 and 24/24 recalled — the two outputs.
    expect(verdict.fpWilsonUpper).toBe(wilsonInterval(0, 40).ciHigh);
    // 24 true positives out of 24 — the SUCCESSES, which is what a recall\n    // bound counts. wilson(20,20)=0.8389 is the same arithmetic.\n    expect(verdict.recallWilsonLower).toBe(wilsonInterval(24, 24).ciLow);
    // And they are on the verdict, not on the evidence.
    expect(Object.keys(passingCell())).not.toContain("fpWilsonUpper");
    expect(Object.keys(passingCell())).not.toContain("recallWilsonLower");
  });
});

describe("a record may not carry a computed interval", () => {
  it("accepts counts alone", () => {
    expect(() =>
      assertCountsOnly({
        concept: "hard-sleep-in-test",
        precision: { tp: 40, fp: 0, n: 40 },
        sensitivity: { tp: 24, fn: 0, n: 24 },
      }),
    ).not.toThrow();
  });

  it("rejects a stored FP bound, and names the field", () => {
    // The plan's own example: {fp: 5, n: 250} with fpWilsonUpper: 0.02. It
    // looks valid to anything that does not recompute it.
    expect(() =>
      assertCountsOnly({
        precision: { tp: 245, fp: 5, n: 250 },
        fpWilsonUpper: 0.02,
      }),
    ).toThrow(/fpWilsonUpper/);
    expect(() =>
      assertCountsOnly({
        sensitivity: { tp: 30, fn: 2, n: 32 },
        recallWilsonLower: 0.91,
      }),
    ).toThrow(/recallWilsonLower/);
  });

  it("rejects a pre-computed rate for the same reason", () => {
    // `fpRate` is the shape the old measurements use. A record carrying it is
    // carrying a claim the validator must be free to disagree with.
    expect(() =>
      assertCountsOnly({ precision: { tp: 1, fp: 1, n: 2, fpRate: 0.5 } }),
    ).toThrow(/fpRate/);
  });
});

describe("every gate reports itself, so a gap report can name what is open", () => {
  it("a passing cell passes all six", () => {
    const verdict = validateCell(passingCell());
    expect(verdict.passed).toBe(true);
    expect(verdict.gates.map((g) => g.gate)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
  });

  it("a thin precision cell fails A with the arithmetic in the reason", () => {
    const verdict = validateCell(
      passingCell({ precision: { tp: 10, fp: 2, n: 12 } }),
    );
    expect(verdict.passed).toBe(false);
    const a = verdict.gates.find((g) => g.gate === "A");
    expect(a?.passed).toBe(false);
    // The reason states the numbers, not "failed". A contributor opening a gap
    // needs to know what to write.
    expect(a?.reasons.join(" ")).toContain("n=12");
    expect(a?.reasons.join(" ")).toContain(String(CONCEPT_MIN_N));
    expect(a?.bound).toBeGreaterThan(CONCEPT_FP_WILSON_UPPER_MAX);
  });

  it("one repository cannot supply a precision cell", () => {
    // QA-TEST-004 fires 157 times on tanstack-query alone, and 157 fires on
    // one repository is not evidence about hard-coded waits.
    const verdict = validateCell(
      passingCell({
        corpusDiversity: {
          uniqueRepos: 1,
          maxSingleRepoShare: 1,
          uniqueFrameworkVersions: 1,
          maxSingleSizeBandShare: 1,
          sizeBand: 1,
        },
      }),
    );
    const f = verdict.gates.find((g) => g.gate === "F");
    expect(f?.passed).toBe(false);
    expect(f?.reasons.join(" ")).toContain(String(PRECISION_MIN_UNIQUE_REPOS));
    expect(f?.reasons.join(" ")).toContain(
      String(PRECISION_MAX_SINGLE_REPO_SHARE),
    );
  });

  it("three repositories on ONE framework version is not three versions of evidence", () => {
    // The failure `uniqueRepos` cannot see: a set of repositories can agree on a
    // version by being forks of each other, by sharing a lockfile, or by all
    // pinning the same release. `uniqueRepos: 6` then reads as breadth while
    // every row came from one version — and a rate measured only against Jest 29
    // is a statement about Jest 29.
    const verdict = validateCell(
      passingCell({
        corpusDiversity: {
          uniqueRepos: 6,
          maxSingleRepoShare: 0.25,
          uniqueFrameworkVersions: 1,
          maxSingleSizeBandShare: 0.4,
          sizeBand: 1,
        },
      }),
    );
    const f = verdict.gates.find((g) => g.gate === "F");
    expect(f?.passed).toBe(false);
    expect(f?.reasons.join(" ")).toContain(
      String(PRECISION_MIN_UNIQUE_FRAMEWORK_VERSIONS),
    );
  });

  it("one project-size band may not supply the cell", () => {
    // Size is a second way for a cell to be narrower than it looks: a set of
    // small repositories can agree on a rate that does not survive contact with
    // a monorepo, without any single repo dominating by row count.
    const verdict = validateCell(
      passingCell({
        corpusDiversity: {
          uniqueRepos: 6,
          maxSingleRepoShare: 0.3,
          uniqueFrameworkVersions: 3,
          maxSingleSizeBandShare: 0.9,
          sizeBand: 2,
        },
      }),
    );
    const f = verdict.gates.find((g) => g.gate === "F");
    expect(f?.passed).toBe(false);
    expect(f?.reasons.join(" ")).toContain(
      String(PRECISION_MAX_SINGLE_SIZE_BAND_SHARE),
    );
  });

  it("an ABSENT axis is reported as absent, not as zero", () => {
    // The distinction that makes the new fields worth requiring. A missing
    // `uniqueFrameworkVersions` read as `undefined < 2` would produce the same
    // sentence as a measured 1, and the two call for different work: one is a
    // recording omission, the other is a finding about the evidence.
    //
    // The cast is deliberate and is the point: a record lives in JSON, which does
    // not enforce the interface, so the shape a real record can arrive in is
    // wider than the type. That gap is exactly what this asserts.
    const partialAxis = {
      uniqueRepos: 6,
      maxSingleRepoShare: 0.25,
    } as unknown as NonNullable<CellEvidence["corpusDiversity"]>;
    const verdict = validateCell(passingCell({ corpusDiversity: partialAxis }));
    const reasons = verdict.gates
      .find((g) => g.gate === "F")
      ?.reasons.join(" ");
    expect(reasons).toContain("uniqueFrameworkVersions is absent");
    expect(reasons).toContain("maxSingleSizeBandShare is absent");
  });

  it("F does not apply to a sensitivity-only reading of the same cell", () => {
    // Sensitivity positives are constructed by design and have no repository
    // identity. The guard there is `distinctShapes`, and the plan is explicit
    // that F must not be charged for them.
    const verdict = validateCell(
      passingCell({
        // `exactOptionalPropertyTypes` distinguishes "absent" from
        // "present and undefined", and F reads ABSENT as the finding — so
        // the field is omitted rather than blanked.
        corpusDiversity: undefined,
      } as unknown as Partial<CellEvidence>),
    );
    const f = verdict.gates.find((g) => g.gate === "F");
    expect(f?.passed).toBe(false);
    expect(f?.reasons.join(" ")).toContain("corpusDiversity is absent");
    expect(f?.dimension).toContain("precision only");
  });

  it("a multi-language concept's OWN cell passes gate D", () => {
    // The previous version of this gate failed ANY cell whose concept had
    // more than one language binding — which means no cell of the
    // three-language concepts could ever pass, and 40 of the 100 open cells
    // listed gate D. Language parity is a property of the SET (§6.E), computed
    // by the ecosystem roll-up in the matrix; a single cell cannot answer it.
    // What it CAN answer is whether it names a language the concept is bound to.
    const multi = CONCEPT_IDS.find(
      (id) => (CONCEPTS[id]?.languages.length ?? 0) > 1,
    );
    expect(
      multi,
      "no concept has more than one language binding",
    ).toBeDefined();
    const key = multi as string;
    const own = validateCell(
      passingCell({
        concept: key,
        language: CONCEPTS[key]?.languages[0] ?? "typescript",
      }),
    );
    expect(own.gates.find((g) => g.gate === "D")?.passed).toBe(true);
  });

  it("a cell naming a language the concept is NOT bound to fails gate D", () => {
    const multi = CONCEPT_IDS.find(
      (id) => (CONCEPTS[id]?.languages.length ?? 0) > 1,
    ) as string;
    const wrong =
      ["cobol", "haskell", "elixir", "fortran"].find(
        (l) => !(CONCEPTS[multi]?.languages ?? []).includes(l),
      ) ?? "not-a-language";
    const verdict = validateCell(
      passingCell({ concept: multi, language: wrong }),
    );
    const d = verdict.gates.find((g) => g.gate === "D");
    expect(d?.passed).toBe(false);
    expect(d?.reasons.join(" ")).toContain("not bound to");
    expect(d?.dimension).toBe("language binding");
  });

  it("the concept tier is pooled and stricter than the cell tier", () => {
    // A cell can pass at n=20 while the concept has not yet earned the 0.90
    // claim. Both verdicts are reported, which is how a reader sees that the
    // difference is pooling and not a contradiction.
    const cell = validateCell(passingCell());
    const concept = validateConcept("hard-sleep-in-test", {
      tp: 24,
      fn: 0,
      n: 24,
    });
    expect(cell.gates.find((g) => g.gate === "B")?.passed).toBe(true);
    expect(concept.passed).toBe(false);
    expect(concept.reasons.join(" ")).toContain(String(CONCEPT_MIN_N));
    // The SAME evidence clears the cell bar and fails the concept bar — which
    // is the entire reason §5.5b has two tiers. A cell claims "this binding
    // is wired correctly"; a concept claims "this detector catches the
    // failure mode". The second is a bigger claim and needs more evidence.
    expect(concept.bound).toBeGreaterThanOrEqual(CELL_RECALL_WILSON_LOWER_MIN);
    expect(concept.bound).toBeLessThan(CONCEPT_RECALL_WILSON_LOWER_MIN);
    // And it fails on the sample size too, by name, so a contributor knows
    // that adding fixtures is the fix rather than guessing.
    expect(concept.reasons.join(" ")).toContain("pooled sensitivity n=24");
  });
});
