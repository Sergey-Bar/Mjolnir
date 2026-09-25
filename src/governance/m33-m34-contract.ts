export const M33_M34_SCHEMA = "m33-m34.governance-assurance@1" as const;
export const M33_TRAIN = "M33" as const;
export const M34_TRAIN = "M34" as const;

export const M33_M34_TRAINS = [M33_TRAIN, M34_TRAIN] as const;
export const GOVERNANCE_EXECUTION_STATUSES = ["NOT_RUN", "COMPLETE"] as const;
export const GOVERNANCE_RECORD_STATUSES = [
  "BLOCKED",
  "NOT_RUN",
  "VALID",
] as const;
export const GOVERNANCE_VALIDATION_STATUSES = [
  "BLOCKED",
  "NOT_RUN",
  "INVALID",
  "VALID",
] as const;
export const GOVERNANCE_DIAGNOSTIC_SEVERITIES = ["error", "warning"] as const;
export const GOVERNANCE_EVIDENCE_KINDS = [
  "LOCAL_FIXTURE",
  "SCRUBBED_METADATA",
  "SIGNED_ARTIFACT",
  "SBOM",
  "PROVENANCE",
  "RESTORE_DRILL",
  "ASSESSMENT",
] as const;

export type M33M34Train = (typeof M33_M34_TRAINS)[number];
export type GovernanceExecutionStatus =
  (typeof GOVERNANCE_EXECUTION_STATUSES)[number];
export type GovernanceRecordStatus =
  (typeof GOVERNANCE_RECORD_STATUSES)[number];
export type GovernanceValidationStatus =
  (typeof GOVERNANCE_VALIDATION_STATUSES)[number];
export type GovernanceDiagnosticSeverity =
  (typeof GOVERNANCE_DIAGNOSTIC_SEVERITIES)[number];
export type GovernanceEvidenceKind = (typeof GOVERNANCE_EVIDENCE_KINDS)[number];

export interface GovernanceOwner {
  readonly id: string | null;
  readonly state: "BLOCKED" | "ASSIGNED";
  readonly reviewedAt: string | null;
  readonly validUntil: string | null;
}

export interface GovernanceApproval {
  readonly state: "BLOCKED" | "APPROVED";
  readonly scope: "M33_PILOT" | "M34_ASSURANCE";
  readonly approverId: string | null;
  readonly approvedAt: string | null;
  readonly validUntil: string | null;
  readonly evidence: readonly string[];
}

export interface GovernanceArchitecture {
  readonly localAuthority: "LOCAL";
  readonly controlPlane: "OPTIONAL";
  readonly mode: "READ_ONLY";
  readonly network: "FORBIDDEN";
  readonly hostedDependency: "FORBIDDEN";
  readonly writes: "FORBIDDEN";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceTenancy {
  readonly tenantModel: "ORGANIZATION_INSTALLATION";
  readonly tenantId: string | null;
  readonly repositoryScope: "REPOSITORY";
  readonly repositoryIds: readonly string[];
  readonly userScope: "USER";
  readonly userIds: readonly string[];
  readonly crossTenantAccess: "FORBIDDEN";
  readonly isolation: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceConsent {
  readonly required: true;
  readonly state: "NOT_REQUESTED" | "CONSENTED" | "REVOKED";
  readonly purpose: "NO_EXTERNAL_SYNC" | "CONSENTED_PILOT";
  readonly approverId: string | null;
  readonly grantedAt: string | null;
  readonly validUntil: string | null;
  readonly evidence: readonly string[];
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceOperating {
  readonly mode: "LOCAL_READ_ONLY";
  readonly transport: "NONE";
  readonly failOpen: true;
  readonly queue: "NOT_RUN" | "BLOCKED" | "EMPTY";
  readonly audit: "APPEND_ONLY_DECLARED";
  readonly reconciliation: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceEvidenceReference {
  readonly evidenceId: string;
  readonly kind: GovernanceEvidenceKind;
  readonly candidateId: string | null;
  readonly tenantId: string | null;
  readonly ownerId: string | null;
  readonly observedAt: string | null;
  readonly digest: string | null;
  readonly scrubbed: boolean | null;
  readonly content: "METADATA_ONLY";
  readonly status: "NOT_RUN" | "BLOCKED" | "COMPLETE";
}

export interface GovernanceEvidencePackage {
  readonly state: "NOT_RUN" | "BLOCKED" | "PRESENT";
  readonly candidateId: string | null;
  readonly tenantId: string | null;
  readonly items: readonly GovernanceEvidenceReference[];
  readonly scrubbed: boolean | null;
  readonly content: "METADATA_ONLY";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceRetention {
  readonly policy: "NOT_DEFINED" | "DEFINED";
  readonly retentionDays: number | null;
  readonly legalHold: "NOT_RUN" | "BLOCKED" | "ENABLED" | "DISABLED";
  readonly deletion: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly export: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceOffline {
  readonly localVerdict: "AUTHORITATIVE";
  readonly sync: "NOT_RUN" | "BLOCKED" | "CONSENTED_OPTIONAL";
  readonly queue: "NOT_RUN" | "BLOCKED" | "EMPTY";
  readonly reconciliation: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceRecovery {
  readonly backup: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly restore: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly rollback: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly incident: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceServiceObjective {
  readonly targetMinutes: number | null;
  readonly observedMinutes: number | null;
  readonly evidenceId: string | null;
  readonly status: "NOT_RUN" | "BLOCKED" | "COMPLETE";
}

export interface GovernanceRpoRto {
  readonly rpo: GovernanceServiceObjective;
  readonly rto: GovernanceServiceObjective;
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernancePersistence {
  readonly mode: "LOCAL_READ_ONLY";
  readonly source: "FORBIDDEN";
  readonly prompts: "FORBIDDEN";
  readonly secrets: "FORBIDDEN";
  readonly rawReports: "FORBIDDEN";
  readonly network: "FORBIDDEN";
  readonly status: "BLOCKED" | "VALID";
}

export interface M33PilotContract {
  readonly state: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly cohort: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly productApproval: "NOT_RUN" | "BLOCKED" | "APPROVED";
  readonly securityApproval: "NOT_RUN" | "BLOCKED" | "APPROVED";
  readonly status: "BLOCKED" | "VALID";
}

export interface M34EnterpriseContract {
  readonly claim: "BLOCKED" | "NOT_CLAIMED";
  readonly promotion: "FORBIDDEN";
  readonly independentReview: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly threatModel: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly airGapped: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  readonly status: "BLOCKED" | "VALID";
}

export interface GovernanceAssuranceRecordBase {
  readonly schema: typeof M33_M34_SCHEMA;
  readonly schemaVersion: 1;
  readonly train: M33M34Train;
  readonly recordId: string;
  readonly status: GovernanceRecordStatus;
  readonly executionStatus: GovernanceExecutionStatus;
  readonly authority: "NONE";
  readonly claimPromotion: "BLOCKED" | "FORBIDDEN";
  readonly owner: GovernanceOwner;
  readonly approval: GovernanceApproval;
  readonly architecture: GovernanceArchitecture;
  readonly tenancy: GovernanceTenancy;
  readonly consent: GovernanceConsent;
  readonly operating: GovernanceOperating;
  readonly evidencePackage: GovernanceEvidencePackage;
  readonly retention: GovernanceRetention;
  readonly offline: GovernanceOffline;
  readonly recovery: GovernanceRecovery;
  readonly rpoRto: GovernanceRpoRto;
  readonly persistence: GovernancePersistence;
}

export interface M33ControlPlaneRecord extends GovernanceAssuranceRecordBase {
  readonly train: typeof M33_TRAIN;
  readonly pilot: M33PilotContract;
}

export interface M34AssuranceRecord extends GovernanceAssuranceRecordBase {
  readonly train: typeof M34_TRAIN;
  readonly enterprise: M34EnterpriseContract;
}

export interface GovernanceValidationContext {
  readonly now: string;
  readonly expectedCandidateId?: string;
  readonly expectedTenantId?: string;
}

export interface GovernanceDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
  readonly severity: GovernanceDiagnosticSeverity;
}

export interface GovernanceValidationResult {
  readonly status: GovernanceValidationStatus;
  readonly valid: boolean;
  readonly authority: "NONE";
  readonly approval: "NOT_SYNTHESIZED";
  readonly claimPromotion: "BLOCKED";
  readonly canPromote: false;
  readonly diagnostics: readonly GovernanceDiagnostic[];
}

const MAX_DEPTH = 32;
const MAX_NODES = 4096;
const MAX_EVIDENCE_ITEMS = 128;
const MAX_TEXT_LENGTH = 1024;
const MAX_EVIDENCE_AGE_MS = 86_400_000;
const EVIDENCE_ID_PATTERN = /^\w[\w.:-]{0,127}$/;
const DIGEST_PATTERN = /^(?:sha256:[0-9a-f]{64}|sha512:[0-9a-f]{128})$/;
const UNOWNED = new Set([
  "",
  "unassigned",
  "unowned",
  "tbd",
  "unknown",
  "none",
  "n/a",
]);
const SAFE_POLICY_VALUES = new Set([
  "BLOCKED",
  "FORBIDDEN",
  "LOCAL_ONLY",
  "NONE",
  "NOT_RUN",
  "READ_ONLY",
  "VALID",
]);
const POSITIVE_CLAIM_VALUES = new Set([
  "APPROVED",
  "AUTHORIZED",
  "CERTIFIED",
  "ENTERPRISE_CERTIFIED",
  "GO",
  "PASS",
  "SUCCESS",
]);
const AUTHORITY_KEYS = new Set([
  "authority",
  "certification",
  "claim",
  "claimpromotion",
  "decision",
  "gate",
  "outcome",
  "promotion",
  "result",
  "status",
  "verdict",
]);
const PERSISTENCE_KEYS = new Set([
  "credential",
  "credentials",
  "egress",
  "filesystemwrite",
  "hosted",
  "networkaccess",
  "persist",
  "persisted",
  "prompt",
  "prompts",
  "rawreport",
  "rawreports",
  "secret",
  "secrets",
  "source",
  "sourcecode",
  "token",
  "tokens",
  "upload",
  "uploads",
  "write",
  "writes",
]);

type UnknownRecord = Record<string, unknown>;

const OWNER_DEFAULT: GovernanceOwner = Object.freeze({
  id: null,
  state: "BLOCKED",
  reviewedAt: null,
  validUntil: null,
});

const APPROVAL_M33_DEFAULT: GovernanceApproval = Object.freeze({
  state: "BLOCKED",
  scope: "M33_PILOT",
  approverId: null,
  approvedAt: null,
  validUntil: null,
  evidence: Object.freeze([]),
});

const APPROVAL_M34_DEFAULT: GovernanceApproval = Object.freeze({
  state: "BLOCKED",
  scope: "M34_ASSURANCE",
  approverId: null,
  approvedAt: null,
  validUntil: null,
  evidence: Object.freeze([]),
});

const ARCHITECTURE_DEFAULT: GovernanceArchitecture = Object.freeze({
  localAuthority: "LOCAL",
  controlPlane: "OPTIONAL",
  mode: "READ_ONLY",
  network: "FORBIDDEN",
  hostedDependency: "FORBIDDEN",
  writes: "FORBIDDEN",
  status: "BLOCKED",
});

const TENANCY_DEFAULT: GovernanceTenancy = Object.freeze({
  tenantModel: "ORGANIZATION_INSTALLATION",
  tenantId: null,
  repositoryScope: "REPOSITORY",
  repositoryIds: Object.freeze([]),
  userScope: "USER",
  userIds: Object.freeze([]),
  crossTenantAccess: "FORBIDDEN",
  isolation: "NOT_RUN",
  status: "BLOCKED",
});

const CONSENT_DEFAULT: GovernanceConsent = Object.freeze({
  required: true,
  state: "NOT_REQUESTED",
  purpose: "NO_EXTERNAL_SYNC",
  approverId: null,
  grantedAt: null,
  validUntil: null,
  evidence: Object.freeze([]),
  status: "BLOCKED",
});

const OPERATING_DEFAULT: GovernanceOperating = Object.freeze({
  mode: "LOCAL_READ_ONLY",
  transport: "NONE",
  failOpen: true,
  queue: "NOT_RUN",
  audit: "APPEND_ONLY_DECLARED",
  reconciliation: "NOT_RUN",
  status: "BLOCKED",
});

const PERSISTENCE_DEFAULT: GovernancePersistence = Object.freeze({
  mode: "LOCAL_READ_ONLY",
  source: "FORBIDDEN",
  prompts: "FORBIDDEN",
  secrets: "FORBIDDEN",
  rawReports: "FORBIDDEN",
  network: "FORBIDDEN",
  status: "BLOCKED",
});

const RETENTION_DEFAULT: GovernanceRetention = Object.freeze({
  policy: "NOT_DEFINED",
  retentionDays: null,
  legalHold: "NOT_RUN",
  deletion: "NOT_RUN",
  export: "NOT_RUN",
  status: "BLOCKED",
});

const OFFLINE_DEFAULT: GovernanceOffline = Object.freeze({
  localVerdict: "AUTHORITATIVE",
  sync: "NOT_RUN",
  queue: "NOT_RUN",
  reconciliation: "NOT_RUN",
  status: "BLOCKED",
});

const RECOVERY_DEFAULT: GovernanceRecovery = Object.freeze({
  backup: "NOT_RUN",
  restore: "NOT_RUN",
  rollback: "NOT_RUN",
  incident: "NOT_RUN",
  status: "BLOCKED",
});

const RPO_RTO_DEFAULT: GovernanceRpoRto = Object.freeze({
  rpo: Object.freeze({
    targetMinutes: null,
    observedMinutes: null,
    evidenceId: null,
    status: "NOT_RUN",
  }),
  rto: Object.freeze({
    targetMinutes: null,
    observedMinutes: null,
    evidenceId: null,
    status: "NOT_RUN",
  }),
  status: "BLOCKED",
});

const PILOT_DEFAULT: M33PilotContract = Object.freeze({
  state: "NOT_RUN",
  cohort: "NOT_RUN",
  productApproval: "NOT_RUN",
  securityApproval: "NOT_RUN",
  status: "BLOCKED",
});

const ENTERPRISE_DEFAULT: M34EnterpriseContract = Object.freeze({
  claim: "BLOCKED",
  promotion: "FORBIDDEN",
  independentReview: "NOT_RUN",
  threatModel: "NOT_RUN",
  airGapped: "NOT_RUN",
  status: "BLOCKED",
});

const EVIDENCE_DEFAULT: GovernanceEvidencePackage = Object.freeze({
  state: "NOT_RUN",
  candidateId: null,
  tenantId: null,
  items: Object.freeze([]),
  scrubbed: null,
  content: "METADATA_ONLY",
  status: "BLOCKED",
});

function freezeRecord<T extends object>(value: T): Readonly<T> {
  if (Object.isFrozen(value)) return value;
  for (const key of Object.keys(value)) {
    const child = (value as UnknownRecord)[key];
    if (
      child !== null &&
      typeof child === "object" &&
      !Object.isFrozen(child)
    ) {
      freezeRecord(child);
    }
  }
  return Object.freeze(value);
}

function makeBase(
  train: M33M34Train,
  recordId: string,
): GovernanceAssuranceRecordBase {
  return freezeRecord({
    schema: M33_M34_SCHEMA,
    schemaVersion: 1,
    train,
    recordId,
    status: "BLOCKED",
    executionStatus: "NOT_RUN",
    authority: "NONE",
    claimPromotion: "BLOCKED",
    owner: OWNER_DEFAULT,
    approval: train === M33_TRAIN ? APPROVAL_M33_DEFAULT : APPROVAL_M34_DEFAULT,
    architecture: ARCHITECTURE_DEFAULT,
    tenancy: TENANCY_DEFAULT,
    consent: CONSENT_DEFAULT,
    operating: OPERATING_DEFAULT,
    evidencePackage: EVIDENCE_DEFAULT,
    retention: RETENTION_DEFAULT,
    offline: OFFLINE_DEFAULT,
    recovery: RECOVERY_DEFAULT,
    rpoRto: RPO_RTO_DEFAULT,
    persistence: PERSISTENCE_DEFAULT,
  });
}

export const M33_CONTROL_PLANE_RECORD: M33ControlPlaneRecord = freezeRecord({
  ...makeBase(M33_TRAIN, "GOV-M33-001"),
  pilot: PILOT_DEFAULT,
}) as M33ControlPlaneRecord;

export const M34_ASSURANCE_RECORD: M34AssuranceRecord = freezeRecord({
  ...makeBase(M34_TRAIN, "ASS-M34-001"),
  enterprise: ENTERPRISE_DEFAULT,
}) as M34AssuranceRecord;

export const M33_M34_RECORDS = Object.freeze([
  M33_CONTROL_PLANE_RECORD,
  M34_ASSURANCE_RECORD,
] as const);

export function createM33ControlPlaneRecord(): M33ControlPlaneRecord {
  return M33_CONTROL_PLANE_RECORD;
}

export function createM34AssuranceRecord(): M34AssuranceRecord {
  return M34_ASSURANCE_RECORD;
}

function isRecord(value: unknown): value is UnknownRecord {
  try {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value) as unknown;
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function addDiagnostic(
  diagnostics: GovernanceDiagnostic[],
  code: string,
  path: string,
  message: string,
  severity: GovernanceDiagnosticSeverity = "error",
): void {
  diagnostics.push({ code, path, message, severity });
}

function readOwn(
  value: UnknownRecord,
  key: string,
  path: string,
  diagnostics: GovernanceDiagnostic[],
): unknown {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(value, key);
  } catch {
    addDiagnostic(
      diagnostics,
      "HOSTILE_OBJECT",
      path,
      "Object could not be inspected",
    );
    return undefined;
  }
  if (descriptor === undefined) return undefined;
  if (!("value" in descriptor)) {
    addDiagnostic(
      diagnostics,
      "ACCESSOR_FORBIDDEN",
      path,
      "Accessor properties are not accepted",
    );
    return undefined;
  }
  return descriptor.value;
}

function keysOf(
  value: UnknownRecord,
  path: string,
  diagnostics: GovernanceDiagnostic[],
): string[] {
  try {
    return Object.keys(value).sort();
  } catch {
    addDiagnostic(
      diagnostics,
      "HOSTILE_OBJECT",
      path,
      "Object keys could not be inspected",
    );
    return [];
  }
}

function checkKeys(
  value: UnknownRecord,
  expected: readonly string[],
  path: string,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  const expectedSet = new Set(expected);
  const unexpected = keysOf(value, path, diagnostics).filter(
    (key) => !expectedSet.has(key),
  );
  if (unexpected.length === 0) return true;
  addDiagnostic(
    diagnostics,
    "UNKNOWN_FIELD",
    path,
    `Unexpected field${unexpected.length === 1 ? "" : "s"}: ${unexpected.join(", ")}`,
  );
  return false;
}

function stringValue(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
  allowNull = false,
): string | null {
  if (allowNull && value === null) return null;
  if (
    typeof value !== "string" ||
    value.trim().length === 0 ||
    value.length > MAX_TEXT_LENGTH
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "Expected a bounded non-empty string",
    );
    return null;
  }
  return value;
}

function boolValue(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
): boolean | null {
  if (typeof value !== "boolean") {
    addDiagnostic(diagnostics, "INVALID_FIELD", path, "Expected a boolean");
    return null;
  }
  return value;
}

function numberValue(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
  minimum = 0,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      `Expected a finite number >= ${minimum}`,
    );
    return null;
  }
  return value;
}

function parseTime(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
  allowNull = true,
): number | null {
  if (allowNull && value === null) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "Expected an ISO-8601 timestamp",
    );
    return null;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "Expected an ISO-8601 timestamp",
    );
    return null;
  }
  return parsed;
}

function stringArray(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
  required = false,
): boolean {
  if (!Array.isArray(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "Expected an array of strings",
    );
    return false;
  }
  let valid = true;
  if (required && value.length === 0) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      path,
      "At least one value is required",
    );
    valid = false;
  }
  for (const [index, item] of value.entries()) {
    if (
      typeof item !== "string" ||
      item.trim().length === 0 ||
      item.length > MAX_TEXT_LENGTH
    ) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}[${index}]`,
        "Expected a bounded non-empty string",
      );
      valid = false;
    }
  }
  return valid;
}

function exact(
  value: unknown,
  expected: string,
  path: string,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (value !== expected) {
    addDiagnostic(diagnostics, "INVALID_FIELD", path, `Expected ${expected}`);
    return false;
  }
  return true;
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  path: string,
  diagnostics: GovernanceDiagnostic[],
): T | null {
  if (typeof value !== "string" || !values.some((entry) => entry === value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      `Expected one of: ${values.join(", ")}`,
    );
    return null;
  }
  return value as T;
}

function scanForClaimsAndPersistence(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
  depth = 0,
  state = { nodes: 0, seen: new WeakSet<object>() },
): boolean {
  if (depth > MAX_DEPTH) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      "$",
      `Input exceeds depth ${MAX_DEPTH}`,
    );
    return false;
  }
  state.nodes += 1;
  if (state.nodes > MAX_NODES) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      "$",
      `Input exceeds ${MAX_NODES} nodes`,
    );
    return false;
  }
  if (value === null || typeof value !== "object") {
    return true;
  }
  if (state.seen.has(value)) return true;
  state.seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > MAX_EVIDENCE_ITEMS) {
      addDiagnostic(
        diagnostics,
        "RESOURCE_LIMIT",
        "$",
        `Array exceeds ${MAX_EVIDENCE_ITEMS} items`,
      );
      return false;
    }
    for (const item of value) {
      if (!scanForClaimsAndPersistence(item, diagnostics, depth + 1, state))
        return false;
    }
    return true;
  }
  if (!isRecord(value)) return true;
  for (const key of keysOf(value, "$", diagnostics)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const descriptor = (() => {
      try {
        return Object.getOwnPropertyDescriptor(value, key);
      } catch {
        return undefined;
      }
    })();
    if (descriptor === undefined || !("value" in descriptor)) {
      addDiagnostic(
        diagnostics,
        "ACCESSOR_FORBIDDEN",
        `$.${key}`,
        "Accessor properties are not accepted",
      );
      return false;
    }
    const child: unknown = descriptor.value;
    if (
      typeof child === "string" &&
      AUTHORITY_KEYS.has(normalized) &&
      POSITIVE_CLAIM_VALUES.has(child.toUpperCase())
    ) {
      const enterpriseClaim =
        normalized === "claim" ||
        normalized === "claimpromotion" ||
        normalized === "promotion";
      addDiagnostic(
        diagnostics,
        enterpriseClaim
          ? "ENTERPRISE_CLAIM_FORBIDDEN"
          : "AUTHORITY_CLAIM_FORBIDDEN",
        `$.${key}`,
        enterpriseClaim
          ? "Enterprise claim promotion is forbidden"
          : "A validator cannot accept a positive authority claim",
        enterpriseClaim ? "warning" : "error",
      );
    }
    if (PERSISTENCE_KEYS.has(normalized)) {
      const safe =
        typeof child === "string" &&
        SAFE_POLICY_VALUES.has(child.toUpperCase());
      if (!safe) {
        addDiagnostic(
          diagnostics,
          "FORBIDDEN_PERSISTENCE",
          `$.${key}`,
          "Source, secrets, prompts, raw reports, writes, and network persistence are forbidden",
        );
      }
    }
    if (!scanForClaimsAndPersistence(child, diagnostics, depth + 1, state))
      return false;
  }
  return true;
}

function validateOwner(
  value: unknown,
  path: string,
  nowMs: number,
  diagnostics: GovernanceDiagnostic[],
): { id: string | null; fresh: boolean } {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "OWNER_MISSING",
      path,
      "A named owner is required",
      "warning",
    );
    return { id: null, fresh: false };
  }
  checkKeys(
    value,
    ["id", "state", "reviewedAt", "validUntil"],
    path,
    diagnostics,
  );
  const id = stringValue(
    readOwn(value, "id", `${path}.id`, diagnostics),
    `${path}.id`,
    diagnostics,
    true,
  );
  const state = oneOf(
    readOwn(value, "state", `${path}.state`, diagnostics),
    ["BLOCKED", "ASSIGNED"],
    `${path}.state`,
    diagnostics,
  );
  const reviewedAt = parseTime(
    readOwn(value, "reviewedAt", `${path}.reviewedAt`, diagnostics),
    `${path}.reviewedAt`,
    diagnostics,
  );
  const validUntil = parseTime(
    readOwn(value, "validUntil", `${path}.validUntil`, diagnostics),
    `${path}.validUntil`,
    diagnostics,
  );
  if (id !== null && UNOWNED.has(id.trim().toLowerCase())) {
    addDiagnostic(
      diagnostics,
      "OWNER_UNASSIGNED",
      `${path}.id`,
      "Owner must be a named accountable person",
      "warning",
    );
  }
  if (reviewedAt !== null && validUntil !== null && validUntil <= nowMs) {
    addDiagnostic(
      diagnostics,
      "OWNER_STALE",
      `${path}.validUntil`,
      "Owner review is stale and requires revalidation",
      "warning",
    );
  }
  if (
    state !== "ASSIGNED" ||
    id === null ||
    UNOWNED.has(id.trim().toLowerCase())
  ) {
    addDiagnostic(
      diagnostics,
      "OWNER_MISSING",
      path,
      "A current named owner is required",
      "warning",
    );
    return { id, fresh: false };
  }
  if (reviewedAt === null || validUntil === null) {
    addDiagnostic(
      diagnostics,
      "OWNER_REVIEW_MISSING",
      path,
      "Owner review dates are required",
      "warning",
    );
    return { id, fresh: false };
  }
  if (reviewedAt > nowMs) {
    addDiagnostic(
      diagnostics,
      "OWNER_REVIEW_FUTURE",
      `${path}.reviewedAt`,
      "Owner review cannot be in the future",
    );
    return { id, fresh: false };
  }
  if (validUntil <= reviewedAt) {
    addDiagnostic(
      diagnostics,
      "OWNER_REVIEW_INVALID",
      `${path}.validUntil`,
      "Owner validity must follow review",
    );
    return { id, fresh: false };
  }
  return { id, fresh: true };
}

function validateApproval(
  value: unknown,
  train: M33M34Train,
  ownerId: string | null,
  nowMs: number,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_APPROVAL",
      "$.approval",
      "Human approval is required",
      "warning",
    );
    return false;
  }
  checkKeys(
    value,
    ["state", "scope", "approverId", "approvedAt", "validUntil", "evidence"],
    "$.approval",
    diagnostics,
  );
  const state = oneOf(
    readOwn(value, "state", "$.approval.state", diagnostics),
    ["BLOCKED", "APPROVED"],
    "$.approval.state",
    diagnostics,
  );
  const expectedScope = train === M33_TRAIN ? "M33_PILOT" : "M34_ASSURANCE";
  exact(
    readOwn(value, "scope", "$.approval.scope", diagnostics),
    expectedScope,
    "$.approval.scope",
    diagnostics,
  );
  const approverId = stringValue(
    readOwn(value, "approverId", "$.approval.approverId", diagnostics),
    "$.approval.approverId",
    diagnostics,
    true,
  );
  const approvedAt = parseTime(
    readOwn(value, "approvedAt", "$.approval.approvedAt", diagnostics),
    "$.approval.approvedAt",
    diagnostics,
  );
  const validUntil = parseTime(
    readOwn(value, "validUntil", "$.approval.validUntil", diagnostics),
    "$.approval.validUntil",
    diagnostics,
  );
  const evidence = readOwn(
    value,
    "evidence",
    "$.approval.evidence",
    diagnostics,
  );
  stringArray(
    evidence,
    "$.approval.evidence",
    diagnostics,
    state === "APPROVED",
  );
  if (state !== "APPROVED") {
    addDiagnostic(
      diagnostics,
      "APPROVAL_REQUIRED",
      "$.approval.state",
      "Approval is not recorded; validation cannot synthesize it",
      "warning",
    );
    return false;
  }
  if (
    approverId === null ||
    approvedAt === null ||
    validUntil === null ||
    !Array.isArray(evidence) ||
    evidence.length === 0
  ) {
    addDiagnostic(
      diagnostics,
      "APPROVAL_INCOMPLETE",
      "$.approval",
      "Approved records require approver, dates, and evidence",
      "warning",
    );
    return false;
  }
  if (approvedAt > nowMs) {
    addDiagnostic(
      diagnostics,
      "APPROVAL_FUTURE",
      "$.approval.approvedAt",
      "Approval cannot be in the future",
    );
    return false;
  }
  if (validUntil <= approvedAt) {
    addDiagnostic(
      diagnostics,
      "APPROVAL_INVALID",
      "$.approval.validUntil",
      "Approval validity must follow approval",
    );
    return false;
  }
  if (validUntil <= nowMs) {
    addDiagnostic(
      diagnostics,
      "APPROVAL_STALE",
      "$.approval.validUntil",
      "Approval is stale",
      "warning",
    );
    return false;
  }
  if (ownerId !== null && approverId === ownerId) {
    addDiagnostic(
      diagnostics,
      "SELF_APPROVAL",
      "$.approval.approverId",
      "An owner cannot approve their own record",
    );
    return false;
  }
  return true;
}

function validateArchitecture(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.architecture",
      "Architecture contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    [
      "localAuthority",
      "controlPlane",
      "mode",
      "network",
      "hostedDependency",
      "writes",
      "status",
    ],
    "$.architecture",
    diagnostics,
  );
  return [
    exact(
      readOwn(
        value,
        "localAuthority",
        "$.architecture.localAuthority",
        diagnostics,
      ),
      "LOCAL",
      "$.architecture.localAuthority",
      diagnostics,
    ),
    exact(
      readOwn(
        value,
        "controlPlane",
        "$.architecture.controlPlane",
        diagnostics,
      ),
      "OPTIONAL",
      "$.architecture.controlPlane",
      diagnostics,
    ),
    exact(
      readOwn(value, "mode", "$.architecture.mode", diagnostics),
      "READ_ONLY",
      "$.architecture.mode",
      diagnostics,
    ),
    exact(
      readOwn(value, "network", "$.architecture.network", diagnostics),
      "FORBIDDEN",
      "$.architecture.network",
      diagnostics,
    ),
    exact(
      readOwn(
        value,
        "hostedDependency",
        "$.architecture.hostedDependency",
        diagnostics,
      ),
      "FORBIDDEN",
      "$.architecture.hostedDependency",
      diagnostics,
    ),
    exact(
      readOwn(value, "writes", "$.architecture.writes", diagnostics),
      "FORBIDDEN",
      "$.architecture.writes",
      diagnostics,
    ),
    oneOf(
      readOwn(value, "status", "$.architecture.status", diagnostics),
      ["BLOCKED", "VALID"],
      "$.architecture.status",
      diagnostics,
    ),
  ].every(Boolean);
}

function validateTenancy(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): string | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.tenancy",
      "Tenancy contract is required",
    );
    return null;
  }
  checkKeys(
    value,
    [
      "tenantModel",
      "tenantId",
      "repositoryScope",
      "repositoryIds",
      "userScope",
      "userIds",
      "crossTenantAccess",
      "isolation",
      "status",
    ],
    "$.tenancy",
    diagnostics,
  );
  exact(
    readOwn(value, "tenantModel", "$.tenancy.tenantModel", diagnostics),
    "ORGANIZATION_INSTALLATION",
    "$.tenancy.tenantModel",
    diagnostics,
  );
  exact(
    readOwn(value, "repositoryScope", "$.tenancy.repositoryScope", diagnostics),
    "REPOSITORY",
    "$.tenancy.repositoryScope",
    diagnostics,
  );
  exact(
    readOwn(value, "userScope", "$.tenancy.userScope", diagnostics),
    "USER",
    "$.tenancy.userScope",
    diagnostics,
  );
  exact(
    readOwn(
      value,
      "crossTenantAccess",
      "$.tenancy.crossTenantAccess",
      diagnostics,
    ),
    "FORBIDDEN",
    "$.tenancy.crossTenantAccess",
    diagnostics,
  );
  oneOf(
    readOwn(value, "isolation", "$.tenancy.isolation", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.tenancy.isolation",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.tenancy.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.tenancy.status",
    diagnostics,
  );
  const tenantId = stringValue(
    readOwn(value, "tenantId", "$.tenancy.tenantId", diagnostics),
    "$.tenancy.tenantId",
    diagnostics,
    true,
  );
  stringArray(
    readOwn(value, "repositoryIds", "$.tenancy.repositoryIds", diagnostics),
    "$.tenancy.repositoryIds",
    diagnostics,
  );
  stringArray(
    readOwn(value, "userIds", "$.tenancy.userIds", diagnostics),
    "$.tenancy.userIds",
    diagnostics,
  );
  return tenantId;
}

function validateConsent(
  value: unknown,
  nowMs: number,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.consent",
      "Consent contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    [
      "required",
      "state",
      "purpose",
      "approverId",
      "grantedAt",
      "validUntil",
      "evidence",
      "status",
    ],
    "$.consent",
    diagnostics,
  );
  const required = boolValue(
    readOwn(value, "required", "$.consent.required", diagnostics),
    "$.consent.required",
    diagnostics,
  );
  if (required !== true)
    addDiagnostic(
      diagnostics,
      "CONSENT_REQUIRED",
      "$.consent.required",
      "External evidence requires consent",
    );
  const state = oneOf(
    readOwn(value, "state", "$.consent.state", diagnostics),
    ["NOT_REQUESTED", "CONSENTED", "REVOKED"],
    "$.consent.state",
    diagnostics,
  );
  oneOf(
    readOwn(value, "purpose", "$.consent.purpose", diagnostics),
    ["NO_EXTERNAL_SYNC", "CONSENTED_PILOT"],
    "$.consent.purpose",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.consent.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.consent.status",
    diagnostics,
  );
  const approverId = stringValue(
    readOwn(value, "approverId", "$.consent.approverId", diagnostics),
    "$.consent.approverId",
    diagnostics,
    true,
  );
  const grantedAt = parseTime(
    readOwn(value, "grantedAt", "$.consent.grantedAt", diagnostics),
    "$.consent.grantedAt",
    diagnostics,
  );
  const validUntil = parseTime(
    readOwn(value, "validUntil", "$.consent.validUntil", diagnostics),
    "$.consent.validUntil",
    diagnostics,
  );
  const evidence = readOwn(
    value,
    "evidence",
    "$.consent.evidence",
    diagnostics,
  );
  stringArray(
    evidence,
    "$.consent.evidence",
    diagnostics,
    state === "CONSENTED",
  );
  if (state === "REVOKED") {
    addDiagnostic(
      diagnostics,
      "CONSENT_REVOKED",
      "$.consent.state",
      "Revoked consent blocks external evidence",
    );
    return false;
  }
  if (state !== "CONSENTED") {
    addDiagnostic(
      diagnostics,
      "CONSENT_REQUIRED",
      "$.consent.state",
      "Consent is not recorded; validation cannot synthesize it",
      "warning",
    );
    return false;
  }
  if (
    approverId === null ||
    grantedAt === null ||
    validUntil === null ||
    !Array.isArray(evidence) ||
    evidence.length === 0
  ) {
    addDiagnostic(
      diagnostics,
      "CONSENT_INCOMPLETE",
      "$.consent",
      "Consented records require grantor, dates, and evidence",
      "warning",
    );
    return false;
  }
  if (grantedAt > nowMs) {
    addDiagnostic(
      diagnostics,
      "CONSENT_FUTURE",
      "$.consent.grantedAt",
      "Consent cannot be in the future",
    );
    return false;
  }
  if (validUntil <= grantedAt) {
    addDiagnostic(
      diagnostics,
      "CONSENT_INVALID",
      "$.consent.validUntil",
      "Consent validity must follow grant",
    );
    return false;
  }
  if (validUntil <= nowMs) {
    addDiagnostic(
      diagnostics,
      "CONSENT_STALE",
      "$.consent.validUntil",
      "Consent is stale",
      "warning",
    );
    return false;
  }
  return true;
}

function validateOperating(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.operating",
      "Operating contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    [
      "mode",
      "transport",
      "failOpen",
      "queue",
      "audit",
      "reconciliation",
      "status",
    ],
    "$.operating",
    diagnostics,
  );
  exact(
    readOwn(value, "mode", "$.operating.mode", diagnostics),
    "LOCAL_READ_ONLY",
    "$.operating.mode",
    diagnostics,
  );
  exact(
    readOwn(value, "transport", "$.operating.transport", diagnostics),
    "NONE",
    "$.operating.transport",
    diagnostics,
  );
  const failOpen = boolValue(
    readOwn(value, "failOpen", "$.operating.failOpen", diagnostics),
    "$.operating.failOpen",
    diagnostics,
  );
  if (failOpen !== true)
    addDiagnostic(
      diagnostics,
      "FAIL_OPEN_REQUIRED",
      "$.operating.failOpen",
      "Optional transport failure must preserve local verdicts",
    );
  oneOf(
    readOwn(value, "queue", "$.operating.queue", diagnostics),
    ["NOT_RUN", "BLOCKED", "EMPTY"],
    "$.operating.queue",
    diagnostics,
  );
  exact(
    readOwn(value, "audit", "$.operating.audit", diagnostics),
    "APPEND_ONLY_DECLARED",
    "$.operating.audit",
    diagnostics,
  );
  oneOf(
    readOwn(value, "reconciliation", "$.operating.reconciliation", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.operating.reconciliation",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.operating.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.operating.status",
    diagnostics,
  );
  return true;
}

function validatePersistence(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "FORBIDDEN_PERSISTENCE",
      "$.persistence",
      "Persistence contract is required and must deny source data",
    );
    return false;
  }
  checkKeys(
    value,
    ["mode", "source", "prompts", "secrets", "rawReports", "network", "status"],
    "$.persistence",
    diagnostics,
  );
  exact(
    readOwn(value, "mode", "$.persistence.mode", diagnostics),
    "LOCAL_READ_ONLY",
    "$.persistence.mode",
    diagnostics,
  );
  exact(
    readOwn(value, "source", "$.persistence.source", diagnostics),
    "FORBIDDEN",
    "$.persistence.source",
    diagnostics,
  );
  exact(
    readOwn(value, "prompts", "$.persistence.prompts", diagnostics),
    "FORBIDDEN",
    "$.persistence.prompts",
    diagnostics,
  );
  exact(
    readOwn(value, "secrets", "$.persistence.secrets", diagnostics),
    "FORBIDDEN",
    "$.persistence.secrets",
    diagnostics,
  );
  exact(
    readOwn(value, "rawReports", "$.persistence.rawReports", diagnostics),
    "FORBIDDEN",
    "$.persistence.rawReports",
    diagnostics,
  );
  exact(
    readOwn(value, "network", "$.persistence.network", diagnostics),
    "FORBIDDEN",
    "$.persistence.network",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.persistence.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.persistence.status",
    diagnostics,
  );
  return true;
}

function validateEvidenceReference(
  value: unknown,
  path: string,
  expectedCandidateId: string | null,
  expectedTenantId: string | null,
  nowMs: number,
  diagnostics: GovernanceDiagnostic[],
): string | null {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      path,
      "Evidence references must be objects",
    );
    return null;
  }
  checkKeys(
    value,
    [
      "evidenceId",
      "kind",
      "candidateId",
      "tenantId",
      "ownerId",
      "observedAt",
      "digest",
      "scrubbed",
      "content",
      "status",
    ],
    path,
    diagnostics,
  );
  const evidenceId = stringValue(
    readOwn(value, "evidenceId", `${path}.evidenceId`, diagnostics),
    `${path}.evidenceId`,
    diagnostics,
  );
  if (evidenceId !== null && !EVIDENCE_ID_PATTERN.test(evidenceId)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      `${path}.evidenceId`,
      "Evidence IDs must be bounded identifiers",
    );
  }
  oneOf(
    readOwn(value, "kind", `${path}.kind`, diagnostics),
    GOVERNANCE_EVIDENCE_KINDS,
    `${path}.kind`,
    diagnostics,
  );
  const candidateId = stringValue(
    readOwn(value, "candidateId", `${path}.candidateId`, diagnostics),
    `${path}.candidateId`,
    diagnostics,
    true,
  );
  const tenantId = stringValue(
    readOwn(value, "tenantId", `${path}.tenantId`, diagnostics),
    `${path}.tenantId`,
    diagnostics,
    true,
  );
  const ownerId = stringValue(
    readOwn(value, "ownerId", `${path}.ownerId`, diagnostics),
    `${path}.ownerId`,
    diagnostics,
    true,
  );
  const observedAt = parseTime(
    readOwn(value, "observedAt", `${path}.observedAt`, diagnostics),
    `${path}.observedAt`,
    diagnostics,
  );
  const digest = stringValue(
    readOwn(value, "digest", `${path}.digest`, diagnostics),
    `${path}.digest`,
    diagnostics,
    true,
  );
  if (digest !== null && !DIGEST_PATTERN.test(digest)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      `${path}.digest`,
      "Evidence digests must be explicit SHA-256 or SHA-512 values",
    );
  }
  const scrubbed = readOwn(value, "scrubbed", `${path}.scrubbed`, diagnostics);
  if (scrubbed !== null && typeof scrubbed !== "boolean")
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      `${path}.scrubbed`,
      "Evidence scrubbed state must be boolean or null",
    );
  exact(
    readOwn(value, "content", `${path}.content`, diagnostics),
    "METADATA_ONLY",
    `${path}.content`,
    diagnostics,
  );
  const status = oneOf(
    readOwn(value, "status", `${path}.status`, diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    `${path}.status`,
    diagnostics,
  )
    ? (readOwn(value, "status", `${path}.status`, diagnostics) as
        "NOT_RUN" | "BLOCKED" | "COMPLETE")
    : "NOT_RUN";
  if (status !== "COMPLETE")
    addDiagnostic(
      diagnostics,
      "EVIDENCE_NOT_RUN",
      `${path}.status`,
      "Evidence is not complete",
      "warning",
    );
  if (scrubbed !== true)
    addDiagnostic(
      diagnostics,
      "EVIDENCE_NOT_SCRUBBED",
      `${path}.scrubbed`,
      "Only scrubbed metadata evidence is allowed",
      "warning",
    );
  if (
    evidenceId === null ||
    candidateId === null ||
    tenantId === null ||
    ownerId === null ||
    observedAt === null ||
    digest === null ||
    status !== "COMPLETE" ||
    scrubbed !== true
  ) {
    addDiagnostic(
      diagnostics,
      "EVIDENCE_INCOMPLETE",
      path,
      "Complete evidence requires identity, owner, digest, time, and scrubbed metadata",
    );
    return evidenceId;
  }
  const expectedCandidate = expectedCandidateId ?? candidateId;
  const expectedTenant = expectedTenantId ?? tenantId;
  if (candidateId !== expectedCandidate) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_EVIDENCE",
      `${path}.candidateId`,
      "Evidence belongs to another candidate",
      "warning",
    );
  }
  if (tenantId !== expectedTenant) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_EVIDENCE",
      `${path}.tenantId`,
      "Evidence belongs to another tenant",
      "warning",
    );
  }
  if (observedAt > nowMs) {
    addDiagnostic(
      diagnostics,
      "EVIDENCE_FUTURE",
      `${path}.observedAt`,
      "Evidence cannot be observed in the future",
    );
  } else if (nowMs - observedAt > MAX_EVIDENCE_AGE_MS) {
    addDiagnostic(
      diagnostics,
      "STALE_EVIDENCE",
      `${path}.observedAt`,
      "Evidence is stale",
    );
  }
  return evidenceId;
}

function validateEvidencePackage(
  value: unknown,
  context: GovernanceValidationContext,
  tenantId: string | null,
  nowMs: number,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.evidencePackage",
      "Evidence package contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    [
      "state",
      "candidateId",
      "tenantId",
      "items",
      "scrubbed",
      "content",
      "status",
    ],
    "$.evidencePackage",
    diagnostics,
  );
  const state = oneOf(
    readOwn(value, "state", "$.evidencePackage.state", diagnostics),
    ["NOT_RUN", "BLOCKED", "PRESENT"],
    "$.evidencePackage.state",
    diagnostics,
  );
  const candidateId = stringValue(
    readOwn(value, "candidateId", "$.evidencePackage.candidateId", diagnostics),
    "$.evidencePackage.candidateId",
    diagnostics,
    true,
  );
  const packageTenantId = stringValue(
    readOwn(value, "tenantId", "$.evidencePackage.tenantId", diagnostics),
    "$.evidencePackage.tenantId",
    diagnostics,
    true,
  );
  const items = readOwn(value, "items", "$.evidencePackage.items", diagnostics);
  const scrubbed = readOwn(
    value,
    "scrubbed",
    "$.evidencePackage.scrubbed",
    diagnostics,
  );
  if (scrubbed !== null && typeof scrubbed !== "boolean")
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      "$.evidencePackage.scrubbed",
      "Evidence scrubbed state must be boolean or null",
    );
  exact(
    readOwn(value, "content", "$.evidencePackage.content", diagnostics),
    "METADATA_ONLY",
    "$.evidencePackage.content",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.evidencePackage.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.evidencePackage.status",
    diagnostics,
  );
  if (!Array.isArray(items)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      "$.evidencePackage.items",
      "Evidence items must be an array",
    );
    return false;
  }
  if (items.length > MAX_EVIDENCE_ITEMS) {
    addDiagnostic(
      diagnostics,
      "RESOURCE_LIMIT",
      "$.evidencePackage.items",
      `Evidence package exceeds ${MAX_EVIDENCE_ITEMS} items`,
    );
    return false;
  }
  const seen = new Set<string>();
  const expectedCandidate = context.expectedCandidateId ?? candidateId;
  const expectedTenant =
    context.expectedTenantId ?? packageTenantId ?? tenantId;
  if (expectedCandidate !== null && candidateId !== expectedCandidate) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_EVIDENCE",
      "$.evidencePackage.candidateId",
      "Evidence package belongs to another candidate",
      "warning",
    );
  }
  if (expectedTenant !== null && packageTenantId !== expectedTenant) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_EVIDENCE",
      "$.evidencePackage.tenantId",
      "Evidence package belongs to another tenant",
      "warning",
    );
  }
  if (
    state === "PRESENT" &&
    (candidateId === null ||
      packageTenantId === null ||
      items.length === 0 ||
      scrubbed !== true)
  ) {
    addDiagnostic(
      diagnostics,
      "EVIDENCE_INCOMPLETE",
      "$.evidencePackage",
      "Presented evidence requires candidate, tenant, items, and scrubbed metadata",
    );
  }
  if (state !== "PRESENT" && items.length > 0) {
    addDiagnostic(
      diagnostics,
      "EVIDENCE_STATE_INVALID",
      "$.evidencePackage.state",
      "Evidence items cannot accompany a not-run state",
    );
  }
  const evidenceStart = diagnostics.length;
  for (const [index, item] of items.entries()) {
    const evidenceId = validateEvidenceReference(
      item,
      `$.evidencePackage.items[${index}]`,
      expectedCandidate,
      expectedTenant,
      nowMs,
      diagnostics,
    );
    if (evidenceId !== null) {
      if (seen.has(evidenceId))
        addDiagnostic(
          diagnostics,
          "DUPLICATE_EVIDENCE",
          `$.evidencePackage.items[${index}].evidenceId`,
          "Evidence IDs must be unique",
        );
      seen.add(evidenceId);
    }
  }
  const evidenceBlocked = diagnostics
    .slice(evidenceStart)
    .some((diagnostic) =>
      [
        "EVIDENCE_NOT_RUN",
        "EVIDENCE_NOT_SCRUBBED",
        "EVIDENCE_INCOMPLETE",
        "EVIDENCE_FUTURE",
        "STALE_EVIDENCE",
        "FOREIGN_EVIDENCE",
        "DUPLICATE_EVIDENCE",
      ].includes(diagnostic.code),
    );
  return state === "PRESENT" && items.length > 0 && !evidenceBlocked;
}

function validateRetention(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.retention",
      "Retention contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    ["policy", "retentionDays", "legalHold", "deletion", "export", "status"],
    "$.retention",
    diagnostics,
  );
  oneOf(
    readOwn(value, "policy", "$.retention.policy", diagnostics),
    ["NOT_DEFINED", "DEFINED"],
    "$.retention.policy",
    diagnostics,
  );
  const retentionDays = readOwn(
    value,
    "retentionDays",
    "$.retention.retentionDays",
    diagnostics,
  );
  if (retentionDays !== null)
    numberValue(retentionDays, "$.retention.retentionDays", diagnostics, 0);
  oneOf(
    readOwn(value, "legalHold", "$.retention.legalHold", diagnostics),
    ["NOT_RUN", "BLOCKED", "ENABLED", "DISABLED"],
    "$.retention.legalHold",
    diagnostics,
  );
  oneOf(
    readOwn(value, "deletion", "$.retention.deletion", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.retention.deletion",
    diagnostics,
  );
  oneOf(
    readOwn(value, "export", "$.retention.export", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.retention.export",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.retention.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.retention.status",
    diagnostics,
  );
  return true;
}

function validateOffline(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.offline",
      "Offline contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    ["localVerdict", "sync", "queue", "reconciliation", "status"],
    "$.offline",
    diagnostics,
  );
  exact(
    readOwn(value, "localVerdict", "$.offline.localVerdict", diagnostics),
    "AUTHORITATIVE",
    "$.offline.localVerdict",
    diagnostics,
  );
  oneOf(
    readOwn(value, "sync", "$.offline.sync", diagnostics),
    ["NOT_RUN", "BLOCKED", "CONSENTED_OPTIONAL"],
    "$.offline.sync",
    diagnostics,
  );
  oneOf(
    readOwn(value, "queue", "$.offline.queue", diagnostics),
    ["NOT_RUN", "BLOCKED", "EMPTY"],
    "$.offline.queue",
    diagnostics,
  );
  oneOf(
    readOwn(value, "reconciliation", "$.offline.reconciliation", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.offline.reconciliation",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.offline.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.offline.status",
    diagnostics,
  );
  return true;
}

function validateRecovery(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.recovery",
      "Recovery contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    ["backup", "restore", "rollback", "incident", "status"],
    "$.recovery",
    diagnostics,
  );
  for (const key of ["backup", "restore", "rollback", "incident"] as const) {
    oneOf(
      readOwn(value, key, `$.recovery.${key}`, diagnostics),
      ["NOT_RUN", "BLOCKED", "COMPLETE"],
      `$.recovery.${key}`,
      diagnostics,
    );
  }
  oneOf(
    readOwn(value, "status", "$.recovery.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.recovery.status",
    diagnostics,
  );
  return true;
}

function validateServiceObjective(
  value: unknown,
  path: string,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      path,
      "RPO/RTO objective is required",
    );
    return false;
  }
  checkKeys(
    value,
    ["targetMinutes", "observedMinutes", "evidenceId", "status"],
    path,
    diagnostics,
  );
  const target = readOwn(
    value,
    "targetMinutes",
    `${path}.targetMinutes`,
    diagnostics,
  );
  const observed = readOwn(
    value,
    "observedMinutes",
    `${path}.observedMinutes`,
    diagnostics,
  );
  if (target !== null)
    numberValue(target, `${path}.targetMinutes`, diagnostics, 0);
  if (observed !== null)
    numberValue(observed, `${path}.observedMinutes`, diagnostics, 0);
  stringValue(
    readOwn(value, "evidenceId", `${path}.evidenceId`, diagnostics),
    `${path}.evidenceId`,
    diagnostics,
    true,
  );
  oneOf(
    readOwn(value, "status", `${path}.status`, diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    `${path}.status`,
    diagnostics,
  );
  if (
    observed !== null &&
    readOwn(value, "evidenceId", `${path}.evidenceId`, diagnostics) === null
  ) {
    addDiagnostic(
      diagnostics,
      "RPO_RTO_EVIDENCE_REQUIRED",
      path,
      "Observed objectives require evidence",
    );
  }
  if (
    typeof target === "number" &&
    typeof observed === "number" &&
    observed > target
  ) {
    addDiagnostic(
      diagnostics,
      "RPO_RTO_TARGET_EXCEEDED",
      path,
      "Observed objective exceeds target",
    );
  }
  return true;
}

function validateRpoRto(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.rpoRto",
      "RPO/RTO contract is required",
    );
    return false;
  }
  checkKeys(value, ["rpo", "rto", "status"], "$.rpoRto", diagnostics);
  const rpo = validateServiceObjective(
    readOwn(value, "rpo", "$.rpoRto.rpo", diagnostics),
    "$.rpoRto.rpo",
    diagnostics,
  );
  const rto = validateServiceObjective(
    readOwn(value, "rto", "$.rpoRto.rto", diagnostics),
    "$.rpoRto.rto",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.rpoRto.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.rpoRto.status",
    diagnostics,
  );
  return rpo && rto;
}

function validatePilot(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.pilot",
      "M33 pilot contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    ["state", "cohort", "productApproval", "securityApproval", "status"],
    "$.pilot",
    diagnostics,
  );
  const state = oneOf(
    readOwn(value, "state", "$.pilot.state", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.pilot.state",
    diagnostics,
  );
  oneOf(
    readOwn(value, "cohort", "$.pilot.cohort", diagnostics),
    ["NOT_RUN", "BLOCKED", "COMPLETE"],
    "$.pilot.cohort",
    diagnostics,
  );
  const productApproval = oneOf(
    readOwn(value, "productApproval", "$.pilot.productApproval", diagnostics),
    ["NOT_RUN", "BLOCKED", "APPROVED"],
    "$.pilot.productApproval",
    diagnostics,
  );
  const securityApproval = oneOf(
    readOwn(value, "securityApproval", "$.pilot.securityApproval", diagnostics),
    ["NOT_RUN", "BLOCKED", "APPROVED"],
    "$.pilot.securityApproval",
    diagnostics,
  );
  oneOf(
    readOwn(value, "status", "$.pilot.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.pilot.status",
    diagnostics,
  );
  if (
    state === "COMPLETE" &&
    (productApproval !== "APPROVED" || securityApproval !== "APPROVED")
  ) {
    addDiagnostic(
      diagnostics,
      "PILOT_APPROVAL_REQUIRED",
      "$.pilot",
      "M33 completion requires product and security approval",
      "warning",
    );
  }
  return true;
}

function validateEnterprise(
  value: unknown,
  diagnostics: GovernanceDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.enterprise",
      "M34 enterprise contract is required",
    );
    return false;
  }
  checkKeys(
    value,
    [
      "claim",
      "promotion",
      "independentReview",
      "threatModel",
      "airGapped",
      "status",
    ],
    "$.enterprise",
    diagnostics,
  );
  const claim = readOwn(value, "claim", "$.enterprise.claim", diagnostics);
  const promotion = readOwn(
    value,
    "promotion",
    "$.enterprise.promotion",
    diagnostics,
  );
  if (claim !== "BLOCKED" && claim !== "NOT_CLAIMED")
    addDiagnostic(
      diagnostics,
      "ENTERPRISE_CLAIM_FORBIDDEN",
      "$.enterprise.claim",
      "Enterprise claim must remain blocked or not claimed",
      "warning",
    );
  if (promotion !== "FORBIDDEN")
    addDiagnostic(
      diagnostics,
      "ENTERPRISE_CLAIM_FORBIDDEN",
      "$.enterprise.promotion",
      "Enterprise claim promotion is forbidden",
      "warning",
    );
  for (const key of [
    "independentReview",
    "threatModel",
    "airGapped",
  ] as const) {
    oneOf(
      readOwn(value, key, `$.enterprise.${key}`, diagnostics),
      ["NOT_RUN", "BLOCKED", "COMPLETE"],
      `$.enterprise.${key}`,
      diagnostics,
    );
  }
  oneOf(
    readOwn(value, "status", "$.enterprise.status", diagnostics),
    ["BLOCKED", "VALID"],
    "$.enterprise.status",
    diagnostics,
  );
  return true;
}

function nestedField(
  value: UnknownRecord,
  objectKey: string,
  fieldKey: string,
): unknown {
  const child = readOwn(value, objectKey, `$.${objectKey}`, []);
  return isRecord(child)
    ? readOwn(child, fieldKey, `$.${objectKey}.${fieldKey}`, [])
    : undefined;
}

function contractsAreComplete(
  value: UnknownRecord,
  train: M33M34Train,
): boolean {
  const architectureComplete =
    nestedField(value, "architecture", "status") === "VALID";
  const tenancyComplete =
    nestedField(value, "tenancy", "status") === "VALID" &&
    nestedField(value, "tenancy", "isolation") === "COMPLETE" &&
    typeof nestedField(value, "tenancy", "tenantId") === "string" &&
    Array.isArray(nestedField(value, "tenancy", "repositoryIds")) &&
    Array.isArray(nestedField(value, "tenancy", "userIds")) &&
    (nestedField(value, "tenancy", "repositoryIds") as unknown[]).length > 0 &&
    (nestedField(value, "tenancy", "userIds") as unknown[]).length > 0;
  const consentComplete =
    nestedField(value, "consent", "status") === "VALID" &&
    nestedField(value, "consent", "state") === "CONSENTED";
  const operatingComplete =
    nestedField(value, "operating", "status") === "VALID" &&
    nestedField(value, "operating", "queue") === "EMPTY" &&
    nestedField(value, "operating", "reconciliation") === "COMPLETE";
  const evidenceComplete =
    nestedField(value, "evidencePackage", "status") === "VALID" &&
    nestedField(value, "evidencePackage", "state") === "PRESENT";
  const retentionComplete =
    nestedField(value, "retention", "status") === "VALID" &&
    nestedField(value, "retention", "policy") === "DEFINED" &&
    typeof nestedField(value, "retention", "retentionDays") === "number" &&
    nestedField(value, "retention", "deletion") === "COMPLETE" &&
    nestedField(value, "retention", "export") === "COMPLETE";
  const offlineComplete =
    nestedField(value, "offline", "status") === "VALID" &&
    nestedField(value, "offline", "sync") === "CONSENTED_OPTIONAL" &&
    nestedField(value, "offline", "queue") === "EMPTY" &&
    nestedField(value, "offline", "reconciliation") === "COMPLETE";
  const recoveryComplete =
    nestedField(value, "recovery", "status") === "VALID" &&
    ["backup", "restore", "rollback", "incident"].every(
      (key) => nestedField(value, "recovery", key) === "COMPLETE",
    );
  const objectives = ["rpo", "rto"].every((key) => {
    const objective = nestedField(value, "rpoRto", key);
    return (
      isRecord(objective) &&
      nestedField(value, "rpoRto", key) !== undefined &&
      readOwn(objective, "status", `$.rpoRto.${key}.status`, []) ===
        "COMPLETE" &&
      readOwn(
        objective,
        "targetMinutes",
        `$.rpoRto.${key}.targetMinutes`,
        [],
      ) !== null &&
      readOwn(
        objective,
        "observedMinutes",
        `$.rpoRto.${key}.observedMinutes`,
        [],
      ) !== null &&
      readOwn(objective, "evidenceId", `$.rpoRto.${key}.evidenceId`, []) !==
        null
    );
  });
  const rpoRtoComplete =
    nestedField(value, "rpoRto", "status") === "VALID" && objectives;
  const persistenceComplete =
    nestedField(value, "persistence", "status") === "VALID";
  const trainComplete =
    train === M33_TRAIN
      ? nestedField(value, "pilot", "state") === "COMPLETE" &&
        nestedField(value, "pilot", "cohort") === "COMPLETE" &&
        nestedField(value, "pilot", "productApproval") === "APPROVED" &&
        nestedField(value, "pilot", "securityApproval") === "APPROVED" &&
        nestedField(value, "pilot", "status") === "VALID"
      : nestedField(value, "enterprise", "status") === "VALID" &&
        nestedField(value, "enterprise", "independentReview") === "COMPLETE" &&
        nestedField(value, "enterprise", "threatModel") === "COMPLETE" &&
        nestedField(value, "enterprise", "airGapped") === "COMPLETE";
  return (
    architectureComplete &&
    tenancyComplete &&
    consentComplete &&
    operatingComplete &&
    evidenceComplete &&
    retentionComplete &&
    offlineComplete &&
    recoveryComplete &&
    rpoRtoComplete &&
    persistenceComplete &&
    trainComplete
  );
}

function validateRecordBase(
  value: UnknownRecord,
  train: M33M34Train,
  context: GovernanceValidationContext,
  diagnostics: GovernanceDiagnostic[],
): {
  ownerId: string | null;
  ownerFresh: boolean;
  structurallyValid: boolean;
  contractsComplete: boolean;
  approvalValid: boolean;
  evidenceValid: boolean;
  status: GovernanceRecordStatus;
  executionStatus: GovernanceExecutionStatus;
} {
  const expectedKeys = [
    "schema",
    "schemaVersion",
    "train",
    "recordId",
    "status",
    "executionStatus",
    "authority",
    "claimPromotion",
    "owner",
    "approval",
    "architecture",
    "tenancy",
    "consent",
    "operating",
    "evidencePackage",
    "retention",
    "offline",
    "recovery",
    "rpoRto",
    "persistence",
    train === M33_TRAIN ? "pilot" : "enterprise",
  ];
  checkKeys(value, expectedKeys, "$", diagnostics);
  exact(
    readOwn(value, "schema", "$.schema", diagnostics),
    M33_M34_SCHEMA,
    "$.schema",
    diagnostics,
  );
  if (readOwn(value, "schemaVersion", "$.schemaVersion", diagnostics) !== 1)
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.schemaVersion",
      "schemaVersion must be 1",
    );
  if (readOwn(value, "train", "$.train", diagnostics) !== train)
    addDiagnostic(
      diagnostics,
      "TRAIN_MISMATCH",
      "$.train",
      "Record train does not match validator",
    );
  stringValue(
    readOwn(value, "recordId", "$.recordId", diagnostics),
    "$.recordId",
    diagnostics,
  );
  const status = oneOf(
    readOwn(value, "status", "$.status", diagnostics),
    GOVERNANCE_RECORD_STATUSES,
    "$.status",
    diagnostics,
  )
    ? (readOwn(
        value,
        "status",
        "$.status",
        diagnostics,
      ) as GovernanceRecordStatus)
    : "BLOCKED";
  const executionStatus = oneOf(
    readOwn(value, "executionStatus", "$.executionStatus", diagnostics),
    GOVERNANCE_EXECUTION_STATUSES,
    "$.executionStatus",
    diagnostics,
  )
    ? (readOwn(
        value,
        "executionStatus",
        "$.executionStatus",
        diagnostics,
      ) as GovernanceExecutionStatus)
    : "NOT_RUN";
  exact(
    readOwn(value, "authority", "$.authority", diagnostics),
    "NONE",
    "$.authority",
    diagnostics,
  );
  const claimPromotion = readOwn(
    value,
    "claimPromotion",
    "$.claimPromotion",
    diagnostics,
  );
  if (claimPromotion !== "BLOCKED" && claimPromotion !== "FORBIDDEN")
    addDiagnostic(
      diagnostics,
      "ENTERPRISE_CLAIM_FORBIDDEN",
      "$.claimPromotion",
      "Claim promotion must remain blocked",
      "warning",
    );
  const owner = validateOwner(
    readOwn(value, "owner", "$.owner", diagnostics),
    "$.owner",
    Date.parse(context.now),
    diagnostics,
  );
  const approvalValid = validateApproval(
    readOwn(value, "approval", "$.approval", diagnostics),
    train,
    owner.id,
    Date.parse(context.now),
    diagnostics,
  );
  const architectureValid = validateArchitecture(
    readOwn(value, "architecture", "$.architecture", diagnostics),
    diagnostics,
  );
  const tenantId = validateTenancy(
    readOwn(value, "tenancy", "$.tenancy", diagnostics),
    diagnostics,
  );
  const consentValid = validateConsent(
    readOwn(value, "consent", "$.consent", diagnostics),
    Date.parse(context.now),
    diagnostics,
  );
  const operatingValid = validateOperating(
    readOwn(value, "operating", "$.operating", diagnostics),
    diagnostics,
  );
  const evidenceValid = validateEvidencePackage(
    readOwn(value, "evidencePackage", "$.evidencePackage", diagnostics),
    context,
    tenantId,
    Date.parse(context.now),
    diagnostics,
  );
  const retentionValid = validateRetention(
    readOwn(value, "retention", "$.retention", diagnostics),
    diagnostics,
  );
  const offlineValid = validateOffline(
    readOwn(value, "offline", "$.offline", diagnostics),
    diagnostics,
  );
  const recoveryValid = validateRecovery(
    readOwn(value, "recovery", "$.recovery", diagnostics),
    diagnostics,
  );
  const rpoRtoValid = validateRpoRto(
    readOwn(value, "rpoRto", "$.rpoRto", diagnostics),
    diagnostics,
  );
  const persistenceValid = validatePersistence(
    readOwn(value, "persistence", "$.persistence", diagnostics),
    diagnostics,
  );
  const trainValid =
    train === M33_TRAIN
      ? validatePilot(
          readOwn(value, "pilot", "$.pilot", diagnostics),
          diagnostics,
        )
      : validateEnterprise(
          readOwn(value, "enterprise", "$.enterprise", diagnostics),
          diagnostics,
        );
  const contractsComplete = contractsAreComplete(value, train);
  if (
    !contractsComplete &&
    (status === "VALID" || executionStatus === "COMPLETE")
  ) {
    addDiagnostic(
      diagnostics,
      "CONTRACT_NOT_COMPLETE",
      "$",
      "All bounded governance contracts must be explicitly complete",
      "warning",
    );
  }
  return {
    ownerId: owner.id,
    ownerFresh: owner.fresh,
    structurallyValid:
      architectureValid &&
      consentValid &&
      operatingValid &&
      retentionValid &&
      offlineValid &&
      recoveryValid &&
      rpoRtoValid &&
      persistenceValid &&
      trainValid,
    contractsComplete,
    approvalValid,
    evidenceValid,
    status,
    executionStatus,
  };
}

function result(
  diagnostics: GovernanceDiagnostic[],
  state: GovernanceValidationStatus,
): GovernanceValidationResult {
  Object.freeze(diagnostics);
  return Object.freeze({
    status: state,
    valid: state === "VALID",
    authority: "NONE",
    approval: "NOT_SYNTHESIZED",
    claimPromotion: "BLOCKED",
    canPromote: false,
    diagnostics,
  });
}

function validate(
  value: unknown,
  train: M33M34Train,
  context?: GovernanceValidationContext,
): GovernanceValidationResult {
  const diagnostics: GovernanceDiagnostic[] = [];
  const now = context?.now ?? new Date().toISOString();
  const parsedNow = Date.parse(now);
  if (!Number.isFinite(parsedNow)) {
    addDiagnostic(
      diagnostics,
      "INVALID_CONTEXT",
      "$.context.now",
      "Validation context requires an ISO-8601 time",
    );
    return result(diagnostics, "INVALID");
  }
  const effectiveContext: GovernanceValidationContext = { ...context, now };
  if (!scanForClaimsAndPersistence(value, diagnostics))
    return result(diagnostics, "INVALID");
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_RECORD",
      "$",
      "Governance record must be a plain object",
    );
    return result(diagnostics, "INVALID");
  }
  const base = validateRecordBase(value, train, effectiveContext, diagnostics);
  const hasError = diagnostics.some(
    (diagnostic) => diagnostic.severity === "error",
  );
  const hasWarning = diagnostics.some(
    (diagnostic) => diagnostic.severity === "warning",
  );
  if (hasError) return result(diagnostics, "INVALID");
  if (
    base.status === "BLOCKED" ||
    !base.structurallyValid ||
    !base.contractsComplete ||
    !base.approvalValid ||
    !base.evidenceValid ||
    !base.ownerFresh
  ) {
    return result(diagnostics, "BLOCKED");
  }
  if (base.executionStatus === "NOT_RUN" || hasWarning)
    return result(diagnostics, "NOT_RUN");
  return result(diagnostics, "VALID");
}

export function validateM33ControlPlaneRecord(
  value: unknown,
  context?: GovernanceValidationContext,
): GovernanceValidationResult {
  return validate(value, M33_TRAIN, context);
}

export function validateM34AssuranceRecord(
  value: unknown,
  context?: GovernanceValidationContext,
): GovernanceValidationResult {
  return validate(value, M34_TRAIN, context);
}

export function validateGovernanceAssuranceRecord(
  value: unknown,
  context?: GovernanceValidationContext,
): GovernanceValidationResult {
  if (isRecord(value)) {
    const train = readOwn(value, "train", "$.train", []);
    if (train === M34_TRAIN) return validateM34AssuranceRecord(value, context);
  }
  return validateM33ControlPlaneRecord(value, context);
}
