import { createHash } from "node:crypto";

export const M45_DETECTOR_LIFECYCLE_SCHEMA =
  "m45.detector-lifecycle@1" as const;

export const M45_DETECTOR_LIMITS = Object.freeze({
  maxCases: 100_000,
  maxEvidenceItems: 100_000,
  maxIdLength: 160,
  maxTextLength: 512,
  maxDeltas: 1_000_000_000,
});

export const DETECTOR_LIFECYCLE_STATES = [
  "DISCOVERED",
  "DISPOSITIONED",
  "ADJUDICATED",
  "CANDIDATE",
  "DIFFERENTIAL_EVALUATED",
  "HOLDOUT_EVALUATED",
  "AWAITING_APPROVAL",
  "PROMOTED",
  "NO_PROMOTION",
  "INCONCLUSIVE",
  "ROLLED_BACK",
  "DEPRECATED",
  "RETIRED",
] as const;

export type DetectorLifecycleState = (typeof DETECTOR_LIFECYCLE_STATES)[number];

export const DETECTOR_PROMOTION_OUTCOMES = [
  "PROMOTED",
  "NO_PROMOTION",
  "INCONCLUSIVE",
] as const;

export type DetectorPromotionOutcome =
  (typeof DETECTOR_PROMOTION_OUTCOMES)[number];

export const DETECTOR_EVIDENCE_STATES = [
  "CURRENT",
  "STALE",
  "FOREIGN",
  "MALFORMED",
  "PARTIAL",
] as const;

export type DetectorEvidenceState = (typeof DETECTOR_EVIDENCE_STATES)[number];

export const M45_DETECTOR_STATES = DETECTOR_LIFECYCLE_STATES;
export const M45_PROMOTION_OUTCOMES = DETECTOR_PROMOTION_OUTCOMES;
export const M45_EVIDENCE_STATES = DETECTOR_EVIDENCE_STATES;

export const DETECTOR_PROMOTION_REASONS = [
  "CRITERIA_MET",
  "MALFORMED_REQUEST",
  "MALFORMED_EVIDENCE",
  "STALE_EVIDENCE",
  "FOREIGN_EVIDENCE",
  "PARTIAL_EVIDENCE",
  "REVISION_NOT_ADVANCING",
  "REPORT_DIGEST_MISMATCH",
  "HOLDOUT_NOT_SEALED",
  "HOLDOUT_CONTAMINATED",
  "HOLDOUT_UNKNOWN_CASES",
  "HOLDOUT_INSUFFICIENT_CASES",
  "HOLDOUT_FALSE_POSITIVE_REGRESSION",
  "HOLDOUT_FALSE_NEGATIVE_REGRESSION",
  "NEW_FALSE_POSITIVES",
  "LOST_TRUE_POSITIVES",
  "FALSE_POSITIVE_DELTA",
  "PERFORMANCE_P50_REGRESSION",
  "PERFORMANCE_P95_REGRESSION",
  "PERFORMANCE_MAX_REGRESSION",
  "CRASH_DELTA",
  "NEW_CRASHES",
  "NEW_TIMEOUTS",
  "HUMAN_REJECTED",
  "HUMAN_APPROVAL_STALE",
  "HUMAN_APPROVAL_FOREIGN",
  "HUMAN_APPROVAL_MALFORMED",
  "HUMAN_APPROVAL_REFERENCE_MISMATCH",
  "ILLEGAL_LIFECYCLE_TRANSITION",
  "ROLLBACK_NOT_ALLOWED",
  "ROLLBACK_TARGET_INVALID",
  "DEPRECATION_NOT_ALLOWED",
  "DEPRECATION_EVIDENCE_MISSING",
  "RETIREMENT_NOT_ALLOWED",
  "RETIREMENT_NOT_DUE",
] as const;

export type DetectorPromotionReason =
  (typeof DETECTOR_PROMOTION_REASONS)[number];

export const M45_PROMOTION_REASONS = DETECTOR_PROMOTION_REASONS;

export type M45DetectorLifecycleState = DetectorLifecycleState;
export type M45DetectorPromotionOutcome = DetectorPromotionOutcome;
export type M45DetectorEvidenceState = DetectorEvidenceState;
export type M45DetectorRunMetrics = DetectorRunMetrics;
export type M45DetectorDifferential = DetectorDifferential;
export type M45HumanApprovalEvidenceReference = HumanApprovalEvidenceReference;

export type DetectorDifferentialReason =
  | "CURRENT"
  | "MALFORMED_EVIDENCE"
  | "STALE_EVIDENCE"
  | "FOREIGN_EVIDENCE"
  | "PARTIAL_EVIDENCE"
  | "REVISION_NOT_ADVANCING";

export type HoldoutEvaluationState =
  "VALID" | "STALE" | "FOREIGN" | "MALFORMED" | "PARTIAL";

export type HoldoutEvaluationOutcome =
  "ACCEPTED" | "NO_PROMOTION" | "INCONCLUSIVE";

export type DetectorLifecycleEventType =
  | "RECORD_FINDING"
  | "RECORD_DISPOSITION"
  | "COMPLETE_ADJUDICATION"
  | "COMPLETE_DIFFERENTIAL"
  | "COMPLETE_HOLDOUT"
  | "RECORD_APPROVAL"
  | "PROMOTE"
  | "REJECT"
  | "INCONCLUSIVE"
  | "REMEDIATE"
  | "REASSESS"
  | "ROLLBACK"
  | "DEPRECATE"
  | "RETIRE";

export interface PerformanceMetrics {
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly throughputPerSecond: number;
}

export interface CrashMetrics {
  readonly total: number;
  readonly detectorCrashes: number;
  readonly timeouts: number;
  readonly contained: number;
}

export interface DetectorRunMetrics {
  readonly schemaVersion: 1;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly capturedAt: string;
  readonly complete: boolean;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly truePositiveIds?: readonly string[];
  readonly falsePositiveIds?: readonly string[];
  readonly falseNegativeIds?: readonly string[];
  readonly performance: PerformanceMetrics;
  readonly crash: CrashMetrics;
}

export interface PerformanceDelta {
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly maxMs: number;
  readonly throughputPerSecond: number;
}

export interface CrashDelta {
  readonly total: number;
  readonly detectorCrashes: number;
  readonly timeouts: number;
  readonly contained: number;
}

export interface RateDelta {
  readonly baseline: number | null;
  readonly candidate: number | null;
  readonly delta: number | null;
}

export interface DetectorDifferential {
  readonly reportId: string;
  readonly state: "CURRENT";
  readonly baselineRevision: number;
  readonly candidateRevision: number;
  readonly truePositiveDelta: number;
  readonly falsePositiveDelta: number;
  readonly falseNegativeDelta: number;
  readonly tpDelta: number;
  readonly fpDelta: number;
  readonly fnDelta: number;
  readonly newTruePositives: number;
  readonly lostTruePositives: number;
  readonly newFalsePositives: number;
  readonly resolvedFalsePositives: number;
  readonly newTp: number;
  readonly lostTp: number;
  readonly newFp: number;
  readonly resolvedFp: number;
  readonly precision: RateDelta;
  readonly sensitivity: RateDelta;
  readonly recall: RateDelta;
  readonly performanceDelta: PerformanceDelta;
  readonly crashDelta: CrashDelta;
}

export interface DetectorDifferentialEvaluation {
  readonly state: DetectorEvidenceState;
  readonly reason: DetectorDifferentialReason;
  readonly diagnostics: readonly string[];
  readonly differential: DetectorDifferential | null;
}

export interface DifferentialContext {
  readonly candidateId: string;
  readonly detectorId: string;
  readonly repositoryId: string;
  readonly evaluatedAt: string;
  readonly maxEvidenceAgeMs: number;
}

export interface SealedHoldoutInput {
  readonly schemaVersion: 1;
  readonly holdoutId: string;
  readonly candidateId: string;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly repositoryId: string;
  readonly trainingCorpusId: string;
  readonly corpusId: string;
  readonly corpusDigest: string;
}

export interface SealedHoldout extends SealedHoldoutInput {
  readonly sealedAt: string;
  readonly status: "SEALED";
}

export interface SealedHoldoutResult {
  readonly schemaVersion: 1;
  readonly holdoutId: string;
  readonly candidateId: string;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly repositoryId: string;
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly evaluatedAt: string;
  readonly complete: boolean;
  readonly isolated: boolean;
  readonly contamination: "NONE";
  readonly caseCount: number;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly unknownCount: number;
  readonly digest: string;
}

export interface SealedHoldoutValidation {
  readonly state: DetectorEvidenceState;
  readonly diagnostics: readonly string[];
  readonly holdout: SealedHoldout | null;
}

export interface SealedHoldoutEvaluation {
  readonly state: HoldoutEvaluationState;
  readonly outcome: HoldoutEvaluationOutcome;
  readonly reason: DetectorPromotionReason;
  readonly diagnostics: readonly string[];
  readonly falsePositiveRate: number | null;
  readonly falseNegativeRate: number | null;
  readonly caseCount: number;
  readonly unknownCount: number;
  readonly resultDigest: string | null;
}

export interface HumanApprovalEvidenceReference {
  readonly schemaVersion: 1;
  readonly evidenceId: string;
  readonly evidenceDigest: string;
  readonly reviewerId: string;
  readonly decision: "APPROVE" | "REJECT";
  readonly candidateId: string;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly differentialReportId: string;
  readonly holdoutResultDigest: string;
  readonly recordedAt: string;
}

export interface HumanApprovalValidation {
  readonly state: DetectorEvidenceState;
  readonly diagnostics: readonly string[];
  readonly evidence: HumanApprovalEvidenceReference | null;
}

export interface DetectorPromotionPolicy {
  readonly maxLostTruePositives: number;
  readonly maxNewFalsePositives: number;
  readonly maxFalsePositiveDelta: number;
  readonly maxPerformanceP50RegressionMs: number;
  readonly maxPerformanceP95RegressionMs: number;
  readonly maxPerformanceMaxRegressionMs: number;
  readonly maxCrashDelta: number;
  readonly maxNewCrashes: number;
  readonly maxNewTimeouts: number;
  readonly minimumHoldoutCases: number;
  readonly maxHoldoutFalsePositiveRate: number;
  readonly maxHoldoutFalseNegativeRate: number;
  readonly maxEvidenceAgeMs: number;
}

export const DEFAULT_M45_PROMOTION_POLICY: DetectorPromotionPolicy =
  Object.freeze({
    maxLostTruePositives: 0,
    maxNewFalsePositives: 0,
    maxFalsePositiveDelta: 0,
    maxPerformanceP50RegressionMs: 50,
    maxPerformanceP95RegressionMs: 100,
    maxPerformanceMaxRegressionMs: 250,
    maxCrashDelta: 0,
    maxNewCrashes: 0,
    maxNewTimeouts: 0,
    minimumHoldoutCases: 1,
    maxHoldoutFalsePositiveRate: 0.25,
    maxHoldoutFalseNegativeRate: 0.25,
    maxEvidenceAgeMs: 86_400_000,
  });

export interface DetectorPromotionRequest {
  readonly schemaVersion: 1;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly baseline: DetectorRunMetrics;
  readonly candidate: DetectorRunMetrics;
  readonly holdout: SealedHoldout;
  readonly holdoutResult: SealedHoldoutResult;
  readonly humanApprovalEvidence: HumanApprovalEvidenceReference;
  readonly humanApprovalEvidenceRef: string;
  readonly policy?: Partial<DetectorPromotionPolicy>;
}

export interface DetectorPromotionContext {
  readonly evaluatedAt: string;
  readonly maxEvidenceAgeMs?: number;
}

export interface DetectorPromotionResult {
  readonly outcome: DetectorPromotionOutcome;
  readonly state: DetectorLifecycleState;
  readonly reason: DetectorPromotionReason;
  readonly diagnostics: readonly string[];
  readonly differential: DetectorDifferential | null;
  readonly holdout: SealedHoldoutEvaluation | null;
  readonly humanApprovalEvidenceRef: string | null;
}

export interface DetectorLifecycleEvent {
  readonly type: DetectorLifecycleEventType;
  readonly humanApprovalVerified?: boolean;
  readonly humanApprovalEvidenceRef?: string;
}

export type DetectorLifecycleInput =
  DetectorLifecycleEvent | DetectorLifecycleEventType;

export interface DetectorLifecycleTransition {
  readonly from: DetectorLifecycleState | null;
  readonly event: DetectorLifecycleEventType | null;
  readonly to: DetectorLifecycleState;
  readonly accepted: boolean;
  readonly outcome: "ACCEPTED" | "NO_PROMOTION" | "INCONCLUSIVE";
  readonly reason: string;
}

export interface DetectorRollbackInput {
  readonly state: DetectorLifecycleState;
  readonly activeRevision: number;
  readonly targetRevision: number;
  readonly reason: string;
  readonly evidenceId: string;
}

export interface DetectorRollbackPlan {
  readonly outcome: "APPLIED" | "NO_PROMOTION" | "INCONCLUSIVE";
  readonly state: DetectorLifecycleState;
  readonly activeRevision: number;
  readonly targetRevision: number | null;
  readonly reason: DetectorPromotionReason;
  readonly evidenceId: string | null;
}

export interface DetectorDeprecationInput {
  readonly state: DetectorLifecycleState;
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly replacementDetectorId: string | null;
  readonly since: string;
  readonly removeAfter: string;
  readonly reason: string;
  readonly approvalEvidenceRef: string;
}

export interface DetectorDeprecationPlan {
  readonly outcome: "APPLIED" | "NO_PROMOTION" | "INCONCLUSIVE";
  readonly state: DetectorLifecycleState;
  readonly detectorId: string | null;
  readonly detectorRevision: number | null;
  readonly replacementDetectorId: string | null;
  readonly removeAfter: string | null;
  readonly approvalEvidenceRef: string | null;
  readonly reason: DetectorPromotionReason;
}

type UnknownRecord = Record<string, unknown>;

interface ParsedMetrics {
  readonly detectorId: string;
  readonly detectorRevision: number;
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly corpusId: string;
  readonly corpusDigest: string;
  readonly capturedAt: string;
  readonly capturedAtMs: number;
  readonly complete: boolean;
  readonly truePositives: number;
  readonly falsePositives: number;
  readonly falseNegatives: number;
  readonly truePositiveIds: readonly string[];
  readonly falsePositiveIds: readonly string[];
  readonly falseNegativeIds: readonly string[];
  readonly hasTruePositiveIds: boolean;
  readonly hasFalsePositiveIds: boolean;
  readonly hasFalseNegativeIds: boolean;
  readonly performance: PerformanceMetrics;
  readonly crash: CrashMetrics;
}

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Reflect.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function field(value: UnknownRecord, key: string): unknown {
  try {
    return value[key];
  } catch {
    return undefined;
  }
}

function firstField(value: UnknownRecord, keys: readonly string[]): unknown {
  for (const key of keys) {
    const candidate = field(value, key);
    if (candidate !== undefined) return candidate;
  }
  return undefined;
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > maxLength) return false;
  if (value.trim() !== value) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return false;
  }
  return true;
}

function parseString(
  value: unknown,
  maxLength: number = M45_DETECTOR_LIMITS.maxIdLength,
): string | null {
  return isBoundedString(value, maxLength) ? value : null;
}

function parseNonNegativeInteger(
  value: unknown,
  max: number = M45_DETECTOR_LIMITS.maxDeltas,
): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isSafeInteger(value) || value < 0 || value > max) return null;
  return value;
}

function parseNonNegativeFinite(
  value: unknown,
  max: number = Number.MAX_SAFE_INTEGER,
): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value < 0 || value > max) return null;
  return value;
}

function parseTimestamp(value: unknown): number | null {
  const text = parseString(value, 64);
  if (text === null) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseStringArray(value: unknown): readonly string[] | null {
  try {
    if (!Array.isArray(value) || value.length > M45_DETECTOR_LIMITS.maxCases) {
      return null;
    }
    const result: string[] = [];
    const seen = new Set<string>();
    for (const item of value) {
      const text = parseString(item);
      if (text === null || seen.has(text)) return null;
      seen.add(text);
      result.push(text);
    }
    return result;
  } catch {
    return null;
  }
}

function parsePerformance(value: unknown): PerformanceMetrics | null {
  if (!isRecord(value)) return null;
  const p50Ms = parseNonNegativeFinite(
    firstField(value, ["p50Ms", "latencyP50Ms"]),
  );
  const p95Ms = parseNonNegativeFinite(
    firstField(value, ["p95Ms", "latencyP95Ms"]),
  );
  const maxMs = parseNonNegativeFinite(
    firstField(value, ["maxMs", "maxLatencyMs"]),
  );
  const throughputPerSecond = parseNonNegativeFinite(
    firstField(value, ["throughputPerSecond", "throughput"]),
  );
  if (
    p50Ms === null ||
    p95Ms === null ||
    maxMs === null ||
    throughputPerSecond === null
  ) {
    return null;
  }
  if (p95Ms < p50Ms || maxMs < p95Ms) return null;
  return { p50Ms, p95Ms, maxMs, throughputPerSecond };
}

function parseCrash(value: unknown): CrashMetrics | null {
  if (typeof value === "number") {
    const total = parseNonNegativeInteger(value);
    return total === null
      ? null
      : { total, detectorCrashes: total, timeouts: 0, contained: total };
  }
  if (!isRecord(value)) return null;
  const total = parseNonNegativeInteger(firstField(value, ["total", "count"]));
  const detectorCrashes = parseNonNegativeInteger(
    firstField(value, ["detectorCrashes", "crashes", "ruleCrashes"]),
  );
  const timeouts = parseNonNegativeInteger(
    firstField(value, ["timeouts", "timeoutCount"]),
  );
  const contained = parseNonNegativeInteger(
    firstField(value, ["contained", "containedCrashes"]),
  );
  if (
    total === null ||
    detectorCrashes === null ||
    timeouts === null ||
    contained === null
  ) {
    return null;
  }
  if (detectorCrashes > total || timeouts > total || contained > total) {
    return null;
  }
  return { total, detectorCrashes, timeouts, contained };
}

function parseMetrics(value: unknown): ParsedMetrics | null {
  if (!isRecord(value)) return null;
  const schemaVersion = field(value, "schemaVersion");
  if (schemaVersion !== 1) return null;
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const candidateId = parseString(field(value, "candidateId"));
  const repositoryId = parseString(field(value, "repositoryId"));
  const corpusId = parseString(field(value, "corpusId"));
  const corpusDigest = parseString(
    field(value, "corpusDigest"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const capturedAt = parseString(field(value, "capturedAt"), 64);
  const capturedAtMs = parseTimestamp(capturedAt);
  const complete = parseBoolean(field(value, "complete"));
  const truePositives = parseNonNegativeInteger(
    firstField(value, ["truePositives", "truePositiveCount", "tp"]),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const falsePositives = parseNonNegativeInteger(
    firstField(value, ["falsePositives", "falsePositiveCount", "fp"]),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const falseNegatives = parseNonNegativeInteger(
    firstField(value, ["falseNegatives", "falseNegativeCount", "fn"]),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const performance = parsePerformance(field(value, "performance"));
  const crash = parseCrash(firstField(value, ["crash", "crashes"]));
  if (
    detectorId === null ||
    detectorRevision === null ||
    candidateId === null ||
    repositoryId === null ||
    corpusId === null ||
    corpusDigest === null ||
    capturedAt === null ||
    capturedAtMs === null ||
    complete === null ||
    truePositives === null ||
    falsePositives === null ||
    falseNegatives === null ||
    performance === null ||
    crash === null
  ) {
    return null;
  }
  const truePositiveIdsValue = field(value, "truePositiveIds");
  const falsePositiveIdsValue = field(value, "falsePositiveIds");
  const falseNegativeIdsValue = field(value, "falseNegativeIds");
  const truePositiveIds =
    truePositiveIdsValue === undefined
      ? []
      : parseStringArray(truePositiveIdsValue);
  const falsePositiveIds =
    falsePositiveIdsValue === undefined
      ? []
      : parseStringArray(falsePositiveIdsValue);
  const falseNegativeIds =
    falseNegativeIdsValue === undefined
      ? []
      : parseStringArray(falseNegativeIdsValue);
  if (
    truePositiveIds === null ||
    falsePositiveIds === null ||
    falseNegativeIds === null
  ) {
    return null;
  }
  if (
    (truePositiveIdsValue !== undefined &&
      truePositiveIds.length !== truePositives) ||
    (falsePositiveIdsValue !== undefined &&
      falsePositiveIds.length !== falsePositives) ||
    (falseNegativeIdsValue !== undefined &&
      falseNegativeIds.length !== falseNegatives)
  ) {
    return null;
  }
  return {
    detectorId,
    detectorRevision,
    candidateId,
    repositoryId,
    corpusId,
    corpusDigest,
    capturedAt,
    capturedAtMs,
    complete,
    truePositives,
    falsePositives,
    falseNegatives,
    truePositiveIds,
    falsePositiveIds,
    falseNegativeIds,
    hasTruePositiveIds: truePositiveIdsValue !== undefined,
    hasFalsePositiveIds: falsePositiveIdsValue !== undefined,
    hasFalseNegativeIds: falseNegativeIdsValue !== undefined,
    performance,
    crash,
  };
}

function toMetrics(metrics: ParsedMetrics): DetectorRunMetrics {
  const result: {
    schemaVersion: 1;
    detectorId: string;
    detectorRevision: number;
    candidateId: string;
    repositoryId: string;
    corpusId: string;
    corpusDigest: string;
    capturedAt: string;
    complete: boolean;
    truePositives: number;
    falsePositives: number;
    falseNegatives: number;
    truePositiveIds?: readonly string[];
    falsePositiveIds?: readonly string[];
    falseNegativeIds?: readonly string[];
    performance: PerformanceMetrics;
    crash: CrashMetrics;
  } = {
    schemaVersion: 1,
    detectorId: metrics.detectorId,
    detectorRevision: metrics.detectorRevision,
    candidateId: metrics.candidateId,
    repositoryId: metrics.repositoryId,
    corpusId: metrics.corpusId,
    corpusDigest: metrics.corpusDigest,
    capturedAt: metrics.capturedAt,
    complete: metrics.complete,
    truePositives: metrics.truePositives,
    falsePositives: metrics.falsePositives,
    falseNegatives: metrics.falseNegatives,
    performance: metrics.performance,
    crash: metrics.crash,
  };
  if (metrics.hasTruePositiveIds)
    result.truePositiveIds = metrics.truePositiveIds;
  if (metrics.hasFalsePositiveIds)
    result.falsePositiveIds = metrics.falsePositiveIds;
  if (metrics.hasFalseNegativeIds)
    result.falseNegativeIds = metrics.falseNegativeIds;
  return result;
}

function safeSubtract(left: number, right: number): number {
  const result = left - right;
  return Number.isSafeInteger(result) ? result : 0;
}

function safeNumberDifference(left: number, right: number): number {
  const result = left - right;
  return Number.isFinite(result) ? result : 0;
}

function countDelta(
  baseline: number,
  candidate: number,
  baselineIds: readonly string[],
  candidateIds: readonly string[],
  hasIds: boolean,
): {
  readonly newCount: number;
  readonly lostCount: number;
  readonly delta: number;
} {
  if (hasIds) {
    const baselineSet = new Set(baselineIds);
    const candidateSet = new Set(candidateIds);
    const newCount = candidateIds.filter((id) => !baselineSet.has(id)).length;
    const lostCount = baselineIds.filter((id) => !candidateSet.has(id)).length;
    return {
      newCount,
      lostCount,
      delta: safeSubtract(candidateIds.length, baselineIds.length),
    };
  }
  const delta = safeSubtract(candidate, baseline);
  return {
    newCount: Math.max(delta, 0),
    lostCount: Math.max(-delta, 0),
    delta,
  };
}

function rateDelta(
  baselineNumerator: number,
  baselineDenominator: number,
  candidateNumerator: number,
  candidateDenominator: number,
): RateDelta {
  if (baselineDenominator === 0 || candidateDenominator === 0) {
    return { baseline: null, candidate: null, delta: null };
  }
  const baseline = baselineNumerator / baselineDenominator;
  const candidate = candidateNumerator / candidateDenominator;
  return {
    baseline,
    candidate,
    delta: safeNumberDifference(candidate, baseline),
  };
}

function performanceDelta(
  baseline: PerformanceMetrics,
  candidate: PerformanceMetrics,
): PerformanceDelta {
  return {
    p50Ms: safeNumberDifference(candidate.p50Ms, baseline.p50Ms),
    p95Ms: safeNumberDifference(candidate.p95Ms, baseline.p95Ms),
    maxMs: safeNumberDifference(candidate.maxMs, baseline.maxMs),
    throughputPerSecond: safeNumberDifference(
      candidate.throughputPerSecond,
      baseline.throughputPerSecond,
    ),
  };
}

function crashDelta(
  baseline: CrashMetrics,
  candidate: CrashMetrics,
): CrashDelta {
  return {
    total: safeSubtract(candidate.total, baseline.total),
    detectorCrashes: safeSubtract(
      candidate.detectorCrashes,
      baseline.detectorCrashes,
    ),
    timeouts: safeSubtract(candidate.timeouts, baseline.timeouts),
    contained: safeSubtract(candidate.contained, baseline.contained),
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as UnknownRecord;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown): string {
  try {
    return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
  } catch {
    return "sha256:unavailable";
  }
}

function invalidDifferential(
  state: DetectorEvidenceState,
  reason: DetectorDifferentialReason,
  diagnostics: readonly string[],
): DetectorDifferentialEvaluation {
  return {
    state,
    reason,
    diagnostics: [...new Set(diagnostics)].slice(
      0,
      M45_DETECTOR_LIMITS.maxTextLength,
    ),
    differential: null,
  };
}

function metricsState(
  baseline: ParsedMetrics,
  candidate: ParsedMetrics,
  context: DifferentialContext,
): {
  state: DetectorEvidenceState;
  reason: DetectorDifferentialReason;
  diagnostics: string[];
} {
  const diagnostics: string[] = [];
  if (
    baseline.detectorId !== context.detectorId ||
    candidate.detectorId !== context.detectorId
  ) {
    diagnostics.push("detector identity mismatch");
    return { state: "FOREIGN", reason: "FOREIGN_EVIDENCE", diagnostics };
  }
  if (
    baseline.candidateId !== context.candidateId ||
    candidate.candidateId !== context.candidateId
  ) {
    diagnostics.push("candidate identity mismatch");
    return { state: "FOREIGN", reason: "FOREIGN_EVIDENCE", diagnostics };
  }
  if (
    baseline.repositoryId !== context.repositoryId ||
    candidate.repositoryId !== context.repositoryId
  ) {
    diagnostics.push("repository identity mismatch");
    return { state: "FOREIGN", reason: "FOREIGN_EVIDENCE", diagnostics };
  }
  if (
    baseline.corpusId !== candidate.corpusId ||
    baseline.corpusDigest !== candidate.corpusDigest
  ) {
    diagnostics.push("corpus identity mismatch");
    return { state: "FOREIGN", reason: "FOREIGN_EVIDENCE", diagnostics };
  }
  const now = parseTimestamp(context.evaluatedAt);
  if (now === null) {
    diagnostics.push("invalid evaluation timestamp");
    return { state: "MALFORMED", reason: "MALFORMED_EVIDENCE", diagnostics };
  }
  if (baseline.capturedAtMs > now || candidate.capturedAtMs > now) {
    diagnostics.push("future evidence");
    return { state: "MALFORMED", reason: "MALFORMED_EVIDENCE", diagnostics };
  }
  if (
    now - baseline.capturedAtMs > context.maxEvidenceAgeMs ||
    now - candidate.capturedAtMs > context.maxEvidenceAgeMs
  ) {
    diagnostics.push("evidence older than policy");
    return { state: "STALE", reason: "STALE_EVIDENCE", diagnostics };
  }
  if (!baseline.complete || !candidate.complete) {
    diagnostics.push("incomplete measurement");
    return { state: "PARTIAL", reason: "PARTIAL_EVIDENCE", diagnostics };
  }
  if (candidate.detectorRevision <= baseline.detectorRevision) {
    diagnostics.push("candidate revision does not advance baseline");
    return {
      state: "MALFORMED",
      reason: "REVISION_NOT_ADVANCING",
      diagnostics,
    };
  }
  return { state: "CURRENT", reason: "CURRENT", diagnostics };
}

function makeDifferential(
  baseline: ParsedMetrics,
  candidate: ParsedMetrics,
): DetectorDifferential {
  const truePositive = countDelta(
    baseline.truePositives,
    candidate.truePositives,
    baseline.truePositiveIds,
    candidate.truePositiveIds,
    baseline.hasTruePositiveIds && candidate.hasTruePositiveIds,
  );
  const falsePositive = countDelta(
    baseline.falsePositives,
    candidate.falsePositives,
    baseline.falsePositiveIds,
    candidate.falsePositiveIds,
    baseline.hasFalsePositiveIds && candidate.hasFalsePositiveIds,
  );
  const falseNegative = countDelta(
    baseline.falseNegatives,
    candidate.falseNegatives,
    baseline.falseNegativeIds,
    candidate.falseNegativeIds,
    baseline.hasFalseNegativeIds && candidate.hasFalseNegativeIds,
  );
  const performance = performanceDelta(
    baseline.performance,
    candidate.performance,
  );
  const crashes = crashDelta(baseline.crash, candidate.crash);
  const precision = rateDelta(
    baseline.truePositives,
    baseline.truePositives + baseline.falsePositives,
    candidate.truePositives,
    candidate.truePositives + candidate.falsePositives,
  );
  const sensitivity = rateDelta(
    baseline.truePositives,
    baseline.truePositives + baseline.falseNegatives,
    candidate.truePositives,
    candidate.truePositives + candidate.falseNegatives,
  );
  const reportId = `differential:${digest({
    baseline: toMetrics(baseline),
    candidate: toMetrics(candidate),
  })}`;
  return {
    reportId,
    state: "CURRENT",
    baselineRevision: baseline.detectorRevision,
    candidateRevision: candidate.detectorRevision,
    truePositiveDelta: truePositive.delta,
    falsePositiveDelta: falsePositive.delta,
    falseNegativeDelta: falseNegative.delta,
    tpDelta: truePositive.delta,
    fpDelta: falsePositive.delta,
    fnDelta: falseNegative.delta,
    newTruePositives: truePositive.newCount,
    lostTruePositives: truePositive.lostCount,
    newFalsePositives: falsePositive.newCount,
    resolvedFalsePositives: falsePositive.lostCount,
    newTp: truePositive.newCount,
    lostTp: truePositive.lostCount,
    newFp: falsePositive.newCount,
    resolvedFp: falsePositive.lostCount,
    precision,
    sensitivity,
    recall: sensitivity,
    performanceDelta: performance,
    crashDelta: crashes,
  };
}

export function computeDetectorDifferential(
  baseline: unknown,
  candidate: unknown,
  context: unknown,
): DetectorDifferentialEvaluation {
  if (!isRecord(context)) {
    return invalidDifferential("MALFORMED", "MALFORMED_EVIDENCE", [
      "invalid differential context",
    ]);
  }
  const candidateId = parseString(field(context, "candidateId"));
  const detectorId = parseString(field(context, "detectorId"));
  const repositoryId = parseString(field(context, "repositoryId"));
  const evaluatedAt = parseString(field(context, "evaluatedAt"), 64);
  const maxEvidenceAgeMs = parseNonNegativeInteger(
    field(context, "maxEvidenceAgeMs"),
  );
  if (
    candidateId === null ||
    detectorId === null ||
    repositoryId === null ||
    evaluatedAt === null ||
    maxEvidenceAgeMs === null
  ) {
    return invalidDifferential("MALFORMED", "MALFORMED_EVIDENCE", [
      "invalid differential context",
    ]);
  }
  const parsedBaseline = parseMetrics(baseline);
  const parsedCandidate = parseMetrics(candidate);
  if (parsedBaseline === null || parsedCandidate === null) {
    return invalidDifferential("MALFORMED", "MALFORMED_EVIDENCE", [
      "invalid detector metrics",
    ]);
  }
  const differentialContext: DifferentialContext = {
    candidateId,
    detectorId,
    repositoryId,
    evaluatedAt,
    maxEvidenceAgeMs,
  };
  const state = metricsState(
    parsedBaseline,
    parsedCandidate,
    differentialContext,
  );
  if (state.state !== "CURRENT")
    return invalidDifferential(state.state, state.reason, state.diagnostics);
  return {
    state: "CURRENT",
    reason: "CURRENT",
    diagnostics: state.diagnostics,
    differential: makeDifferential(parsedBaseline, parsedCandidate),
  };
}

function parseHoldout(value: unknown): SealedHoldout | null {
  if (!isRecord(value)) return null;
  if (field(value, "schemaVersion") !== 1) return null;
  const holdoutId = parseString(field(value, "holdoutId"));
  const candidateId = parseString(field(value, "candidateId"));
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const repositoryId = parseString(field(value, "repositoryId"));
  const trainingCorpusId = parseString(field(value, "trainingCorpusId"));
  const corpusId = parseString(field(value, "corpusId"));
  const corpusDigest = parseString(
    field(value, "corpusDigest"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const sealedAt = parseString(field(value, "sealedAt"), 64);
  const status = field(value, "status");
  if (
    holdoutId === null ||
    candidateId === null ||
    detectorId === null ||
    detectorRevision === null ||
    repositoryId === null ||
    trainingCorpusId === null ||
    corpusId === null ||
    corpusDigest === null ||
    sealedAt === null ||
    parseTimestamp(sealedAt) === null ||
    status !== "SEALED" ||
    trainingCorpusId === corpusId
  ) {
    return null;
  }
  return Object.freeze({
    schemaVersion: 1 as const,
    holdoutId,
    candidateId,
    detectorId,
    detectorRevision,
    repositoryId,
    trainingCorpusId,
    corpusId,
    corpusDigest,
    sealedAt,
    status: "SEALED" as const,
  });
}

export function createSealedHoldout(
  input: unknown,
  sealedAt: unknown,
): SealedHoldoutValidation {
  const timestamp = parseString(sealedAt, 64);
  if (timestamp === null || parseTimestamp(timestamp) === null) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid sealed timestamp"],
      holdout: null,
    };
  }
  if (!isRecord(input) || field(input, "schemaVersion") !== 1) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid holdout schema"],
      holdout: null,
    };
  }
  const candidate = {
    schemaVersion: 1 as const,
    holdoutId: field(input, "holdoutId"),
    candidateId: field(input, "candidateId"),
    detectorId: field(input, "detectorId"),
    detectorRevision: field(input, "detectorRevision"),
    repositoryId: field(input, "repositoryId"),
    trainingCorpusId: field(input, "trainingCorpusId"),
    corpusId: field(input, "corpusId"),
    corpusDigest: field(input, "corpusDigest"),
    sealedAt: timestamp,
    status: "SEALED" as const,
  };
  const holdout = parseHoldout(candidate);
  if (holdout === null) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid or unsealed holdout"],
      holdout: null,
    };
  }
  return { state: "CURRENT", diagnostics: [], holdout };
}

export const sealHoldout = createSealedHoldout;

function validateHoldout(
  holdout: unknown,
  context: unknown,
): SealedHoldoutValidation {
  const parsed = parseHoldout(holdout);
  if (parsed === null) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid sealed holdout"],
      holdout: null,
    };
  }
  if (!isRecord(context)) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid holdout context"],
      holdout: parsed,
    };
  }
  const candidateId = parseString(field(context, "candidateId"));
  const detectorId = parseString(field(context, "detectorId"));
  const repositoryId = parseString(field(context, "repositoryId"));
  const detectorRevision = parseNonNegativeInteger(
    field(context, "detectorRevision"),
  );
  const evaluatedAt = parseTimestamp(field(context, "evaluatedAt"));
  const maxAge = parseNonNegativeInteger(field(context, "maxEvidenceAgeMs"));
  if (
    candidateId === null ||
    detectorId === null ||
    repositoryId === null ||
    detectorRevision === null ||
    evaluatedAt === null ||
    maxAge === null
  ) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid holdout context"],
      holdout: parsed,
    };
  }
  if (
    parsed.candidateId !== candidateId ||
    parsed.detectorId !== detectorId ||
    parsed.repositoryId !== repositoryId ||
    parsed.detectorRevision !== detectorRevision
  ) {
    return {
      state: "FOREIGN",
      diagnostics: ["holdout binding mismatch"],
      holdout: parsed,
    };
  }
  const sealedAt = parseTimestamp(parsed.sealedAt);
  if (sealedAt === null || sealedAt > evaluatedAt) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid sealed time"],
      holdout: parsed,
    };
  }
  if (evaluatedAt - sealedAt > maxAge) {
    return {
      state: "STALE",
      diagnostics: ["sealed holdout expired"],
      holdout: parsed,
    };
  }
  return { state: "CURRENT", diagnostics: [], holdout: parsed };
}

export function verifySealedHoldout(
  holdout: unknown,
  context: unknown,
): SealedHoldoutValidation {
  try {
    return validateHoldout(holdout, context);
  } catch {
    return {
      state: "MALFORMED",
      diagnostics: ["holdout validation failed"],
      holdout: null,
    };
  }
}

function parseHoldoutResult(value: unknown): SealedHoldoutResult | null {
  if (!isRecord(value) || field(value, "schemaVersion") !== 1) return null;
  const holdoutId = parseString(field(value, "holdoutId"));
  const candidateId = parseString(field(value, "candidateId"));
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const repositoryId = parseString(field(value, "repositoryId"));
  const corpusId = parseString(field(value, "corpusId"));
  const corpusDigest = parseString(
    field(value, "corpusDigest"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const evaluatedAt = parseString(field(value, "evaluatedAt"), 64);
  const complete = parseBoolean(field(value, "complete"));
  const isolated = parseBoolean(field(value, "isolated"));
  const contamination = field(value, "contamination");
  const caseCount = parseNonNegativeInteger(
    field(value, "caseCount"),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const truePositives = parseNonNegativeInteger(
    field(value, "truePositives"),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const falsePositives = parseNonNegativeInteger(
    field(value, "falsePositives"),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const falseNegatives = parseNonNegativeInteger(
    field(value, "falseNegatives"),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const unknownCount = parseNonNegativeInteger(
    field(value, "unknownCount"),
    M45_DETECTOR_LIMITS.maxCases,
  );
  const resultDigest = parseString(
    field(value, "digest"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  if (
    holdoutId === null ||
    candidateId === null ||
    detectorId === null ||
    detectorRevision === null ||
    repositoryId === null ||
    corpusId === null ||
    corpusDigest === null ||
    evaluatedAt === null ||
    parseTimestamp(evaluatedAt) === null ||
    complete === null ||
    isolated === null ||
    contamination !== "NONE" ||
    caseCount === null ||
    truePositives === null ||
    falsePositives === null ||
    falseNegatives === null ||
    unknownCount === null ||
    resultDigest === null
  ) {
    return null;
  }
  if (
    caseCount !==
    truePositives + falsePositives + falseNegatives + unknownCount
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    holdoutId,
    candidateId,
    detectorId,
    detectorRevision,
    repositoryId,
    corpusId,
    corpusDigest,
    evaluatedAt,
    complete,
    isolated,
    contamination: "NONE",
    caseCount,
    truePositives,
    falsePositives,
    falseNegatives,
    unknownCount,
    digest: resultDigest,
  };
}

function holdoutFailure(
  state: HoldoutEvaluationState,
  reason: DetectorPromotionReason,
  diagnostics: readonly string[],
  resultDigest: string | null = null,
): SealedHoldoutEvaluation {
  return {
    state,
    outcome: state === "VALID" ? "INCONCLUSIVE" : "INCONCLUSIVE",
    reason,
    diagnostics: [...new Set(diagnostics)].slice(
      0,
      M45_DETECTOR_LIMITS.maxTextLength,
    ),
    falsePositiveRate: null,
    falseNegativeRate: null,
    caseCount: 0,
    unknownCount: 0,
    resultDigest,
  };
}

export function evaluateSealedHoldout(
  holdout: unknown,
  result: unknown,
  context: unknown,
  policy: Partial<DetectorPromotionPolicy> = DEFAULT_M45_PROMOTION_POLICY,
): SealedHoldoutEvaluation {
  try {
    const holdoutValidation = verifySealedHoldout(holdout, context);
    if (
      holdoutValidation.state !== "CURRENT" ||
      holdoutValidation.holdout === null
    ) {
      return holdoutFailure(
        holdoutValidation.state === "FOREIGN"
          ? "FOREIGN"
          : holdoutValidation.state === "STALE"
            ? "STALE"
            : holdoutValidation.state === "PARTIAL"
              ? "PARTIAL"
              : "MALFORMED",
        holdoutValidation.state === "FOREIGN"
          ? "FOREIGN_EVIDENCE"
          : holdoutValidation.state === "STALE"
            ? "STALE_EVIDENCE"
            : "HOLDOUT_NOT_SEALED",
        holdoutValidation.diagnostics,
      );
    }
    const parsed = parseHoldoutResult(result);
    if (parsed === null) {
      return holdoutFailure("MALFORMED", "MALFORMED_EVIDENCE", [
        "invalid holdout result",
      ]);
    }
    const sealed = holdoutValidation.holdout;
    if (
      parsed.holdoutId !== sealed.holdoutId ||
      parsed.candidateId !== sealed.candidateId ||
      parsed.detectorId !== sealed.detectorId ||
      parsed.detectorRevision !== sealed.detectorRevision ||
      parsed.repositoryId !== sealed.repositoryId ||
      parsed.corpusId !== sealed.corpusId ||
      parsed.corpusDigest !== sealed.corpusDigest
    ) {
      return holdoutFailure(
        "FOREIGN",
        "FOREIGN_EVIDENCE",
        ["holdout result binding mismatch"],
        parsed.digest,
      );
    }
    if (
      !isRecord(context) ||
      parseTimestamp(field(context, "evaluatedAt")) === null
    ) {
      return holdoutFailure(
        "MALFORMED",
        "MALFORMED_EVIDENCE",
        ["invalid holdout context"],
        parsed.digest,
      );
    }
    const evaluatedAt = parseTimestamp(field(context, "evaluatedAt"));
    const resultAt = parseTimestamp(parsed.evaluatedAt);
    const maxAge = parseNonNegativeInteger(field(context, "maxEvidenceAgeMs"));
    if (evaluatedAt === null || resultAt === null || maxAge === null) {
      return holdoutFailure(
        "MALFORMED",
        "MALFORMED_EVIDENCE",
        ["invalid holdout timing"],
        parsed.digest,
      );
    }
    if (resultAt > evaluatedAt) {
      return holdoutFailure(
        "MALFORMED",
        "MALFORMED_EVIDENCE",
        ["future holdout result"],
        parsed.digest,
      );
    }
    if (evaluatedAt - resultAt > maxAge) {
      return holdoutFailure(
        "STALE",
        "STALE_EVIDENCE",
        ["expired holdout result"],
        parsed.digest,
      );
    }
    if (
      !parsed.complete ||
      !parsed.isolated ||
      parsed.contamination !== "NONE"
    ) {
      return holdoutFailure(
        "PARTIAL",
        "HOLDOUT_CONTAMINATED",
        ["holdout is not isolated and complete"],
        parsed.digest,
      );
    }
    if (parsed.unknownCount > 0) {
      return holdoutFailure(
        "PARTIAL",
        "HOLDOUT_UNKNOWN_CASES",
        ["holdout contains unknown cases"],
        parsed.digest,
      );
    }
    const minimumCases = parseNonNegativeInteger(
      firstField(policy, ["minimumHoldoutCases"]),
      M45_DETECTOR_LIMITS.maxCases,
    );
    const maxFalsePositiveRate = parseRate(
      firstField(policy, ["maxHoldoutFalsePositiveRate"]),
    );
    const maxFalseNegativeRate = parseRate(
      firstField(policy, ["maxHoldoutFalseNegativeRate"]),
    );
    if (
      minimumCases === null ||
      maxFalsePositiveRate === null ||
      maxFalseNegativeRate === null
    ) {
      return holdoutFailure(
        "MALFORMED",
        "MALFORMED_REQUEST",
        ["invalid holdout policy"],
        parsed.digest,
      );
    }
    if (parsed.caseCount < minimumCases) {
      return holdoutFailure(
        "VALID",
        "HOLDOUT_INSUFFICIENT_CASES",
        ["holdout denominator is too small"],
        parsed.digest,
      );
    }
    const predicted = parsed.truePositives + parsed.falsePositives;
    const actual = parsed.truePositives + parsed.falseNegatives;
    if (predicted === 0 || actual === 0) {
      return holdoutFailure(
        "VALID",
        "HOLDOUT_INSUFFICIENT_CASES",
        ["holdout denominator is undefined"],
        parsed.digest,
      );
    }
    const falsePositiveRate = parsed.falsePositives / predicted;
    const falseNegativeRate = parsed.falseNegatives / actual;
    if (falsePositiveRate > maxFalsePositiveRate) {
      return {
        state: "VALID",
        outcome: "NO_PROMOTION",
        reason: "HOLDOUT_FALSE_POSITIVE_REGRESSION",
        diagnostics: ["holdout false-positive rate exceeds policy"],
        falsePositiveRate,
        falseNegativeRate,
        caseCount: parsed.caseCount,
        unknownCount: parsed.unknownCount,
        resultDigest: parsed.digest,
      };
    }
    if (falseNegativeRate > maxFalseNegativeRate) {
      return {
        state: "VALID",
        outcome: "NO_PROMOTION",
        reason: "HOLDOUT_FALSE_NEGATIVE_REGRESSION",
        diagnostics: ["holdout false-negative rate exceeds policy"],
        falsePositiveRate,
        falseNegativeRate,
        caseCount: parsed.caseCount,
        unknownCount: parsed.unknownCount,
        resultDigest: parsed.digest,
      };
    }
    return {
      state: "VALID",
      outcome: "ACCEPTED",
      reason: "CRITERIA_MET",
      diagnostics: [],
      falsePositiveRate,
      falseNegativeRate,
      caseCount: parsed.caseCount,
      unknownCount: parsed.unknownCount,
      resultDigest: parsed.digest,
    };
  } catch {
    return holdoutFailure("MALFORMED", "MALFORMED_EVIDENCE", [
      "holdout evaluation failed",
    ]);
  }
}

function parseRate(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    return null;
  }
  return value;
}

function parseApproval(value: unknown): HumanApprovalEvidenceReference | null {
  if (!isRecord(value) || field(value, "schemaVersion") !== 1) return null;
  const evidenceId = parseString(firstField(value, ["evidenceId", "id"]));
  const evidenceDigest = parseString(
    firstField(value, ["evidenceDigest", "digest"]),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const reviewerId = parseString(field(value, "reviewerId"));
  const decision = field(value, "decision");
  const candidateId = parseString(field(value, "candidateId"));
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const differentialReportId = parseString(
    field(value, "differentialReportId"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const holdoutResultDigest = parseString(
    field(value, "holdoutResultDigest"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const recordedAt = parseString(field(value, "recordedAt"), 64);
  if (
    evidenceId === null ||
    evidenceDigest === null ||
    reviewerId === null ||
    (decision !== "APPROVE" && decision !== "REJECT") ||
    candidateId === null ||
    detectorId === null ||
    detectorRevision === null ||
    differentialReportId === null ||
    holdoutResultDigest === null ||
    recordedAt === null ||
    parseTimestamp(recordedAt) === null
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    evidenceId,
    evidenceDigest,
    reviewerId,
    decision,
    candidateId,
    detectorId,
    detectorRevision,
    differentialReportId,
    holdoutResultDigest,
    recordedAt,
  };
}

function validateApproval(
  value: unknown,
  context: unknown,
  expected: {
    readonly candidateId: string;
    readonly detectorId: string;
    readonly detectorRevision: number;
    readonly differentialReportId: string;
    readonly holdoutResultDigest: string;
  },
): HumanApprovalValidation {
  const evidence = parseApproval(value);
  if (evidence === null) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid human approval evidence"],
      evidence: null,
    };
  }
  if (!isRecord(context)) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid approval context"],
      evidence,
    };
  }
  const evaluatedAt = parseTimestamp(field(context, "evaluatedAt"));
  const maxAge = parseNonNegativeInteger(field(context, "maxEvidenceAgeMs"));
  if (evaluatedAt === null || maxAge === null) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid approval context"],
      evidence,
    };
  }
  if (
    evidence.candidateId !== expected.candidateId ||
    evidence.detectorId !== expected.detectorId ||
    evidence.detectorRevision !== expected.detectorRevision
  ) {
    return {
      state: "FOREIGN",
      diagnostics: ["approval binding mismatch"],
      evidence,
    };
  }
  if (
    evidence.differentialReportId !== expected.differentialReportId ||
    evidence.holdoutResultDigest !== expected.holdoutResultDigest
  ) {
    return {
      state: "FOREIGN",
      diagnostics: ["approval evidence reference mismatch"],
      evidence,
    };
  }
  const recordedAt = parseTimestamp(evidence.recordedAt);
  if (recordedAt === null || recordedAt > evaluatedAt) {
    return {
      state: "MALFORMED",
      diagnostics: ["invalid approval timestamp"],
      evidence,
    };
  }
  if (evaluatedAt - recordedAt > maxAge) {
    return {
      state: "STALE",
      diagnostics: ["approval evidence expired"],
      evidence,
    };
  }
  return { state: "CURRENT", diagnostics: [], evidence };
}

export function validateHumanApprovalEvidence(
  evidence: unknown,
  context: unknown,
  expected: {
    readonly candidateId: string;
    readonly detectorId: string;
    readonly detectorRevision: number;
    readonly differentialReportId: string;
    readonly holdoutResultDigest: string;
  },
): HumanApprovalValidation {
  try {
    return validateApproval(evidence, context, expected);
  } catch {
    return {
      state: "MALFORMED",
      diagnostics: ["approval validation failed"],
      evidence: null,
    };
  }
}

function parsePolicy(value: unknown): DetectorPromotionPolicy | null {
  if (value === undefined) return DEFAULT_M45_PROMOTION_POLICY;
  if (!isRecord(value)) return null;
  const integerKeys = [
    "maxLostTruePositives",
    "maxNewFalsePositives",
    "maxFalsePositiveDelta",
    "maxPerformanceP50RegressionMs",
    "maxPerformanceP95RegressionMs",
    "maxPerformanceMaxRegressionMs",
    "maxCrashDelta",
    "maxNewCrashes",
    "maxNewTimeouts",
    "minimumHoldoutCases",
    "maxEvidenceAgeMs",
  ] as const;
  const result: {
    maxLostTruePositives: number;
    maxNewFalsePositives: number;
    maxFalsePositiveDelta: number;
    maxPerformanceP50RegressionMs: number;
    maxPerformanceP95RegressionMs: number;
    maxPerformanceMaxRegressionMs: number;
    maxCrashDelta: number;
    maxNewCrashes: number;
    maxNewTimeouts: number;
    minimumHoldoutCases: number;
    maxHoldoutFalsePositiveRate: number;
    maxHoldoutFalseNegativeRate: number;
    maxEvidenceAgeMs: number;
  } = { ...DEFAULT_M45_PROMOTION_POLICY };
  for (const key of integerKeys) {
    const raw = field(value, key);
    if (raw === undefined) continue;
    const parsed = parseNonNegativeInteger(raw);
    if (parsed === null) return null;
    result[key] = parsed;
  }
  const fpRate = field(value, "maxHoldoutFalsePositiveRate");
  if (fpRate !== undefined) {
    const parsed = parseRate(fpRate);
    if (parsed === null) return null;
    result.maxHoldoutFalsePositiveRate = parsed;
  }
  const fnRate = field(value, "maxHoldoutFalseNegativeRate");
  if (fnRate !== undefined) {
    const parsed = parseRate(fnRate);
    if (parsed === null) return null;
    result.maxHoldoutFalseNegativeRate = parsed;
  }
  return Object.freeze(result);
}

function promotionFailure(
  outcome: DetectorPromotionOutcome,
  reason: DetectorPromotionReason,
  diagnostics: readonly string[],
  differential: DetectorDifferential | null = null,
  holdout: SealedHoldoutEvaluation | null = null,
  evidenceRef: string | null = null,
): DetectorPromotionResult {
  return {
    outcome,
    state: outcome,
    reason,
    diagnostics: [...new Set(diagnostics)].slice(
      0,
      M45_DETECTOR_LIMITS.maxTextLength,
    ),
    differential,
    holdout,
    humanApprovalEvidenceRef: evidenceRef,
  };
}

function parseRequest(value: unknown): DetectorPromotionRequest | null {
  if (!isRecord(value) || field(value, "schemaVersion") !== 1) return null;
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const candidateId = parseString(field(value, "candidateId"));
  const repositoryId = parseString(field(value, "repositoryId"));
  const humanApprovalEvidenceRef = parseString(
    field(value, "humanApprovalEvidenceRef"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  if (
    detectorId === null ||
    detectorRevision === null ||
    candidateId === null ||
    repositoryId === null ||
    humanApprovalEvidenceRef === null
  ) {
    return null;
  }
  const policy = field(value, "policy");
  return {
    schemaVersion: 1,
    detectorId,
    detectorRevision,
    candidateId,
    repositoryId,
    baseline: field(value, "baseline") as DetectorRunMetrics,
    candidate: field(value, "candidate") as DetectorRunMetrics,
    holdout: field(value, "holdout") as SealedHoldout,
    holdoutResult: field(value, "holdoutResult") as SealedHoldoutResult,
    humanApprovalEvidence: field(
      value,
      "humanApprovalEvidence",
    ) as HumanApprovalEvidenceReference,
    humanApprovalEvidenceRef,
    ...(policy === undefined
      ? {}
      : { policy: policy as Partial<DetectorPromotionPolicy> }),
  };
}

export function evaluateDetectorPromotion(
  request: unknown,
  context: unknown,
): DetectorPromotionResult {
  try {
    const parsedRequest = parseRequest(request);
    if (parsedRequest === null) {
      return promotionFailure("INCONCLUSIVE", "MALFORMED_REQUEST", [
        "promotion request is malformed or incomplete",
      ]);
    }
    if (!isRecord(context)) {
      return promotionFailure("INCONCLUSIVE", "MALFORMED_REQUEST", [
        "promotion context is malformed",
      ]);
    }
    const evaluatedAt = parseTimestamp(field(context, "evaluatedAt"));
    const policy = parsePolicy(parsedRequest.policy);
    if (evaluatedAt === null || policy === null) {
      return promotionFailure("INCONCLUSIVE", "MALFORMED_REQUEST", [
        "promotion timing or policy is malformed",
      ]);
    }
    const maxEvidenceAgeMs = field(context, "maxEvidenceAgeMs");
    const contextMaxAge = parseNonNegativeInteger(maxEvidenceAgeMs);
    if (maxEvidenceAgeMs !== undefined && contextMaxAge === null) {
      return promotionFailure("INCONCLUSIVE", "MALFORMED_REQUEST", [
        "evidence age limit is malformed",
      ]);
    }
    const effectiveMaxAge =
      contextMaxAge === null ? policy.maxEvidenceAgeMs : contextMaxAge;
    const differentialContext: DifferentialContext = {
      candidateId: parsedRequest.candidateId,
      detectorId: parsedRequest.detectorId,
      repositoryId: parsedRequest.repositoryId,
      evaluatedAt: field(context, "evaluatedAt") as string,
      maxEvidenceAgeMs: effectiveMaxAge,
    };
    if (
      parsedRequest.candidate.detectorId !== parsedRequest.detectorId ||
      parsedRequest.candidate.detectorRevision !==
        parsedRequest.detectorRevision ||
      parsedRequest.candidate.candidateId !== parsedRequest.candidateId ||
      parsedRequest.candidate.repositoryId !== parsedRequest.repositoryId ||
      parsedRequest.baseline.detectorId !== parsedRequest.detectorId ||
      parsedRequest.baseline.candidateId !== parsedRequest.candidateId ||
      parsedRequest.baseline.repositoryId !== parsedRequest.repositoryId
    ) {
      const differential = computeDetectorDifferential(
        parsedRequest.baseline,
        parsedRequest.candidate,
        differentialContext,
      );
      return promotionFailure(
        "INCONCLUSIVE",
        differential.state === "FOREIGN"
          ? "FOREIGN_EVIDENCE"
          : "MALFORMED_EVIDENCE",
        ["request binding does not match detector metrics"],
        differential.differential,
      );
    }
    const differential = computeDetectorDifferential(
      parsedRequest.baseline,
      parsedRequest.candidate,
      differentialContext,
    );
    if (
      differential.state !== "CURRENT" ||
      differential.differential === null
    ) {
      return promotionFailure(
        "INCONCLUSIVE",
        differential.reason === "FOREIGN_EVIDENCE"
          ? "FOREIGN_EVIDENCE"
          : differential.reason === "STALE_EVIDENCE"
            ? "STALE_EVIDENCE"
            : differential.reason === "PARTIAL_EVIDENCE"
              ? "PARTIAL_EVIDENCE"
              : "MALFORMED_EVIDENCE",
        differential.diagnostics,
        null,
      );
    }
    const holdoutValidation = verifySealedHoldout(parsedRequest.holdout, {
      candidateId: parsedRequest.candidateId,
      detectorId: parsedRequest.detectorId,
      detectorRevision: parsedRequest.detectorRevision,
      repositoryId: parsedRequest.repositoryId,
      evaluatedAt: field(context, "evaluatedAt"),
      maxEvidenceAgeMs: effectiveMaxAge,
    });
    if (
      holdoutValidation.state !== "CURRENT" ||
      holdoutValidation.holdout === null
    ) {
      return promotionFailure(
        "INCONCLUSIVE",
        holdoutValidation.state === "FOREIGN"
          ? "FOREIGN_EVIDENCE"
          : holdoutValidation.state === "STALE"
            ? "STALE_EVIDENCE"
            : "HOLDOUT_NOT_SEALED",
        holdoutValidation.diagnostics,
        differential.differential,
      );
    }
    const holdout = evaluateSealedHoldout(
      parsedRequest.holdout,
      parsedRequest.holdoutResult,
      {
        candidateId: parsedRequest.candidateId,
        detectorId: parsedRequest.detectorId,
        detectorRevision: parsedRequest.detectorRevision,
        repositoryId: parsedRequest.repositoryId,
        evaluatedAt: field(context, "evaluatedAt"),
        maxEvidenceAgeMs: effectiveMaxAge,
      },
      policy,
    );
    if (holdout.outcome === "NO_PROMOTION") {
      return promotionFailure(
        "NO_PROMOTION",
        holdout.reason,
        holdout.diagnostics,
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    if (holdout.outcome !== "ACCEPTED") {
      return promotionFailure(
        "INCONCLUSIVE",
        holdout.reason,
        holdout.diagnostics,
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    const approval = validateHumanApprovalEvidence(
      parsedRequest.humanApprovalEvidence,
      {
        evaluatedAt: field(context, "evaluatedAt"),
        maxEvidenceAgeMs: effectiveMaxAge,
      },
      {
        candidateId: parsedRequest.candidateId,
        detectorId: parsedRequest.detectorId,
        detectorRevision: parsedRequest.detectorRevision,
        differentialReportId: differential.differential.reportId,
        holdoutResultDigest: holdout.resultDigest ?? "",
      },
    );
    if (approval.state !== "CURRENT" || approval.evidence === null) {
      return promotionFailure(
        "INCONCLUSIVE",
        approval.state === "FOREIGN"
          ? "HUMAN_APPROVAL_FOREIGN"
          : approval.state === "STALE"
            ? "HUMAN_APPROVAL_STALE"
            : "HUMAN_APPROVAL_MALFORMED",
        approval.diagnostics,
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    if (
      parsedRequest.humanApprovalEvidenceRef !== approval.evidence.evidenceId
    ) {
      return promotionFailure(
        "INCONCLUSIVE",
        "HUMAN_APPROVAL_REFERENCE_MISMATCH",
        ["human approval reference does not match evidence identifier"],
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    if (approval.evidence.decision === "REJECT") {
      return promotionFailure(
        "NO_PROMOTION",
        "HUMAN_REJECTED",
        ["human reviewer rejected the revision"],
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    const d = differential.differential;
    const failures: DetectorPromotionReason[] = [];
    if (d.lostTruePositives > policy.maxLostTruePositives) {
      failures.push("LOST_TRUE_POSITIVES");
    }
    if (d.newFalsePositives > policy.maxNewFalsePositives) {
      failures.push("NEW_FALSE_POSITIVES");
    }
    if (d.falsePositiveDelta > policy.maxFalsePositiveDelta) {
      failures.push("FALSE_POSITIVE_DELTA");
    }
    if (d.performanceDelta.p50Ms > policy.maxPerformanceP50RegressionMs) {
      failures.push("PERFORMANCE_P50_REGRESSION");
    }
    if (d.performanceDelta.p95Ms > policy.maxPerformanceP95RegressionMs) {
      failures.push("PERFORMANCE_P95_REGRESSION");
    }
    if (d.performanceDelta.maxMs > policy.maxPerformanceMaxRegressionMs) {
      failures.push("PERFORMANCE_MAX_REGRESSION");
    }
    if (d.crashDelta.total > policy.maxCrashDelta) {
      failures.push("CRASH_DELTA");
    }
    if (d.crashDelta.detectorCrashes > policy.maxNewCrashes) {
      failures.push("NEW_CRASHES");
    }
    if (d.crashDelta.timeouts > policy.maxNewTimeouts) {
      failures.push("NEW_TIMEOUTS");
    }
    if (failures.length > 0) {
      return promotionFailure(
        "NO_PROMOTION",
        failures[0] ?? "CRITERIA_MET",
        failures,
        differential.differential,
        holdout,
        parsedRequest.humanApprovalEvidenceRef,
      );
    }
    return promotionFailure(
      "PROMOTED",
      "CRITERIA_MET",
      ["all differential, holdout, and approval criteria passed"],
      differential.differential,
      holdout,
      parsedRequest.humanApprovalEvidenceRef,
    );
  } catch {
    return promotionFailure("INCONCLUSIVE", "MALFORMED_REQUEST", [
      "promotion evaluation failed closed",
    ]);
  }
}

export const evaluatePromotion = evaluateDetectorPromotion;

function isLifecycleState(value: unknown): value is DetectorLifecycleState {
  return (
    typeof value === "string" &&
    DETECTOR_LIFECYCLE_STATES.some((state) => state === value)
  );
}

function isLifecycleEventType(
  value: unknown,
): value is DetectorLifecycleEventType {
  return (
    typeof value === "string" &&
    [
      "RECORD_FINDING",
      "RECORD_DISPOSITION",
      "COMPLETE_ADJUDICATION",
      "COMPLETE_DIFFERENTIAL",
      "COMPLETE_HOLDOUT",
      "RECORD_APPROVAL",
      "PROMOTE",
      "REJECT",
      "INCONCLUSIVE",
      "REMEDIATE",
      "REASSESS",
      "ROLLBACK",
      "DEPRECATE",
      "RETIRE",
    ].some((event) => event === value)
  );
}

function parseLifecycleEvent(value: unknown): DetectorLifecycleEvent | null {
  if (isLifecycleEventType(value)) return { type: value };
  if (!isRecord(value)) return null;
  const type = field(value, "type");
  if (!isLifecycleEventType(type)) return null;
  const humanApprovalVerified = field(value, "humanApprovalVerified");
  const humanApprovalEvidenceRef = field(value, "humanApprovalEvidenceRef");
  return {
    type,
    ...(typeof humanApprovalVerified === "boolean"
      ? { humanApprovalVerified }
      : {}),
    ...(typeof humanApprovalEvidenceRef === "string"
      ? { humanApprovalEvidenceRef }
      : {}),
  };
}

function transitionFailure(
  from: DetectorLifecycleState | null,
  event: DetectorLifecycleEventType | null,
  reason: string,
  outcome: "NO_PROMOTION" | "INCONCLUSIVE",
): DetectorLifecycleTransition {
  return {
    from,
    event,
    to: from ?? "INCONCLUSIVE",
    accepted: false,
    outcome,
    reason,
  };
}

export function transitionDetectorLifecycle(
  state: unknown,
  event: unknown,
): DetectorLifecycleTransition {
  try {
    if (!isLifecycleState(state)) {
      return transitionFailure(
        null,
        null,
        "invalid lifecycle state",
        "INCONCLUSIVE",
      );
    }
    const parsedEvent = parseLifecycleEvent(event);
    if (parsedEvent === null) {
      return transitionFailure(
        state,
        null,
        "invalid lifecycle event",
        "INCONCLUSIVE",
      );
    }
    if (
      state === "RETIRED" ||
      (state === "DEPRECATED" && parsedEvent.type !== "RETIRE") ||
      (state === "PROMOTED" &&
        (parsedEvent.type === "REJECT" || parsedEvent.type === "INCONCLUSIVE"))
    ) {
      return transitionFailure(
        state,
        parsedEvent.type,
        "terminal lifecycle state cannot be reopened",
        "INCONCLUSIVE",
      );
    }
    if (parsedEvent.type === "REJECT") {
      return {
        from: state,
        event: parsedEvent.type,
        to: "NO_PROMOTION",
        accepted: true,
        outcome: "NO_PROMOTION",
        reason: "revision rejected",
      };
    }
    if (parsedEvent.type === "INCONCLUSIVE") {
      return {
        from: state,
        event: parsedEvent.type,
        to: "INCONCLUSIVE",
        accepted: true,
        outcome: "INCONCLUSIVE",
        reason: "evidence is inconclusive",
      };
    }
    if (parsedEvent.type === "PROMOTE") {
      if (
        parsedEvent.humanApprovalVerified !== true ||
        typeof parsedEvent.humanApprovalEvidenceRef !== "string" ||
        !isBoundedString(
          parsedEvent.humanApprovalEvidenceRef,
          M45_DETECTOR_LIMITS.maxTextLength,
        )
      ) {
        return transitionFailure(
          state,
          parsedEvent.type,
          "promotion requires human approval evidence",
          "NO_PROMOTION",
        );
      }
      if (state !== "AWAITING_APPROVAL") {
        return transitionFailure(
          state,
          parsedEvent.type,
          "promotion is not allowed from the current state",
          "NO_PROMOTION",
        );
      }
      return {
        from: state,
        event: parsedEvent.type,
        to: "PROMOTED",
        accepted: true,
        outcome: "ACCEPTED",
        reason: "human approval evidence verified",
      };
    }
    const next: Partial<
      Record<
        DetectorLifecycleState,
        Partial<Record<DetectorLifecycleEventType, DetectorLifecycleState>>
      >
    > = {
      DISCOVERED: { RECORD_FINDING: "DISPOSITIONED" },
      DISPOSITIONED: { RECORD_DISPOSITION: "ADJUDICATED" },
      ADJUDICATED: { COMPLETE_ADJUDICATION: "CANDIDATE" },
      CANDIDATE: { COMPLETE_DIFFERENTIAL: "DIFFERENTIAL_EVALUATED" },
      DIFFERENTIAL_EVALUATED: { COMPLETE_HOLDOUT: "HOLDOUT_EVALUATED" },
      HOLDOUT_EVALUATED: { RECORD_APPROVAL: "AWAITING_APPROVAL" },
      NO_PROMOTION: { REMEDIATE: "CANDIDATE" },
      INCONCLUSIVE: { REASSESS: "ADJUDICATED" },
      PROMOTED: { ROLLBACK: "ROLLED_BACK", DEPRECATE: "DEPRECATED" },
      ROLLED_BACK: { REMEDIATE: "CANDIDATE", DEPRECATE: "DEPRECATED" },
      DEPRECATED: { RETIRE: "RETIRED" },
    };
    const to = next[state]?.[parsedEvent.type];
    if (to === undefined) {
      return transitionFailure(
        state,
        parsedEvent.type,
        "illegal lifecycle transition",
        "INCONCLUSIVE",
      );
    }
    return {
      from: state,
      event: parsedEvent.type,
      to,
      accepted: true,
      outcome: "ACCEPTED",
      reason: "lifecycle event accepted",
    };
  } catch {
    return transitionFailure(
      null,
      null,
      "lifecycle transition failed closed",
      "INCONCLUSIVE",
    );
  }
}

export const advanceDetectorLifecycle = transitionDetectorLifecycle;

function parseRollback(value: unknown): DetectorRollbackInput | null {
  if (!isRecord(value)) return null;
  const state = field(value, "state");
  const activeRevision = parseNonNegativeInteger(
    field(value, "activeRevision"),
  );
  const targetRevision = parseNonNegativeInteger(
    field(value, "targetRevision"),
  );
  const reason = parseString(
    field(value, "reason"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const evidenceId = parseString(
    field(value, "evidenceId"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  if (
    !isLifecycleState(state) ||
    activeRevision === null ||
    targetRevision === null ||
    reason === null ||
    evidenceId === null
  ) {
    return null;
  }
  return {
    state,
    activeRevision,
    targetRevision,
    reason,
    evidenceId,
  };
}

export function planDetectorRollback(value: unknown): DetectorRollbackPlan {
  const parsed = parseRollback(value);
  if (parsed === null) {
    return {
      outcome: "INCONCLUSIVE",
      state: "INCONCLUSIVE",
      activeRevision: 0,
      targetRevision: null,
      reason: "MALFORMED_REQUEST",
      evidenceId: null,
    };
  }
  if (parsed.state !== "PROMOTED" && parsed.state !== "DEPRECATED") {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      activeRevision: parsed.activeRevision,
      targetRevision: null,
      reason: "ROLLBACK_NOT_ALLOWED",
      evidenceId: parsed.evidenceId,
    };
  }
  if (parsed.targetRevision >= parsed.activeRevision) {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      activeRevision: parsed.activeRevision,
      targetRevision: parsed.targetRevision,
      reason: "ROLLBACK_TARGET_INVALID",
      evidenceId: parsed.evidenceId,
    };
  }
  return {
    outcome: "APPLIED",
    state: "ROLLED_BACK",
    activeRevision: parsed.targetRevision,
    targetRevision: parsed.targetRevision,
    reason: "CRITERIA_MET",
    evidenceId: parsed.evidenceId,
  };
}

export const rollbackDetector = planDetectorRollback;

function parseDeprecation(value: unknown): DetectorDeprecationInput | null {
  if (!isRecord(value)) return null;
  const state = field(value, "state");
  const detectorId = parseString(field(value, "detectorId"));
  const detectorRevision = parseNonNegativeInteger(
    field(value, "detectorRevision"),
  );
  const replacementValue = field(value, "replacementDetectorId");
  const replacementDetectorId =
    replacementValue === null ? null : parseString(replacementValue);
  const since = parseString(field(value, "since"), 64);
  const removeAfter = parseString(field(value, "removeAfter"), 64);
  const reason = parseString(
    field(value, "reason"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  const approvalEvidenceRef = parseString(
    field(value, "approvalEvidenceRef"),
    M45_DETECTOR_LIMITS.maxTextLength,
  );
  if (
    !isLifecycleState(state) ||
    detectorId === null ||
    detectorRevision === null ||
    (replacementValue !== null && replacementDetectorId === null) ||
    since === null ||
    removeAfter === null ||
    parseTimestamp(since) === null ||
    parseTimestamp(removeAfter) === null ||
    reason === null ||
    approvalEvidenceRef === null
  ) {
    return null;
  }
  return {
    state,
    detectorId,
    detectorRevision,
    replacementDetectorId,
    since,
    removeAfter,
    reason,
    approvalEvidenceRef,
  };
}

export function planDetectorDeprecation(
  value: unknown,
): DetectorDeprecationPlan {
  const parsed = parseDeprecation(value);
  if (parsed === null) {
    return {
      outcome: "INCONCLUSIVE",
      state: "INCONCLUSIVE",
      detectorId: null,
      detectorRevision: null,
      replacementDetectorId: null,
      removeAfter: null,
      approvalEvidenceRef: null,
      reason: "MALFORMED_REQUEST",
    };
  }
  if (parsed.state !== "PROMOTED" && parsed.state !== "ROLLED_BACK") {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: parsed.approvalEvidenceRef,
      reason: "DEPRECATION_NOT_ALLOWED",
    };
  }
  const removeAfterMs = parseTimestamp(parsed.removeAfter);
  const sinceMs = parseTimestamp(parsed.since);
  if (removeAfterMs === null || sinceMs === null || removeAfterMs <= sinceMs) {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: parsed.approvalEvidenceRef,
      reason: "DEPRECATION_NOT_ALLOWED",
    };
  }
  if (
    !isBoundedString(
      parsed.approvalEvidenceRef,
      M45_DETECTOR_LIMITS.maxTextLength,
    )
  ) {
    return {
      outcome: "INCONCLUSIVE",
      state: "INCONCLUSIVE",
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: null,
      reason: "DEPRECATION_EVIDENCE_MISSING",
    };
  }
  return {
    outcome: "APPLIED",
    state: "DEPRECATED",
    detectorId: parsed.detectorId,
    detectorRevision: parsed.detectorRevision,
    replacementDetectorId: parsed.replacementDetectorId,
    removeAfter: parsed.removeAfter,
    approvalEvidenceRef: parsed.approvalEvidenceRef,
    reason: "CRITERIA_MET",
  };
}

export const deprecateDetector = planDetectorDeprecation;

export function planDetectorRetirement(
  value: unknown,
  now: unknown,
): DetectorDeprecationPlan {
  const parsed = parseDeprecation(value);
  const nowMs = parseTimestamp(now);
  if (parsed === null || nowMs === null) {
    return {
      outcome: "INCONCLUSIVE",
      state: "INCONCLUSIVE",
      detectorId: null,
      detectorRevision: null,
      replacementDetectorId: null,
      removeAfter: null,
      approvalEvidenceRef: null,
      reason: "MALFORMED_REQUEST",
    };
  }
  if (parsed.state !== "DEPRECATED") {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: parsed.approvalEvidenceRef,
      reason: "RETIREMENT_NOT_ALLOWED",
    };
  }
  const removeAfterMs = parseTimestamp(parsed.removeAfter);
  if (removeAfterMs === null) {
    return {
      outcome: "INCONCLUSIVE",
      state: "INCONCLUSIVE",
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: parsed.approvalEvidenceRef,
      reason: "MALFORMED_REQUEST",
    };
  }
  if (nowMs < removeAfterMs) {
    return {
      outcome: "NO_PROMOTION",
      state: parsed.state,
      detectorId: parsed.detectorId,
      detectorRevision: parsed.detectorRevision,
      replacementDetectorId: parsed.replacementDetectorId,
      removeAfter: parsed.removeAfter,
      approvalEvidenceRef: parsed.approvalEvidenceRef,
      reason: "RETIREMENT_NOT_DUE",
    };
  }
  return {
    outcome: "APPLIED",
    state: "RETIRED",
    detectorId: parsed.detectorId,
    detectorRevision: parsed.detectorRevision,
    replacementDetectorId: parsed.replacementDetectorId,
    removeAfter: parsed.removeAfter,
    approvalEvidenceRef: parsed.approvalEvidenceRef,
    reason: "CRITERIA_MET",
  };
}

export const evaluateM45DetectorPromotion = evaluateDetectorPromotion;
export const evaluateM45Promotion = evaluateDetectorPromotion;
export const computeM45DetectorDifferential = computeDetectorDifferential;
export const evaluateM45SealedHoldout = evaluateSealedHoldout;
export const verifyM45SealedHoldout = verifySealedHoldout;
export const transitionM45DetectorLifecycle = transitionDetectorLifecycle;
export const planM45DetectorRollback = planDetectorRollback;
export const planM45DetectorDeprecation = planDetectorDeprecation;
export const planM45DetectorRetirement = planDetectorRetirement;
