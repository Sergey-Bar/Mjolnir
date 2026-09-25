export const FAILURE_SENSITIVITY_OUTCOMES = [
  "VERIFICATION_PROVEN",
  "VERIFICATION_WEAK",
  "VERIFICATION_NOT_SENSITIVE",
  "INCONCLUSIVE",
] as const;

export type FailureSensitivityOutcome =
  (typeof FAILURE_SENSITIVITY_OUTCOMES)[number];

export type FailureSensitivityEvidenceState =
  "CURRENT" | "STALE" | "FOREIGN" | "MALFORMED";

export type FailureSensitivityReason =
  | "MALFORMED_EVIDENCE"
  | "MALFORMED_BUDGET"
  | "MALFORMED_CONTEXT"
  | "FOREIGN_EVIDENCE"
  | "STALE_EVIDENCE"
  | "COST_BUDGET_EXCEEDED"
  | "UNCERTAINTY_BUDGET_EXCEEDED"
  | "NO_EXECUTED_CHALLENGES"
  | "INSUFFICIENT_DENOMINATOR_FOR_PROOF"
  | "ALL_EXECUTED_DETECTED"
  | "MIXED_EXECUTED_OUTCOMES"
  | "ALL_EXECUTED_SURVIVED";

export interface FailureSensitivityCounts {
  readonly detected: number;
  readonly survived: number;
  readonly noCoverage: number;
  readonly timeout: number;
}

export interface FailureSensitivityEvidence {
  readonly candidateId: string;
  readonly observedAtMs: number;
  readonly costUnits: number;
  readonly mutations: FailureSensitivityCounts;
  readonly faults: FailureSensitivityCounts;
}

export interface FailureSensitivityBudget {
  readonly minimumExecutedForProof: number;
  readonly maxUncertaintyRate: number;
  readonly maxCostUnits: number;
  readonly maxEvidenceAgeMs: number;
}

export interface FailureSensitivityContext {
  readonly candidateId: string;
  readonly nowMs: number;
}

export interface FailureSensitivityDenominators {
  readonly planned: number;
  readonly executed: number;
  readonly detected: number;
  readonly survived: number;
  readonly noCoverage: number;
  readonly timeout: number;
  readonly uncertain: number;
  readonly uncertaintyRate: number;
}

export interface FailureSensitivityBudgetResult {
  readonly uncertainty: {
    readonly observedRate: number;
    readonly maximumRate: number;
    readonly withinBudget: boolean;
  };
  readonly cost: {
    readonly observedUnits: number;
    readonly maximumUnits: number;
    readonly withinBudget: boolean;
  };
}

export interface FailureSensitivityResult {
  readonly outcome: FailureSensitivityOutcome;
  readonly evidenceState: FailureSensitivityEvidenceState;
  readonly reason: FailureSensitivityReason;
  readonly denominators: FailureSensitivityDenominators | null;
  readonly budgets: FailureSensitivityBudgetResult | null;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isCandidateId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.trim() === value
  );
}

function parseCounts(value: unknown): FailureSensitivityCounts | null {
  if (!isRecord(value)) return null;
  const { detected, survived, noCoverage, timeout } = value;
  if (
    !isNonNegativeInteger(detected) ||
    !isNonNegativeInteger(survived) ||
    !isNonNegativeInteger(noCoverage) ||
    !isNonNegativeInteger(timeout)
  ) {
    return null;
  }
  if (totalCounts({ detected, survived, noCoverage, timeout }) === null) {
    return null;
  }
  return { detected, survived, noCoverage, timeout };
}

function parseEvidence(value: unknown): FailureSensitivityEvidence | null {
  if (!isRecord(value)) return null;
  const { candidateId, observedAtMs, costUnits, mutations, faults } = value;
  if (!isCandidateId(candidateId) || !isNonNegativeInteger(observedAtMs)) {
    return null;
  }
  if (!isNonNegativeFinite(costUnits)) return null;
  const parsedMutations = parseCounts(mutations);
  const parsedFaults = parseCounts(faults);
  if (parsedMutations === null || parsedFaults === null) return null;
  return {
    candidateId,
    observedAtMs,
    costUnits,
    mutations: parsedMutations,
    faults: parsedFaults,
  };
}

function parseBudget(value: unknown): FailureSensitivityBudget | null {
  if (!isRecord(value)) return null;
  const {
    minimumExecutedForProof,
    maxUncertaintyRate,
    maxCostUnits,
    maxEvidenceAgeMs,
  } = value;
  if (
    !isNonNegativeInteger(minimumExecutedForProof) ||
    !isNonNegativeFinite(maxUncertaintyRate) ||
    maxUncertaintyRate > 1 ||
    !isNonNegativeFinite(maxCostUnits) ||
    !isNonNegativeInteger(maxEvidenceAgeMs)
  ) {
    return null;
  }
  return {
    minimumExecutedForProof,
    maxUncertaintyRate,
    maxCostUnits,
    maxEvidenceAgeMs,
  };
}

function parseContext(value: unknown): FailureSensitivityContext | null {
  if (!isRecord(value)) return null;
  const { candidateId, nowMs } = value;
  if (!isCandidateId(candidateId) || !isNonNegativeInteger(nowMs)) {
    return null;
  }
  return { candidateId, nowMs };
}

function totalCounts(counts: FailureSensitivityCounts): number | null {
  const total =
    counts.detected + counts.survived + counts.noCoverage + counts.timeout;
  return Number.isSafeInteger(total) ? total : null;
}

function safeAdd(left: number, right: number): number | null {
  const total = left + right;
  return Number.isSafeInteger(total) ? total : null;
}

function combineCounts(
  mutations: FailureSensitivityCounts,
  faults: FailureSensitivityCounts,
): FailureSensitivityDenominators | null {
  const detected = safeAdd(mutations.detected, faults.detected);
  const survived = safeAdd(mutations.survived, faults.survived);
  const noCoverage = safeAdd(mutations.noCoverage, faults.noCoverage);
  const timeout = safeAdd(mutations.timeout, faults.timeout);
  const executed = safeAdd(detected ?? 0, survived ?? 0);
  const uncertain = safeAdd(noCoverage ?? 0, timeout ?? 0);
  const planned = safeAdd(executed ?? 0, uncertain ?? 0);
  if (
    detected === null ||
    survived === null ||
    noCoverage === null ||
    timeout === null ||
    executed === null ||
    uncertain === null ||
    planned === null
  ) {
    return null;
  }
  return {
    planned,
    executed,
    detected,
    survived,
    noCoverage,
    timeout,
    uncertain,
    uncertaintyRate: planned === 0 ? 1 : uncertain / planned,
  };
}

function inconclusive(
  evidenceState: FailureSensitivityEvidenceState,
  reason: FailureSensitivityReason,
): FailureSensitivityResult {
  return {
    outcome: "INCONCLUSIVE",
    evidenceState,
    reason,
    denominators: null,
    budgets: null,
  };
}

export function assessFailureSensitivity(
  evidence: unknown,
  budget: unknown,
  context: unknown,
): FailureSensitivityResult {
  const parsedBudget = parseBudget(budget);
  if (parsedBudget === null) {
    return inconclusive("MALFORMED", "MALFORMED_BUDGET");
  }
  const parsedContext = parseContext(context);
  if (parsedContext === null) {
    return inconclusive("MALFORMED", "MALFORMED_CONTEXT");
  }
  const parsedEvidence = parseEvidence(evidence);
  if (parsedEvidence === null) {
    return inconclusive("MALFORMED", "MALFORMED_EVIDENCE");
  }
  if (parsedEvidence.candidateId !== parsedContext.candidateId) {
    return inconclusive("FOREIGN", "FOREIGN_EVIDENCE");
  }
  if (parsedEvidence.observedAtMs > parsedContext.nowMs) {
    return inconclusive("MALFORMED", "MALFORMED_EVIDENCE");
  }
  if (
    parsedContext.nowMs - parsedEvidence.observedAtMs >
    parsedBudget.maxEvidenceAgeMs
  ) {
    return inconclusive("STALE", "STALE_EVIDENCE");
  }

  const denominators = combineCounts(
    parsedEvidence.mutations,
    parsedEvidence.faults,
  );
  if (denominators === null) {
    return inconclusive("MALFORMED", "MALFORMED_EVIDENCE");
  }
  const uncertaintyWithinBudget =
    denominators.uncertaintyRate <= parsedBudget.maxUncertaintyRate;
  const costWithinBudget =
    parsedEvidence.costUnits <= parsedBudget.maxCostUnits;
  const budgets: FailureSensitivityBudgetResult = {
    uncertainty: {
      observedRate: denominators.uncertaintyRate,
      maximumRate: parsedBudget.maxUncertaintyRate,
      withinBudget: uncertaintyWithinBudget,
    },
    cost: {
      observedUnits: parsedEvidence.costUnits,
      maximumUnits: parsedBudget.maxCostUnits,
      withinBudget: costWithinBudget,
    },
  };
  const base = {
    evidenceState: "CURRENT" as const,
    denominators,
    budgets,
  };

  if (!costWithinBudget) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "COST_BUDGET_EXCEEDED",
      ...base,
    };
  }
  if (denominators.executed === 0) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "NO_EXECUTED_CHALLENGES",
      ...base,
    };
  }
  if (!uncertaintyWithinBudget) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "UNCERTAINTY_BUDGET_EXCEEDED",
      ...base,
    };
  }
  if (denominators.survived > 0) {
    return denominators.detected === 0
      ? {
          outcome: "VERIFICATION_NOT_SENSITIVE",
          reason: "ALL_EXECUTED_SURVIVED",
          ...base,
        }
      : {
          outcome: "VERIFICATION_WEAK",
          reason: "MIXED_EXECUTED_OUTCOMES",
          ...base,
        };
  }
  if (denominators.executed < parsedBudget.minimumExecutedForProof) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "INSUFFICIENT_DENOMINATOR_FOR_PROOF",
      ...base,
    };
  }
  return {
    outcome: "VERIFICATION_PROVEN",
    reason: "ALL_EXECUTED_DETECTED",
    ...base,
  };
}
