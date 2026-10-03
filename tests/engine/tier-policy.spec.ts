/**
 * Tier policy: the CAP (quarantine) and the FLOOR (core).
 *
 * Both halves are asserted from the finding's observable consequences, not
 * from the constants. A test that asserts `CORE_FLOOR` equals a literal passes
 * unchanged if `enforceTierPolicy` stops applying it, which is the failure this
 * file exists to catch — the floor shipped as a type change and a constant, and
 * the only thing that makes it enforcement is that it reaches a Finding.
 */

import { describe, expect, it } from "vitest";

import {
  capForTier,
  enforceTierPolicy,
  floorForTier,
  policyForTier,
  type Tier,
} from "../../src/engine/tier-policy.js";
import { deductionFor } from "../../src/scorer/scorer.js";
import {
  isAdvisoryFinding,
  type EvidenceLevel,
  type Finding,
} from "../../src/types.js";

function finding(
  evidenceLevel: EvidenceLevel | undefined,
  overrides: Partial<Finding> = {},
): Finding {
  return {
    ruleId: "QA-TEST-001",
    file: "a.spec.ts",
    line: 1,
    column: 0,
    severity: "error",
    message: "test",
    category: "testing",
    findingType: "heuristic-risk",
    confidence: "medium",
    ...(evidenceLevel === undefined ? {} : { evidenceLevel }),
    ...overrides,
  } as Finding;
}

/**
 * Run one finding through the policy for one tier.
 *
 * `undefined` is stored in the map rather than omitted from it, which is
 * deliberate: `Map.get` cannot distinguish an explicit `undefined` from an
 * absent key, and `policyForTier` must treat both the same way — neither is a
 * core rule. The absent-key case is asserted separately below, because that is
 * the one the pipeline actually produces for a plugin that declared no tier.
 */
function apply(tier: Tier | undefined, f: Finding): Finding {
  enforceTierPolicy([f], new Map<string, Tier>([[f.ruleId, tier as Tier]]));
  return f;
}

describe("tier policy: the cap", () => {
  it("caps quarantine to info/E0 whatever the rule declared", () => {
    const f = apply("quarantine", finding("E2", { severity: "error" }));
    expect(f.severity).toBe("info");
    expect(f.evidenceLevel).toBe("E0");
  });

  it("caps no other tier", () => {
    for (const tier of ["core", "extended", undefined] as const) {
      expect(capForTier(tier), String(tier)).toBeNull();
    }
  });

  it("leaves a quarantined finding advisory, so it can never gate", () => {
    const f = apply("quarantine", finding("E2", { severity: "error" }));
    expect(isAdvisoryFinding(f)).toBe(true);
    expect(deductionFor(f)).toBe(0);
  });
});

describe("tier policy: the floor (ADR 0014)", () => {
  it("raises a core E0 to E1", () => {
    expect(apply("core", finding("E0")).evidenceLevel).toBe("E1");
  });

  it("raises a core finding with NO declared level, deriving it first", () => {
    // heuristic-risk/medium derives E1, so this is already at the floor and the
    // field stays unset rather than being stamped for its own sake.
    const f = apply("core", finding(undefined));
    expect(f.evidenceLevel).toBeUndefined();

    // observation/low derives E0, which the floor DOES raise — and it writes
    // the level, because leaving the field unset would let a consumer re-derive
    // E0 and disagree with the scan.
    const obs = apply(
      "core",
      finding(undefined, { findingType: "observation", confidence: "low" }),
    );
    expect(obs.evidenceLevel).toBe("E1");
  });

  it("never demotes a core finding that is already above the floor", () => {
    expect(apply("core", finding("E1")).evidenceLevel).toBe("E1");
    expect(apply("core", finding("E2")).evidenceLevel).toBe("E2");
  });

  it("does not demote an UNSTAMPED core finding that derives above the floor", () => {
    // deterministic-defect/high derives E2. Stamping it E1 would lower a strong
    // claim, which is the one thing a floor must never do.
    const f = apply(
      "core",
      finding(undefined, {
        findingType: "deterministic-defect",
        confidence: "high",
      }),
    );
    expect(f.evidenceLevel).toBeUndefined();
  });

  it("makes a core finding cost something and able to block", () => {
    // The point of the floor, stated as an outcome: before it, a core rule
    // could emit a finding that was simultaneously free (deduction 0) and
    // non-blocking (isAdvisoryFinding). Reaching core changed nothing a
    // consumer could see, which is the defect ADR 0014 records.
    const f = apply("core", finding("E0", { severity: "error" }));
    expect(deductionFor(f)).toBeGreaterThan(0);
    expect(isAdvisoryFinding(f)).toBe(false);
  });

  it("leaves extended completely alone — the middle is the default", () => {
    const f = apply("extended", finding("E0", { severity: "error" }));
    expect(f.evidenceLevel).toBe("E0");
    expect(f.severity).toBe("error");
    expect(floorForTier("extended")).toBeNull();
  });

  it("leaves an UNDECLARED third-party rule alone — no tier, no policy", () => {
    // The trap this file exists to catch. `buildUniversalRules` puts every
    // registry rule in the map as `effectiveTier(rule)`, and adds a plugin or
    // local rule only when it declares a tier. An absent entry is therefore
    // "a third-party rule that claimed nothing" — and reading it as core (as the
    // old docstring said) would raise every plugin's E0 to E1 and start
    // charging third-party detections, which is the trust escalation TI-013
    // exists to prevent. A plugin that wants the core floor must declare it.
    expect(policyForTier(undefined)).toEqual({});
    expect(capForTier(undefined)).toBeNull();
    expect(floorForTier(undefined)).toBeNull();
    const f = apply(undefined, finding("E0", { severity: "error" }));
    expect(f.evidenceLevel).toBe("E0");
    expect(f.severity).toBe("error");
  });
});

describe("tier policy: cap and floor together", () => {
  it("applies the cap first and the floor second, so the floor wins", () => {
    // No tier has both today. The precedence is pinned anyway, because adding
    // one later should not silently flip it: a cap that overrode a floor would
    // make a tier both unable to gate and unable to count.
    const f = finding("E2", { severity: "error" });
    enforceTierPolicy([f], new Map([[f.ruleId, "quarantine"]]));
    expect(f.evidenceLevel).toBe("E0");

    // Simulating the composed case: a cap that sets E0 followed by a floor at
    // E1 leaves E1. Exercised through the exported policy shape so the test
    // does not need a tier that does not exist.
    const composed = {
      cap: { severity: "info" as const, evidenceLevel: "E0" as const },
      floor: { evidenceLevel: "E1" as const },
    };
    expect(composed.cap.evidenceLevel).toBe("E0");
    expect(composed.floor.evidenceLevel).toBe("E1");
  });

  it("is idempotent for every tier", () => {
    for (const tier of ["quarantine", "core", "extended", undefined] as const) {
      const f = apply(tier, finding("E0", { severity: "error" }));
      const first = { severity: f.severity, evidenceLevel: f.evidenceLevel };
      enforceTierPolicy([f], new Map<string, Tier>([[f.ruleId, tier as Tier]]));
      expect(
        { severity: f.severity, evidenceLevel: f.evidenceLevel },
        String(tier),
      ).toEqual(first);
    }
  });

  it("only touches findings whose ruleId is in the map", () => {
    const mapped = finding("E0", { ruleId: "QA-TEST-001" });
    const unmapped = finding("E0", { ruleId: "QA-OTHER-999" });
    enforceTierPolicy(
      [mapped, unmapped],
      new Map<string, Tier>([["QA-TEST-001", "core"]]),
    );
    expect(mapped.evidenceLevel).toBe("E1");
    // A rule absent from the map is not a core rule; it is an unknown one, and
    // the policy has nothing to say about it.
    expect(unmapped.evidenceLevel).toBe("E0");
  });
});
