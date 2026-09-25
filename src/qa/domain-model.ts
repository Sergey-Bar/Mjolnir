export const QA_DOMAIN_MODEL_SCHEMA_VERSION = 1 as const;

export const QA_DOMAIN_IDS = [
  "requirements",
  "risk",
  "test-strategy",
  "test-data",
  "api",
  "accessibility",
  "performance",
  "security",
  "mobile",
  "exploratory-observability",
  "release-evidence",
] as const;

export type QaDomainId = (typeof QA_DOMAIN_IDS)[number];

export const QA_DOMAIN_MATURITY_VALUES = [
  "UNSUPPORTED",
  "PARTIAL",
  "CANDIDATE",
  "EXPERIMENTAL",
  "MEASURED",
  "CERTIFIED",
] as const;

export type QaDomainMaturity = (typeof QA_DOMAIN_MATURITY_VALUES)[number];

export const QA_EVIDENCE_STATE_VALUES = [
  "FRESH",
  "STALE",
  "FOREIGN",
  "NOT_RUN",
  "PARTIAL",
  "CONTRADICTORY",
  "INVALID",
  "UNKNOWN",
] as const;

export type QaEvidenceState = (typeof QA_EVIDENCE_STATE_VALUES)[number];

export const QA_EVIDENCE_SUPPORT_VALUES = [
  "SUPPORTED",
  "UNSUPPORTED",
  "UNKNOWN",
] as const;

export type QaEvidenceSupport = (typeof QA_EVIDENCE_SUPPORT_VALUES)[number];

export const QA_DOMAIN_CLAIM_VALUES = [
  "NONE",
  "PASS",
  "PARTIAL",
  "FAIL",
  "BLOCKED",
] as const;

export type QaDomainClaim = (typeof QA_DOMAIN_CLAIM_VALUES)[number];

export const QA_DOMAIN_VALIDATION_STATUSES = [
  "PASS",
  "PARTIAL",
  "BLOCKED",
  "FAIL",
] as const;

export type QaDomainValidationStatus =
  (typeof QA_DOMAIN_VALIDATION_STATUSES)[number];

export type QaDomainDiagnosticSeverity = "error" | "warning";

export interface QaEvidenceReference {
  id: string;
  source: string;
  candidate: string;
  state?: QaEvidenceState;
  support?: QaEvidenceSupport;
  observedAt?: string | null;
}

export interface QaDomainEvidence {
  runtime: QaEvidenceReference[];
  external: QaEvidenceReference[];
}

export interface QaDomainRecordBase {
  id: string;
  domain: QaDomainId;
  maturity: QaDomainMaturity;
  source: string;
  sourceVersion?: string;
  runtimeEvidence: readonly QaEvidenceReference[];
  externalEvidence: readonly QaEvidenceReference[];
  owner: string;
  limitation: string;
  trustBoundary: string;
  nextAction: string;
  candidate: string;
  claim?: QaDomainClaim;
  links?: string[];
  evidence?: QaDomainEvidence;
}

export interface RequirementRecord extends QaDomainRecordBase {
  domain: "requirements";
  statement?: string;
  acceptanceCriteria?: string[];
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface RiskRecord extends QaDomainRecordBase {
  domain: "risk";
  description?: string;
  likelihood?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  impact?: string;
  mitigation?: string;
  requirementIds?: string[];
  testIds?: string[];
}

export interface TestStrategyRecord extends QaDomainRecordBase {
  domain: "test-strategy";
  layers?: string[];
  selection?: string[];
  gates?: string[];
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface TestDataRecord extends QaDomainRecordBase {
  domain: "test-data";
  classification?: string;
  generation?: string;
  cleanup?: string;
  requirementIds?: string[];
  testIds?: string[];
}

export interface ApiRecord extends QaDomainRecordBase {
  domain: "api";
  contract?: string;
  authBoundary?: string;
  negativeCases?: string[];
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface AccessibilityRecord extends QaDomainRecordBase {
  domain: "accessibility";
  automatedChecks?: string[];
  manualChecks?: string[];
  humanValidation?: "NOT_RUN" | "PENDING" | "COMPLETE";
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface PerformanceRecord extends QaDomainRecordBase {
  domain: "performance";
  budget?: string;
  environment?: string;
  variance?: string;
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface SecurityRecord extends QaDomainRecordBase {
  domain: "security";
  threatModel?: string;
  artifacts?: string[];
  privacyBoundary?: string;
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface MobileRecord extends QaDomainRecordBase {
  domain: "mobile";
  platforms?: string[];
  devices?: string[];
  privacyBoundary?: string;
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface ExploratoryObservabilityRecord extends QaDomainRecordBase {
  domain: "exploratory-observability";
  charters?: string[];
  signals?: string[];
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export interface ReleaseEvidenceRecord extends QaDomainRecordBase {
  domain: "release-evidence";
  artifacts?: string[];
  gates?: string[];
  provenance?: string;
  requirementIds?: string[];
  riskIds?: string[];
  testIds?: string[];
}

export type QaDomainRecord =
  | RequirementRecord
  | RiskRecord
  | TestStrategyRecord
  | TestDataRecord
  | ApiRecord
  | AccessibilityRecord
  | PerformanceRecord
  | SecurityRecord
  | MobileRecord
  | ExploratoryObservabilityRecord
  | ReleaseEvidenceRecord;

export type RequirementsRecord = RequirementRecord;
export type TestStrategyModelRecord = TestStrategyRecord;
export type TestDataModelRecord = TestDataRecord;
export type APIRecord = ApiRecord;
export type A11yRecord = AccessibilityRecord;
export type ExploratoryRecord = ExploratoryObservabilityRecord;
export type ObservabilityRecord = ExploratoryObservabilityRecord;

export interface QaDomainModel {
  schemaVersion: typeof QA_DOMAIN_MODEL_SCHEMA_VERSION;
  candidate: string;
  records: readonly QaDomainRecord[];
  claim?: QaDomainClaim;
}

function m31RecordBase(): Omit<QaDomainRecordBase, "id" | "domain"> {
  return {
    maturity: "UNSUPPORTED",
    source: "M31 bounded domain contract",
    sourceVersion: "1",
    runtimeEvidence: [],
    externalEvidence: [],
    owner: "M31-domain-owner",
    limitation: "No executed or external validation is recorded",
    trustBoundary: "Local typed model only",
    nextAction: "Collect candidate-bound evidence before promotion",
    candidate: "M31",
    claim: "NONE",
    links: [],
  };
}

export const QA_DOMAIN_RECORDS: readonly QaDomainRecord[] = [
  {
    ...m31RecordBase(),
    id: "REQ-M31-001",
    domain: "requirements",
    maturity: "PARTIAL",
    statement: "Requirements are represented without an imported source",
    acceptanceCriteria: [],
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "RISK-M31-001",
    domain: "risk",
    description: "Risk records are represented without likelihood measurement",
    likelihood: "MEDIUM",
    impact: "Unmeasured release exposure",
    mitigation: "Link risks to requirements and evidence",
    requirementIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "TEST-STRATEGY-M31-001",
    domain: "test-strategy",
    layers: [],
    selection: [],
    gates: [],
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "TEST-DATA-M31-001",
    domain: "test-data",
    classification: "unclassified",
    generation: "not-run",
    cleanup: "not-run",
    requirementIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "API-M31-001",
    domain: "api",
    contract: "not-imported",
    authBoundary: "not-verified",
    negativeCases: [],
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "A11Y-M31-001",
    domain: "accessibility",
    automatedChecks: [],
    manualChecks: [],
    humanValidation: "NOT_RUN",
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "PERF-M31-001",
    domain: "performance",
    budget: "not-defined",
    environment: "not-captured",
    variance: "not-measured",
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "SEC-M31-001",
    domain: "security",
    threatModel: "not-imported",
    artifacts: [],
    privacyBoundary: "not-verified",
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "MOB-M31-001",
    domain: "mobile",
    platforms: [],
    devices: [],
    privacyBoundary: "not-verified",
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "EXP-OBS-M31-001",
    domain: "exploratory-observability",
    charters: [],
    signals: [],
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
  {
    ...m31RecordBase(),
    id: "REL-M31-001",
    domain: "release-evidence",
    artifacts: [],
    gates: [],
    provenance: "not-captured",
    requirementIds: [],
    riskIds: [],
    testIds: [],
  },
];

export const M31_QA_DOMAIN_IDS = QA_DOMAIN_IDS;
export const M31_QA_DOMAIN_RECORDS = QA_DOMAIN_RECORDS;
export type M31DomainId = QaDomainId;
export type M31DomainRecord = QaDomainRecord;

export interface QaDomainDiagnostic {
  code: string;
  path: string;
  message: string;
  severity: QaDomainDiagnosticSeverity;
  domain?: QaDomainId;
}

export interface QaDomainValidationResult {
  status: QaDomainValidationStatus;
  valid: boolean;
  gating: boolean;
  nonGating: boolean;
  diagnostics: QaDomainDiagnostic[];
  violations: QaDomainDiagnostic[];
  errors: string[];
  warnings: string[];
  nonGatingDomains: QaDomainId[];
  gatingDomains: QaDomainId[];
}

interface NormalizedEvidence {
  id: string;
  source: string;
  candidate: string;
  state: QaEvidenceState | "INVALID";
  support: QaEvidenceSupport | "INVALID";
  observedAt: string | null;
  validShape: boolean;
}

interface RecordInspection {
  record: Record<string, unknown>;
  id: string;
  domain: QaDomainId | null;
  maturity: QaDomainMaturity | null;
  passClaim: boolean;
  nonGating: boolean;
  links: string[];
  evidence: NormalizedEvidence[];
}

const NON_GATING_MATURITIES = new Set<QaDomainMaturity>([
  "UNSUPPORTED",
  "PARTIAL",
  "CANDIDATE",
  "EXPERIMENTAL",
]);

const CURRENT_EVIDENCE_STATES = new Set<QaEvidenceState>(["FRESH"]);
const EVIDENCE_LIST_KEYS = ["runtimeEvidence", "externalEvidence"] as const;
const LINK_KEYS = [
  "links",
  "linkedIds",
  "requirementIds",
  "riskIds",
  "testIds",
  "evidenceIds",
] as const;
const DETAIL_ARRAY_KEYS = [
  "acceptanceCriteria",
  "layers",
  "selection",
  "gates",
  "negativeCases",
  "automatedChecks",
  "manualChecks",
  "artifacts",
  "threats",
  "platforms",
  "devices",
  "charters",
  "signals",
] as const;
const DETAIL_STRING_KEYS = [
  "statement",
  "description",
  "impact",
  "mitigation",
  "classification",
  "generation",
  "cleanup",
  "contract",
  "authBoundary",
  "budget",
  "environment",
  "variance",
  "threatModel",
  "privacyBoundary",
  "provenance",
] as const;
const COMMON_TEXT_KEYS = [
  "id",
  "source",
  "owner",
  "limitation",
  "trustBoundary",
  "nextAction",
  "candidate",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function token(value: unknown): string {
  return text(value).toUpperCase();
}

function isMaturity(value: string): value is QaDomainMaturity {
  return (QA_DOMAIN_MATURITY_VALUES as readonly string[]).includes(value);
}

function isEvidenceState(value: string): value is QaEvidenceState {
  return (QA_EVIDENCE_STATE_VALUES as readonly string[]).includes(value);
}

function isEvidenceSupport(value: string): value is QaEvidenceSupport {
  return (QA_EVIDENCE_SUPPORT_VALUES as readonly string[]).includes(value);
}

function isDomain(value: string): value is QaDomainId {
  return (QA_DOMAIN_IDS as readonly string[]).includes(value);
}

function isClaim(value: string): value is QaDomainClaim {
  return (QA_DOMAIN_CLAIM_VALUES as readonly string[]).includes(value);
}

function addDiagnostic(
  diagnostics: QaDomainDiagnostic[],
  code: string,
  path: string,
  message: string,
  severity: QaDomainDiagnosticSeverity,
  domain?: QaDomainId,
): void {
  const diagnostic: QaDomainDiagnostic = { code, path, message, severity };
  if (domain !== undefined) diagnostic.domain = domain;
  diagnostics.push(diagnostic);
}

function addError(
  diagnostics: QaDomainDiagnostic[],
  code: string,
  path: string,
  message: string,
  domain?: QaDomainId,
): void {
  addDiagnostic(diagnostics, code, path, message, "error", domain);
}

function readEvidenceLists(record: Record<string, unknown>): {
  runtime: unknown[];
  external: unknown[];
} {
  const nested = isRecord(record["evidence"]) ? record["evidence"] : undefined;
  const runtimeValue = record["runtimeEvidence"] ?? nested?.["runtime"];
  const externalValue = record["externalEvidence"] ?? nested?.["external"];
  return {
    runtime: Array.isArray(runtimeValue) ? runtimeValue : [],
    external: Array.isArray(externalValue) ? externalValue : [],
  };
}

function normalizeEvidence(
  value: unknown,
  fallbackCandidate: string,
): NormalizedEvidence | null {
  if (typeof value === "string") {
    const id = value.trim();
    if (id.length === 0) return null;
    return {
      id,
      source: id,
      candidate: fallbackCandidate,
      state: "UNKNOWN",
      support: "UNKNOWN",
      observedAt: null,
      validShape: true,
    };
  }
  if (!isRecord(value)) return null;

  const id = text(value["id"] ?? value["artifact"] ?? value["ref"]);
  const source = text(value["source"] ?? value["artifact"] ?? value["ref"]);
  const rawCandidate = value["candidate"];
  const candidate =
    rawCandidate === undefined ? fallbackCandidate : text(rawCandidate);
  const rawState = value["state"];
  const stateToken = rawState === undefined ? "UNKNOWN" : token(rawState);
  const rawSupport = value["support"];
  const supportToken = rawSupport === undefined ? "UNKNOWN" : token(rawSupport);
  const rawObservedAt = value["observedAt"];
  const observedAt =
    rawObservedAt === undefined || rawObservedAt === null
      ? null
      : text(rawObservedAt);
  const validShape =
    id.length > 0 &&
    source.length > 0 &&
    (rawCandidate === undefined || typeof rawCandidate === "string") &&
    (rawState === undefined || typeof rawState === "string") &&
    (rawSupport === undefined || typeof rawSupport === "string") &&
    (rawObservedAt === undefined ||
      rawObservedAt === null ||
      typeof rawObservedAt === "string");

  return {
    id,
    source,
    candidate,
    state: isEvidenceState(stateToken) ? stateToken : "INVALID",
    support: isEvidenceSupport(supportToken) ? supportToken : "INVALID",
    observedAt,
    validShape,
  };
}

function collectStrings(
  record: Record<string, unknown>,
  keys: readonly string[],
  diagnostics: QaDomainDiagnostic[],
  path: string,
  domain: QaDomainId | null,
): string[] {
  const values: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      addError(
        diagnostics,
        "INVALID_FIELD",
        `${path}.${key}`,
        `${key} must be an array of identifiers`,
        domain ?? undefined,
      );
      continue;
    }
    for (const [index, item] of value.entries()) {
      if (typeof item !== "string" || item.trim().length === 0) {
        addError(
          diagnostics,
          "INVALID_LINK",
          `${path}.${key}[${index}]`,
          `${key} entries must be non-empty identifiers`,
          domain ?? undefined,
        );
        continue;
      }
      values.push(item.trim());
    }
  }
  return [...new Set(values)].sort(compareStrings);
}

function validateDetailArrays(
  record: Record<string, unknown>,
  diagnostics: QaDomainDiagnostic[],
  path: string,
  domain: QaDomainId | null,
): void {
  for (const key of DETAIL_ARRAY_KEYS) {
    const value = record[key];
    if (value === undefined) continue;
    if (
      !Array.isArray(value) ||
      value.some((item) => typeof item !== "string")
    ) {
      addError(
        diagnostics,
        "INVALID_FIELD",
        `${path}.${key}`,
        `${key} must be an array of strings`,
        domain ?? undefined,
      );
    }
  }
  for (const key of DETAIL_STRING_KEYS) {
    const value = record[key];
    if (value !== undefined && typeof value !== "string") {
      addError(
        diagnostics,
        "INVALID_FIELD",
        `${path}.${key}`,
        `${key} must be a string`,
        domain ?? undefined,
      );
    }
  }
}

function readClaim(record: Record<string, unknown>): {
  value: QaDomainClaim | null;
  raw: string;
} {
  const rawValue = record["claim"] ?? record["verdict"] ?? record["status"];
  if (rawValue === undefined) return { value: null, raw: "" };
  const raw = token(rawValue);
  return { value: isClaim(raw) ? raw : null, raw };
}

function inspectRecord(
  value: unknown,
  index: number,
  modelCandidate: string,
  diagnostics: QaDomainDiagnostic[],
): RecordInspection | null {
  const path = `model.records[${index}]`;
  if (!isRecord(value)) {
    addError(diagnostics, "INVALID_RECORD", path, "record must be an object");
    return null;
  }

  const id = text(value["id"]);
  const domainToken = text(value["domain"]).toLowerCase();
  const domain = isDomain(domainToken) ? domainToken : null;
  const maturityToken = token(value["maturity"]);
  const maturity = isMaturity(maturityToken) ? maturityToken : null;
  const nonGating = maturity !== null && NON_GATING_MATURITIES.has(maturity);
  const claim = readClaim(value);
  const passClaim = claim.value === "PASS" || maturity === "CERTIFIED";
  const severity: QaDomainDiagnosticSeverity =
    passClaim || !nonGating ? "error" : "warning";

  if (id.length === 0) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}.id`,
      "id must be a non-empty identifier",
      "error",
    );
  }
  if (domain === null) {
    addError(
      diagnostics,
      "UNKNOWN_DOMAIN",
      `${path}.domain`,
      "domain must be one of the supported M31 domains",
    );
  }
  if (maturity === null) {
    addError(
      diagnostics,
      "INVALID_MATURITY",
      `${path}.maturity`,
      "maturity must be a supported M31 maturity",
      domain ?? undefined,
    );
  }
  if (value["claim"] !== undefined && claim.value === null) {
    addError(
      diagnostics,
      "INVALID_CLAIM",
      `${path}.claim`,
      "claim must be NONE, PASS, PARTIAL, FAIL, or BLOCKED",
      domain ?? undefined,
    );
  }

  for (const key of COMMON_TEXT_KEYS) {
    const fieldValue = value[key];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      addDiagnostic(
        diagnostics,
        key === "source" ? "BLANK_SOURCE" : "MISSING_FIELD",
        `${path}.${key}`,
        `${key} must be a non-empty string`,
        key === "id" ? "error" : severity,
        domain ?? undefined,
      );
    }
  }

  const sourceVersion = value["sourceVersion"];
  if (
    sourceVersion !== undefined &&
    (typeof sourceVersion !== "string" || sourceVersion.trim().length === 0)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.sourceVersion`,
      "sourceVersion must be a non-empty string when present",
      "error",
      domain ?? undefined,
    );
  }

  const recordCandidate = text(value["candidate"]);
  if (
    recordCandidate.length > 0 &&
    modelCandidate.length > 0 &&
    recordCandidate !== modelCandidate
  ) {
    addDiagnostic(
      diagnostics,
      "STALE_CANDIDATE",
      `${path}.candidate`,
      "record candidate does not match the model candidate",
      passClaim ? "error" : "warning",
      domain ?? undefined,
    );
  }

  validateDetailArrays(value, diagnostics, path, domain);
  const links = collectStrings(value, LINK_KEYS, diagnostics, path, domain);
  const evidenceLists = readEvidenceLists(value);
  const evidence: NormalizedEvidence[] = [];

  for (const [listKey, values] of [
    ["runtimeEvidence", evidenceLists.runtime],
    ["externalEvidence", evidenceLists.external],
  ] as const) {
    const listPath = `${path}.${listKey}`;
    for (const [evidenceIndex, rawEvidence] of values.entries()) {
      const normalized = normalizeEvidence(rawEvidence, modelCandidate);
      if (normalized === null) {
        addDiagnostic(
          diagnostics,
          "UNSUPPORTED_EVIDENCE",
          `${listPath}[${evidenceIndex}]`,
          "evidence must be a non-empty reference",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
        continue;
      }
      evidence.push(normalized);
      const evidencePath = `${listPath}[${evidenceIndex}]`;
      if (!normalized.validShape) {
        addDiagnostic(
          diagnostics,
          "INVALID_EVIDENCE",
          evidencePath,
          "evidence fields must have their declared types",
          "error",
          domain ?? undefined,
        );
      }
      if (normalized.id.length === 0 || normalized.source.length === 0) {
        addDiagnostic(
          diagnostics,
          "BLANK_EVIDENCE",
          evidencePath,
          "evidence id and source must be non-empty",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      }
      if (normalized.state === "INVALID") {
        addError(
          diagnostics,
          "INVALID_EVIDENCE_STATE",
          `${evidencePath}.state`,
          "evidence state is not recognized",
          domain ?? undefined,
        );
      }
      if (normalized.support === "INVALID") {
        addError(
          diagnostics,
          "INVALID_EVIDENCE_SUPPORT",
          `${evidencePath}.support`,
          "evidence support is not recognized",
          domain ?? undefined,
        );
      }
      if (normalized.candidate.length === 0) {
        addDiagnostic(
          diagnostics,
          "MISSING_CANDIDATE",
          `${evidencePath}.candidate`,
          "evidence must identify its candidate",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      } else if (
        modelCandidate.length > 0 &&
        normalized.candidate !== modelCandidate
      ) {
        addDiagnostic(
          diagnostics,
          "STALE_CANDIDATE",
          `${evidencePath}.candidate`,
          "evidence is bound to another candidate",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      }
      if (normalized.state === "STALE" || normalized.state === "FOREIGN") {
        addDiagnostic(
          diagnostics,
          "STALE_CANDIDATE",
          `${evidencePath}.state`,
          "evidence is stale or foreign",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      }
      if (normalized.support === "UNSUPPORTED") {
        addDiagnostic(
          diagnostics,
          "UNSUPPORTED_EVIDENCE",
          `${evidencePath}.support`,
          "unsupported evidence cannot support a PASS claim",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      }
      if (
        normalized.state !== "INVALID" &&
        !CURRENT_EVIDENCE_STATES.has(normalized.state)
      ) {
        addDiagnostic(
          diagnostics,
          "PARTIAL_EVIDENCE",
          `${evidencePath}.state`,
          "evidence is not current and complete",
          passClaim ? "error" : "warning",
          domain ?? undefined,
        );
      }
      if (
        normalized.observedAt !== null &&
        Number.isNaN(Date.parse(normalized.observedAt))
      ) {
        addError(
          diagnostics,
          "INVALID_OBSERVED_AT",
          `${evidencePath}.observedAt`,
          "observedAt must be an ISO date-time or null",
          domain ?? undefined,
        );
      }
    }
  }

  if (evidence.length === 0) {
    addDiagnostic(
      diagnostics,
      passClaim ? "BLANK_PASS_CLAIM" : "NO_EVIDENCE",
      `${path}.runtimeEvidence`,
      passClaim
        ? "a PASS claim requires runtime or external evidence"
        : "no runtime or external evidence is recorded",
      passClaim ? "error" : "warning",
      domain ?? undefined,
    );
  }

  if (passClaim) {
    if (maturity !== null && NON_GATING_MATURITIES.has(maturity)) {
      addError(
        diagnostics,
        "UNSUPPORTED_PASS_CLAIM",
        `${path}.maturity`,
        "unsupported or partial maturity cannot claim PASS",
        domain ?? undefined,
      );
    }
    const eligible = evidence.filter(
      (item) =>
        item.validShape &&
        item.support === "SUPPORTED" &&
        item.state === "FRESH" &&
        item.candidate === modelCandidate,
    );
    if (eligible.length === 0) {
      addError(
        diagnostics,
        "UNSUPPORTED_EVIDENCE",
        `${path}.evidence`,
        "PASS requires supported evidence bound to the current candidate",
        domain ?? undefined,
      );
    }
  }

  return {
    record: value,
    id,
    domain,
    maturity,
    passClaim,
    nonGating,
    links,
    evidence,
  };
}

function compareStrings(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort(compareStrings)) {
    const child = value[key];
    if (child !== undefined) result[key] = canonicalize(child);
  }
  return result;
}

function canonicalText(value: unknown): string {
  const serialized = JSON.stringify(canonicalize(value));
  return serialized ?? "null";
}

function canonicalizeRecord(value: unknown): unknown {
  if (!isRecord(value)) return canonicalize(value);
  const result = canonicalize(value) as Record<string, unknown>;
  for (const key of [
    "links",
    "linkedIds",
    "requirementIds",
    "riskIds",
    "testIds",
    "evidenceIds",
  ]) {
    const entries = result[key];
    if (isUnknownArray(entries)) {
      result[key] = [...entries].sort((left, right) =>
        compareStrings(canonicalText(left), canonicalText(right)),
      );
    }
  }
  for (const key of EVIDENCE_LIST_KEYS) {
    const entries = result[key];
    if (isUnknownArray(entries)) {
      result[key] = [...entries].sort((left, right) =>
        compareStrings(canonicalText(left), canonicalText(right)),
      );
    }
  }
  if (isRecord(result["evidence"])) {
    const nested = result["evidence"];
    for (const key of ["runtime", "external"]) {
      const entries = nested[key];
      if (isUnknownArray(entries)) {
        nested[key] = [...entries].sort((left, right) =>
          compareStrings(canonicalText(left), canonicalText(right)),
        );
      }
    }
  }
  return result;
}

function canonicalizeModel(value: unknown): unknown {
  if (!isRecord(value)) return canonicalize(value);
  const result = canonicalize(value) as Record<string, unknown>;
  if (isUnknownArray(result["records"])) {
    result["records"] = [...result["records"]]
      .map(canonicalizeRecord)
      .sort((left, right) => {
        const leftRecord = isRecord(left) ? left : {};
        const rightRecord = isRecord(right) ? right : {};
        const leftDomain = text(leftRecord["domain"]);
        const rightDomain = text(rightRecord["domain"]);
        const leftIndex = QA_DOMAIN_IDS.findIndex((id) => id === leftDomain);
        const rightIndex = QA_DOMAIN_IDS.findIndex((id) => id === rightDomain);
        const domainOrder = compareStrings(
          String(leftIndex < 0 ? QA_DOMAIN_IDS.length : leftIndex).padStart(
            2,
            "0",
          ),
          String(rightIndex < 0 ? QA_DOMAIN_IDS.length : rightIndex).padStart(
            2,
            "0",
          ),
        );
        if (domainOrder !== 0) return domainOrder;
        const idOrder = compareStrings(
          text(leftRecord["id"]),
          text(rightRecord["id"]),
        );
        if (idOrder !== 0) return idOrder;
        return compareStrings(canonicalText(left), canonicalText(right));
      });
  }
  return result;
}

function diagnosticSort(
  left: QaDomainDiagnostic,
  right: QaDomainDiagnostic,
): number {
  return (
    compareStrings(left.path, right.path) ||
    compareStrings(left.code, right.code) ||
    compareStrings(left.message, right.message)
  );
}

function resultFrom(
  status: QaDomainValidationStatus,
  diagnostics: QaDomainDiagnostic[],
  nonGatingDomains: QaDomainId[],
  gatingDomains: QaDomainId[],
): QaDomainValidationResult {
  const ordered = [...diagnostics].sort(diagnosticSort);
  const errors = ordered
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => diagnostic.message);
  const warnings = ordered
    .filter((diagnostic) => diagnostic.severity === "warning")
    .map((diagnostic) => diagnostic.message);
  const valid = status !== "FAIL";
  const gating = status === "PASS";
  return {
    status,
    valid,
    gating,
    nonGating: !gating,
    diagnostics: ordered,
    violations: ordered,
    errors,
    warnings,
    nonGatingDomains: [...new Set(nonGatingDomains)].sort(compareStrings),
    gatingDomains: [...new Set(gatingDomains)].sort(compareStrings),
  };
}

export function validateQaDomainModel(
  input: unknown,
): QaDomainValidationResult {
  const diagnostics: QaDomainDiagnostic[] = [];
  if (!isRecord(input)) {
    addError(diagnostics, "INVALID_MODEL", "model", "model must be an object");
    return resultFrom("FAIL", diagnostics, [], []);
  }

  if (input["schemaVersion"] !== QA_DOMAIN_MODEL_SCHEMA_VERSION) {
    addError(
      diagnostics,
      "SCHEMA_VERSION",
      "model.schemaVersion",
      `schemaVersion must be ${QA_DOMAIN_MODEL_SCHEMA_VERSION}`,
    );
  }
  const modelCandidate = text(input["candidate"]);
  if (modelCandidate.length === 0) {
    addError(
      diagnostics,
      "MISSING_CANDIDATE",
      "model.candidate",
      "candidate must be a non-empty identifier",
    );
  }
  const recordsValue = input["records"];
  if (!Array.isArray(recordsValue)) {
    addError(
      diagnostics,
      "MISSING_RECORDS",
      "model.records",
      "records must be an array",
    );
    return resultFrom("FAIL", diagnostics, [], []);
  }

  const inspections: RecordInspection[] = [];
  for (const [index, value] of recordsValue.entries()) {
    const inspection = inspectRecord(value, index, modelCandidate, diagnostics);
    if (inspection !== null) inspections.push(inspection);
  }

  const ids = new Set<string>();
  for (const inspection of inspections) {
    if (inspection.id.length === 0) continue;
    if (ids.has(inspection.id)) {
      addError(
        diagnostics,
        "DUPLICATE_ID",
        `model.records.${inspection.id}`,
        `record id ${inspection.id} occurs more than once`,
        inspection.domain ?? undefined,
      );
    }
    ids.add(inspection.id);
  }

  const nonGatingDomains: QaDomainId[] = [];
  const gatingDomains: QaDomainId[] = [];
  let staleOrIncomplete = false;
  for (const inspection of inspections) {
    if (inspection.domain === null) continue;
    if (inspection.nonGating) {
      nonGatingDomains.push(inspection.domain);
    } else {
      gatingDomains.push(inspection.domain);
      if (inspection.evidence.length === 0) staleOrIncomplete = true;
    }
    for (const link of inspection.links) {
      if (link === inspection.id) {
        addError(
          diagnostics,
          "MISSING_LINK",
          `model.records.${inspection.id}.links`,
          "a record cannot link to itself",
          inspection.domain,
        );
      } else if (!ids.has(link)) {
        addError(
          diagnostics,
          "MISSING_LINK",
          `model.records.${inspection.id}.links.${link}`,
          `linked record ${link} does not exist`,
          inspection.domain,
        );
      }
    }
  }

  const modelClaim = readClaim(input);
  if (modelClaim.value === "PASS") {
    for (const inspection of inspections) {
      if (inspection.domain !== null && inspection.nonGating) {
        addError(
          diagnostics,
          "UNSUPPORTED_PASS_CLAIM",
          `model.records.${inspection.id}`,
          "a model PASS claim cannot include unsupported or partial domains",
          inspection.domain,
        );
      }
    }
  }
  if (modelClaim.raw !== "" && modelClaim.value === null) {
    addError(
      diagnostics,
      "INVALID_CLAIM",
      "model.claim",
      "model claim is not recognized",
    );
  }

  if (diagnostics.some((diagnostic) => diagnostic.code === "STALE_CANDIDATE")) {
    staleOrIncomplete = true;
  }
  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const hasWarnings = diagnostics.some(
    (diagnostic) => diagnostic.severity === "warning",
  );
  const status: QaDomainValidationStatus = hasErrors
    ? "FAIL"
    : staleOrIncomplete
      ? "BLOCKED"
      : hasWarnings || nonGatingDomains.length > 0 || inspections.length === 0
        ? "PARTIAL"
        : "PASS";

  return resultFrom(status, diagnostics, nonGatingDomains, gatingDomains);
}

export function validateQaDomainRecord(
  value: unknown,
  candidate = "M31",
): QaDomainValidationResult {
  return validateQaDomainModel({
    schemaVersion: QA_DOMAIN_MODEL_SCHEMA_VERSION,
    candidate,
    records: [value],
  });
}

export function stableStringify(value: unknown): string {
  const canonical =
    isRecord(value) && isUnknownArray(value["records"])
      ? canonicalizeModel(value)
      : canonicalize(value);
  return JSON.stringify(canonical) ?? "null";
}

export function serializeQaDomainModel(model: QaDomainModel): string {
  return `${JSON.stringify(canonicalizeModel(model), null, 2)}\n`;
}

export const deterministicStringify = stableStringify;
export const serializeQaModel = serializeQaDomainModel;
export const validateQaModel = validateQaDomainModel;
export const validateM31DomainRecord = validateQaDomainRecord;
export const validateM31DomainModel = validateQaDomainModel;
export const M31_DOMAIN_IDS = QA_DOMAIN_IDS;
export const M31_DOMAIN_RECORDS = QA_DOMAIN_RECORDS;
export const serializeM31DomainModel = serializeQaDomainModel;
