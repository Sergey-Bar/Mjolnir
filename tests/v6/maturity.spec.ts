import { describe, expect, it } from "vitest";

import {
  MACHINE_REACHABLE_CEILING,
  MATURITY_DESCRIPTIONS,
  MATURITY_LEVELS,
  MATURITY_NAMES,
  MATURITY_SHORT,
  ORTHOGONAL_AXES,
  ORTHOGONAL_AXIS_IDS,
  PROMOTION_CRITERIA,
  demote,
  deriveMaturityFromEvidence,
  findAxisViolations,
  isMaturity,
  isOverClaiming,
  maturityRank,
  nextLevelGapFromEvidence,
  nextMaturity,
  previousMaturity,
  requiresNextLevelGap,
  validateNextLevelGap,
  type MaturityEvidence,
} from "../../src/v6/maturity.js";

const NONE: MaturityEvidence = {
  declared: false,
  implemented: false,
  unitTested: false,
  fixtureQuadVerified: false,
  corpusVerified: false,
  fieldProven: false,
};

describe("ADR 0001 — the M0-M5 maturity ladder", () => {
  it("declares exactly the six agreed levels, in order", () => {
    expect(MATURITY_LEVELS).toEqual([
      "M0_UNKNOWN",
      "M1_DECLARED",
      "M2_IMPLEMENTED",
      "M3_FIXTURE_VERIFIED",
      "M4_CORPUS_VERIFIED",
      "M5_FIELD_PROVEN",
    ]);
  });

  it("gives every level a short form, a name, a description and a promotion criterion", () => {
    for (const level of MATURITY_LEVELS) {
      expect(MATURITY_SHORT[level]).toMatch(/^M[0-5]$/);
      expect(MATURITY_NAMES[level]).toBeTruthy();
      expect(MATURITY_DESCRIPTIONS[level].length).toBeGreaterThan(20);
      expect(PROMOTION_CRITERIA[level]).toBeTruthy();
    }
  });

  it("uses distinct promotion criteria, so no level is a rename of another", () => {
    const criteria = MATURITY_LEVELS.map((level) => PROMOTION_CRITERIA[level]);
    expect(new Set(criteria).size).toBe(criteria.length);
  });

  it("ranks monotonically and treats unparseable input as M0", () => {
    for (let index = 1; index < MATURITY_LEVELS.length; index += 1) {
      const previous = MATURITY_LEVELS[index - 1];
      const current = MATURITY_LEVELS[index];
      if (previous === undefined || current === undefined) continue;
      expect(maturityRank(current)).toBeGreaterThan(maturityRank(previous));
    }
    // An unparseable claim is not a claim.
    for (const junk of [undefined, null, "M6", "L4", "high", 7, {}]) {
      expect(maturityRank(junk)).toBe(0);
      expect(isMaturity(junk)).toBe(false);
    }
  });

  it("never puts an L-prefixed value on the ladder", () => {
    // ADR 0001's whole reason for existing: L0-L5 is the finding trust
    // level and must not leak into capability maturity.
    for (const level of MATURITY_LEVELS) {
      expect(level).not.toMatch(/^L[0-5]/);
    }
    expect(MATURITY_LEVELS).not.toContain("L4" as never);
  });

  it("walks the ladder in both directions and stops at the ends", () => {
    expect(nextMaturity("M0_UNKNOWN")).toBe("M1_DECLARED");
    expect(previousMaturity("M1_DECLARED")).toBe("M0_UNKNOWN");
    expect(nextMaturity("M5_FIELD_PROVEN")).toBeNull();
    expect(previousMaturity("M0_UNKNOWN")).toBeNull();
  });
});

describe("ADR 0001 — maturity is derived from evidence, never hand-set", () => {
  it("derives the highest level whose own criterion and every one below it hold", () => {
    expect(deriveMaturityFromEvidence(NONE)).toBe("M0_UNKNOWN");
    expect(deriveMaturityFromEvidence({ ...NONE, declared: true })).toBe(
      "M1_DECLARED",
    );
    expect(
      deriveMaturityFromEvidence({
        ...NONE,
        declared: true,
        implemented: true,
        unitTested: true,
      }),
    ).toBe("M2_IMPLEMENTED");
    expect(
      deriveMaturityFromEvidence({
        ...NONE,
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
      }),
    ).toBe("M3_FIXTURE_VERIFIED");
    expect(
      deriveMaturityFromEvidence({
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
        corpusVerified: true,
        fieldProven: false,
      }),
    ).toBe("M4_CORPUS_VERIFIED");
    expect(
      deriveMaturityFromEvidence({
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
        corpusVerified: true,
        fieldProven: true,
      }),
    ).toBe("M5_FIELD_PROVEN");
  });

  it("refuses to skip a level: a corpus run without a fixture quad is M2", () => {
    // The monotone-chain rule is what stops "we ran it on 40 real repos"
    // from being advertised as M4 without the deterministic layer under it.
    expect(
      deriveMaturityFromEvidence({
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: false,
        corpusVerified: true,
        fieldProven: false,
      }),
    ).toBe("M2_IMPLEMENTED");
  });

  it("caps the machine-reachable ceiling at M4", () => {
    // M5 needs external field evidence, which the zero-network default
    // never produces. Unreachable from inside the engine, by design.
    expect(MACHINE_REACHABLE_CEILING).toBe("M4_CORPUS_VERIFIED");
  });

  it("flags an advertised level above the proven one", () => {
    expect(isOverClaiming("M4_CORPUS_VERIFIED", "M2_IMPLEMENTED")).toBe(true);
    expect(isOverClaiming("M2_IMPLEMENTED", "M4_CORPUS_VERIFIED")).toBe(false);
    expect(isOverClaiming("M5_FIELD_PROVEN", "M4_CORPUS_VERIFIED")).toBe(true);
  });
});

describe("ADR 0001 — the nextLevelGap obligation", () => {
  it("requires a gap at every level below M5 and forbids one at M5", () => {
    for (const level of MATURITY_LEVELS) {
      expect(requiresNextLevelGap(level)).toBe(level !== "M5_FIELD_PROVEN");
    }
  });

  it("rejects a missing gap, a wrong target, an empty missing-list, an unowned gap and a trigger-less gap", () => {
    const valid = {
      target: "M2_IMPLEMENTED" as const,
      missing: ["unit tests"],
      owner: "someone",
      revisitTrigger: "a new major",
    };
    expect(validateNextLevelGap("M1_DECLARED", valid)).toEqual({ ok: true });

    expect(validateNextLevelGap("M1_DECLARED", null).ok).toBe(false);
    expect(validateNextLevelGap("M1_DECLARED", undefined).ok).toBe(false);
    // The target must be the level the capability is actually working toward.
    expect(
      validateNextLevelGap("M1_DECLARED", {
        ...valid,
        target: "M4_CORPUS_VERIFIED",
      }).ok,
    ).toBe(false);
    expect(
      validateNextLevelGap("M1_DECLARED", { ...valid, missing: [] }).ok,
    ).toBe(false);
    expect(
      validateNextLevelGap("M1_DECLARED", { ...valid, owner: "  " }).ok,
    ).toBe(false);
    // Auto-demotion depends on the trigger, so it is not optional.
    expect(
      validateNextLevelGap("M1_DECLARED", { ...valid, revisitTrigger: "" }).ok,
    ).toBe(false);
    expect(validateNextLevelGap("M5_FIELD_PROVEN", null)).toEqual({ ok: true });
    expect(validateNextLevelGap("M5_FIELD_PROVEN", valid).ok).toBe(false);
  });

  it("derives a gap whose missing-list names the unsatisfied criteria", () => {
    const { maturity, nextLevelGap } = nextLevelGapFromEvidence(
      { ...NONE, declared: true },
      "owner-x",
      "trigger-y",
    );
    expect(maturity).toBe("M1_DECLARED");
    expect(nextLevelGap?.target).toBe("M2_IMPLEMENTED");
    expect(nextLevelGap?.missing.join(" ")).toMatch(/implementation exists/);
    expect(validateNextLevelGap(maturity, nextLevelGap)).toEqual({ ok: true });

    const top = nextLevelGapFromEvidence(
      {
        declared: true,
        implemented: true,
        unitTested: true,
        fixtureQuadVerified: true,
        corpusVerified: true,
        fieldProven: true,
      },
      "owner-x",
      "trigger-y",
    );
    expect(top.maturity).toBe("M5_FIELD_PROVEN");
    expect(top.nextLevelGap).toBeNull();
  });
});

describe("ADR 0001 — auto-demotion", () => {
  const gap = {
    target: "M3_FIXTURE_VERIFIED" as const,
    missing: ["fixtures"],
    owner: "owner",
    revisitTrigger: "trigger",
  };

  it("does nothing when no trigger fired", () => {
    expect(
      demote({ maturity: "M3_FIXTURE_VERIFIED", gap, triggerFired: false }),
    ).toBeNull();
  });

  it("demotes the level the gap was working toward, one step, and says why", () => {
    expect(
      demote({
        maturity: "M3_FIXTURE_VERIFIED",
        gap,
        triggerFired: true,
        detectorRevisionChanged: true,
      }),
    ).toEqual({
      from: "M3_FIXTURE_VERIFIED",
      to: "M2_IMPLEMENTED",
      reason: "DETECTOR_REVISION_CHANGED",
    });
  });

  it("prefers the most specific reason", () => {
    const result = demote({
      maturity: "M3_FIXTURE_VERIFIED",
      gap,
      triggerFired: true,
      detectorRevisionChanged: true,
      measurementStale: true,
    });
    expect(result?.reason).toBe("CORPUS_MEASUREMENT_STALE");
  });

  it("cannot demote M5, which carries no gap and no next step", () => {
    expect(
      demote({ maturity: "M5_FIELD_PROVEN", gap: null, triggerFired: true }),
    ).toBeNull();
  });
});

describe("ADR 0011 — the six claim axes are orthogonal", () => {
  it("declares six axes, each answering a different question", () => {
    expect(ORTHOGONAL_AXES).toHaveLength(6);
    expect(ORTHOGONAL_AXIS_IDS).toEqual([
      "trustLevel",
      "maturity",
      "evidenceState",
      "determination",
      "lifecycle",
      "severity",
    ]);
    const questions = new Set(ORTHOGONAL_AXES.map((axis) => axis.question));
    expect(questions.size).toBe(6);
  });

  it("puts the finding trust ladder on the trust axis and the M ladder on maturity", () => {
    const trust = ORTHOGONAL_AXES.find((axis) => axis.id === "trustLevel");
    const maturity = ORTHOGONAL_AXES.find((axis) => axis.id === "maturity");
    expect(trust?.vocabulary).toEqual(["L0", "L1", "L2", "L3", "L4", "L5"]);
    expect(maturity?.vocabulary).toEqual(MATURITY_LEVELS);
  });

  it("rejects a trust level written into a maturity field and vice versa", () => {
    expect(findAxisViolations({ maturity: "L4" })).toEqual([
      'maturity="L4" is a trust level in a maturity field (ADR 0001)',
    ]);
    expect(findAxisViolations({ trustLevel: "M3" })).toEqual([
      'trustLevel="M3" is a maturity in a trust-level field (ADR 0001)',
    ]);
  });

  it("accepts a record whose every axis holds its own vocabulary", () => {
    expect(
      findAxisViolations({
        trustLevel: "L3",
        maturity: "M4_CORPUS_VERIFIED",
        evidenceState: "FRESH",
        determination: "PASS",
        lifecycle: "VERIFIED",
        severity: "HIGH",
      }),
    ).toEqual([]);
  });
});
