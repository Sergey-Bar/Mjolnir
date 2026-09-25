import { createHash } from "node:crypto";

export const M44_HISTORY_SCHEMA_VERSION = 1 as const;

const SCAN_STATES = Object.freeze([
  "STARTED",
  "COMPLETE",
  "PARTIAL",
  "INVALIDATED",
  "CONTRADICTORY",
] as const);
const INCIDENT_STATES = Object.freeze([
  "OPEN",
  "CONTAINED",
  "ESCAPED",
  "RESOLVED",
  "CONTRADICTORY",
] as const);
const DECISION_STATES = Object.freeze([
  "PROPOSED",
  "ACCEPTED",
  "REJECTED",
  "DEFERRED",
  "SUPERSEDED",
  "CONTRADICTORY",
] as const);
const RELEASE_STATES = Object.freeze([
  "PREPARED",
  "PUBLISHED",
  "REVOKED",
  "SUPERSEDED",
  "CONTRADICTORY",
] as const);
const EVIDENCE_STATES = Object.freeze([
  "OBSERVED",
  "STALE",
  "FOREIGN",
  "CONTRADICTORY",
  "DELETED",
] as const);

export const M44_EVENT_KINDS = Object.freeze([
  "scan",
  "incident",
  "decision",
  "release",
  "evidence",
] as const);

export const M44_EVENT_STATES = Object.freeze({
  scan: SCAN_STATES,
  incident: INCIDENT_STATES,
  decision: DECISION_STATES,
  release: RELEASE_STATES,
  evidence: EVIDENCE_STATES,
});

export const M44_TRUST_DEBT_CATEGORIES = Object.freeze([
  "verification",
  "evidence",
  "sensitivity",
  "flakiness",
  "ci-bypass",
  "coverage",
  "incident",
  "release",
  "other",
] as const);

export const M44_HISTORY_LIMITS = Object.freeze({
  maxEvents: 4_096,
  maxObjectFields: 64,
  maxReferences: 32,
  maxIdLength: 128,
  maxTextLength: 1_024,
  maxCounter: 1_000_000,
  maxDebtPoints: 10_000,
  maxAggregateDebt: 1_000_000_000,
  maxEvidenceAgeMs: 31_536_000_000,
  maxDecayHorizonMs: 31_536_000_000,
});

export const M44_AUTHORITY_POLICY = Object.freeze({
  effect: "ADVISORY_ONLY",
  canApproveRelease: false,
  canCertify: false,
  canSetTrust: false,
});

export type M44EventKind = (typeof M44_EVENT_KINDS)[number];
export type M44ScanState = (typeof SCAN_STATES)[number];
export type M44IncidentState = (typeof INCIDENT_STATES)[number];
export type M44DecisionState = (typeof DECISION_STATES)[number];
export type M44ReleaseState = (typeof RELEASE_STATES)[number];
export type M44EvidenceState = (typeof EVIDENCE_STATES)[number];
export type M44EventState =
  | M44ScanState
  | M44IncidentState
  | M44DecisionState
  | M44ReleaseState
  | M44EvidenceState;
export type M44TrustDebtCategory = (typeof M44_TRUST_DEBT_CATEGORIES)[number];
export type M44RetentionLegalBasis = "OPERATIONAL" | "SECURITY" | "LEGAL";
export type M44DeletionState =
  "NOT_REQUESTED" | "REQUESTED" | "BLOCKED" | "REPORTED_COMPLETE";
export type M44ReplayDisposition =
  | "INCLUDED"
  | "STALE"
  | "FOREIGN"
  | "CONTRADICTORY"
  | "RETENTION_EXPIRED"
  | "DELETION_REPORTED";
export type M44ReplayReason =
  | M44ReplayDisposition
  | "FOREIGN_CANDIDATE"
  | "FUTURE_EVENT"
  | "OUTSIDE_HORIZON";

export interface M44TrustDebtAmount {
  readonly category: M44TrustDebtCategory;
  readonly points: number;
}

export interface M44RetentionMetadata {
  readonly policy: string;
  readonly legalBasis: M44RetentionLegalBasis;
  readonly retainUntil: string;
}

export interface M44DeletionMetadata {
  readonly state: M44DeletionState;
  readonly requestedAt: string | null;
  readonly completedAt: string | null;
  readonly reason: string | null;
  readonly evidenceIds: readonly string[];
}

export interface M44ScanData {
  readonly findingCount: number;
  readonly incompleteChecks: number;
  readonly sensitivityEscapes: number;
}

export interface M44IncidentData {
  readonly defectConfirmed: boolean;
  readonly detectedBeforeRelease: boolean;
  readonly escapedToRelease: boolean;
  readonly expectedVerificationId: string;
  readonly missingEvidenceIds: readonly string[];
  readonly regressionFixtureId: string | null;
}

export interface M44DecisionData {
  readonly rationale: string;
  readonly supersedes: string | null;
}

export interface M44ReleaseData {
  readonly releaseId: string;
  readonly incidentIds: readonly string[];
  readonly artifactDigest: string;
}

export interface M44EvidenceData {
  readonly evidenceId: string;
  readonly sourceCandidateId: string;
  readonly digest: string;
}

export type M44EventData =
  | M44ScanData
  | M44IncidentData
  | M44DecisionData
  | M44ReleaseData
  | M44EvidenceData;

interface M44EventInputBase<K extends M44EventKind, S extends M44EventState> {
  readonly kind: K;
  readonly state: S;
  readonly repositoryId: string;
  readonly historyId: string;
  readonly candidateId: string;
  readonly subjectId: string;
  readonly correlationId: string;
  readonly source: string;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly detail: string;
  readonly evidenceIds: readonly string[];
  readonly relatedEventIds: readonly string[];
  readonly debt: M44TrustDebtAmount;
  readonly retention: M44RetentionMetadata;
  readonly deletion: M44DeletionMetadata;
}

export type M44ScanEventInput = M44EventInputBase<"scan", M44ScanState> & {
  readonly data: M44ScanData;
};
export type M44IncidentEventInput = M44EventInputBase<
  "incident",
  M44IncidentState
> & {
  readonly data: M44IncidentData;
};
export type M44DecisionEventInput = M44EventInputBase<
  "decision",
  M44DecisionState
> & {
  readonly data: M44DecisionData;
};
export type M44ReleaseEventInput = M44EventInputBase<
  "release",
  M44ReleaseState
> & {
  readonly data: M44ReleaseData;
};
export type M44EvidenceEventInput = M44EventInputBase<
  "evidence",
  M44EvidenceState
> & {
  readonly data: M44EvidenceData;
};

export type M44EventInput =
  | M44ScanEventInput
  | M44IncidentEventInput
  | M44DecisionEventInput
  | M44ReleaseEventInput
  | M44EvidenceEventInput;

interface M44EventEnvelopeBase<
  K extends M44EventKind,
  S extends M44EventState,
> extends M44EventInputBase<K, S> {
  readonly schemaVersion: typeof M44_HISTORY_SCHEMA_VERSION;
  readonly sequence: number;
  readonly eventId: string;
  readonly previousEventId: string | null;
  readonly authority: "NONE";
}

export type M44ScanEventEnvelope = M44EventEnvelopeBase<
  "scan",
  M44ScanState
> & {
  readonly data: M44ScanData;
};
export type M44IncidentEventEnvelope = M44EventEnvelopeBase<
  "incident",
  M44IncidentState
> & {
  readonly data: M44IncidentData;
};
export type M44DecisionEventEnvelope = M44EventEnvelopeBase<
  "decision",
  M44DecisionState
> & {
  readonly data: M44DecisionData;
};
export type M44ReleaseEventEnvelope = M44EventEnvelopeBase<
  "release",
  M44ReleaseState
> & {
  readonly data: M44ReleaseData;
};
export type M44EvidenceEventEnvelope = M44EventEnvelopeBase<
  "evidence",
  M44EvidenceState
> & {
  readonly data: M44EvidenceData;
};

export type M44EventEnvelope =
  | M44ScanEventEnvelope
  | M44IncidentEventEnvelope
  | M44DecisionEventEnvelope
  | M44ReleaseEventEnvelope
  | M44EvidenceEventEnvelope;

export interface M44Diagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface M44AppendResult {
  readonly accepted: boolean;
  readonly event: M44EventEnvelope | null;
  readonly diagnostics: readonly M44Diagnostic[];
}

export interface M44HistoryValidation {
  readonly valid: boolean;
  readonly events: readonly M44EventEnvelope[];
  readonly repositoryId: string | null;
  readonly historyId: string | null;
  readonly submittedCount: number;
  readonly unprocessedCount: number;
  readonly diagnostics: readonly M44Diagnostic[];
}

export interface M44ReplayContext {
  readonly repositoryId: string;
  readonly historyId: string;
  readonly candidateId: string;
  readonly asOf: string;
  readonly maxEvidenceAgeMs?: number;
}

export interface M44ReplayProjection {
  readonly key: string;
  readonly eventId: string;
  readonly subjectId: string;
  readonly occurredAt: string;
  readonly kind: M44EventKind;
  readonly state: M44EventState;
  readonly disposition: M44ReplayDisposition;
  readonly reasons: readonly M44ReplayReason[];
  readonly debt: M44TrustDebtAmount;
  readonly data: M44EventData | null;
}

export interface M44ReplayIgnored {
  readonly stale: number;
  readonly foreign: number;
  readonly contradictory: number;
  readonly retentionExpired: number;
  readonly deletionReported: number;
}

export interface M44ReplayScope {
  readonly repositoryId: string;
  readonly historyId: string;
  readonly candidateId: string;
}

export interface M44ReplayResult {
  readonly schemaVersion: typeof M44_HISTORY_SCHEMA_VERSION;
  readonly state: "COMPLETE" | "PARTIAL" | "UNKNOWN";
  readonly deterministic: true;
  readonly authority: "NONE";
  readonly scope: M44ReplayScope | null;
  readonly asOf: string | null;
  readonly eventCount: number;
  readonly unprocessedCount: number;
  readonly ignored: M44ReplayIgnored;
  readonly projections: readonly M44ReplayProjection[];
  readonly replayDigest: string;
  readonly diagnostics: readonly M44Diagnostic[];
}

export interface M44ReplayChange {
  readonly key: string;
  readonly before: M44ReplayProjection;
  readonly after: M44ReplayProjection;
}

export interface M44ReplayDiff {
  readonly comparable: boolean;
  readonly equivalent: boolean;
  readonly authority: "NONE";
  readonly added: readonly M44ReplayProjection[];
  readonly removed: readonly M44ReplayProjection[];
  readonly changed: readonly M44ReplayChange[];
  readonly unchangedCount: number;
  readonly diffDigest: string;
}

export interface M44TrustDecayOptions {
  readonly asOf: string;
  readonly halfLifeMs: number;
  readonly horizonMs: number;
}

export interface M44DecayContribution {
  readonly key: string;
  readonly category: M44TrustDebtCategory;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly uncertainty: number;
  readonly reasons: readonly M44ReplayReason[];
}

export interface M44TrustDecayResult {
  readonly state: "BOUNDED" | "UNKNOWN";
  readonly certainty: "EXACT" | "RANGE" | "UNKNOWN";
  readonly authority: "NONE";
  readonly asOf: string | null;
  readonly lowerBound: number;
  readonly upperBound: number;
  readonly uncertainty: number;
  readonly contributions: readonly M44DecayContribution[];
  readonly reasons: readonly M44ReplayReason[];
}

export type M44IncidentClassification =
  | "ESCAPED_DEFECT"
  | "NEAR_MISS"
  | "CONTAINED_DEFECT"
  | "NOT_DEFECT"
  | "INCONCLUSIVE";

export interface M44IncidentLearning {
  readonly classification: M44IncidentClassification;
  readonly nearMiss: boolean;
  readonly authority: "NONE";
  readonly eventId: string | null;
  readonly reasons: readonly string[];
  readonly expectedVerificationId: string | null;
  readonly missingEvidenceIds: readonly string[];
  readonly regressionFixtureId: string | null;
}

type UnknownRecord = Record<string, unknown>;
type MutableDiagnostic = M44Diagnostic;

const ID_PATTERN = /^[\w./:@+-]+$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const AUTHORITY_KEYS = new Set([
  "approval",
  "approve",
  "authority",
  "certify",
  "certification",
  "gate",
  "pass",
  "releaseapproval",
  "severity",
  "trust",
  "trustlevel",
  "verdict",
]);
const UNCERTAINTY_ORDER = Object.freeze([
  "FOREIGN",
  "STALE",
  "CONTRADICTORY",
  "RETENTION_EXPIRED",
  "DELETION_REPORTED",
  "OUTSIDE_HORIZON",
] as const satisfies readonly M44ReplayReason[]);
const EMPTY_IGNORED: M44ReplayIgnored = Object.freeze({
  stale: 0,
  foreign: 0,
  contradictory: 0,
  retentionExpired: 0,
  deletionReported: 0,
});

function isRecord(value: unknown): value is UnknownRecord {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function addDiagnostic(
  diagnostics: MutableDiagnostic[],
  code: string,
  path: string,
  message: string,
): void {
  diagnostics.push({ code, path, message });
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function checkKeys(
  record: UnknownRecord,
  allowed: readonly string[],
  path: string,
  diagnostics: MutableDiagnostic[],
): boolean {
  let keys: readonly (string | symbol)[];
  try {
    keys = Reflect.ownKeys(record);
  } catch {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "object properties cannot be read",
    );
    return false;
  }
  let valid = true;
  const allowedSet = new Set(allowed);
  if (keys.length > M44_HISTORY_LIMITS.maxObjectFields) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      path,
      `objects exceed ${M44_HISTORY_LIMITS.maxObjectFields} fields`,
    );
    valid = false;
  }
  for (const key of keys.slice(0, M44_HISTORY_LIMITS.maxObjectFields)) {
    if (typeof key === "symbol") {
      addDiagnostic(
        diagnostics,
        "UNKNOWN_FIELD",
        path,
        "symbol fields are forbidden",
      );
      valid = false;
      continue;
    }
    if (allowedSet.has(key)) continue;
    addDiagnostic(
      diagnostics,
      AUTHORITY_KEYS.has(normalizedKey(key))
        ? "FORBIDDEN_AUTHORITY_FIELD"
        : "UNKNOWN_FIELD",
      `${path}.${key}`,
      `${key} is not allowed`,
    );
    valid = false;
  }
  return valid;
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= M44_HISTORY_LIMITS.maxIdLength &&
    ID_PATTERN.test(value)
  );
}

function isSafeText(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > M44_HISTORY_LIMITS.maxTextLength ||
    value.trim() !== value
  ) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) return false;
  }
  return true;
}

function isCounter(value: unknown, limit: number): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= limit
  );
}

function parseTime(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 35) {
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === value ? parsed : null;
}

function isKind(value: unknown): value is M44EventKind {
  return M44_EVENT_KINDS.some((kind) => kind === value);
}

function isDebtCategory(value: unknown): value is M44TrustDebtCategory {
  return M44_TRUST_DEBT_CATEGORIES.some((category) => category === value);
}

function isStateForKind(
  kind: M44EventKind,
  value: unknown,
): value is M44EventState {
  return M44_EVENT_STATES[kind].some((state) => state === value);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as UnknownRecord)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function freezeDiagnostics(
  diagnostics: readonly M44Diagnostic[],
): readonly M44Diagnostic[] {
  return Object.freeze(
    diagnostics.map((diagnostic) => Object.freeze(diagnostic)),
  );
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined)
      throw new TypeError("value is not canonicalizable");
    return encoded;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as UnknownRecord;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function digestValue(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

function normalizeReferences(
  value: unknown,
  path: string,
  diagnostics: MutableDiagnostic[],
): readonly string[] | null {
  if (!Array.isArray(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "references must be an array",
    );
    return null;
  }
  if (value.length > M44_HISTORY_LIMITS.maxReferences) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      path,
      `references exceed ${M44_HISTORY_LIMITS.maxReferences}`,
    );
    return null;
  }
  const references: string[] = [];
  const seen = new Set<string>();
  let valid = true;
  try {
    for (let index = 0; index < value.length; index += 1) {
      const reference = value[index] as unknown;
      if (!isSafeId(reference) || seen.has(reference)) {
        addDiagnostic(
          diagnostics,
          "MALFORMED_INPUT",
          `${path}[${index}]`,
          "references must be unique safe identifiers",
        );
        valid = false;
        continue;
      }
      seen.add(reference);
      references.push(reference);
    }
  } catch {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "references cannot be read",
    );
    return null;
  }
  return valid ? references.sort() : null;
}

function cloneRetention(
  value: unknown,
  recordedAtMs: number,
  path: string,
  diagnostics: MutableDiagnostic[],
): M44RetentionMetadata | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "retention metadata must be an object",
    );
    return null;
  }
  const before = diagnostics.length;
  checkKeys(value, ["policy", "legalBasis", "retainUntil"], path, diagnostics);
  const policy = value["policy"];
  const legalBasis = value["legalBasis"];
  const retainUntil = value["retainUntil"];
  if (!isSafeId(policy)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.policy`,
      "retention policy must be a safe identifier",
    );
  }
  if (
    legalBasis !== "OPERATIONAL" &&
    legalBasis !== "SECURITY" &&
    legalBasis !== "LEGAL"
  ) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.legalBasis`,
      "retention legal basis is invalid",
    );
  }
  const retainUntilMs = parseTime(retainUntil);
  if (retainUntilMs === null || retainUntilMs < recordedAtMs) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.retainUntil`,
      "retainUntil must be canonical and no earlier than recordedAt",
    );
  }
  if (
    diagnostics.length !== before ||
    !isSafeId(policy) ||
    retainUntilMs === null
  ) {
    return null;
  }
  return {
    policy,
    legalBasis: legalBasis as M44RetentionLegalBasis,
    retainUntil: retainUntil as string,
  };
}

function cloneDeletion(
  value: unknown,
  recordedAtMs: number,
  path: string,
  diagnostics: MutableDiagnostic[],
): M44DeletionMetadata | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "deletion metadata must be an object",
    );
    return null;
  }
  const before = diagnostics.length;
  checkKeys(
    value,
    ["state", "requestedAt", "completedAt", "reason", "evidenceIds"],
    path,
    diagnostics,
  );
  const state = value["state"];
  if (
    state !== "NOT_REQUESTED" &&
    state !== "REQUESTED" &&
    state !== "BLOCKED" &&
    state !== "REPORTED_COMPLETE"
  ) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.state`,
      "deletion state is invalid",
    );
  }
  const requestedAt = value["requestedAt"];
  const completedAt = value["completedAt"];
  const reason = value["reason"];
  const requestedAtMs = requestedAt === null ? null : parseTime(requestedAt);
  const completedAtMs = completedAt === null ? null : parseTime(completedAt);
  if (requestedAt !== null && requestedAtMs === null) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.requestedAt`,
      "requestedAt must be null or canonical",
    );
  }
  if (completedAt !== null && completedAtMs === null) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.completedAt`,
      "completedAt must be null or canonical",
    );
  }
  if (reason !== null && !isSafeText(reason)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.reason`,
      "deletion reason must be null or bounded text",
    );
  }
  const evidenceIds = normalizeReferences(
    value["evidenceIds"],
    `${path}.evidenceIds`,
    diagnostics,
  );
  if (evidenceIds === null) return null;
  if (state === "NOT_REQUESTED") {
    if (
      requestedAt !== null ||
      completedAt !== null ||
      reason !== null ||
      evidenceIds.length > 0
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "NOT_REQUESTED deletion metadata must be empty",
      );
    }
  } else {
    if (
      requestedAtMs === null ||
      requestedAtMs < recordedAtMs ||
      reason === null
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "requested deletion metadata requires a timestamp and reason",
      );
    }
    if (completedAt !== null && state !== "REPORTED_COMPLETE") {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "only reported completion may include completedAt",
      );
    }
    if (
      state === "REPORTED_COMPLETE" &&
      (completedAtMs === null ||
        requestedAtMs === null ||
        completedAtMs < requestedAtMs ||
        evidenceIds.length === 0)
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "reported deletion completion requires ordered evidence",
      );
    }
  }
  if (diagnostics.length !== before) return null;
  return {
    state: state as M44DeletionState,
    requestedAt: requestedAt as string | null,
    completedAt: completedAt as string | null,
    reason: reason as string | null,
    evidenceIds,
  };
}

function cloneDebt(
  value: unknown,
  path: string,
  diagnostics: MutableDiagnostic[],
): M44TrustDebtAmount | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "debt metadata must be an object",
    );
    return null;
  }
  const before = diagnostics.length;
  checkKeys(value, ["category", "points"], path, diagnostics);
  const category = value["category"];
  const points = value["points"];
  if (!isDebtCategory(category)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.category`,
      "debt category is invalid",
    );
  }
  if (!isCounter(points, M44_HISTORY_LIMITS.maxDebtPoints)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.points`,
      `debt points must be from 0 to ${M44_HISTORY_LIMITS.maxDebtPoints}`,
    );
  }
  if (diagnostics.length !== before || !isDebtCategory(category)) return null;
  return { category, points: points as number };
}

function cloneCommon(
  record: UnknownRecord,
  path: string,
  diagnostics: MutableDiagnostic[],
): Omit<
  M44EventInputBase<M44EventKind, M44EventState>,
  "kind" | "state" | "data"
> | null {
  const before = diagnostics.length;
  const repositoryId = record["repositoryId"];
  const historyId = record["historyId"];
  const candidateId = record["candidateId"];
  const subjectId = record["subjectId"];
  const correlationId = record["correlationId"];
  const source = record["source"];
  const occurredAt = record["occurredAt"];
  const recordedAt = record["recordedAt"];
  const detail = record["detail"];
  for (const [key, value] of [
    ["repositoryId", repositoryId],
    ["historyId", historyId],
    ["candidateId", candidateId],
    ["subjectId", subjectId],
    ["correlationId", correlationId],
    ["source", source],
  ] as const) {
    if (!isSafeId(value)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.${key}`,
        `${key} must be a safe identifier`,
      );
    }
  }
  if (!isSafeText(detail)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.detail`,
      "detail must be bounded text",
    );
  }
  const occurredAtMs = parseTime(occurredAt);
  const recordedAtMs = parseTime(recordedAt);
  if (occurredAtMs === null || recordedAtMs === null) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "occurredAt and recordedAt must be canonical timestamps",
    );
  } else if (recordedAtMs < occurredAtMs) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "recordedAt cannot precede occurredAt",
    );
  }
  const evidenceIds = normalizeReferences(
    record["evidenceIds"],
    `${path}.evidenceIds`,
    diagnostics,
  );
  const relatedEventIds = normalizeReferences(
    record["relatedEventIds"],
    `${path}.relatedEventIds`,
    diagnostics,
  );
  const debt = cloneDebt(record["debt"], `${path}.debt`, diagnostics);
  const retention =
    recordedAtMs === null
      ? null
      : cloneRetention(
          record["retention"],
          recordedAtMs,
          `${path}.retention`,
          diagnostics,
        );
  const deletion =
    recordedAtMs === null
      ? null
      : cloneDeletion(
          record["deletion"],
          recordedAtMs,
          `${path}.deletion`,
          diagnostics,
        );
  if (
    diagnostics.length !== before ||
    !isSafeId(repositoryId) ||
    !isSafeId(historyId) ||
    !isSafeId(candidateId) ||
    !isSafeId(subjectId) ||
    !isSafeId(correlationId) ||
    !isSafeId(source) ||
    occurredAtMs === null ||
    recordedAtMs === null ||
    evidenceIds === null ||
    relatedEventIds === null ||
    debt === null ||
    retention === null ||
    deletion === null
  ) {
    return null;
  }
  return {
    repositoryId,
    historyId,
    candidateId,
    subjectId,
    correlationId,
    source,
    occurredAt: occurredAt as string,
    recordedAt: recordedAt as string,
    detail: detail as string,
    evidenceIds,
    relatedEventIds,
    debt,
    retention,
    deletion,
  };
}

function cloneData(
  kind: M44EventKind,
  state: M44EventState,
  value: unknown,
  candidateId: string,
  path: string,
  diagnostics: MutableDiagnostic[],
): M44EventData | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "event data must be an object",
    );
    return null;
  }
  const before = diagnostics.length;
  if (kind === "scan") {
    checkKeys(
      value,
      ["findingCount", "incompleteChecks", "sensitivityEscapes"],
      path,
      diagnostics,
    );
    const findingCount = value["findingCount"];
    const incompleteChecks = value["incompleteChecks"];
    const sensitivityEscapes = value["sensitivityEscapes"];
    if (
      !isCounter(findingCount, M44_HISTORY_LIMITS.maxCounter) ||
      !isCounter(incompleteChecks, M44_HISTORY_LIMITS.maxCounter) ||
      !isCounter(sensitivityEscapes, M44_HISTORY_LIMITS.maxCounter)
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "scan counters must be bounded non-negative integers",
      );
    }
    if (state === "COMPLETE" && incompleteChecks !== 0) {
      addDiagnostic(
        diagnostics,
        "CONTRADICTORY_STATE",
        path,
        "a complete scan cannot retain incomplete checks",
      );
    }
    if (diagnostics.length !== before) return null;
    return {
      findingCount: findingCount as number,
      incompleteChecks: incompleteChecks as number,
      sensitivityEscapes: sensitivityEscapes as number,
    };
  }
  if (kind === "incident") {
    checkKeys(
      value,
      [
        "defectConfirmed",
        "detectedBeforeRelease",
        "escapedToRelease",
        "expectedVerificationId",
        "missingEvidenceIds",
        "regressionFixtureId",
      ],
      path,
      diagnostics,
    );
    const defectConfirmed = value["defectConfirmed"];
    const detectedBeforeRelease = value["detectedBeforeRelease"];
    const escapedToRelease = value["escapedToRelease"];
    const expectedVerificationId = value["expectedVerificationId"];
    const regressionFixtureId = value["regressionFixtureId"];
    if (
      typeof defectConfirmed !== "boolean" ||
      typeof detectedBeforeRelease !== "boolean" ||
      typeof escapedToRelease !== "boolean"
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        path,
        "incident observations must be booleans",
      );
    }
    if (!isSafeId(expectedVerificationId)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.expectedVerificationId`,
        "expectedVerificationId must be a safe identifier",
      );
    }
    if (regressionFixtureId !== null && !isSafeId(regressionFixtureId)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.regressionFixtureId`,
        "regressionFixtureId must be null or a safe identifier",
      );
    }
    const missingEvidenceIds = normalizeReferences(
      value["missingEvidenceIds"],
      `${path}.missingEvidenceIds`,
      diagnostics,
    );
    if (missingEvidenceIds === null) return null;
    if (state === "ESCAPED" && escapedToRelease !== true) {
      addDiagnostic(
        diagnostics,
        "CONTRADICTORY_STATE",
        path,
        "escaped incident state requires an escaped release",
      );
    }
    if (
      (state === "CONTAINED" || state === "RESOLVED") &&
      escapedToRelease !== false
    ) {
      addDiagnostic(
        diagnostics,
        "CONTRADICTORY_STATE",
        path,
        "contained or resolved incident state cannot report an escape",
      );
    }
    if (diagnostics.length !== before) return null;
    return {
      defectConfirmed: defectConfirmed as boolean,
      detectedBeforeRelease: detectedBeforeRelease as boolean,
      escapedToRelease: escapedToRelease as boolean,
      expectedVerificationId: expectedVerificationId as string,
      missingEvidenceIds,
      regressionFixtureId: regressionFixtureId as string | null,
    };
  }
  if (kind === "decision") {
    checkKeys(value, ["rationale", "supersedes"], path, diagnostics);
    const rationale = value["rationale"];
    const supersedes = value["supersedes"];
    if (!isSafeText(rationale)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.rationale`,
        "decision rationale must be bounded text",
      );
    }
    if (supersedes !== null && !isSafeId(supersedes)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.supersedes`,
        "supersedes must be null or a safe identifier",
      );
    }
    if (diagnostics.length !== before) return null;
    return {
      rationale: rationale as string,
      supersedes: supersedes as string | null,
    };
  }
  if (kind === "release") {
    checkKeys(
      value,
      ["releaseId", "incidentIds", "artifactDigest"],
      path,
      diagnostics,
    );
    const releaseId = value["releaseId"];
    const artifactDigest = value["artifactDigest"];
    if (!isSafeId(releaseId)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.releaseId`,
        "releaseId must be a safe identifier",
      );
    }
    if (
      typeof artifactDigest !== "string" ||
      !SHA256_PATTERN.test(artifactDigest)
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `${path}.artifactDigest`,
        "artifactDigest must be a lowercase SHA-256 digest",
      );
    }
    const incidentIds = normalizeReferences(
      value["incidentIds"],
      `${path}.incidentIds`,
      diagnostics,
    );
    if (incidentIds === null) return null;
    if (diagnostics.length !== before) return null;
    return {
      releaseId: releaseId as string,
      incidentIds,
      artifactDigest: artifactDigest as string,
    };
  }
  checkKeys(
    value,
    ["evidenceId", "sourceCandidateId", "digest"],
    path,
    diagnostics,
  );
  const evidenceId = value["evidenceId"];
  const sourceCandidateId = value["sourceCandidateId"];
  const evidenceDigest = value["digest"];
  if (!isSafeId(evidenceId) || !isSafeId(sourceCandidateId)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "evidence identity fields must be safe identifiers",
    );
  }
  if (
    typeof evidenceDigest !== "string" ||
    !SHA256_PATTERN.test(evidenceDigest)
  ) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.digest`,
      "evidence digest must be a lowercase SHA-256 digest",
    );
  }
  const isForeign = sourceCandidateId !== candidateId;
  if ((state === "FOREIGN") !== isForeign) {
    addDiagnostic(
      diagnostics,
      "CONTRADICTORY_STATE",
      path,
      "evidence foreign state must match its source candidate",
    );
  }
  if (diagnostics.length !== before) return null;
  return {
    evidenceId: evidenceId as string,
    sourceCandidateId: sourceCandidateId as string,
    digest: evidenceDigest as string,
  };
}

function validateStateSemantics(
  kind: M44EventKind,
  state: M44EventState,
  data: M44EventData,
  deletion: M44DeletionMetadata,
  path: string,
  diagnostics: MutableDiagnostic[],
): void {
  if (
    kind === "evidence" &&
    state === "DELETED" &&
    deletion.state !== "REPORTED_COMPLETE"
  ) {
    addDiagnostic(
      diagnostics,
      "CONTRADICTORY_STATE",
      path,
      "deleted evidence requires reported deletion metadata",
    );
  }
}

function cloneInput(
  value: unknown,
  path = "event",
  diagnostics: MutableDiagnostic[] = [],
): M44EventInput | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "event input must be an object",
    );
    return null;
  }
  checkKeys(
    value,
    [
      "kind",
      "state",
      "repositoryId",
      "historyId",
      "candidateId",
      "subjectId",
      "correlationId",
      "source",
      "occurredAt",
      "recordedAt",
      "detail",
      "evidenceIds",
      "relatedEventIds",
      "debt",
      "retention",
      "deletion",
      "data",
    ],
    path,
    diagnostics,
  );
  const kind = value["kind"];
  if (!isKind(kind)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.kind`,
      "event kind is invalid",
    );
    return null;
  }
  const state = value["state"];
  if (!isStateForKind(kind, state)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.state`,
      "event state is invalid for its kind",
    );
    return null;
  }
  const common = cloneCommon(value, path, diagnostics);
  const data = cloneData(
    kind,
    state,
    value["data"],
    typeof value["candidateId"] === "string" ? value["candidateId"] : "",
    `${path}.data`,
    diagnostics,
  );
  if (common === null || data === null) return null;
  validateStateSemantics(kind, state, data, common.deletion, path, diagnostics);
  if (diagnostics.length > 0) return null;
  return {
    kind,
    state,
    ...common,
    data,
  } as M44EventInput;
}

function unsignedEnvelope(event: M44EventEnvelope): UnknownRecord {
  const { eventId: _eventId, ...unsigned } = event;
  return unsigned;
}

function cloneEnvelope(
  value: unknown,
  path: string,
  diagnostics: MutableDiagnostic[] = [],
): M44EventEnvelope | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      path,
      "event envelope must be an object",
    );
    return null;
  }
  checkKeys(
    value,
    [
      "schemaVersion",
      "sequence",
      "eventId",
      "previousEventId",
      "authority",
      "kind",
      "state",
      "repositoryId",
      "historyId",
      "candidateId",
      "subjectId",
      "correlationId",
      "source",
      "occurredAt",
      "recordedAt",
      "detail",
      "evidenceIds",
      "relatedEventIds",
      "debt",
      "retention",
      "deletion",
      "data",
    ],
    path,
    diagnostics,
  );
  if (value["schemaVersion"] !== M44_HISTORY_SCHEMA_VERSION) {
    addDiagnostic(
      diagnostics,
      "UNSUPPORTED_SCHEMA_VERSION",
      `${path}.schemaVersion`,
      `schemaVersion must be ${M44_HISTORY_SCHEMA_VERSION}`,
    );
  }
  if (value["authority"] !== "NONE") {
    addDiagnostic(
      diagnostics,
      "FORBIDDEN_AUTHORITY_FIELD",
      `${path}.authority`,
      "authority must be NONE",
    );
  }
  const sequence = value["sequence"];
  if (!isCounter(sequence, M44_HISTORY_LIMITS.maxEvents) || sequence < 1) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.sequence`,
      "sequence must be a positive bounded integer",
    );
  }
  const eventId = value["eventId"];
  if (typeof eventId !== "string" || !SHA256_PATTERN.test(eventId)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.eventId`,
      "eventId must be a lowercase SHA-256 digest",
    );
  }
  const previousEventId = value["previousEventId"];
  if (
    previousEventId !== null &&
    (typeof previousEventId !== "string" ||
      !SHA256_PATTERN.test(previousEventId))
  ) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.previousEventId`,
      "previousEventId must be null or a lowercase SHA-256 digest",
    );
  }
  const kind = value["kind"];
  if (!isKind(kind)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.kind`,
      "event kind is invalid",
    );
    return null;
  }
  const state = value["state"];
  if (!isStateForKind(kind, state)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      `${path}.state`,
      "event state is invalid for its kind",
    );
    return null;
  }
  const common = cloneCommon(value, path, diagnostics);
  const data = cloneData(
    kind,
    state,
    value["data"],
    typeof value["candidateId"] === "string" ? value["candidateId"] : "",
    `${path}.data`,
    diagnostics,
  );
  if (common === null || data === null) return null;
  validateStateSemantics(kind, state, data, common.deletion, path, diagnostics);
  if (diagnostics.length > 0) return null;
  const envelope = {
    schemaVersion: M44_HISTORY_SCHEMA_VERSION,
    sequence,
    eventId,
    previousEventId,
    authority: "NONE",
    kind,
    state,
    ...common,
    data,
  } as unknown as M44EventEnvelope;
  if (eventId !== digestValue(unsignedEnvelope(envelope))) {
    addDiagnostic(
      diagnostics,
      "EVENT_DIGEST_MISMATCH",
      `${path}.eventId`,
      "eventId does not match canonical event content",
    );
    return null;
  }
  return deepFreeze(envelope);
}

function failedAppend(diagnostics: readonly M44Diagnostic[]): M44AppendResult {
  return deepFreeze({
    accepted: false,
    event: null,
    diagnostics: freezeDiagnostics(diagnostics),
  });
}

function historyFailure(
  submittedCount: number,
  unprocessedCount: number,
  diagnostics: readonly M44Diagnostic[],
  repositoryId: string | null = null,
  historyId: string | null = null,
): M44HistoryValidation {
  return deepFreeze({
    valid: false,
    events: Object.freeze([]),
    repositoryId,
    historyId,
    submittedCount,
    unprocessedCount,
    diagnostics: freezeDiagnostics(diagnostics),
  });
}

export function validateM44History(value: unknown): M44HistoryValidation {
  const diagnostics: MutableDiagnostic[] = [];
  if (!Array.isArray(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_INPUT",
      "history",
      "history must be an array",
    );
    return historyFailure(0, 0, diagnostics);
  }
  let submittedCount: number;
  try {
    submittedCount = value.length;
  } catch {
    return historyFailure(0, 0, diagnostics);
  }
  const processCount = Math.min(submittedCount, M44_HISTORY_LIMITS.maxEvents);
  const unprocessedCount = submittedCount - processCount;
  if (unprocessedCount > 0) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      "history",
      `history exceeds ${M44_HISTORY_LIMITS.maxEvents} events`,
    );
  }
  const events: M44EventEnvelope[] = [];
  for (let index = 0; index < processCount; index += 1) {
    try {
      const event = cloneEnvelope(
        value[index],
        `history[${index}]`,
        diagnostics,
      );
      if (event !== null) events.push(event);
    } catch {
      addDiagnostic(
        diagnostics,
        "MALFORMED_INPUT",
        `history[${index}]`,
        "event envelope cannot be canonicalized",
      );
    }
  }
  events.sort((left, right) => left.sequence - right.sequence);
  const seenSequences = new Set<number>();
  let previous: M44EventEnvelope | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (event === undefined) continue;
    if (seenSequences.has(event.sequence)) {
      addDiagnostic(
        diagnostics,
        "DUPLICATE_SEQUENCE",
        `history.sequence.${event.sequence}`,
        "event sequences must be unique",
      );
    }
    seenSequences.add(event.sequence);
    if (event.sequence !== index + 1) {
      addDiagnostic(
        diagnostics,
        "SEQUENCE_GAP",
        `history[${index}].sequence`,
        "event sequences must be contiguous from one",
      );
    }
    if (event.previousEventId !== (previous?.eventId ?? null)) {
      addDiagnostic(
        diagnostics,
        "CHAIN_BROKEN",
        `history[${index}].previousEventId`,
        "event chain does not match the preceding event",
      );
    }
    previous = event;
  }
  const first = events[0];
  if (
    first !== undefined &&
    events.some(
      (event) =>
        event.repositoryId !== first.repositoryId ||
        event.historyId !== first.historyId,
    )
  ) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_HISTORY",
      "history",
      "all events must bind one repository and history",
    );
  }
  return deepFreeze({
    valid: diagnostics.length === 0,
    events: Object.freeze(events),
    repositoryId: first?.repositoryId ?? null,
    historyId: first?.historyId ?? null,
    submittedCount,
    unprocessedCount,
    diagnostics: freezeDiagnostics(diagnostics),
  });
}

export function appendM44Event(
  historyValue: unknown,
  inputValue: unknown,
): M44AppendResult {
  const validation = validateM44History(historyValue);
  if (!validation.valid) {
    return failedAppend(validation.diagnostics);
  }
  if (validation.events.length >= M44_HISTORY_LIMITS.maxEvents) {
    return failedAppend([
      {
        code: "RESOURCE_LIMIT",
        path: "history",
        message: `history cannot exceed ${M44_HISTORY_LIMITS.maxEvents} events`,
      },
    ]);
  }
  const inputDiagnostics: MutableDiagnostic[] = [];
  const input = cloneInput(inputValue, "event", inputDiagnostics);
  if (input === null) {
    return failedAppend(inputDiagnostics);
  }
  const previous = validation.events[validation.events.length - 1];
  if (
    previous !== undefined &&
    (previous.repositoryId !== input.repositoryId ||
      previous.historyId !== input.historyId)
  ) {
    return failedAppend([
      {
        code: "FOREIGN_HISTORY",
        path: "event",
        message: "event must append to the existing repository history",
      },
    ]);
  }
  const unsigned = {
    schemaVersion: M44_HISTORY_SCHEMA_VERSION,
    sequence: (previous?.sequence ?? 0) + 1,
    previousEventId: previous?.eventId ?? null,
    authority: "NONE" as const,
    ...input,
  };
  const eventId = digestValue(unsigned);
  const event = deepFreeze({
    ...unsigned,
    eventId,
  });
  return deepFreeze({
    accepted: true,
    event,
    diagnostics: Object.freeze([]),
  });
}

function parseContext(
  value: unknown,
): (M44ReplayContext & { maxEvidenceAgeMs: number }) | null {
  const diagnostics: MutableDiagnostic[] = [];
  if (!isRecord(value)) {
    return null;
  }
  checkKeys(
    value,
    ["repositoryId", "historyId", "candidateId", "asOf", "maxEvidenceAgeMs"],
    "context",
    diagnostics,
  );
  const repositoryId = value["repositoryId"];
  const historyId = value["historyId"];
  const candidateId = value["candidateId"];
  const asOf = value["asOf"];
  const suppliedMaxEvidenceAgeMs = value["maxEvidenceAgeMs"];
  const maxEvidenceAgeMs =
    suppliedMaxEvidenceAgeMs === undefined
      ? M44_HISTORY_LIMITS.maxEvidenceAgeMs
      : suppliedMaxEvidenceAgeMs;
  if (
    diagnostics.length > 0 ||
    !isSafeId(repositoryId) ||
    !isSafeId(historyId) ||
    !isSafeId(candidateId) ||
    parseTime(asOf) === null ||
    !isCounter(maxEvidenceAgeMs, M44_HISTORY_LIMITS.maxEvidenceAgeMs) ||
    maxEvidenceAgeMs < 1
  ) {
    return null;
  }
  return {
    repositoryId,
    historyId,
    candidateId,
    asOf: asOf as string,
    maxEvidenceAgeMs,
  };
}

function invalidReplay(
  diagnostics: readonly M44Diagnostic[],
  scope: M44ReplayScope | null = null,
  asOf: string | null = null,
  unprocessedCount = 0,
): M44ReplayResult {
  const frozenDiagnostics = freezeDiagnostics(diagnostics);
  return deepFreeze({
    schemaVersion: M44_HISTORY_SCHEMA_VERSION,
    state: "UNKNOWN",
    deterministic: true,
    authority: "NONE",
    scope,
    asOf,
    eventCount: 0,
    unprocessedCount,
    ignored: EMPTY_IGNORED,
    projections: Object.freeze([]),
    replayDigest: digestValue({
      state: "UNKNOWN",
      unprocessedCount,
      diagnostics: frozenDiagnostics,
    }),
    diagnostics: frozenDiagnostics,
  });
}

function ignoredCountKey(
  disposition: M44ReplayDisposition,
): keyof M44ReplayIgnored | null {
  if (disposition === "STALE") return "stale";
  if (disposition === "FOREIGN") return "foreign";
  if (disposition === "CONTRADICTORY") return "contradictory";
  if (disposition === "RETENTION_EXPIRED") return "retentionExpired";
  if (disposition === "DELETION_REPORTED") return "deletionReported";
  return null;
}

function classifyProjection(
  event: M44EventEnvelope,
  contextValue: M44ReplayContext & { maxEvidenceAgeMs: number },
  asOfMs: number,
): M44ReplayProjection {
  const reasons: M44ReplayReason[] = [];
  const foreignScope =
    event.repositoryId !== contextValue.repositoryId ||
    event.historyId !== contextValue.historyId;
  const eventCandidateForeign = event.candidateId !== contextValue.candidateId;
  const evidenceCandidateForeign =
    event.kind === "evidence" &&
    event.data.sourceCandidateId !== event.candidateId;
  const stateForeign = event.kind === "evidence" && event.state === "FOREIGN";
  const contradictory = event.state === "CONTRADICTORY";
  const recordedAtMs = Date.parse(event.recordedAt);
  const future = recordedAtMs > asOfMs;
  const retentionExpired = asOfMs > Date.parse(event.retention.retainUntil);
  const deletionReported = event.deletion.state === "REPORTED_COMPLETE";
  const stale =
    event.kind === "evidence" && event.state === "STALE"
      ? true
      : asOfMs - recordedAtMs > contextValue.maxEvidenceAgeMs;
  let disposition: M44ReplayDisposition = "INCLUDED";
  if (
    foreignScope ||
    eventCandidateForeign ||
    evidenceCandidateForeign ||
    stateForeign
  ) {
    disposition = "FOREIGN";
    reasons.push("FOREIGN", "FOREIGN_CANDIDATE");
  } else if (contradictory || future) {
    disposition = "CONTRADICTORY";
    reasons.push("CONTRADICTORY");
    if (future) reasons.push("FUTURE_EVENT");
  } else if (retentionExpired) {
    disposition = "RETENTION_EXPIRED";
    reasons.push("RETENTION_EXPIRED");
  } else if (deletionReported) {
    disposition = "DELETION_REPORTED";
    reasons.push("DELETION_REPORTED");
  } else if (stale) {
    disposition = "STALE";
    reasons.push("STALE");
  }
  return {
    key: `${event.kind}:${event.subjectId}`,
    eventId: event.eventId,
    subjectId: event.subjectId,
    occurredAt: event.occurredAt,
    kind: event.kind,
    state: event.state,
    disposition,
    reasons,
    debt: { ...event.debt },
    data: disposition === "INCLUDED" ? event.data : null,
  };
}

export function replayM44History(
  historyValue: unknown,
  contextValue: unknown,
): M44ReplayResult {
  const context = parseContext(contextValue);
  if (context === null) {
    return invalidReplay([
      {
        code: "MALFORMED_CONTEXT",
        path: "context",
        message: "replay context is invalid",
      },
    ]);
  }
  const scope: M44ReplayScope = {
    repositoryId: context.repositoryId,
    historyId: context.historyId,
    candidateId: context.candidateId,
  };
  const validation = validateM44History(historyValue);
  if (!validation.valid) {
    return invalidReplay(
      validation.diagnostics,
      scope,
      context.asOf,
      validation.unprocessedCount,
    );
  }
  const projections = new Map<string, M44ReplayProjection>();
  const ignored = { ...EMPTY_IGNORED };
  const asOfMs = Date.parse(context.asOf);
  for (const event of validation.events) {
    const projection = classifyProjection(event, context, asOfMs);
    projections.set(projection.key, projection);
    const countKey = ignoredCountKey(projection.disposition);
    if (countKey !== null) ignored[countKey] += 1;
  }
  const projectionList = [...projections.values()];
  const ignoredTotal = Object.values(ignored).reduce(
    (total, count) => total + count,
    0,
  );
  const state =
    validation.unprocessedCount === 0 && ignoredTotal === 0
      ? "COMPLETE"
      : "PARTIAL";
  const replayDigest = digestValue({
    scope,
    asOf: context.asOf,
    projections: projectionList,
    ignored,
    unprocessedCount: validation.unprocessedCount,
  });
  return deepFreeze({
    schemaVersion: M44_HISTORY_SCHEMA_VERSION,
    state,
    deterministic: true,
    authority: "NONE",
    scope,
    asOf: context.asOf,
    eventCount: validation.events.length,
    unprocessedCount: validation.unprocessedCount,
    ignored: Object.freeze(ignored),
    projections: Object.freeze(projectionList),
    replayDigest,
    diagnostics: Object.freeze([]),
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function diffM44Replays(
  expectedValue: M44ReplayResult,
  actualValue: M44ReplayResult,
): M44ReplayDiff {
  const expected = new Map(
    expectedValue.projections.map((projection) => [projection.key, projection]),
  );
  const actual = new Map(
    actualValue.projections.map((projection) => [projection.key, projection]),
  );
  const added: M44ReplayProjection[] = [];
  const removed: M44ReplayProjection[] = [];
  const changed: M44ReplayChange[] = [];
  let unchangedCount = 0;
  for (const [key, actualProjection] of actual) {
    const expectedProjection = expected.get(key);
    if (expectedProjection === undefined) {
      added.push(actualProjection);
    } else if (
      canonicalJson(expectedProjection) !== canonicalJson(actualProjection)
    ) {
      changed.push({
        key,
        before: expectedProjection,
        after: actualProjection,
      });
    } else {
      unchangedCount += 1;
    }
  }
  for (const [key, expectedProjection] of expected) {
    if (!actual.has(key)) removed.push(expectedProjection);
  }
  added.sort((left, right) => compareText(left.key, right.key));
  removed.sort((left, right) => compareText(left.key, right.key));
  changed.sort((left, right) => compareText(left.key, right.key));
  const sameScope =
    expectedValue.scope === null ||
    actualValue.scope === null ||
    canonicalJson(expectedValue.scope) === canonicalJson(actualValue.scope);
  const comparable =
    expectedValue.state !== "UNKNOWN" &&
    actualValue.state !== "UNKNOWN" &&
    expectedValue.deterministic &&
    actualValue.deterministic &&
    expectedValue.authority === "NONE" &&
    actualValue.authority === "NONE" &&
    sameScope;
  const diffDigest = digestValue({ added, removed, changed, unchangedCount });
  return deepFreeze({
    comparable,
    equivalent:
      comparable &&
      added.length === 0 &&
      removed.length === 0 &&
      changed.length === 0,
    authority: "NONE",
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    changed: Object.freeze(changed),
    unchangedCount,
    diffDigest,
  });
}

function debtIsActive(projection: M44ReplayProjection): boolean {
  if (projection.debt.points === 0) return false;
  if (projection.disposition !== "INCLUDED") return true;
  if (projection.kind === "scan") {
    return (
      projection.state === "PARTIAL" ||
      projection.state === "INVALIDATED" ||
      projection.state === "CONTRADICTORY"
    );
  }
  if (projection.kind === "incident") {
    return (
      projection.state === "OPEN" ||
      projection.state === "ESCAPED" ||
      projection.state === "CONTRADICTORY"
    );
  }
  if (projection.kind === "decision") {
    return (
      projection.state === "PROPOSED" ||
      projection.state === "DEFERRED" ||
      projection.state === "SUPERSEDED" ||
      projection.state === "CONTRADICTORY"
    );
  }
  if (projection.kind === "release") {
    return (
      projection.state === "PREPARED" ||
      projection.state === "REVOKED" ||
      projection.state === "CONTRADICTORY"
    );
  }
  return (
    projection.state === "STALE" ||
    projection.state === "FOREIGN" ||
    projection.state === "CONTRADICTORY"
  );
}

function decayedPoints(
  points: number,
  ageMs: number,
  halfLifeMs: number,
): number {
  return Math.max(0, Math.round(points * 2 ** (-ageMs / halfLifeMs)));
}

function boundedAdd(left: number, right: number): number {
  return Math.min(
    M44_HISTORY_LIMITS.maxAggregateDebt,
    left + Math.min(right, M44_HISTORY_LIMITS.maxAggregateDebt),
  );
}

function orderedReasons(
  reasons: ReadonlySet<M44ReplayReason>,
): readonly M44ReplayReason[] {
  return UNCERTAINTY_ORDER.filter((reason) => reasons.has(reason));
}

function unknownDecay(asOf: string | null = null): M44TrustDecayResult {
  return deepFreeze({
    state: "UNKNOWN",
    certainty: "UNKNOWN",
    authority: "NONE",
    asOf,
    lowerBound: 0,
    upperBound: 0,
    uncertainty: 0,
    contributions: Object.freeze([]),
    reasons: Object.freeze([]),
  });
}

export function evaluateM44TrustDecay(
  replay: M44ReplayResult,
  options: M44TrustDecayOptions,
): M44TrustDecayResult {
  if (replay.state === "UNKNOWN" || replay.authority !== "NONE") {
    return unknownDecay();
  }
  const asOfMs = parseTime(options.asOf);
  if (
    asOfMs === null ||
    !isCounter(options.halfLifeMs, M44_HISTORY_LIMITS.maxDecayHorizonMs) ||
    options.halfLifeMs < 1 ||
    !isCounter(options.horizonMs, M44_HISTORY_LIMITS.maxDecayHorizonMs) ||
    options.horizonMs < options.halfLifeMs
  ) {
    return unknownDecay();
  }
  const contributions: M44DecayContribution[] = [];
  const reasons = new Set<M44ReplayReason>();
  let lowerBound = 0;
  let upperBound = 0;
  for (const projection of replay.projections) {
    if (!debtIsActive(projection)) continue;
    const ageMs = Math.max(0, asOfMs - Date.parse(projection.occurredAt));
    const exact = decayedPoints(
      projection.debt.points,
      ageMs,
      options.halfLifeMs,
    );
    const contributionReasons = new Set<M44ReplayReason>();
    let contributionLower = exact;
    let contributionUpper = exact;
    if (projection.disposition !== "INCLUDED") {
      contributionReasons.add(projection.disposition);
      contributionLower = 0;
      contributionUpper =
        ageMs > options.horizonMs ? projection.debt.points : exact;
    } else if (ageMs > options.horizonMs) {
      contributionReasons.add("OUTSIDE_HORIZON");
      contributionLower = 0;
      contributionUpper = projection.debt.points;
    }
    for (const reason of contributionReasons) reasons.add(reason);
    contributions.push({
      key: projection.key,
      category: projection.debt.category,
      lowerBound: contributionLower,
      upperBound: contributionUpper,
      uncertainty: contributionUpper - contributionLower,
      reasons: orderedReasons(contributionReasons),
    });
    lowerBound = boundedAdd(lowerBound, contributionLower);
    upperBound = boundedAdd(upperBound, contributionUpper);
  }
  contributions.sort((left, right) => compareText(left.key, right.key));
  return deepFreeze({
    state: "BOUNDED",
    certainty: lowerBound === upperBound ? "EXACT" : "RANGE",
    authority: "NONE",
    asOf: options.asOf,
    lowerBound,
    upperBound,
    uncertainty: upperBound - lowerBound,
    contributions: Object.freeze(contributions),
    reasons: orderedReasons(reasons),
  });
}

function incidentLearning(
  classification: M44IncidentClassification,
  nearMiss: boolean,
  eventId: string | null,
  reasons: readonly string[],
  expectedVerificationId: string | null = null,
  missingEvidenceIds: readonly string[] = [],
  regressionFixtureId: string | null = null,
): M44IncidentLearning {
  return deepFreeze({
    classification,
    nearMiss,
    authority: "NONE",
    eventId,
    reasons: Object.freeze([...reasons]),
    expectedVerificationId,
    missingEvidenceIds: Object.freeze([...missingEvidenceIds]),
    regressionFixtureId,
  });
}

function isIncidentData(data: M44EventData | null): data is M44IncidentData {
  return (
    data !== null &&
    "defectConfirmed" in data &&
    "detectedBeforeRelease" in data &&
    "escapedToRelease" in data
  );
}

export function classifyM44Incident(
  replay: M44ReplayResult,
  incidentId: string,
): M44IncidentLearning {
  if (replay.state === "UNKNOWN" || !isSafeId(incidentId)) {
    return incidentLearning("INCONCLUSIVE", false, null, [
      "HISTORY_UNAVAILABLE",
    ]);
  }
  const projection = replay.projections.find(
    (item) =>
      item.kind === "incident" &&
      (item.subjectId === incidentId || item.eventId === incidentId),
  );
  if (projection === undefined) {
    return incidentLearning("INCONCLUSIVE", false, null, ["INCIDENT_MISSING"]);
  }
  if (projection.disposition !== "INCLUDED") {
    return incidentLearning("INCONCLUSIVE", false, projection.eventId, [
      projection.disposition,
    ]);
  }
  if (!isIncidentData(projection.data)) {
    return incidentLearning("INCONCLUSIVE", false, projection.eventId, [
      "INCIDENT_DATA_MISSING",
    ]);
  }
  const data = projection.data;
  if (!data.defectConfirmed) {
    return incidentLearning(
      "NOT_DEFECT",
      false,
      projection.eventId,
      ["DEFECT_NOT_CONFIRMED"],
      data.expectedVerificationId,
      data.missingEvidenceIds,
      data.regressionFixtureId,
    );
  }
  if (data.missingEvidenceIds.length > 0) {
    return incidentLearning(
      "INCONCLUSIVE",
      false,
      projection.eventId,
      ["MISSING_EVIDENCE"],
      data.expectedVerificationId,
      data.missingEvidenceIds,
      data.regressionFixtureId,
    );
  }
  if (data.escapedToRelease) {
    return incidentLearning(
      "ESCAPED_DEFECT",
      false,
      projection.eventId,
      [
        data.detectedBeforeRelease
          ? "DETECTED_BUT_DID_NOT_PREVENT_ESCAPE"
          : "UNDETECTED_ESCAPE",
      ],
      data.expectedVerificationId,
      [],
      data.regressionFixtureId,
    );
  }
  if (data.detectedBeforeRelease) {
    return incidentLearning(
      "NEAR_MISS",
      true,
      projection.eventId,
      ["DETECTED_BEFORE_ESCAPE"],
      data.expectedVerificationId,
      [],
      data.regressionFixtureId,
    );
  }
  return incidentLearning(
    "CONTAINED_DEFECT",
    false,
    projection.eventId,
    ["CONTAINED_WITHOUT_OBSERVED_ESCAPE"],
    data.expectedVerificationId,
    [],
    data.regressionFixtureId,
  );
}
