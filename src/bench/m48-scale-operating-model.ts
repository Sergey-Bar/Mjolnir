export const M48_SCALE_SCHEMA =
  "m48.scale-performance-operating-model@1" as const;

export const M48_WORKLOAD_CLASSES = ["S", "L", "XL", "XXL"] as const;

export type M48WorkloadClass = (typeof M48_WORKLOAD_CLASSES)[number];

export const M48_METRIC_KEYS = [
  "durationMs",
  "startupMs",
  "p50Ms",
  "p95Ms",
  "p99Ms",
  "rssBytes",
  "diskBytes",
  "cacheBytes",
  "graphBytes",
  "reportBytes",
  "cancelMs",
] as const;

export type M48MetricKey = (typeof M48_METRIC_KEYS)[number];

export type M48Metrics = Record<M48MetricKey, number>;

export interface M48Budgets extends M48Metrics {
  readonly maxWorkers: number;
}

export interface M48WorkloadProfile {
  readonly classId: M48WorkloadClass;
  readonly maxFiles: number;
  readonly maxRepositories: number;
  readonly budgets: M48Budgets;
}

function freezeProfile(profile: M48WorkloadProfile): M48WorkloadProfile {
  return Object.freeze({
    ...profile,
    budgets: Object.freeze({ ...profile.budgets }),
  });
}

export const M48_WORKLOAD_PROFILES: Readonly<
  Record<M48WorkloadClass, M48WorkloadProfile>
> = Object.freeze({
  S: freezeProfile({
    classId: "S",
    maxFiles: 1_000,
    maxRepositories: 1,
    budgets: {
      maxWorkers: 2,
      durationMs: 5_000,
      startupMs: 500,
      p50Ms: 250,
      p95Ms: 750,
      p99Ms: 1_500,
      rssBytes: 268_435_456,
      diskBytes: 67_108_864,
      cacheBytes: 33_554_432,
      graphBytes: 67_108_864,
      reportBytes: 4_194_304,
      cancelMs: 250,
    },
  }),
  L: freezeProfile({
    classId: "L",
    maxFiles: 25_000,
    maxRepositories: 10,
    budgets: {
      maxWorkers: 4,
      durationMs: 30_000,
      startupMs: 1_000,
      p50Ms: 1_000,
      p95Ms: 3_000,
      p99Ms: 6_000,
      rssBytes: 805_306_368,
      diskBytes: 268_435_456,
      cacheBytes: 134_217_728,
      graphBytes: 268_435_456,
      reportBytes: 16_777_216,
      cancelMs: 500,
    },
  }),
  XL: freezeProfile({
    classId: "XL",
    maxFiles: 250_000,
    maxRepositories: 100,
    budgets: {
      maxWorkers: 8,
      durationMs: 180_000,
      startupMs: 2_000,
      p50Ms: 5_000,
      p95Ms: 15_000,
      p99Ms: 30_000,
      rssBytes: 2_147_483_648,
      diskBytes: 1_073_741_824,
      cacheBytes: 536_870_912,
      graphBytes: 1_073_741_824,
      reportBytes: 67_108_864,
      cancelMs: 1_000,
    },
  }),
  XXL: freezeProfile({
    classId: "XXL",
    maxFiles: 2_500_000,
    maxRepositories: 1_000,
    budgets: {
      maxWorkers: 16,
      durationMs: 900_000,
      startupMs: 5_000,
      p50Ms: 25_000,
      p95Ms: 60_000,
      p99Ms: 120_000,
      rssBytes: 8_589_934_592,
      diskBytes: 8_589_934_592,
      cacheBytes: 4_294_967_296,
      graphBytes: 8_589_934_592,
      reportBytes: 268_435_456,
      cancelMs: 2_000,
    },
  }),
});

export const M48_BUDGET_KEYS = [
  "files",
  "repositories",
  "workers",
  ...M48_METRIC_KEYS,
] as const;

export type M48BudgetKey = (typeof M48_BUDGET_KEYS)[number];

export const M48_LIFECYCLE_STATES = [
  "IDLE",
  "STARTING",
  "RUNNING",
  "SOAKING",
  "CANCELLING",
  "FAULTED",
  "RECOVERING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;

export type M48LifecycleState = (typeof M48_LIFECYCLE_STATES)[number];

type M48TransitionTable = Readonly<
  Record<M48LifecycleState, readonly M48LifecycleState[]>
>;

export const M48_STATE_TRANSITIONS = Object.freeze({
  IDLE: Object.freeze(["STARTING"]),
  STARTING: Object.freeze(["RUNNING", "CANCELLING", "FAULTED"]),
  RUNNING: Object.freeze(["SOAKING", "CANCELLING", "FAULTED", "COMPLETED"]),
  SOAKING: Object.freeze(["CANCELLING", "FAULTED", "COMPLETED"]),
  FAULTED: Object.freeze(["CANCELLING", "RECOVERING", "FAILED"]),
  RECOVERING: Object.freeze(["CANCELLING", "FAULTED", "COMPLETED", "FAILED"]),
  CANCELLING: Object.freeze(["CANCELLED", "FAILED"]),
  COMPLETED: Object.freeze([]),
  CANCELLED: Object.freeze([]),
  FAILED: Object.freeze([]),
} satisfies M48TransitionTable);

export function canTransitionM48State(
  from: M48LifecycleState,
  to: M48LifecycleState,
): boolean {
  return (M48_STATE_TRANSITIONS[from] as readonly M48LifecycleState[]).includes(
    to,
  );
}

export const M48_EVIDENCE_MAX_AGE_MS = 86_400_000;

export const M48_REGRESSION_POLICY = Object.freeze({
  mode: "advisory",
  canBlock: false,
});

export interface M48PerformanceEvidence {
  readonly schema: typeof M48_SCALE_SCHEMA;
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly graphDigest: string;
  readonly observedAtMs: number;
  readonly workloadClass: M48WorkloadClass;
  readonly files: number;
  readonly repositories: number;
  readonly workers: number;
  readonly lifecycleState: M48LifecycleState;
  readonly completeness: "COMPLETE" | "PARTIAL";
  readonly metrics: M48Metrics;
}

export interface M48EvaluationContext {
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly graphDigest: string;
  readonly nowMs: number;
}

export type M48EvidenceState =
  "CURRENT" | "PARTIAL" | "MALFORMED" | "STALE" | "FOREIGN";

export type M48RegressionState = "NONE" | "DETECTED" | "UNDETERMINED";

export type M48AssessmentReason =
  | "WITHIN_BUDGET"
  | "PARTIAL_EVIDENCE"
  | "BUDGET_EXCEEDED"
  | "MALFORMED_EVIDENCE"
  | "MALFORMED_CONTEXT"
  | "STALE_EVIDENCE"
  | "FOREIGN_EVIDENCE";

export interface M48BudgetBreach {
  readonly budget: M48BudgetKey;
  readonly observed: number;
  readonly maximum: number;
}

export interface M48ScaleAssessment {
  readonly schema: typeof M48_SCALE_SCHEMA;
  readonly evidenceState: M48EvidenceState;
  readonly reason: M48AssessmentReason;
  readonly regression: M48RegressionState;
  readonly advisoryOnly: true;
  readonly blocking: false;
  readonly workloadClass: M48WorkloadClass | null;
  readonly lifecycleState: M48LifecycleState | null;
  readonly breaches: readonly M48BudgetBreach[];
  readonly policy: typeof M48_REGRESSION_POLICY;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return isNonNegativeSafeInteger(value) && value > 0;
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value.trim() === value
  );
}

function isWorkloadClass(value: unknown): value is M48WorkloadClass {
  return (
    typeof value === "string" &&
    (M48_WORKLOAD_CLASSES as readonly string[]).includes(value)
  );
}

function isLifecycleState(value: unknown): value is M48LifecycleState {
  return (
    typeof value === "string" &&
    (M48_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

function parseMetrics(value: unknown): M48Metrics | null {
  if (!isRecord(value)) return null;
  const durationMs = value["durationMs"];
  const startupMs = value["startupMs"];
  const p50Ms = value["p50Ms"];
  const p95Ms = value["p95Ms"];
  const p99Ms = value["p99Ms"];
  const rssBytes = value["rssBytes"];
  const diskBytes = value["diskBytes"];
  const cacheBytes = value["cacheBytes"];
  const graphBytes = value["graphBytes"];
  const reportBytes = value["reportBytes"];
  const cancelMs = value["cancelMs"];
  if (
    !isNonNegativeSafeInteger(durationMs) ||
    !isNonNegativeSafeInteger(startupMs) ||
    !isNonNegativeSafeInteger(p50Ms) ||
    !isNonNegativeSafeInteger(p95Ms) ||
    !isNonNegativeSafeInteger(p99Ms) ||
    !isNonNegativeSafeInteger(rssBytes) ||
    !isNonNegativeSafeInteger(diskBytes) ||
    !isNonNegativeSafeInteger(cacheBytes) ||
    !isNonNegativeSafeInteger(graphBytes) ||
    !isNonNegativeSafeInteger(reportBytes) ||
    !isNonNegativeSafeInteger(cancelMs) ||
    p50Ms > p95Ms ||
    p95Ms > p99Ms
  ) {
    return null;
  }
  return {
    durationMs,
    startupMs,
    p50Ms,
    p95Ms,
    p99Ms,
    rssBytes,
    diskBytes,
    cacheBytes,
    graphBytes,
    reportBytes,
    cancelMs,
  };
}

function parseEvidence(value: unknown): M48PerformanceEvidence | null {
  if (!isRecord(value) || value["schema"] !== M48_SCALE_SCHEMA) return null;
  const candidateId = value["candidateId"];
  const repositoryId = value["repositoryId"];
  const graphDigest = value["graphDigest"];
  const observedAtMs = value["observedAtMs"];
  const workloadClass = value["workloadClass"];
  const files = value["files"];
  const repositories = value["repositories"];
  const workers = value["workers"];
  const lifecycleState = value["lifecycleState"];
  const completeness = value["completeness"];
  if (
    !isBoundedText(candidateId, 128) ||
    !isBoundedText(repositoryId, 128) ||
    !isBoundedText(graphDigest, 256) ||
    !isNonNegativeSafeInteger(observedAtMs) ||
    !isWorkloadClass(workloadClass) ||
    !isNonNegativeSafeInteger(files) ||
    !isPositiveSafeInteger(repositories) ||
    !isNonNegativeSafeInteger(workers) ||
    !isLifecycleState(lifecycleState) ||
    (completeness !== "COMPLETE" && completeness !== "PARTIAL")
  ) {
    return null;
  }
  const metrics = parseMetrics(value["metrics"]);
  if (metrics === null) return null;
  return {
    schema: M48_SCALE_SCHEMA,
    candidateId,
    repositoryId,
    graphDigest,
    observedAtMs,
    workloadClass,
    files,
    repositories,
    workers,
    lifecycleState,
    completeness,
    metrics,
  };
}

function parseContext(value: unknown): M48EvaluationContext | null {
  if (!isRecord(value)) return null;
  const candidateId = value["candidateId"];
  const repositoryId = value["repositoryId"];
  const graphDigest = value["graphDigest"];
  const nowMs = value["nowMs"];
  if (
    !isBoundedText(candidateId, 128) ||
    !isBoundedText(repositoryId, 128) ||
    !isBoundedText(graphDigest, 256) ||
    !isNonNegativeSafeInteger(nowMs)
  ) {
    return null;
  }
  return { candidateId, repositoryId, graphDigest, nowMs };
}

function result(
  evidenceState: M48EvidenceState,
  reason: M48AssessmentReason,
  regression: M48RegressionState,
  evidence?: M48PerformanceEvidence,
  breaches: readonly M48BudgetBreach[] = [],
): M48ScaleAssessment {
  return {
    schema: M48_SCALE_SCHEMA,
    evidenceState,
    reason,
    regression,
    advisoryOnly: true,
    blocking: false,
    workloadClass: evidence?.workloadClass ?? null,
    lifecycleState: evidence?.lifecycleState ?? null,
    breaches,
    policy: M48_REGRESSION_POLICY,
  };
}

function findBudgetBreaches(
  evidence: M48PerformanceEvidence,
): readonly M48BudgetBreach[] {
  const profile = M48_WORKLOAD_PROFILES[evidence.workloadClass];
  const values: Record<M48BudgetKey, number> = {
    files: evidence.files,
    repositories: evidence.repositories,
    workers: evidence.workers,
    ...evidence.metrics,
  };
  return M48_BUDGET_KEYS.flatMap((key) => {
    const observed = values[key];
    const maximum =
      key === "files"
        ? profile.maxFiles
        : key === "repositories"
          ? profile.maxRepositories
          : key === "workers"
            ? profile.budgets.maxWorkers
            : profile.budgets[key];
    return observed > maximum ? [{ budget: key, observed, maximum }] : [];
  });
}

export function assessM48ScalePerformance(
  evidenceValue: unknown,
  contextValue: unknown,
): M48ScaleAssessment {
  try {
    const evidence = parseEvidence(evidenceValue);
    if (evidence === null) {
      return result("MALFORMED", "MALFORMED_EVIDENCE", "UNDETERMINED");
    }
    const context = parseContext(contextValue);
    if (context === null) {
      return result("MALFORMED", "MALFORMED_CONTEXT", "UNDETERMINED", evidence);
    }
    if (
      evidence.candidateId !== context.candidateId ||
      evidence.repositoryId !== context.repositoryId ||
      evidence.graphDigest !== context.graphDigest
    ) {
      return result("FOREIGN", "FOREIGN_EVIDENCE", "UNDETERMINED", evidence);
    }
    if (evidence.observedAtMs > context.nowMs) {
      return result(
        "MALFORMED",
        "MALFORMED_EVIDENCE",
        "UNDETERMINED",
        evidence,
      );
    }
    if (context.nowMs - evidence.observedAtMs > M48_EVIDENCE_MAX_AGE_MS) {
      return result("STALE", "STALE_EVIDENCE", "UNDETERMINED", evidence);
    }
    const breaches = findBudgetBreaches(evidence);
    if (evidence.completeness === "PARTIAL") {
      return result(
        "PARTIAL",
        "PARTIAL_EVIDENCE",
        breaches.length === 0 ? "UNDETERMINED" : "DETECTED",
        evidence,
        breaches,
      );
    }
    return result(
      "CURRENT",
      breaches.length === 0 ? "WITHIN_BUDGET" : "BUDGET_EXCEEDED",
      breaches.length === 0 ? "NONE" : "DETECTED",
      evidence,
      breaches,
    );
  } catch {
    return result("MALFORMED", "MALFORMED_EVIDENCE", "UNDETERMINED");
  }
}
