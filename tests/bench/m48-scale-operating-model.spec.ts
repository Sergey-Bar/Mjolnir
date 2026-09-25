import { describe, expect, it } from "vitest";

import {
  M48_BUDGET_KEYS,
  M48_EVIDENCE_MAX_AGE_MS,
  M48_LIFECYCLE_STATES,
  M48_METRIC_KEYS,
  M48_REGRESSION_POLICY,
  M48_SCALE_SCHEMA,
  M48_WORKLOAD_CLASSES,
  M48_WORKLOAD_PROFILES,
  assessM48ScalePerformance,
  canTransitionM48State,
  type M48BudgetKey,
  type M48EvaluationContext,
  type M48Metrics,
  type M48PerformanceEvidence,
  type M48WorkloadClass,
} from "../../src/bench/m48-scale-operating-model.js";

const CONTEXT: M48EvaluationContext = {
  candidateId: "candidate-a",
  repositoryId: "repository-a",
  graphDigest: "sha256:graph-a",
  nowMs: 100_000_000,
};

type EvidenceOverrides = Partial<Omit<M48PerformanceEvidence, "metrics">> & {
  readonly metrics?: Partial<M48Metrics>;
};

function metricsAtBudget(
  profile: (typeof M48_WORKLOAD_PROFILES)[M48WorkloadClass],
): M48Metrics {
  return {
    durationMs: profile.budgets.durationMs,
    startupMs: profile.budgets.startupMs,
    p50Ms: profile.budgets.p50Ms,
    p95Ms: profile.budgets.p95Ms,
    p99Ms: profile.budgets.p99Ms,
    rssBytes: profile.budgets.rssBytes,
    diskBytes: profile.budgets.diskBytes,
    cacheBytes: profile.budgets.cacheBytes,
    graphBytes: profile.budgets.graphBytes,
    reportBytes: profile.budgets.reportBytes,
    cancelMs: profile.budgets.cancelMs,
  };
}

function evidence(
  workloadClass: M48WorkloadClass = "S",
  overrides: EvidenceOverrides = {},
): M48PerformanceEvidence {
  const profile = M48_WORKLOAD_PROFILES[workloadClass];
  const base: M48PerformanceEvidence = {
    schema: M48_SCALE_SCHEMA,
    candidateId: CONTEXT.candidateId,
    repositoryId: CONTEXT.repositoryId,
    graphDigest: CONTEXT.graphDigest,
    observedAtMs: CONTEXT.nowMs,
    workloadClass,
    files: profile.maxFiles,
    repositories: profile.maxRepositories,
    workers: profile.budgets.maxWorkers,
    lifecycleState: "COMPLETED",
    completeness: "COMPLETE",
    metrics: metricsAtBudget(profile),
  };
  return {
    ...base,
    ...overrides,
    metrics: { ...base.metrics, ...overrides.metrics },
  };
}

function exceedBudget(
  input: M48PerformanceEvidence,
  budget: M48BudgetKey,
): M48PerformanceEvidence {
  const profile = M48_WORKLOAD_PROFILES.S;
  switch (budget) {
    case "files":
      return { ...input, files: input.files + 1 };
    case "repositories":
      return { ...input, repositories: input.repositories + 1 };
    case "workers":
      return { ...input, workers: input.workers + 1 };
    case "p50Ms": {
      const p50Ms = profile.budgets.p50Ms + 1;
      return {
        ...input,
        metrics: { ...input.metrics, p50Ms, p95Ms: p50Ms, p99Ms: p50Ms },
      };
    }
    case "p95Ms": {
      const p95Ms = profile.budgets.p95Ms + 1;
      return {
        ...input,
        metrics: { ...input.metrics, p95Ms, p99Ms: p95Ms },
      };
    }
    default:
      return {
        ...input,
        metrics: {
          ...input.metrics,
          [budget]: profile.budgets[budget] + 1,
        },
      };
  }
}

describe("M48 scale and performance operating model", () => {
  it("defines bounded S through XXL profiles", () => {
    expect(Object.keys(M48_WORKLOAD_PROFILES)).toEqual([
      ...M48_WORKLOAD_CLASSES,
    ]);

    for (const classId of M48_WORKLOAD_CLASSES) {
      const profile = M48_WORKLOAD_PROFILES[classId];
      expect(profile.classId).toBe(classId);
      expect(profile.maxFiles).toBeGreaterThan(0);
      expect(profile.maxRepositories).toBeGreaterThan(0);
      expect(profile.budgets.maxWorkers).toBeGreaterThan(0);
      expect(profile.budgets.maxWorkers).toBeLessThanOrEqual(16);
      expect(profile.budgets.startupMs).toBeLessThanOrEqual(
        profile.budgets.durationMs,
      );
      expect(profile.budgets.p50Ms).toBeLessThanOrEqual(profile.budgets.p95Ms);
      expect(profile.budgets.p95Ms).toBeLessThanOrEqual(profile.budgets.p99Ms);
      expect(profile.budgets.p99Ms).toBeLessThanOrEqual(
        profile.budgets.durationMs,
      );
      for (const metric of M48_METRIC_KEYS) {
        expect(Number.isSafeInteger(profile.budgets[metric])).toBe(true);
        expect(profile.budgets[metric]).toBeGreaterThan(0);
      }
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.budgets)).toBe(true);
    }
  });

  it.each(M48_WORKLOAD_CLASSES)(
    "accepts the exact %s boundary without a regression",
    (classId) => {
      expect(assessM48ScalePerformance(evidence(classId), CONTEXT)).toEqual({
        schema: M48_SCALE_SCHEMA,
        evidenceState: "CURRENT",
        reason: "WITHIN_BUDGET",
        regression: "NONE",
        advisoryOnly: true,
        blocking: false,
        workloadClass: classId,
        lifecycleState: "COMPLETED",
        breaches: [],
        policy: { mode: "advisory", canBlock: false },
      });
    },
  );

  it.each(M48_BUDGET_KEYS)(
    "reports an advisory-only %s budget regression",
    (budget) => {
      const input = exceedBudget(evidence(), budget);
      const assessment = assessM48ScalePerformance(input, CONTEXT);

      expect(assessment).toMatchObject({
        evidenceState: "CURRENT",
        reason: "BUDGET_EXCEEDED",
        regression: "DETECTED",
        advisoryOnly: true,
        blocking: false,
      });
      expect(assessment.breaches).toContainEqual(
        expect.objectContaining({ budget }),
      );
      expect(assessment).not.toHaveProperty("passed");
      expect(assessment.policy).toEqual(M48_REGRESSION_POLICY);
    },
  );

  it("rejects malformed and hostile evidence deterministically", () => {
    const revoked = Proxy.revocable(evidence(), {});
    revoked.revoke();
    const getter = Object.defineProperty({}, "schema", {
      get: () => {
        throw new Error("hostile getter");
      },
    });
    const malformed: readonly unknown[] = [
      null,
      [],
      {},
      { ...evidence(), metrics: { ...evidence().metrics, p99Ms: Number.NaN } },
      { ...evidence(), observedAtMs: -1 },
      { ...evidence(), metrics: { ...evidence().metrics, rssBytes: 1.5 } },
      getter,
      revoked.proxy,
    ];

    for (const input of malformed) {
      const first = assessM48ScalePerformance(input, CONTEXT);
      const second = assessM48ScalePerformance(input, CONTEXT);
      expect(first).toEqual(second);
      expect(first).toMatchObject({
        evidenceState: "MALFORMED",
        reason: "MALFORMED_EVIDENCE",
        regression: "UNDETERMINED",
        advisoryOnly: true,
        blocking: false,
      });
    }
    expect(assessM48ScalePerformance(evidence(), null)).toMatchObject({
      evidenceState: "MALFORMED",
      reason: "MALFORMED_CONTEXT",
      regression: "UNDETERMINED",
    });
  });

  it("keeps partial evidence inconclusive unless it visibly exceeds a budget", () => {
    const partial = assessM48ScalePerformance(
      evidence("S", {
        completeness: "PARTIAL",
        lifecycleState: "RECOVERING",
      }),
      CONTEXT,
    );
    const partialOverBudget = assessM48ScalePerformance(
      evidence("S", {
        completeness: "PARTIAL",
        metrics: { rssBytes: M48_WORKLOAD_PROFILES.S.budgets.rssBytes + 1 },
      }),
      CONTEXT,
    );

    expect(partial).toMatchObject({
      evidenceState: "PARTIAL",
      reason: "PARTIAL_EVIDENCE",
      regression: "UNDETERMINED",
      lifecycleState: "RECOVERING",
      blocking: false,
    });
    expect(partialOverBudget).toMatchObject({
      evidenceState: "PARTIAL",
      reason: "PARTIAL_EVIDENCE",
      regression: "DETECTED",
      blocking: false,
    });
    expect(partialOverBudget.breaches).toContainEqual({
      budget: "rssBytes",
      observed: M48_WORKLOAD_PROFILES.S.budgets.rssBytes + 1,
      maximum: M48_WORKLOAD_PROFILES.S.budgets.rssBytes,
    });
  });

  it("rejects stale and foreign evidence", () => {
    const stale = assessM48ScalePerformance(
      evidence("S", {
        observedAtMs: CONTEXT.nowMs - M48_EVIDENCE_MAX_AGE_MS - 1,
      }),
      CONTEXT,
    );
    const future = assessM48ScalePerformance(
      evidence("S", { observedAtMs: CONTEXT.nowMs + 1 }),
      CONTEXT,
    );
    const foreignInputs = [
      evidence("S", { candidateId: "candidate-b" }),
      evidence("S", { repositoryId: "repository-b" }),
      evidence("S", { graphDigest: "sha256:graph-b" }),
    ] as const;

    expect(stale).toMatchObject({
      evidenceState: "STALE",
      reason: "STALE_EVIDENCE",
      regression: "UNDETERMINED",
    });
    expect(future).toMatchObject({
      evidenceState: "MALFORMED",
      reason: "MALFORMED_EVIDENCE",
    });
    for (const input of foreignInputs) {
      expect(assessM48ScalePerformance(input, CONTEXT)).toMatchObject({
        evidenceState: "FOREIGN",
        reason: "FOREIGN_EVIDENCE",
        regression: "UNDETERMINED",
        advisoryOnly: true,
        blocking: false,
      });
    }
  });

  it("bounds soak, fault, cancellation, and recovery transitions", () => {
    expect(M48_LIFECYCLE_STATES).toEqual(
      expect.arrayContaining([
        "SOAKING",
        "CANCELLING",
        "FAULTED",
        "RECOVERING",
        "COMPLETED",
        "CANCELLED",
        "FAILED",
      ]),
    );
    expect(canTransitionM48State("RUNNING", "SOAKING")).toBe(true);
    expect(canTransitionM48State("SOAKING", "FAULTED")).toBe(true);
    expect(canTransitionM48State("FAULTED", "RECOVERING")).toBe(true);
    expect(canTransitionM48State("RECOVERING", "COMPLETED")).toBe(true);
    expect(canTransitionM48State("RUNNING", "CANCELLING")).toBe(true);
    expect(canTransitionM48State("CANCELLING", "CANCELLED")).toBe(true);
    expect(canTransitionM48State("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransitionM48State("FAILED", "RECOVERING")).toBe(false);
  });

  it("returns byte-stable assessments without mutating evidence", () => {
    const input = evidence("XL");
    const before = structuredClone(input);
    const first = assessM48ScalePerformance(input, CONTEXT);
    const second = assessM48ScalePerformance(input, CONTEXT);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(second).toEqual(first);
    expect(input).toEqual(before);
  });
});
