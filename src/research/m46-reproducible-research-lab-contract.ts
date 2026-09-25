import { createHash } from "node:crypto";

export const M46_RESEARCH_LAB_SCHEMA =
  "m46.reproducible-research-lab@1" as const;

export const M46_RESEARCH_LAB_LIMITS = Object.freeze({
  maxIdLength: 128,
  maxTextLength: 2_048,
  maxProtocolFields: 32,
  maxProtocolMetrics: 8,
  maxCohortRecords: 256,
  maxFeatures: 32,
  maxSplitRecords: 256,
  maxLimitations: 16,
  maxRetentionDays: 30,
  maxCanonicalDepth: 32,
  maxCanonicalNodes: 16_384,
});

export const M46_RESEARCH_LAB_POLICY = Object.freeze({
  dataSource: "SYNTHETIC_ONLY",
  externalDataIngestion: "DENY",
  networkAccess: "DENY",
  storage: "LOCAL_ONLY",
  releaseScope: "LOCAL_DERIVED_ONLY",
  authorityClaim: "NONE",
});

export const M46_RESEARCH_RECORD_KINDS = Object.freeze([
  "protocol",
  "preregistration",
  "consent",
  "syntheticCohort",
  "contamination",
  "retention",
  "deletion",
  "publication",
] as const);

export type M46ResearchRecordKind = (typeof M46_RESEARCH_RECORD_KINDS)[number];
export type M46Sha256Digest = `sha256:${string}`;
export type M46ConsentStatus = "GRANTED" | "WITHDRAWN";
export type M46ContaminationStatus = "CLEAR" | "DETECTED";
export type M46DeletionStatus = "SCHEDULED" | "COMPLETED";
export type M46DeletionTrigger = "RETENTION_EXPIRY" | "CONSENT_WITHDRAWAL";
export type M46PublicationStatus = "LOCAL_READY" | "WITHHELD";

export interface M46ProtocolRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly objective: string;
  readonly hypothesis: string;
  readonly analysisPlan: {
    readonly metrics: readonly string[];
    readonly fields: readonly string[];
    readonly missingData: "REJECT";
  };
  readonly dataSource: "SYNTHETIC_ONLY";
  readonly externalDataIngestion: "DENY";
  readonly networkAccess: "DENY";
  readonly authorityClaim: "NONE";
}

export interface M46PreregistrationRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly protocolId: string;
  readonly protocolDigest: M46Sha256Digest;
  readonly registeredAt: string;
  readonly status: "FROZEN";
  readonly registry: "LOCAL_ONLY";
  readonly externalSubmission: "DENY";
  readonly authorityClaim: "NONE";
}

export interface M46ConsentRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly protocolId: string;
  readonly subjectId: string;
  readonly scope: "LOCAL_SYNTHETIC_ONLY";
  readonly status: M46ConsentStatus;
  readonly grantedAt: string;
  readonly withdrawnAt: string | null;
  readonly withdrawalReason: string | null;
  readonly authorityClaim: "NONE";
}

export interface M46SyntheticObservation {
  readonly id: string;
  readonly features: readonly number[];
  readonly outcome: number;
}

export interface M46SyntheticCohortRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly preregistrationId: string;
  readonly generator: {
    readonly name: string;
    readonly version: string;
    readonly seed: number;
  };
  readonly source: "SYNTHETIC_ONLY";
  readonly externalDataIngestion: "DENY";
  readonly entries: readonly M46SyntheticObservation[];
  readonly authorityClaim: "NONE";
}

export interface M46ContaminationRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly cohortId: string;
  readonly cohortDigest: M46Sha256Digest;
  readonly trainingIds: readonly string[];
  readonly evaluationIds: readonly string[];
  readonly status: M46ContaminationStatus;
  readonly boundary: "SYNTHETIC_ONLY";
  readonly externalDataIngestion: "DENY";
  readonly authorityClaim: "NONE";
}

export interface M46RetentionRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly cohortId: string;
  readonly cohortDigest: M46Sha256Digest;
  readonly retentionDays: number;
  readonly deleteAfter: string;
  readonly disposition: "DELETE";
  readonly storage: "LOCAL_ONLY";
  readonly authorityClaim: "NONE";
}

export interface M46DeletionRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly retentionId: string;
  readonly cohortId: string;
  readonly cohortDigest: M46Sha256Digest;
  readonly trigger: M46DeletionTrigger;
  readonly status: M46DeletionStatus;
  readonly recordIds: readonly string[];
  readonly receiptDigest: M46Sha256Digest | null;
  readonly storage: "LOCAL_ONLY";
  readonly authorityClaim: "NONE";
}

export interface M46PublicationRecord {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly protocolId: string;
  readonly preregistrationId: string;
  readonly cohortId: string;
  readonly cohortDigest: M46Sha256Digest;
  readonly consentId: string;
  readonly status: M46PublicationStatus;
  readonly artifactKind: "AGGREGATE_ONLY";
  readonly artifactDigest: M46Sha256Digest | null;
  readonly includedRecordIds: readonly string[];
  readonly limitations: readonly string[];
  readonly releaseScope: "LOCAL_DERIVED_ONLY";
  readonly externalDistribution: "DENY";
  readonly authorityClaim: "NONE";
}

export type M46ResearchLabRecord =
  | M46ProtocolRecord
  | M46PreregistrationRecord
  | M46ConsentRecord
  | M46SyntheticCohortRecord
  | M46ContaminationRecord
  | M46RetentionRecord
  | M46DeletionRecord
  | M46PublicationRecord;

export interface M46ResearchLabContract {
  readonly protocol: M46ProtocolRecord;
  readonly preregistration: M46PreregistrationRecord;
  readonly consent: M46ConsentRecord;
  readonly syntheticCohort: M46SyntheticCohortRecord;
  readonly contamination: M46ContaminationRecord;
  readonly retention: M46RetentionRecord;
  readonly deletion: M46DeletionRecord;
  readonly publication: M46PublicationRecord;
}

export type M46ResearchLabState = "REPRODUCIBLE" | "BLOCKED" | "MALFORMED";
export type M46ResearchLabInputState = "VALID" | "MALFORMED";
export type M46ResearchLabDiagnosticCode =
  | "MALFORMED_RECORD"
  | "PROTOCOL_HASH_DRIFT"
  | "COHORT_HASH_DRIFT"
  | "REFERENCE_MISMATCH"
  | "RETENTION_INVALID"
  | "CONTAMINATION_STATUS_MISMATCH"
  | "CONTAMINATION_DETECTED"
  | "DELETION_RECEIPT_INVALID"
  | "DELETION_SET_MISMATCH"
  | "DELETION_TRIGGER_MISMATCH"
  | "CONSENT_WITHDRAWN"
  | "WITHDRAWAL_NOT_PROPAGATED"
  | "PUBLICATION_STATE_MISMATCH"
  | "RAW_PUBLICATION_FORBIDDEN";

export interface M46ResearchLabDiagnostic {
  readonly code: M46ResearchLabDiagnosticCode;
  readonly path: string;
}

export type M46ResearchRecordDigests = Readonly<
  Record<M46ResearchRecordKind, M46Sha256Digest | null>
>;

export interface M46ResearchLabRunOutput {
  readonly schemaVersion: typeof M46_RESEARCH_LAB_SCHEMA;
  readonly state: M46ResearchLabState;
  readonly inputState: M46ResearchLabInputState;
  readonly execution: {
    readonly mode: "LOCAL_DETERMINISTIC";
    readonly dataSource: "SYNTHETIC_ONLY";
    readonly externalDataIngestion: "DENY";
    readonly network: "NOT_USED";
    readonly authorityClaim: "NONE";
  };
  readonly consentState: M46ConsentStatus | "UNKNOWN";
  readonly contaminationState: M46ContaminationStatus | "UNKNOWN";
  readonly publicationEligible: boolean;
  readonly contractDigest: M46Sha256Digest | null;
  readonly recordDigests: M46ResearchRecordDigests;
  readonly diagnostics: readonly M46ResearchLabDiagnostic[];
}

type UnknownRecord = Record<string, unknown>;
type CanonicalState = {
  nodes: number;
  readonly seen: WeakSet<object>;
};

const EMPTY_RECORD_DIGESTS: M46ResearchRecordDigests = Object.freeze({
  protocol: null,
  preregistration: null,
  consent: null,
  syntheticCohort: null,
  contamination: null,
  retention: null,
  deletion: null,
  publication: null,
});

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(
  value: unknown,
  state: CanonicalState = { nodes: 0, seen: new WeakSet<object>() },
  depth = 0,
): string | null {
  state.nodes += 1;
  if (
    state.nodes > M46_RESEARCH_LAB_LIMITS.maxCanonicalNodes ||
    depth > M46_RESEARCH_LAB_LIMITS.maxCanonicalDepth
  ) {
    return null;
  }
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value) ? JSON.stringify(value) : null;
  }
  if (typeof value !== "object") return null;
  if (state.seen.has(value)) return null;
  state.seen.add(value);
  let encoded: string | null = null;
  if (Array.isArray(value)) {
    const entries: string[] = [];
    let valid = true;
    for (const entry of value) {
      const child = canonicalize(entry, state, depth + 1);
      if (child === null) {
        valid = false;
        break;
      }
      entries.push(child);
    }
    if (valid) encoded = `[${entries.join(",")}]`;
  } else {
    const record = value as UnknownRecord;
    const keys = Object.keys(record).sort(compareText);
    const entries: string[] = [];
    let valid = true;
    for (const key of keys) {
      const child = canonicalize(record[key], state, depth + 1);
      if (child === null) {
        valid = false;
        break;
      }
      entries.push(`${JSON.stringify(key)}:${child}`);
    }
    if (valid) encoded = `{${entries.join(",")}}`;
  }
  state.seen.delete(value);
  return encoded;
}

export function m46ResearchRecordDigest(value: object): M46Sha256Digest {
  const encoded = canonicalize(value);
  if (encoded === null) throw new TypeError("record is not canonical JSON");
  return `sha256:${createHash("sha256").update(encoded).digest("hex")}`;
}

function isRecord(value: unknown): value is UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(
  record: UnknownRecord,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(record).sort(compareText);
  const ordered = [...expected].sort(compareText);
  return (
    actual.length === ordered.length &&
    actual.every((key, index) => key === ordered[index])
  );
}

function isText(
  value: unknown,
  maximum: number = M46_RESEARCH_LAB_LIMITS.maxTextLength,
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value
  );
}

function isIdentifier(value: unknown): value is string {
  return isText(value, M46_RESEARCH_LAB_LIMITS.maxIdLength);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64 &&
    Number.isFinite(Date.parse(value))
  );
}

function isDigest(value: unknown): value is M46Sha256Digest {
  return (
    typeof value === "string" &&
    value.length === 71 &&
    value.startsWith("sha256:") &&
    /^[a-f0-9]{64}$/.test(value.slice(7))
  );
}

function isUniqueTextList(
  value: unknown,
  maximum: number,
  minimum = 1,
  maximumLength: number = M46_RESEARCH_LAB_LIMITS.maxTextLength,
): value is readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    return false;
  }
  const seen = new Set<string>();
  for (const entry of value) {
    if (!isText(entry, maximumLength) || seen.has(entry)) return false;
    seen.add(entry);
  }
  return true;
}

function parseProtocol(value: unknown): M46ProtocolRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "version",
      "title",
      "objective",
      "hypothesis",
      "analysisPlan",
      "dataSource",
      "externalDataIngestion",
      "networkAccess",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isText(value["version"]) ||
    !isText(value["title"]) ||
    !isText(value["objective"]) ||
    !isText(value["hypothesis"]) ||
    value["dataSource"] !== "SYNTHETIC_ONLY" ||
    value["externalDataIngestion"] !== "DENY" ||
    value["networkAccess"] !== "DENY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  const plan = value["analysisPlan"];
  if (
    !isRecord(plan) ||
    !hasExactKeys(plan, ["metrics", "fields", "missingData"]) ||
    !isUniqueTextList(
      plan["metrics"],
      M46_RESEARCH_LAB_LIMITS.maxProtocolMetrics,
    ) ||
    !isUniqueTextList(
      plan["fields"],
      M46_RESEARCH_LAB_LIMITS.maxProtocolFields,
    ) ||
    plan["missingData"] !== "REJECT"
  ) {
    return null;
  }
  return value as unknown as M46ProtocolRecord;
}

function parsePreregistration(value: unknown): M46PreregistrationRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "protocolId",
      "protocolDigest",
      "registeredAt",
      "status",
      "registry",
      "externalSubmission",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["protocolId"]) ||
    !isDigest(value["protocolDigest"]) ||
    !isTimestamp(value["registeredAt"]) ||
    value["status"] !== "FROZEN" ||
    value["registry"] !== "LOCAL_ONLY" ||
    value["externalSubmission"] !== "DENY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  return value as unknown as M46PreregistrationRecord;
}

function parseConsent(value: unknown): M46ConsentRecord | null {
  if (!isRecord(value)) return null;
  const status = value["status"];
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "protocolId",
      "subjectId",
      "scope",
      "status",
      "grantedAt",
      "withdrawnAt",
      "withdrawalReason",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["protocolId"]) ||
    !isIdentifier(value["subjectId"]) ||
    value["scope"] !== "LOCAL_SYNTHETIC_ONLY" ||
    (status !== "GRANTED" && status !== "WITHDRAWN") ||
    !isTimestamp(value["grantedAt"]) ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  const withdrawnAt = value["withdrawnAt"];
  const reason = value["withdrawalReason"];
  if (
    (status === "GRANTED" && (withdrawnAt !== null || reason !== null)) ||
    (status === "WITHDRAWN" && (!isTimestamp(withdrawnAt) || !isText(reason)))
  ) {
    return null;
  }
  return value as unknown as M46ConsentRecord;
}

function parseSyntheticCohort(value: unknown): M46SyntheticCohortRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "preregistrationId",
      "generator",
      "source",
      "externalDataIngestion",
      "entries",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["preregistrationId"]) ||
    value["source"] !== "SYNTHETIC_ONLY" ||
    value["externalDataIngestion"] !== "DENY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  const generator = value["generator"];
  if (
    !isRecord(generator) ||
    !hasExactKeys(generator, ["name", "version", "seed"]) ||
    !isText(generator["name"]) ||
    !isText(generator["version"]) ||
    !Number.isSafeInteger(generator["seed"]) ||
    (generator["seed"] as number) < 0 ||
    (generator["seed"] as number) > 0xffff_ffff
  ) {
    return null;
  }
  const entries = value["entries"];
  if (
    !Array.isArray(entries) ||
    entries.length === 0 ||
    entries.length > M46_RESEARCH_LAB_LIMITS.maxCohortRecords
  ) {
    return null;
  }
  const ids = new Set<string>();
  for (const entry of entries) {
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ["id", "features", "outcome"]) ||
      !isIdentifier(entry["id"]) ||
      ids.has(entry["id"]) ||
      !Array.isArray(entry["features"]) ||
      entry["features"].length === 0 ||
      entry["features"].length > M46_RESEARCH_LAB_LIMITS.maxFeatures ||
      !entry["features"].every(
        (feature) => typeof feature === "number" && Number.isFinite(feature),
      ) ||
      typeof entry["outcome"] !== "number" ||
      !Number.isFinite(entry["outcome"])
    ) {
      return null;
    }
    ids.add(entry["id"]);
  }
  return value as unknown as M46SyntheticCohortRecord;
}

function parseContamination(value: unknown): M46ContaminationRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "cohortId",
      "cohortDigest",
      "trainingIds",
      "evaluationIds",
      "status",
      "boundary",
      "externalDataIngestion",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["cohortId"]) ||
    !isDigest(value["cohortDigest"]) ||
    !isUniqueTextList(
      value["trainingIds"],
      M46_RESEARCH_LAB_LIMITS.maxSplitRecords,
      1,
      M46_RESEARCH_LAB_LIMITS.maxIdLength,
    ) ||
    !isUniqueTextList(
      value["evaluationIds"],
      M46_RESEARCH_LAB_LIMITS.maxSplitRecords,
      1,
      M46_RESEARCH_LAB_LIMITS.maxIdLength,
    ) ||
    (value["status"] !== "CLEAR" && value["status"] !== "DETECTED") ||
    value["boundary"] !== "SYNTHETIC_ONLY" ||
    value["externalDataIngestion"] !== "DENY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  return value as unknown as M46ContaminationRecord;
}

function parseRetention(value: unknown): M46RetentionRecord | null {
  if (!isRecord(value)) return null;
  const retentionDays = value["retentionDays"];
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "cohortId",
      "cohortDigest",
      "retentionDays",
      "deleteAfter",
      "disposition",
      "storage",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["cohortId"]) ||
    !isDigest(value["cohortDigest"]) ||
    !Number.isSafeInteger(retentionDays) ||
    (retentionDays as number) < 1 ||
    (retentionDays as number) > M46_RESEARCH_LAB_LIMITS.maxRetentionDays ||
    !isTimestamp(value["deleteAfter"]) ||
    value["disposition"] !== "DELETE" ||
    value["storage"] !== "LOCAL_ONLY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  return value as unknown as M46RetentionRecord;
}

function parseDeletion(value: unknown): M46DeletionRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "retentionId",
      "cohortId",
      "cohortDigest",
      "trigger",
      "status",
      "recordIds",
      "receiptDigest",
      "storage",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["retentionId"]) ||
    !isIdentifier(value["cohortId"]) ||
    !isDigest(value["cohortDigest"]) ||
    (value["trigger"] !== "RETENTION_EXPIRY" &&
      value["trigger"] !== "CONSENT_WITHDRAWAL") ||
    (value["status"] !== "SCHEDULED" && value["status"] !== "COMPLETED") ||
    !isUniqueTextList(
      value["recordIds"],
      M46_RESEARCH_LAB_LIMITS.maxCohortRecords,
      1,
      M46_RESEARCH_LAB_LIMITS.maxIdLength,
    ) ||
    (value["receiptDigest"] !== null && !isDigest(value["receiptDigest"])) ||
    value["storage"] !== "LOCAL_ONLY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  return value as unknown as M46DeletionRecord;
}

function parsePublication(value: unknown): M46PublicationRecord | null {
  if (!isRecord(value)) return null;
  if (
    !hasExactKeys(value, [
      "schemaVersion",
      "id",
      "protocolId",
      "preregistrationId",
      "cohortId",
      "cohortDigest",
      "consentId",
      "status",
      "artifactKind",
      "artifactDigest",
      "includedRecordIds",
      "limitations",
      "releaseScope",
      "externalDistribution",
      "authorityClaim",
    ]) ||
    value["schemaVersion"] !== 1 ||
    !isIdentifier(value["id"]) ||
    !isIdentifier(value["protocolId"]) ||
    !isIdentifier(value["preregistrationId"]) ||
    !isIdentifier(value["cohortId"]) ||
    !isDigest(value["cohortDigest"]) ||
    !isIdentifier(value["consentId"]) ||
    (value["status"] !== "LOCAL_READY" && value["status"] !== "WITHHELD") ||
    value["artifactKind"] !== "AGGREGATE_ONLY" ||
    (value["artifactDigest"] !== null && !isDigest(value["artifactDigest"])) ||
    !isUniqueTextList(
      value["includedRecordIds"],
      M46_RESEARCH_LAB_LIMITS.maxCohortRecords,
      0,
      M46_RESEARCH_LAB_LIMITS.maxIdLength,
    ) ||
    !isUniqueTextList(
      value["limitations"],
      M46_RESEARCH_LAB_LIMITS.maxLimitations,
    ) ||
    value["releaseScope"] !== "LOCAL_DERIVED_ONLY" ||
    value["externalDistribution"] !== "DENY" ||
    value["authorityClaim"] !== "NONE"
  ) {
    return null;
  }
  return value as unknown as M46PublicationRecord;
}

function parseContract(value: unknown): {
  readonly contract: M46ResearchLabContract | null;
  readonly malformedPath: string | null;
} {
  if (!isRecord(value)) return { contract: null, malformedPath: "$" };
  if (!hasExactKeys(value, [...M46_RESEARCH_RECORD_KINDS])) {
    return { contract: null, malformedPath: "$" };
  }
  const protocol = parseProtocol(value["protocol"]);
  if (protocol === null) return { contract: null, malformedPath: "$.protocol" };
  const preregistration = parsePreregistration(value["preregistration"]);
  if (preregistration === null) {
    return { contract: null, malformedPath: "$.preregistration" };
  }
  const consent = parseConsent(value["consent"]);
  if (consent === null) return { contract: null, malformedPath: "$.consent" };
  const syntheticCohort = parseSyntheticCohort(value["syntheticCohort"]);
  if (syntheticCohort === null) {
    return { contract: null, malformedPath: "$.syntheticCohort" };
  }
  const contamination = parseContamination(value["contamination"]);
  if (contamination === null) {
    return { contract: null, malformedPath: "$.contamination" };
  }
  const retention = parseRetention(value["retention"]);
  if (retention === null)
    return { contract: null, malformedPath: "$.retention" };
  const deletion = parseDeletion(value["deletion"]);
  if (deletion === null) return { contract: null, malformedPath: "$.deletion" };
  const publication = parsePublication(value["publication"]);
  if (publication === null) {
    return { contract: null, malformedPath: "$.publication" };
  }
  return {
    contract: {
      protocol,
      preregistration,
      consent,
      syntheticCohort,
      contamination,
      retention,
      deletion,
      publication,
    },
    malformedPath: null,
  };
}

function malformedOutput(path: string): M46ResearchLabRunOutput {
  return {
    schemaVersion: M46_RESEARCH_LAB_SCHEMA,
    state: "MALFORMED",
    inputState: "MALFORMED",
    execution: {
      mode: "LOCAL_DETERMINISTIC",
      dataSource: "SYNTHETIC_ONLY",
      externalDataIngestion: "DENY",
      network: "NOT_USED",
      authorityClaim: "NONE",
    },
    consentState: "UNKNOWN",
    contaminationState: "UNKNOWN",
    publicationEligible: false,
    contractDigest: null,
    recordDigests: EMPTY_RECORD_DIGESTS,
    diagnostics: [{ code: "MALFORMED_RECORD", path }],
  };
}

function computeContamination(
  cohort: M46SyntheticCohortRecord,
  contamination: M46ContaminationRecord,
): M46ContaminationStatus {
  const cohortIds = new Set(cohort.entries.map((entry) => entry.id));
  const training = new Set(contamination.trainingIds);
  const evaluation = new Set(contamination.evaluationIds);
  const covered = new Set([...training, ...evaluation]);
  let detected =
    covered.size !== cohortIds.size ||
    [...cohortIds].some((id) => !covered.has(id)) ||
    [...training].some((id) => !cohortIds.has(id)) ||
    [...evaluation].some((id) => !cohortIds.has(id)) ||
    [...training].some((id) => evaluation.has(id));
  detected =
    detected ||
    training.size !== contamination.trainingIds.length ||
    evaluation.size !== contamination.evaluationIds.length;
  return detected ? "DETECTED" : "CLEAR";
}

function runValidContract(
  contract: M46ResearchLabContract,
): M46ResearchLabRunOutput {
  const {
    protocol,
    preregistration,
    consent,
    syntheticCohort: cohort,
    contamination,
    retention,
    deletion,
    publication,
  } = contract;
  const protocolDigest = m46ResearchRecordDigest(protocol);
  const cohortDigest = m46ResearchRecordDigest(cohort);
  const recordDigests: M46ResearchRecordDigests = {
    protocol: protocolDigest,
    preregistration: m46ResearchRecordDigest(preregistration),
    consent: m46ResearchRecordDigest(consent),
    syntheticCohort: cohortDigest,
    contamination: m46ResearchRecordDigest(contamination),
    retention: m46ResearchRecordDigest(retention),
    deletion: m46ResearchRecordDigest(deletion),
    publication: m46ResearchRecordDigest(publication),
  };
  const contractDigest = m46ResearchRecordDigest(recordDigests);
  const blockers = new Map<string, M46ResearchLabDiagnostic>();
  const block = (code: M46ResearchLabDiagnosticCode, path: string): void => {
    blockers.set(`${code}:${path}`, { code, path });
  };

  if (preregistration.protocolId !== protocol.id) {
    block("REFERENCE_MISMATCH", "$.preregistration.protocolId");
  }
  if (preregistration.protocolDigest !== protocolDigest) {
    block("PROTOCOL_HASH_DRIFT", "$.preregistration.protocolDigest");
  }
  if (consent.protocolId !== protocol.id) {
    block("REFERENCE_MISMATCH", "$.consent.protocolId");
  }
  if (cohort.preregistrationId !== preregistration.id) {
    block("REFERENCE_MISMATCH", "$.syntheticCohort.preregistrationId");
  }
  if (contamination.cohortId !== cohort.id) {
    block("REFERENCE_MISMATCH", "$.contamination.cohortId");
  }
  if (retention.cohortId !== cohort.id) {
    block("REFERENCE_MISMATCH", "$.retention.cohortId");
  }
  if (deletion.retentionId !== retention.id) {
    block("REFERENCE_MISMATCH", "$.deletion.retentionId");
  }
  if (deletion.cohortId !== cohort.id) {
    block("REFERENCE_MISMATCH", "$.deletion.cohortId");
  }
  if (
    contamination.cohortDigest !== cohortDigest ||
    retention.cohortDigest !== cohortDigest ||
    deletion.cohortDigest !== cohortDigest ||
    publication.cohortDigest !== cohortDigest
  ) {
    block("COHORT_HASH_DRIFT", "$.cohortDigest");
  }
  if (
    publication.protocolId !== protocol.id ||
    publication.preregistrationId !== preregistration.id ||
    publication.consentId !== consent.id
  ) {
    block("REFERENCE_MISMATCH", "$.publication");
  }

  const cohortIds = new Set(cohort.entries.map((entry) => entry.id));
  if (!cohortIds.has(consent.subjectId)) {
    block("REFERENCE_MISMATCH", "$.consent.subjectId");
  }
  if (
    Date.parse(retention.deleteAfter) <=
    Date.parse(preregistration.registeredAt)
  ) {
    block("RETENTION_INVALID", "$.retention.deleteAfter");
  }

  const contaminationState = computeContamination(cohort, contamination);
  if (contamination.status !== contaminationState) {
    block("CONTAMINATION_STATUS_MISMATCH", "$.contamination.status");
  }
  if (contaminationState === "DETECTED") {
    block("CONTAMINATION_DETECTED", "$.contamination");
  }

  const deletionIds = new Set(deletion.recordIds);
  if (
    deletionIds.size !== cohortIds.size ||
    [...cohortIds].some((id) => !deletionIds.has(id)) ||
    [...deletionIds].some((id) => !cohortIds.has(id))
  ) {
    block("DELETION_SET_MISMATCH", "$.deletion.recordIds");
  }
  if (
    (deletion.status === "COMPLETED" && deletion.receiptDigest === null) ||
    (deletion.status === "SCHEDULED" && deletion.receiptDigest !== null)
  ) {
    block("DELETION_RECEIPT_INVALID", "$.deletion.receiptDigest");
  }
  if (
    (consent.status === "GRANTED" && deletion.trigger !== "RETENTION_EXPIRY") ||
    (consent.status === "WITHDRAWN" &&
      deletion.trigger !== "CONSENT_WITHDRAWAL")
  ) {
    block("DELETION_TRIGGER_MISMATCH", "$.deletion.trigger");
  }

  if (
    (publication.status === "LOCAL_READY" &&
      publication.artifactDigest === null) ||
    (publication.status === "WITHHELD" && publication.artifactDigest !== null)
  ) {
    block("PUBLICATION_STATE_MISMATCH", "$.publication");
  }
  if (publication.includedRecordIds.length > 0) {
    block("RAW_PUBLICATION_FORBIDDEN", "$.publication.includedRecordIds");
  }
  if (consent.status === "WITHDRAWN") {
    block("CONSENT_WITHDRAWN", "$.consent.status");
    if (
      publication.status !== "WITHHELD" ||
      deletion.status !== "COMPLETED" ||
      !deletionIds.has(consent.subjectId)
    ) {
      block("WITHDRAWAL_NOT_PROPAGATED", "$.publication");
    }
  }
  if (
    consent.status === "WITHDRAWN" &&
    Date.parse(consent.withdrawnAt ?? "") < Date.parse(consent.grantedAt)
  ) {
    block("REFERENCE_MISMATCH", "$.consent.withdrawnAt");
  }

  const diagnostics = [...blockers.values()];
  const publicationEligible =
    consent.status === "GRANTED" &&
    publication.status === "LOCAL_READY" &&
    diagnostics.length === 0;
  return {
    schemaVersion: M46_RESEARCH_LAB_SCHEMA,
    state: diagnostics.length === 0 ? "REPRODUCIBLE" : "BLOCKED",
    inputState: "VALID",
    execution: {
      mode: "LOCAL_DETERMINISTIC",
      dataSource: "SYNTHETIC_ONLY",
      externalDataIngestion: "DENY",
      network: "NOT_USED",
      authorityClaim: "NONE",
    },
    consentState: consent.status,
    contaminationState,
    publicationEligible,
    contractDigest,
    recordDigests,
    diagnostics,
  };
}

export function runM46ResearchLab(input: unknown): M46ResearchLabRunOutput {
  try {
    const parsed = parseContract(input);
    return parsed.contract === null
      ? malformedOutput(parsed.malformedPath ?? "$")
      : runValidContract(parsed.contract);
  } catch {
    return malformedOutput("$");
  }
}
