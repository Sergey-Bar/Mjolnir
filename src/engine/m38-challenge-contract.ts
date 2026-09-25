export const M38_CHALLENGE_DIMENSIONS = Object.freeze([
  "semantic",
  "runtime",
  "ci",
  "artifact",
  "environment",
  "mocks",
  "release-proof",
] as const);

export type M38ChallengeDimension = (typeof M38_CHALLENGE_DIMENSIONS)[number];

export const M38_CHALLENGE_LIMITS = Object.freeze({
  maxChallenges: 128,
  maxChallengeDurationMs: 5_000,
  maxTotalDurationMs: 30_000,
  maxOutputBytes: 262_144,
  maxEvidenceItems: 64,
  maxEvidenceAgeMs: 86_400_000,
  maxIdLength: 128,
  maxTextLength: 1_024,
} as const);

export const M38_CHALLENGE_TRUST_POLICY = Object.freeze({
  effect: "PRESERVE_OR_DOWNGRADE",
  canIncreaseTrust: false,
} as const);

const PROBE_FIELDS = {
  semantic: ["requirementId", "mutation"],
  runtime: ["executionId", "eventType"],
  ci: ["provider", "workflowPath", "jobId"],
  artifact: ["digest", "mediaType"],
  environment: ["fingerprint", "platform"],
  mocks: ["boundary", "dependency"],
  "release-proof": ["candidateId", "proofId"],
} as const satisfies Record<M38ChallengeDimension, readonly string[]>;

export type M38ChallengeOutcome =
  "CONTRADICTED" | "NOT_CONTRADICTED" | "PARTIAL" | "UNKNOWN";

export type M38TrustState = "PASS" | "PARTIAL" | "UNKNOWN";

export type M38ChallengeReason =
  | "CONTRADICTION"
  | "NO_CONTRADICTION"
  | "EVIDENCE_ABSENT"
  | "EVIDENCE_PARTIAL"
  | "EXECUTION_TIMEOUT"
  | "EVIDENCE_STALE"
  | "EVIDENCE_FOREIGN"
  | "EVIDENCE_FUTURE"
  | "EVIDENCE_MALFORMED"
  | "RECORD_MALFORMED"
  | "RESOURCE_LIMIT"
  | "DUPLICATE_ID";

export interface M38SemanticProbe {
  readonly kind: "semantic";
  readonly requirementId: string;
  readonly mutation: string;
}

export interface M38RuntimeProbe {
  readonly kind: "runtime";
  readonly executionId: string;
  readonly eventType: string;
}

export interface M38CiProbe {
  readonly kind: "ci";
  readonly provider: string;
  readonly workflowPath: string;
  readonly jobId: string;
}

export interface M38ArtifactProbe {
  readonly kind: "artifact";
  readonly digest: string;
  readonly mediaType: string;
}

export interface M38EnvironmentProbe {
  readonly kind: "environment";
  readonly fingerprint: string;
  readonly platform: string;
}

export interface M38MocksProbe {
  readonly kind: "mocks";
  readonly boundary: string;
  readonly dependency: string;
}

export interface M38ReleaseProofProbe {
  readonly kind: "release-proof";
  readonly candidateId: string;
  readonly proofId: string;
}

export interface M38ChallengeEvidence {
  readonly completeness: "COMPLETE" | "PARTIAL";
  readonly execution: "COMPLETE" | "TIMED_OUT";
  readonly candidateId: string;
  readonly capturedAt: string;
  readonly observation?: "CONTRADICTS" | "NOT_CONTRADICTED";
  readonly detail: string;
  readonly durationMs: number;
  readonly outputBytes: number;
  readonly itemCount: number;
}

interface M38ChallengeRecordBase<
  D extends M38ChallengeDimension,
  P extends { readonly kind: D },
> {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly dimension: D;
  readonly claim: string;
  readonly probe: P;
  readonly evidence?: M38ChallengeEvidence;
}

export type M38SemanticChallengeRecord = M38ChallengeRecordBase<
  "semantic",
  M38SemanticProbe
>;
export type M38RuntimeChallengeRecord = M38ChallengeRecordBase<
  "runtime",
  M38RuntimeProbe
>;
export type M38CiChallengeRecord = M38ChallengeRecordBase<"ci", M38CiProbe>;
export type M38ArtifactChallengeRecord = M38ChallengeRecordBase<
  "artifact",
  M38ArtifactProbe
>;
export type M38EnvironmentChallengeRecord = M38ChallengeRecordBase<
  "environment",
  M38EnvironmentProbe
>;
export type M38MocksChallengeRecord = M38ChallengeRecordBase<
  "mocks",
  M38MocksProbe
>;
export type M38ReleaseProofChallengeRecord = M38ChallengeRecordBase<
  "release-proof",
  M38ReleaseProofProbe
>;

export type M38ChallengeRecord =
  | M38SemanticChallengeRecord
  | M38RuntimeChallengeRecord
  | M38CiChallengeRecord
  | M38ArtifactChallengeRecord
  | M38EnvironmentChallengeRecord
  | M38MocksChallengeRecord
  | M38ReleaseProofChallengeRecord;

export interface M38EvaluationContext {
  readonly candidateId: string;
  readonly evaluatedAt: string;
}

export interface M38ObservedResources {
  readonly durationMs: number;
  readonly outputBytes: number;
  readonly itemCount: number;
}

export interface M38ChallengeResult {
  readonly challengeId: string | null;
  readonly dimension: M38ChallengeDimension | null;
  readonly outcome: M38ChallengeOutcome;
  readonly reason: M38ChallengeReason;
  readonly resources: M38ObservedResources;
  readonly withinResourceBudget: boolean;
  readonly trustEffect: typeof M38_CHALLENGE_TRUST_POLICY.effect;
}

export interface M38DimensionResult {
  readonly dimension: M38ChallengeDimension;
  readonly state: M38ChallengeOutcome;
  readonly challengeCount: number;
}

export interface M38ChallengeReport {
  readonly schemaVersion: 1;
  readonly inputState: "VALID" | "MALFORMED";
  readonly state: M38ChallengeOutcome;
  readonly submittedCount: number;
  readonly evaluatedCount: number;
  readonly unprocessedCount: number;
  readonly duplicateIdCount: number;
  readonly totalResources: M38ObservedResources;
  readonly resourceState: "WITHIN_BOUNDS" | "EXCEEDED" | "UNDETERMINED";
  readonly trustEffect: typeof M38_CHALLENGE_TRUST_POLICY.effect;
  readonly results: readonly M38ChallengeResult[];
  readonly dimensions: readonly M38DimensionResult[];
}

type UnknownRecord = Record<string, unknown>;
type ShapeState = "VALID" | "MALFORMED" | "RESOURCE_LIMIT";

interface ParsedContext {
  readonly valid: boolean;
  readonly candidateId: string | null;
  readonly evaluatedAtMs: number | null;
}

type EvidenceEvaluation = Pick<
  M38ChallengeResult,
  "outcome" | "reason" | "resources" | "withinResourceBudget"
>;

const ZERO_RESOURCES: M38ObservedResources = Object.freeze({
  durationMs: 0,
  outputBytes: 0,
  itemCount: 0,
});

function isRecord(value: unknown): value is UnknownRecord {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function classifyText(value: unknown, maxLength: number): ShapeState {
  if (typeof value !== "string" || value.length === 0) return "MALFORMED";
  return value.length > maxLength ? "RESOURCE_LIMIT" : "VALID";
}

function classifyShape(left: ShapeState, right: ShapeState): ShapeState {
  if (left === "RESOURCE_LIMIT" || right === "RESOURCE_LIMIT") {
    return "RESOURCE_LIMIT";
  }
  return left === "VALID" && right === "VALID" ? "VALID" : "MALFORMED";
}

function isDimension(value: unknown): value is M38ChallengeDimension {
  return M38_CHALLENGE_DIMENSIONS.some((dimension) => dimension === value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseTime(value: unknown, maxLength = 64): number | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > maxLength
  ) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseContext(value: unknown): ParsedContext {
  if (!isRecord(value)) {
    return { valid: false, candidateId: null, evaluatedAtMs: null };
  }
  try {
    const candidateShape = classifyText(
      value["candidateId"],
      M38_CHALLENGE_LIMITS.maxIdLength,
    );
    const evaluatedAtMs = parseTime(value["evaluatedAt"]);
    if (candidateShape !== "VALID" || evaluatedAtMs === null) {
      return { valid: false, candidateId: null, evaluatedAtMs: null };
    }
    return {
      valid: true,
      candidateId: value["candidateId"] as string,
      evaluatedAtMs,
    };
  } catch {
    return { valid: false, candidateId: null, evaluatedAtMs: null };
  }
}

function classifyProbeFields(
  probe: UnknownRecord,
  fields: readonly string[],
): ShapeState {
  let state: ShapeState = "VALID";
  for (const field of fields) {
    state = classifyShape(
      state,
      classifyText(probe[field], M38_CHALLENGE_LIMITS.maxTextLength),
    );
  }
  return state;
}

function classifyRecord(value: unknown): {
  readonly state: ShapeState;
  readonly id: string | null;
  readonly dimension: M38ChallengeDimension | null;
} {
  if (!isRecord(value))
    return { state: "MALFORMED", id: null, dimension: null };
  try {
    const dimensionValue = value["dimension"];
    const dimension = isDimension(dimensionValue) ? dimensionValue : null;
    const idValue = value["id"];
    const id =
      typeof idValue === "string" &&
      idValue.length > 0 &&
      idValue.length <= M38_CHALLENGE_LIMITS.maxIdLength
        ? idValue
        : null;
    let state = classifyShape(
      classifyText(idValue, M38_CHALLENGE_LIMITS.maxIdLength),
      classifyText(value["claim"], M38_CHALLENGE_LIMITS.maxTextLength),
    );
    if (value["schemaVersion"] !== 1) {
      state = classifyShape(state, "MALFORMED");
    }
    if (dimension === null) return { state, id, dimension };
    const probeValue = value["probe"];
    if (!isRecord(probeValue) || probeValue["kind"] !== dimension) {
      state = classifyShape(state, "MALFORMED");
      return { state, id, dimension };
    }
    const fields = PROBE_FIELDS[dimension];
    state = classifyShape(state, classifyProbeFields(probeValue, fields));
    return { state, id, dimension };
  } catch {
    return { state: "MALFORMED", id: null, dimension: null };
  }
}

function result(
  id: string | null,
  dimension: M38ChallengeDimension | null,
  outcome: M38ChallengeOutcome,
  reason: M38ChallengeReason,
  resources: M38ObservedResources = ZERO_RESOURCES,
  withinResourceBudget = true,
): M38ChallengeResult {
  return {
    challengeId: id,
    dimension,
    ...evidenceEvaluation(outcome, reason, resources, withinResourceBudget),
    trustEffect: M38_CHALLENGE_TRUST_POLICY.effect,
  };
}

function evidenceEvaluation(
  outcome: M38ChallengeOutcome,
  reason: M38ChallengeReason,
  resources: M38ObservedResources = ZERO_RESOURCES,
  withinResourceBudget = true,
): EvidenceEvaluation {
  return { outcome, reason, resources, withinResourceBudget };
}

function evaluateEvidence(
  evidenceValue: unknown,
  context: ParsedContext,
): EvidenceEvaluation {
  if (evidenceValue === undefined) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_ABSENT");
  }
  if (!isRecord(evidenceValue)) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_MALFORMED");
  }
  let shape = classifyShape(
    classifyText(
      evidenceValue["candidateId"],
      M38_CHALLENGE_LIMITS.maxIdLength,
    ),
    classifyText(evidenceValue["detail"], M38_CHALLENGE_LIMITS.maxTextLength),
  );
  const durationMs = evidenceValue["durationMs"];
  const outputBytes = evidenceValue["outputBytes"];
  const itemCount = evidenceValue["itemCount"];
  if (
    !isNonNegativeInteger(durationMs) ||
    !isNonNegativeInteger(outputBytes) ||
    !isNonNegativeInteger(itemCount)
  ) {
    shape = "MALFORMED";
  }
  const capturedAtMs = parseTime(evidenceValue["capturedAt"]);
  if (capturedAtMs === null) shape = "MALFORMED";
  const completeness = evidenceValue["completeness"];
  const execution = evidenceValue["execution"];
  const observation = evidenceValue["observation"];
  if (
    (completeness !== "COMPLETE" && completeness !== "PARTIAL") ||
    (execution !== "COMPLETE" && execution !== "TIMED_OUT") ||
    (observation !== undefined &&
      observation !== "CONTRADICTS" &&
      observation !== "NOT_CONTRADICTED") ||
    (completeness === "COMPLETE" && observation === undefined)
  ) {
    shape = "MALFORMED";
  }
  if (shape === "MALFORMED") {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_MALFORMED");
  }
  const observedDurationMs = durationMs as number;
  const observedOutputBytes = outputBytes as number;
  const observedItemCount = itemCount as number;
  const observed: M38ObservedResources = {
    durationMs: observedDurationMs,
    outputBytes: observedOutputBytes,
    itemCount: observedItemCount,
  };
  const withinResourceBudget =
    observedDurationMs <= M38_CHALLENGE_LIMITS.maxChallengeDurationMs &&
    observedOutputBytes <= M38_CHALLENGE_LIMITS.maxOutputBytes &&
    observedItemCount <= M38_CHALLENGE_LIMITS.maxEvidenceItems;
  if (shape === "RESOURCE_LIMIT" || !withinResourceBudget) {
    return evidenceEvaluation("PARTIAL", "RESOURCE_LIMIT", observed, false);
  }
  if (evidenceValue["candidateId"] !== context.candidateId) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_FOREIGN", observed);
  }
  if (capturedAtMs === null || context.evaluatedAtMs === null) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_MALFORMED", observed);
  }
  if (capturedAtMs > context.evaluatedAtMs) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_FUTURE", observed);
  }
  if (
    context.evaluatedAtMs - capturedAtMs >
    M38_CHALLENGE_LIMITS.maxEvidenceAgeMs
  ) {
    return evidenceEvaluation("UNKNOWN", "EVIDENCE_STALE", observed);
  }
  if (execution === "TIMED_OUT") {
    return evidenceEvaluation("PARTIAL", "EXECUTION_TIMEOUT", observed);
  }
  if (completeness === "PARTIAL") {
    return evidenceEvaluation("PARTIAL", "EVIDENCE_PARTIAL", observed);
  }
  if (observation === "CONTRADICTS") {
    return evidenceEvaluation("CONTRADICTED", "CONTRADICTION", observed);
  }
  return evidenceEvaluation("NOT_CONTRADICTED", "NO_CONTRADICTION", observed);
}

function evaluateCandidate(
  value: unknown,
  context: ParsedContext,
  duplicate: boolean,
): M38ChallengeResult {
  try {
    const record = classifyRecord(value);
    if (record.state === "MALFORMED") {
      return result(record.id, record.dimension, "UNKNOWN", "RECORD_MALFORMED");
    }
    if (record.state === "RESOURCE_LIMIT") {
      return result(
        record.id,
        record.dimension,
        "PARTIAL",
        "RESOURCE_LIMIT",
        ZERO_RESOURCES,
        false,
      );
    }
    if (duplicate) {
      return result(record.id, record.dimension, "UNKNOWN", "DUPLICATE_ID");
    }
    if (record.dimension === "release-proof") {
      const probeValue = isRecord(value) ? value["probe"] : null;
      if (
        !isRecord(probeValue) ||
        probeValue["candidateId"] !== context.candidateId
      ) {
        return result(
          record.id,
          record.dimension,
          "UNKNOWN",
          "EVIDENCE_FOREIGN",
        );
      }
    }
    const evidenceValue = isRecord(value) ? value["evidence"] : undefined;
    const evaluated = evaluateEvidence(evidenceValue, context);
    return result(
      record.id,
      record.dimension,
      evaluated.outcome,
      evaluated.reason,
      evaluated.resources,
      evaluated.withinResourceBudget,
    );
  } catch {
    return result(null, null, "UNKNOWN", "RECORD_MALFORMED");
  }
}

function mergeOutcomes(
  outcomes: readonly M38ChallengeOutcome[],
): M38ChallengeOutcome {
  if (outcomes.includes("CONTRADICTED")) return "CONTRADICTED";
  if (outcomes.includes("PARTIAL")) return "PARTIAL";
  if (outcomes.includes("UNKNOWN")) return "UNKNOWN";
  return "NOT_CONTRADICTED";
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortResults(
  results: M38ChallengeResult[],
): readonly M38ChallengeResult[] {
  return results.sort((left, right) => {
    const byId = compareText(left.challengeId ?? "", right.challengeId ?? "");
    if (byId !== 0) return byId;
    const byDimension = compareText(
      left.dimension ?? "",
      right.dimension ?? "",
    );
    if (byDimension !== 0) return byDimension;
    return compareText(left.reason, right.reason);
  });
}

function buildDimensions(
  results: readonly M38ChallengeResult[],
): readonly M38DimensionResult[] {
  return M38_CHALLENGE_DIMENSIONS.map((dimension) => {
    const matching = results.filter((item) => item.dimension === dimension);
    return {
      dimension,
      state:
        matching.length === 0
          ? "UNKNOWN"
          : mergeOutcomes(matching.map((item) => item.outcome)),
      challengeCount: matching.length,
    };
  });
}

function addBoundedTotal(total: number, value: number, limit: number): number {
  if (value > limit || total > limit || value > limit - total) return limit + 1;
  return total + value;
}

function buildReport(
  inputState: "VALID" | "MALFORMED",
  submittedCount: number,
  unprocessedCount: number,
  duplicateIdCount: number,
  results: M38ChallengeResult[],
  resourceState: M38ChallengeReport["resourceState"],
): M38ChallengeReport {
  const sortedResults = sortResults(results);
  const dimensions = buildDimensions(sortedResults);
  const outcome = mergeOutcomes(dimensions.map((dimension) => dimension.state));
  const state =
    resourceState === "UNDETERMINED"
      ? "UNKNOWN"
      : unprocessedCount > 0 || resourceState === "EXCEEDED"
        ? outcome === "CONTRADICTED"
          ? "CONTRADICTED"
          : "PARTIAL"
        : outcome;
  const totalResources = sortedResults.reduce<M38ObservedResources>(
    (total, item) => ({
      durationMs: addBoundedTotal(
        total.durationMs,
        item.resources.durationMs,
        M38_CHALLENGE_LIMITS.maxTotalDurationMs,
      ),
      outputBytes: addBoundedTotal(
        total.outputBytes,
        item.resources.outputBytes,
        M38_CHALLENGE_LIMITS.maxOutputBytes,
      ),
      itemCount: addBoundedTotal(
        total.itemCount,
        item.resources.itemCount,
        M38_CHALLENGE_LIMITS.maxEvidenceItems,
      ),
    }),
    ZERO_RESOURCES,
  );
  return {
    schemaVersion: 1,
    inputState,
    state,
    submittedCount,
    evaluatedCount: sortedResults.length,
    unprocessedCount,
    duplicateIdCount,
    totalResources,
    resourceState,
    trustEffect: M38_CHALLENGE_TRUST_POLICY.effect,
    results: sortedResults,
    dimensions,
  };
}

export function evaluateM38Challenges(
  input: unknown,
  contextValue: unknown,
): M38ChallengeReport {
  const context = parseContext(contextValue);
  let inputArray: unknown[] | null = null;
  let submittedCount = 0;
  try {
    if (Array.isArray(input)) {
      inputArray = input;
      submittedCount = input.length;
    }
  } catch {
    return buildReport("MALFORMED", 0, 0, 0, [], "UNDETERMINED");
  }
  const inputIsArray = inputArray !== null;
  const inputState = inputIsArray ? "VALID" : "MALFORMED";
  const resourceState: M38ChallengeReport["resourceState"] =
    inputIsArray && context.valid ? "WITHIN_BOUNDS" : "UNDETERMINED";
  if (inputArray === null || !context.valid) {
    return buildReport(
      inputState,
      submittedCount,
      inputIsArray ? submittedCount : 0,
      0,
      [],
      resourceState,
    );
  }
  const candidateLimit = Math.min(
    submittedCount,
    M38_CHALLENGE_LIMITS.maxChallenges,
  );
  const candidates: unknown[] = [];
  for (let index = 0; index < candidateLimit; index += 1) {
    try {
      candidates.push(inputArray[index]);
    } catch {
      return buildReport(
        "MALFORMED",
        submittedCount,
        submittedCount,
        0,
        [],
        "UNDETERMINED",
      );
    }
  }
  const idCounts = new Map<string, number>();
  for (const candidate of candidates) {
    const id = classifyRecord(candidate).id;
    if (id !== null) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }
  let duplicateIdCount = 0;
  for (const count of idCounts.values()) {
    if (count > 1) duplicateIdCount += 1;
  }
  const results = candidates.map((candidate) => {
    const id = classifyRecord(candidate).id;
    return evaluateCandidate(
      candidate,
      context,
      id !== null && (idCounts.get(id) ?? 0) > 1,
    );
  });
  const totalDurationMs = results.reduce(
    (total, item) =>
      addBoundedTotal(
        total,
        item.resources.durationMs,
        M38_CHALLENGE_LIMITS.maxTotalDurationMs,
      ),
    0,
  );
  const totalOutputBytes = results.reduce(
    (total, item) =>
      addBoundedTotal(
        total,
        item.resources.outputBytes,
        M38_CHALLENGE_LIMITS.maxOutputBytes,
      ),
    0,
  );
  const totalEvidenceItems = results.reduce(
    (total, item) =>
      addBoundedTotal(
        total,
        item.resources.itemCount,
        M38_CHALLENGE_LIMITS.maxEvidenceItems,
      ),
    0,
  );
  const finalResourceState =
    results.some((item) => !item.withinResourceBudget) ||
    totalDurationMs > M38_CHALLENGE_LIMITS.maxTotalDurationMs ||
    totalOutputBytes > M38_CHALLENGE_LIMITS.maxOutputBytes ||
    totalEvidenceItems > M38_CHALLENGE_LIMITS.maxEvidenceItems
      ? "EXCEEDED"
      : "WITHIN_BOUNDS";
  return buildReport(
    inputState,
    submittedCount,
    submittedCount - results.length,
    duplicateIdCount,
    results,
    finalResourceState,
  );
}

export function applyM38ChallengeReport(
  previousValue: unknown,
  reportValue: unknown,
): M38TrustState {
  const previous: M38TrustState =
    previousValue === "PASS" ||
    previousValue === "PARTIAL" ||
    previousValue === "UNKNOWN"
      ? previousValue
      : "UNKNOWN";
  try {
    const reportState = isRecord(reportValue)
      ? reportValue["state"]
      : undefined;
    if (
      reportState !== "CONTRADICTED" &&
      reportState !== "NOT_CONTRADICTED" &&
      reportState !== "PARTIAL" &&
      reportState !== "UNKNOWN"
    ) {
      return "UNKNOWN";
    }
    if (reportState === "UNKNOWN") return "UNKNOWN";
    if (
      (reportState === "CONTRADICTED" || reportState === "PARTIAL") &&
      previous === "PASS"
    ) {
      return "PARTIAL";
    }
    return previous;
  } catch {
    return "UNKNOWN";
  }
}
