import { describe, expect, it } from "vitest";

import {
  assessFailureSensitivity,
  FAILURE_SENSITIVITY_OUTCOMES,
} from "../../src/mutation/failure-sensitivity.js";
import type {
  FailureSensitivityBudget,
  FailureSensitivityContext,
  FailureSensitivityCounts,
  FailureSensitivityEvidence,
} from "../../src/mutation/failure-sensitivity.js";

const BUDGET: FailureSensitivityBudget = {
  minimumExecutedForProof: 2,
  maxUncertaintyRate: 0.5,
  maxCostUnits: 100,
  maxEvidenceAgeMs: 1_000,
};

const CONTEXT: FailureSensitivityContext = {
  candidateId: "candidate-a",
  nowMs: 10_000,
};

function counts(
  overrides: Partial<FailureSensitivityCounts> = {},
): FailureSensitivityCounts {
  return {
    detected: 0,
    survived: 0,
    noCoverage: 0,
    timeout: 0,
    ...overrides,
  };
}

function evidence(
  overrides: Partial<FailureSensitivityEvidence> = {},
): FailureSensitivityEvidence {
  return {
    candidateId: CONTEXT.candidateId,
    observedAtMs: CONTEXT.nowMs,
    costUnits: 10,
    mutations: counts(),
    faults: counts(),
    ...overrides,
  };
}

describe("M36 failure sensitivity", () => {
  it("exposes only the four bounded outcomes", () => {
    expect(FAILURE_SENSITIVITY_OUTCOMES).toEqual([
      "VERIFICATION_PROVEN",
      "VERIFICATION_WEAK",
      "VERIFICATION_NOT_SENSITIVE",
      "INCONCLUSIVE",
    ]);
  });

  it("proves only when fresh candidate-bound evidence detects every executed challenge", () => {
    const result = assessFailureSensitivity(
      evidence({
        mutations: counts({ detected: 8 }),
        faults: counts({ detected: 1, noCoverage: 1 }),
      }),
      BUDGET,
      CONTEXT,
    );

    expect(result.outcome).toBe("VERIFICATION_PROVEN");
    expect(result.evidenceState).toBe("CURRENT");
    expect(result.denominators).toMatchObject({
      planned: 10,
      executed: 9,
      detected: 9,
      survived: 0,
      noCoverage: 1,
      timeout: 0,
    });
    expect(result.budgets?.uncertainty.withinBudget).toBe(true);
  });

  it("classifies surviving mutants as weak without a score threshold", () => {
    const mostlyDetected = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 9, survived: 1 }) }),
      BUDGET,
      CONTEXT,
    );
    const mostlySurviving = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 1, survived: 9 }) }),
      BUDGET,
      CONTEXT,
    );

    expect(mostlyDetected.outcome).toBe("VERIFICATION_WEAK");
    expect(mostlySurviving.outcome).toBe("VERIFICATION_WEAK");
    expect(mostlyDetected).not.toHaveProperty("score");
    expect(mostlyDetected).not.toHaveProperty("trustLevel");
  });

  it("classifies all surviving executed challenges as not sensitive", () => {
    const result = assessFailureSensitivity(
      evidence({ faults: counts({ survived: 4 }) }),
      BUDGET,
      CONTEXT,
    );

    expect(result.outcome).toBe("VERIFICATION_NOT_SENSITIVE");
    expect(result.denominators?.executed).toBe(4);
  });

  it("excludes no coverage from the executed denominator and tracks its uncertainty", () => {
    const covered = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 9, noCoverage: 1 }) }),
      BUDGET,
      CONTEXT,
    );
    const uncovered = assessFailureSensitivity(
      evidence({ mutations: counts({ noCoverage: 4 }) }),
      BUDGET,
      CONTEXT,
    );

    expect(covered.outcome).toBe("VERIFICATION_PROVEN");
    expect(covered.denominators).toMatchObject({
      planned: 10,
      executed: 9,
      uncertain: 1,
      uncertaintyRate: 0.1,
    });
    expect(uncovered.outcome).toBe("INCONCLUSIVE");
    expect(uncovered.reason).toBe("NO_EXECUTED_CHALLENGES");
  });

  it("excludes timeouts from the executed denominator and fails closed when all timeout", () => {
    const mixed = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 9, timeout: 1 }) }),
      BUDGET,
      CONTEXT,
    );
    const timedOut = assessFailureSensitivity(
      evidence({ mutations: counts({ timeout: 3 }) }),
      BUDGET,
      CONTEXT,
    );

    expect(mixed.outcome).toBe("VERIFICATION_PROVEN");
    expect(mixed.denominators).toMatchObject({
      planned: 10,
      executed: 9,
      uncertain: 1,
    });
    expect(timedOut.outcome).toBe("INCONCLUSIVE");
    expect(timedOut.reason).toBe("NO_EXECUTED_CHALLENGES");
  });

  it("rejects stale and foreign evidence", () => {
    const stale = assessFailureSensitivity(
      evidence({ observedAtMs: CONTEXT.nowMs - BUDGET.maxEvidenceAgeMs - 1 }),
      BUDGET,
      CONTEXT,
    );
    const foreign = assessFailureSensitivity(
      evidence({ candidateId: "candidate-b" }),
      BUDGET,
      CONTEXT,
    );

    expect(stale).toMatchObject({
      outcome: "INCONCLUSIVE",
      evidenceState: "STALE",
      reason: "STALE_EVIDENCE",
    });
    expect(foreign).toMatchObject({
      outcome: "INCONCLUSIVE",
      evidenceState: "FOREIGN",
      reason: "FOREIGN_EVIDENCE",
    });
  });

  it("rejects negative, fractional, and future evidence as malformed", () => {
    const negative = assessFailureSensitivity(
      evidence({ mutations: counts({ survived: -1 }) }),
      BUDGET,
      CONTEXT,
    );
    const fractional = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 1.5 }) }),
      BUDGET,
      CONTEXT,
    );
    const future = assessFailureSensitivity(
      evidence({ observedAtMs: CONTEXT.nowMs + 1 }),
      BUDGET,
      CONTEXT,
    );

    expect(negative).toMatchObject({
      outcome: "INCONCLUSIVE",
      evidenceState: "MALFORMED",
      reason: "MALFORMED_EVIDENCE",
    });
    expect(fractional.reason).toBe("MALFORMED_EVIDENCE");
    expect(future.reason).toBe("MALFORMED_EVIDENCE");
  });

  it("fails closed when uncertainty or cost exceeds its budget", () => {
    const uncertainty = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 1, noCoverage: 1 }) }),
      { ...BUDGET, maxUncertaintyRate: 0.25 },
      CONTEXT,
    );
    const cost = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 2 }), costUnits: 101 }),
      BUDGET,
      CONTEXT,
    );

    expect(uncertainty).toMatchObject({
      outcome: "INCONCLUSIVE",
      reason: "UNCERTAINTY_BUDGET_EXCEEDED",
    });
    expect(cost).toMatchObject({
      outcome: "INCONCLUSIVE",
      reason: "COST_BUDGET_EXCEEDED",
    });
  });

  it("requires a minimum executed denominator only for proof", () => {
    const insufficient = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 1 }) }),
      BUDGET,
      CONTEXT,
    );
    const sufficient = assessFailureSensitivity(
      evidence({ mutations: counts({ detected: 2 }) }),
      BUDGET,
      CONTEXT,
    );

    expect(insufficient).toMatchObject({
      outcome: "INCONCLUSIVE",
      reason: "INSUFFICIENT_DENOMINATOR_FOR_PROOF",
    });
    expect(sufficient.outcome).toBe("VERIFICATION_PROVEN");
  });

  it("returns byte-stable output for the same evidence and context", () => {
    const input = evidence({
      mutations: counts({
        detected: 7,
        survived: 1,
        noCoverage: 1,
        timeout: 1,
      }),
      faults: counts({ detected: 1, survived: 1 }),
    });
    const first = assessFailureSensitivity(input, BUDGET, CONTEXT);
    const second = assessFailureSensitivity(input, BUDGET, CONTEXT);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second).toEqual(first);
    expect(input).toEqual(
      evidence({
        mutations: counts({
          detected: 7,
          survived: 1,
          noCoverage: 1,
          timeout: 1,
        }),
        faults: counts({ detected: 1, survived: 1 }),
      }),
    );
  });
});
