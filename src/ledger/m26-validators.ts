export const M26_SCHEMA_VERSION = 1 as const;

export const GITHUB_RECONCILIATION_STATES = [
  "NOT_RUN",
  "NOT_RECONCILED",
  "RECONCILED",
] as const;
export const GAP_STATUSES = [
  "open",
  "accepted",
  "fix-in-progress",
  "fixed",
  "regression",
  "deferred",
  "not-applicable",
] as const;
export const SUPPORT_DISPOSITIONS = [
  "TESTED",
  "NOT_APPLICABLE",
  "BLOCKED",
] as const;
export const EXTERNAL_VALIDATION_STATUSES = [
  "BLOCKED",
  "PASS",
  "FAIL",
] as const;
export const EXTERNAL_EXECUTION_STATUSES = ["NOT_RUN", "RUN"] as const;

export type GithubReconciliationState =
  (typeof GITHUB_RECONCILIATION_STATES)[number];
export type GapStatus = (typeof GAP_STATUSES)[number];
export type SupportDisposition = (typeof SUPPORT_DISPOSITIONS)[number];
export type ExternalValidationStatus =
  (typeof EXTERNAL_VALIDATION_STATUSES)[number];
export type ExternalExecutionStatus =
  (typeof EXTERNAL_EXECUTION_STATUSES)[number];
export type ValidationStatus = "PASS" | "BLOCKED" | "FAIL";
export type DiagnosticSeverity = "error" | "warning";

export interface LedgerDiagnostic {
  code: string;
  path: string;
  message: string;
  severity: DiagnosticSeverity;
}

export interface LedgerValidationResult {
  status: ValidationStatus;
  valid: boolean;
  diagnostics: LedgerDiagnostic[];
  errors: string[];
}

export interface GithubIssue {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
  state_reason: string | null;
  milestone: { number: number; title: string } | null;
  milestone_numbers?: number[];
  labels: string[];
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  last_commit_sha?: string | null;
  last_pull_request_number?: number | null;
  body_sha256: string;
  evidence_links: string[];
}

export interface GithubMilestone {
  number: number;
  title: string;
  state: "open" | "closed";
  open_issues: number;
  closed_issues: number;
  due_on: string | null;
  description?: string | null;
  description_sha256?: string;
  provider_open_issues?: number;
  provider_closed_issues?: number;
}

export interface GithubPullRequest {
  number: number;
  title: string;
  url: string;
  state: "open" | "closed" | "merged";
  head_sha?: string;
  base_sha?: string;
  created_at: string;
  updated_at: string;
  merged_at?: string | null;
}

export interface GithubSnapshot {
  schemaVersion: typeof M26_SCHEMA_VERSION;
  provenance: {
    source: string;
    capturedBy: string;
    population: string;
    networkAccess: boolean;
    archiveCount: number;
    liveCount: number;
    disposition: string;
  };
  observedAt: string;
  baseSha: string;
  issues: GithubIssue[];
  milestones: GithubMilestone[];
  pullRequests: GithubPullRequest[];
  reconciliation: {
    state: GithubReconciliationState;
    diagnostics: string[];
    issue_count: number;
    milestone_count: number;
    pull_request_count: number;
    duplicate_issue_numbers: number[];
    cross_milestone_issue_numbers: number[];
    counter_mismatches: Array<string | Record<string, unknown>>;
    not_planned_closures: number[];
  };
}

export interface GapClosureEvidence {
  candidate: string;
  observed_at: string;
  command: string;
  result: string;
  artifacts: string[];
}

export interface GapLedgerRecord {
  schemaVersion: typeof M26_SCHEMA_VERSION;
  gap_id: string;
  source_url_or_command: string;
  source_kind: string;
  severity: "release-blocker" | "high" | "medium" | "low" | "debt";
  category: string;
  affected_surface: string;
  affected_version_or_milestone: string;
  reproduction_or_proof: string;
  expected_behavior: string;
  actual_behavior: string;
  user_or_security_impact: string;
  owner: string;
  target_train: string;
  status: GapStatus;
  fix_design: string;
  regression_test: string;
  revalidation_command: string;
  evidence_artifact: string;
  expiry_or_revisit_trigger: string;
  rollback_artifact: string;
  dependencies: string[];
  closure_evidence: GapClosureEvidence | null;
  disposition_reason?: string;
  release_consequence?: string;
  supersedes?: string | null;
  superseded_by?: string | null;
}

export interface SupportMatrixRecord {
  schemaVersion: typeof M26_SCHEMA_VERSION;
  cell_id: string;
  axis: string;
  cell: string;
  disposition: SupportDisposition;
  owner: string;
  evidence: string[];
  command?: string;
  fixture?: string;
  observed_result: string;
  resource_budget: string | Record<string, unknown>;
  last_candidate: string;
  not_applicable_rationale?: string | null;
  blocked_reason?: string | null;
  revisit_trigger?: string | null;
}

export interface ExternalConsent {
  state: "NOT_REQUESTED" | "NOT_RECORDED" | "CONSENTED";
  evidence: string[];
}

export interface ExternalRetention {
  policy: string;
  deletion_status: "NOT_RUN" | "BLOCKED" | "COMPLETE";
}

export interface ExternalClaimReview {
  status: "NOT_RUN" | "BLOCKED" | "COMPLETE";
  evidence: string[];
}

export interface ExternalValidationRecord {
  schemaVersion: typeof M26_SCHEMA_VERSION;
  record_id: string;
  protocol: string;
  owner: string;
  status: ExternalValidationStatus;
  execution_status: ExternalExecutionStatus;
  candidate: string | null;
  observed_at: string | null;
  consent: ExternalConsent;
  evidence: string[];
  retention: ExternalRetention;
  support_requests: string[];
  claim_review: ExternalClaimReview;
  limitations: string[];
  result: string | null;
}

export interface ExternalValidationInput {
  record_id?: string;
  protocol?: string;
  owner?: string;
  status?: ExternalValidationStatus;
  execution_status?: ExternalExecutionStatus;
  candidate?: string | null;
  observed_at?: string | null;
  consent?: ExternalConsent;
  evidence?: string[];
  retention?: ExternalRetention;
  support_requests?: string[];
  claim_review?: ExternalClaimReview;
  limitations?: string[];
  result?: string | null;
}

export const GAP_REQUIRED_FIELDS = [
  "gap_id",
  "source_url_or_command",
  "source_kind",
  "severity",
  "category",
  "affected_surface",
  "affected_version_or_milestone",
  "reproduction_or_proof",
  "expected_behavior",
  "actual_behavior",
  "user_or_security_impact",
  "owner",
  "target_train",
  "status",
  "fix_design",
  "regression_test",
  "revalidation_command",
  "evidence_artifact",
  "expiry_or_revisit_trigger",
  "rollback_artifact",
  "dependencies",
  "closure_evidence",
] as const;

export const SUPPORT_REQUIRED_FIELDS = [
  "cell_id",
  "axis",
  "cell",
  "disposition",
  "owner",
  "evidence",
  "command",
  "fixture",
  "observed_result",
  "resource_budget",
  "last_candidate",
] as const;

export const MAX_M26_LEDGER_RECORDS = 10_000;

const GAP_ID_PATTERN = /^GAP-[A-Z0-9][A-Z0-9._-]*$/;
const MATRIX_ID_PATTERN = /^MATRIX-[A-Z0-9][A-Z0-9._:-]*$/;
const EXTERNAL_ID_PATTERN = /^EXT-[A-Z0-9][A-Z0-9._-]*$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const BODY_SHA_PATTERN = /^[0-9a-f]{64}$/i;
const TRAIN_PATTERN = /^M(?:\d|[1-4]\d|50)$/;
const UNOWNED_VALUES = new Set([
  "unassigned",
  "unowned",
  "unassigned",
  "tbd",
  "unknown",
  "none",
  "n/a",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isSha(value: unknown): value is string {
  return typeof value === "string" && SHA_PATTERN.test(value);
}

function isBodySha(value: unknown): value is string {
  return typeof value === "string" && BODY_SHA_PATTERN.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUnowned(value: string): boolean {
  return UNOWNED_VALUES.has(value.trim().toLowerCase());
}

function addDiagnostic(
  diagnostics: LedgerDiagnostic[],
  code: string,
  path: string,
  message: string,
  severity: DiagnosticSeverity = "error",
): void {
  diagnostics.push({ code, path, message, severity });
}

function resultFrom(
  status: ValidationStatus,
  diagnostics: LedgerDiagnostic[],
): LedgerValidationResult {
  return {
    status,
    valid: status === "PASS",
    diagnostics,
    errors: diagnostics
      .filter((diagnostic) => diagnostic.severity === "error")
      .map((diagnostic) => diagnostic.message),
  };
}

function pass(diagnostics: LedgerDiagnostic[]): LedgerValidationResult {
  return resultFrom("PASS", diagnostics);
}

function blocked(
  diagnostics: LedgerDiagnostic[],
  code: string,
  path: string,
  message: string,
): LedgerValidationResult {
  addDiagnostic(diagnostics, code, path, message, "warning");
  return resultFrom("BLOCKED", diagnostics);
}

function failed(diagnostics: LedgerDiagnostic[]): LedgerValidationResult {
  return resultFrom("FAIL", diagnostics);
}

function missingString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (!(key in record)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}${key}`,
      `${key} is required`,
      "warning",
    );
    return false;
  }
  if (!isNonEmptyString(record[key])) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}${key}`,
      `${key} must be a non-empty string`,
    );
    return false;
  }
  return true;
}

function requiredNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: LedgerDiagnostic[],
  integer = false,
): boolean {
  if (!(key in record)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}${key}`,
      `${key} is required`,
      "warning",
    );
    return false;
  }
  const value = record[key];
  if (!isFiniteNumber(value) || (integer && !Number.isInteger(value))) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}${key}`,
      `${key} must be ${integer ? "an integer" : "a finite number"}`,
    );
    return false;
  }
  return true;
}

function requiredArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (!(key in record)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}${key}`,
      `${key} is required`,
      "warning",
    );
    return false;
  }
  if (!Array.isArray(record[key])) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}${key}`,
      `${key} must be an array`,
    );
    return false;
  }
  return true;
}

function stringArray(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
  allowEmpty = true,
): value is string[] {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, "INVALID_FIELD", path, "must be an array");
    return false;
  }
  if (!allowEmpty && value.length === 0) {
    addDiagnostic(diagnostics, "EMPTY_FIELD", path, "must not be empty");
    return false;
  }
  const items: unknown[] = value;
  let valid = true;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isNonEmptyString(item)) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}[${index}]`,
        "must be a non-empty string",
      );
      valid = false;
    }
  }
  return valid;
}

function numberArray(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): value is number[] {
  if (!Array.isArray(value)) {
    addDiagnostic(diagnostics, "INVALID_FIELD", path, "must be an array");
    return false;
  }
  const items: unknown[] = value;
  let valid = true;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!isFiniteNumber(item) || !Number.isInteger(item) || item < 1) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}[${index}]`,
        "must be a positive integer",
      );
      valid = false;
    }
  }
  return valid;
}

function dateTimeOrNull(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (value === null) return true;
  if (!isDateTime(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "must be null or an ISO-8601 timestamp",
    );
    return false;
  }
  return true;
}

function validateGithubIssue(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "INVALID_RECORD", path, "must be an object");
    return;
  }
  requiredNumber(value, "number", path, diagnostics, true);
  missingString(value, "title", path, diagnostics);
  missingString(value, "url", path, diagnostics);
  if (!(value.state === "open" || value.state === "closed")) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}state`,
      "state must be open or closed",
    );
  }
  if (
    !("state_reason" in value) ||
    (value.state_reason !== null && !isNonEmptyString(value.state_reason))
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}state_reason`,
      "state_reason must be a non-empty string or null",
    );
  }
  if (
    !("milestone" in value) ||
    (value.milestone !== null &&
      (!isRecord(value.milestone) ||
        !isFiniteNumber(value.milestone.number) ||
        !isNonEmptyString(value.milestone.title)))
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}milestone`,
      "milestone must be null or an object with number and title",
    );
  }
  requiredArray(value, "labels", path, diagnostics);
  if (Array.isArray(value.labels)) {
    stringArray(value.labels, `${path}labels`, diagnostics);
  }
  for (const key of ["created_at", "updated_at"] as const) {
    if (!(key in value) || !isDateTime(value[key])) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}${key}`,
        `${key} must be an ISO-8601 timestamp`,
      );
    }
  }
  if (!("closed_at" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}closed_at`,
      "closed_at is required",
      "warning",
    );
  } else {
    dateTimeOrNull(value.closed_at, `${path}closed_at`, diagnostics);
  }
  if (
    "last_commit_sha" in value &&
    value.last_commit_sha !== null &&
    !isNonEmptyString(value.last_commit_sha)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}last_commit_sha`,
      "last_commit_sha must be a non-empty string or null",
    );
  }
  if (
    "last_pull_request_number" in value &&
    value.last_pull_request_number !== null &&
    (!isFiniteNumber(value.last_pull_request_number) ||
      !Number.isInteger(value.last_pull_request_number) ||
      value.last_pull_request_number < 1)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}last_pull_request_number`,
      "last_pull_request_number must be a positive integer or null",
    );
  }
  if (!isBodySha(value.body_sha256)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}body_sha256`,
      "body_sha256 must be a 64-character hexadecimal digest",
    );
  }
  if (requiredArray(value, "evidence_links", path, diagnostics)) {
    stringArray(value.evidence_links, `${path}evidence_links`, diagnostics);
  }
  if ("milestone_numbers" in value) {
    numberArray(
      value.milestone_numbers,
      `${path}milestone_numbers`,
      diagnostics,
    );
    if (
      Array.isArray(value.milestone_numbers) &&
      value.milestone_numbers.length > 1
    ) {
      addDiagnostic(
        diagnostics,
        "CROSS_MILESTONE_ISSUE",
        `${path}milestone_numbers`,
        "issue is assigned to more than one milestone",
        "warning",
      );
    }
  }
}

function validateGithubMilestone(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "INVALID_RECORD", path, "must be an object");
    return;
  }
  requiredNumber(value, "number", path, diagnostics, true);
  missingString(value, "title", path, diagnostics);
  if (!(value.state === "open" || value.state === "closed")) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}state`,
      "state must be open or closed",
    );
  }
  requiredNumber(value, "open_issues", path, diagnostics, true);
  requiredNumber(value, "closed_issues", path, diagnostics, true);
  if (!("description" in value) && !("description_sha256" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}description`,
      "description or description_sha256 is required",
    );
  }
  if (
    "description" in value &&
    value.description !== null &&
    !isNonEmptyString(value.description)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}description`,
      "description must be a non-empty string or null",
    );
  }
  if ("description_sha256" in value && !isBodySha(value.description_sha256)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}description_sha256`,
      "description_sha256 must be a 64-character hexadecimal digest",
    );
  }
  if (
    !("due_on" in value) ||
    (value.due_on !== null && !isDateTime(value.due_on))
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}due_on`,
      "due_on must be null or an ISO-8601 timestamp",
    );
  }
}

function validateGithubPullRequest(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): void {
  if (!isRecord(value)) {
    addDiagnostic(diagnostics, "INVALID_RECORD", path, "must be an object");
    return;
  }
  requiredNumber(value, "number", path, diagnostics, true);
  missingString(value, "title", path, diagnostics);
  missingString(value, "url", path, diagnostics);
  if (!["open", "closed", "merged"].includes(String(value.state))) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}state`,
      "state must be open, closed, or merged",
    );
  }
  for (const key of ["head_sha", "base_sha"] as const) {
    if (key in value && !isSha(value[key])) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}${key}`,
        `${key} must be a 40-character hexadecimal SHA`,
      );
    }
  }
  for (const key of ["created_at", "updated_at"] as const) {
    if (!(key in value) || !isDateTime(value[key])) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `${path}${key}`,
        `${key} must be an ISO-8601 timestamp`,
      );
    }
  }
  if ("merged_at" in value) {
    dateTimeOrNull(value.merged_at, `${path}merged_at`, diagnostics);
  }
}

export function validateGitHubSnapshot(value: unknown): LedgerValidationResult {
  if (value === undefined || value === null) {
    return blocked(
      [],
      "GITHUB_SNAPSHOT_ABSENT",
      "$",
      "GitHub snapshot is absent; reconciliation is BLOCKED",
    );
  }
  if (!isRecord(value)) {
    return failed([
      {
        code: "GITHUB_SNAPSHOT_INVALID",
        path: "$",
        message: "GitHub snapshot must be an object",
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  if (value.schemaVersion !== M26_SCHEMA_VERSION) {
    if (!("schemaVersion" in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.schemaVersion",
        "schemaVersion is required",
        "warning",
      );
    } else {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.schemaVersion",
        "schemaVersion must be 1",
      );
    }
  }

  if (!("provenance" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.provenance",
      "provenance is required",
      "warning",
    );
  } else if (!isRecord(value.provenance)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.provenance",
      "provenance must be an object",
    );
  } else {
    const provenance = value.provenance;
    for (const key of [
      "source",
      "capturedBy",
      "population",
      "disposition",
    ] as const) {
      missingString(provenance, key, "$.provenance.", diagnostics);
    }
    if (!("networkAccess" in provenance)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.provenance.networkAccess",
        "networkAccess is required and must be boolean",
        "warning",
      );
    } else if (typeof provenance.networkAccess !== "boolean") {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.provenance.networkAccess",
        "networkAccess must be boolean",
      );
    } else if (provenance.networkAccess) {
      addDiagnostic(
        diagnostics,
        "NETWORK_ACCESS",
        "$.provenance.networkAccess",
        "snapshot records network provenance; validation remains local",
        "warning",
      );
    }
    requiredNumber(
      provenance,
      "archiveCount",
      "$.provenance.",
      diagnostics,
      true,
    );
    requiredNumber(provenance, "liveCount", "$.provenance.", diagnostics, true);
  }

  if (!("observedAt" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.observedAt",
      "observedAt is required",
      "warning",
    );
  } else if (!isDateTime(value.observedAt)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.observedAt",
      "observedAt must be an ISO-8601 timestamp",
    );
  }

  if (!("baseSha" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.baseSha",
      "baseSha is required",
      "warning",
    );
  } else if (!isSha(value.baseSha)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.baseSha",
      "baseSha must be a 40-character hexadecimal SHA",
    );
  }

  for (const key of ["issues", "milestones", "pullRequests"] as const) {
    if (!(key in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        `$.${key}`,
        `${key} is required`,
        "warning",
      );
    } else if (!Array.isArray(value[key])) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `$.${key}`,
        `${key} must be an array`,
      );
    }
  }

  const issues = Array.isArray(value.issues) ? value.issues : [];
  const milestones = Array.isArray(value.milestones) ? value.milestones : [];
  const pullRequests = Array.isArray(value.pullRequests)
    ? value.pullRequests
    : [];
  for (let index = 0; index < issues.length; index += 1) {
    validateGithubIssue(issues[index], `$.issues[${index}]`, diagnostics);
  }
  for (let index = 0; index < milestones.length; index += 1) {
    validateGithubMilestone(
      milestones[index],
      `$.milestones[${index}]`,
      diagnostics,
    );
  }
  for (let index = 0; index < pullRequests.length; index += 1) {
    validateGithubPullRequest(
      pullRequests[index],
      `$.pullRequests[${index}]`,
      diagnostics,
    );
  }

  let reconciliation: Record<string, unknown> | undefined;
  if (!("reconciliation" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.reconciliation",
      "reconciliation is required",
      "warning",
    );
  } else if (!isRecord(value.reconciliation)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.reconciliation",
      "reconciliation must be an object",
    );
  } else {
    reconciliation = value.reconciliation;
    for (const key of [
      "diagnostics",
      "duplicate_issue_numbers",
      "cross_milestone_issue_numbers",
      "counter_mismatches",
      "not_planned_closures",
    ] as const) {
      if (!(key in reconciliation)) {
        addDiagnostic(
          diagnostics,
          "MISSING_FIELD",
          `$.reconciliation.${key}`,
          `${key} is required`,
          "warning",
        );
      } else if (!Array.isArray(reconciliation[key])) {
        addDiagnostic(
          diagnostics,
          "INVALID_FIELD",
          `$.reconciliation.${key}`,
          `${key} must be an array`,
        );
      }
    }
    for (const key of [
      "issue_count",
      "milestone_count",
      "pull_request_count",
    ] as const) {
      requiredNumber(
        reconciliation,
        key,
        "$.reconciliation.",
        diagnostics,
        true,
      );
    }
    if (!("state" in reconciliation)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.reconciliation.state",
        "state is required",
        "warning",
      );
    } else if (
      !GITHUB_RECONCILIATION_STATES.includes(
        reconciliation.state as GithubReconciliationState,
      )
    ) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.reconciliation.state",
        "state must be NOT_RUN, NOT_RECONCILED, or RECONCILED",
      );
    }
    if (Array.isArray(reconciliation.diagnostics)) {
      stringArray(
        reconciliation.diagnostics,
        "$.reconciliation.diagnostics",
        diagnostics,
      );
    }
    for (const key of [
      "duplicate_issue_numbers",
      "cross_milestone_issue_numbers",
      "not_planned_closures",
    ] as const) {
      if (Array.isArray(reconciliation[key])) {
        numberArray(
          reconciliation[key],
          `$.reconciliation.${key}`,
          diagnostics,
        );
      }
    }
    if (Array.isArray(reconciliation.counter_mismatches)) {
      const mismatches: unknown[] = reconciliation.counter_mismatches;
      for (let index = 0; index < mismatches.length; index += 1) {
        const mismatch = mismatches[index];
        if (!isNonEmptyString(mismatch) && !isRecord(mismatch)) {
          addDiagnostic(
            diagnostics,
            "INVALID_FIELD",
            `$.reconciliation.counter_mismatches[${index}]`,
            "must be a non-empty string or object",
          );
        }
      }
    }
  }

  const issueNumbers = new Set<number>();
  for (const issue of issues) {
    if (isRecord(issue) && isFiniteNumber(issue.number)) {
      if (issueNumbers.has(issue.number)) {
        addDiagnostic(
          diagnostics,
          "DUPLICATE_ISSUE",
          "$.issues",
          `issue number ${issue.number} appears more than once`,
          "warning",
        );
      }
      issueNumbers.add(issue.number);
    }
  }

  for (let index = 0; index < milestones.length; index += 1) {
    const milestone: unknown = milestones[index];
    if (
      !isRecord(milestone) ||
      !isFiniteNumber(milestone.number) ||
      !isFiniteNumber(milestone.open_issues) ||
      !isFiniteNumber(milestone.closed_issues)
    ) {
      continue;
    }
    const openIssues = issues.filter(
      (issue) =>
        isRecord(issue) &&
        issue.state === "open" &&
        isRecord(issue.milestone) &&
        issue.milestone.number === milestone.number,
    ).length;
    const closedIssues = issues.filter(
      (issue) =>
        isRecord(issue) &&
        issue.state === "closed" &&
        isRecord(issue.milestone) &&
        issue.milestone.number === milestone.number,
    ).length;
    if (
      openIssues !== milestone.open_issues ||
      closedIssues !== milestone.closed_issues
    ) {
      addDiagnostic(
        diagnostics,
        "MILESTONE_COUNTER_MISMATCH",
        `$.milestones[${index}]`,
        "milestone issue counters do not match the issues array",
        "warning",
      );
    }
  }

  if (reconciliation) {
    const state = reconciliation.state;
    if (state !== "RECONCILED") {
      addDiagnostic(
        diagnostics,
        "RECONCILIATION_NOT_COMPLETE",
        "$.reconciliation.state",
        `reconciliation state ${String(state)} is not RECONCILED`,
        "warning",
      );
    }
    if (
      Array.isArray(reconciliation.diagnostics) &&
      reconciliation.diagnostics.length > 0
    ) {
      addDiagnostic(
        diagnostics,
        "RECONCILIATION_DIAGNOSTICS",
        "$.reconciliation.diagnostics",
        "reconciliation diagnostics remain unresolved",
        "warning",
      );
    }
    if (
      isFiniteNumber(reconciliation.issue_count) &&
      reconciliation.issue_count !== issues.length
    ) {
      addDiagnostic(
        diagnostics,
        "COUNTER_MISMATCH",
        "$.reconciliation.issue_count",
        "issue_count does not match the issues array",
        "warning",
      );
    }
    if (
      isFiniteNumber(reconciliation.milestone_count) &&
      reconciliation.milestone_count !== milestones.length
    ) {
      addDiagnostic(
        diagnostics,
        "COUNTER_MISMATCH",
        "$.reconciliation.milestone_count",
        "milestone_count does not match the milestones array",
        "warning",
      );
    }
    if (
      isFiniteNumber(reconciliation.pull_request_count) &&
      reconciliation.pull_request_count !== pullRequests.length
    ) {
      addDiagnostic(
        diagnostics,
        "COUNTER_MISMATCH",
        "$.reconciliation.pull_request_count",
        "pull_request_count does not match the pullRequests array",
        "warning",
      );
    }
    for (const key of [
      "duplicate_issue_numbers",
      "cross_milestone_issue_numbers",
      "counter_mismatches",
      "not_planned_closures",
    ] as const) {
      if (
        key === "not_planned_closures" &&
        reconciliation.state === "RECONCILED"
      ) {
        continue;
      }
      if (
        Array.isArray(reconciliation[key]) &&
        reconciliation[key].length > 0
      ) {
        addDiagnostic(
          diagnostics,
          "RECONCILIATION_FINDING",
          `$.reconciliation.${key}`,
          `${key} contains unresolved records`,
          "warning",
        );
      }
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }
  if (
    diagnostics.some((diagnostic) => diagnostic.severity === "warning") ||
    reconciliation?.state !== "RECONCILED"
  ) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}

export const validateGithubSnapshot = validateGitHubSnapshot;

function validateClosureEvidence(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (value === null) return true;
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "closure_evidence must be null or an object",
    );
    return false;
  }
  let valid = true;
  for (const key of [
    "candidate",
    "observed_at",
    "command",
    "result",
  ] as const) {
    if (!missingString(value, key, `${path}.`, diagnostics)) valid = false;
  }
  if (!isDateTime(value.observed_at)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.observed_at`,
      "observed_at must be an ISO-8601 timestamp",
    );
    valid = false;
  }
  if (!requiredArray(value, "artifacts", `${path}.`, diagnostics)) {
    valid = false;
  } else if (
    !stringArray(value.artifacts, `${path}.artifacts`, diagnostics, false)
  ) {
    valid = false;
  }
  return valid;
}

export function validateGapLedgerRecord(
  value: unknown,
): LedgerValidationResult {
  if (value === undefined || value === null) {
    return blocked(
      [],
      "GAP_RECORD_ABSENT",
      "$",
      "gap record is absent; ledger reconciliation is BLOCKED",
    );
  }
  if (!isRecord(value)) {
    return failed([
      {
        code: "GAP_RECORD_INVALID",
        path: "$",
        message: "gap record must be an object",
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  if (value.schemaVersion !== M26_SCHEMA_VERSION) {
    if (!("schemaVersion" in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.schemaVersion",
        "schemaVersion is required",
        "warning",
      );
    } else {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.schemaVersion",
        "schemaVersion must be 1",
      );
    }
  }

  for (const key of [
    "source_url_or_command",
    "source_kind",
    "category",
    "affected_surface",
    "affected_version_or_milestone",
    "reproduction_or_proof",
    "expected_behavior",
    "actual_behavior",
    "user_or_security_impact",
    "owner",
    "target_train",
    "fix_design",
    "regression_test",
    "revalidation_command",
    "evidence_artifact",
    "expiry_or_revisit_trigger",
    "rollback_artifact",
  ] as const) {
    missingString(value, key, "$.", diagnostics);
  }

  if (!("gap_id" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.gap_id",
      "gap_id is required",
      "warning",
    );
  } else if (
    !isNonEmptyString(value.gap_id) ||
    !GAP_ID_PATTERN.test(value.gap_id)
  ) {
    addDiagnostic(
      diagnostics,
      "UNSTABLE_GAP_ID",
      "$.gap_id",
      "gap_id must match GAP-<stable identifier>",
    );
  }

  if (!(
    value.severity === "release-blocker" ||
    value.severity === "high" ||
    value.severity === "medium" ||
    value.severity === "low" ||
    value.severity === "debt"
  )) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.severity",
      "severity is not an allowed M26 value",
    );
  }

  if (!("status" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.status",
      "status is required",
      "warning",
    );
  } else if (!GAP_STATUSES.includes(value.status as GapStatus)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.status",
      "status is not an allowed M26 value",
    );
  }

  if (isNonEmptyString(value.owner) && isUnowned(value.owner)) {
    addDiagnostic(
      diagnostics,
      "UNOWNED_GAP",
      "$.owner",
      "owner must be a named owner",
    );
  }
  if (
    isNonEmptyString(value.target_train) &&
    !TRAIN_PATTERN.test(value.target_train)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_TARGET_TRAIN",
      "$.target_train",
      "target_train must identify an M0-M50 train",
    );
  }

  if (!("dependencies" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.dependencies",
      "dependencies is required",
      "warning",
    );
  } else if (!stringArray(value.dependencies, "$.dependencies", diagnostics)) {
    addDiagnostic(
      diagnostics,
      "INVALID_DEPENDENCIES",
      "$.dependencies",
      "dependencies must be an array of stable identifiers",
    );
  }

  if (!("closure_evidence" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.closure_evidence",
      "closure_evidence is required and may be null while open",
      "warning",
    );
  } else if (
    !validateClosureEvidence(
      value.closure_evidence,
      "$.closure_evidence",
      diagnostics,
    )
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_CLOSURE_EVIDENCE",
      "$.closure_evidence",
      "closure evidence is incomplete",
    );
  }

  for (const key of ["supersedes", "superseded_by"] as const) {
    if (key in value && value[key] !== null) {
      if (!isNonEmptyString(value[key]) || !GAP_ID_PATTERN.test(value[key])) {
        addDiagnostic(
          diagnostics,
          "INVALID_SUPERSESSION",
          `$.${key}`,
          `${key} must be null or a stable gap identifier`,
        );
      }
    }
  }
  if (
    isNonEmptyString(value.supersedes) &&
    isNonEmptyString(value.superseded_by)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_SUPERSESSION",
      "$.supersedes",
      "a record cannot both supersede and be superseded",
    );
  }
  if (isNonEmptyString(value.supersedes) && value.supersedes === value.gap_id) {
    addDiagnostic(
      diagnostics,
      "INVALID_SUPERSESSION",
      "$.supersedes",
      "a record cannot supersede itself",
    );
  }
  if (
    isNonEmptyString(value.superseded_by) &&
    value.superseded_by === value.gap_id
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_SUPERSESSION",
      "$.superseded_by",
      "a record cannot supersede itself",
    );
  }

  if (
    value.status === "fixed" ||
    value.status === "regression" ||
    value.status === "not-applicable"
  ) {
    if (value.closure_evidence === null) {
      addDiagnostic(
        diagnostics,
        "MISSING_CLOSURE_EVIDENCE",
        "$.closure_evidence",
        "closed records require closure evidence",
      );
    }
    const closureResult = isRecord(value.closure_evidence)
      ? value.closure_evidence.result
      : undefined;
    const normalizedClosureResult = isNonEmptyString(closureResult)
      ? closureResult.trim().toUpperCase().replace(/-/g, "_")
      : undefined;
    if (
      normalizedClosureResult === "NOT_RUN" ||
      normalizedClosureResult === "UNKNOWN" ||
      normalizedClosureResult === "BLOCKED" ||
      normalizedClosureResult === "PENDING"
    ) {
      addDiagnostic(
        diagnostics,
        "UNRUN_CLOSURE",
        "$.closure_evidence.result",
        "a closed record requires an observed closure result",
      );
    }
  }

  if (value.status === "accepted" || value.status === "deferred") {
    for (const key of ["disposition_reason", "release_consequence"] as const) {
      if (!missingString(value, key, "$.", diagnostics)) {
        addDiagnostic(
          diagnostics,
          "MISSING_DISPOSITION_DETAIL",
          `$.${key}`,
          `${key} is required for accepted or deferred records`,
        );
      }
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}

function dependencyCycles(
  records: readonly Record<string, unknown>[],
  ids: ReadonlySet<string>,
): string[] {
  const graph = new Map<string, string[]>();
  for (const record of records) {
    if (!isNonEmptyString(record.gap_id)) continue;
    const dependencies = Array.isArray(record.dependencies)
      ? record.dependencies.filter(
          (dependency): dependency is string =>
            isNonEmptyString(dependency) && ids.has(dependency),
        )
      : [];
    graph.set(record.gap_id, dependencies);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[] = [];
  const visit = (id: string, path: string[]): void => {
    if (visiting.has(id)) {
      const start = path.indexOf(id);
      cycles.push([...path.slice(start >= 0 ? start : 0), id].join(" -> "));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) {
      visit(dependency, [...path, id]);
    }
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of ids) visit(id, []);
  return cycles;
}

export function validateGapLedger(value: unknown): LedgerValidationResult {
  if (!Array.isArray(value)) {
    return failed([
      {
        code: "GAP_LEDGER_INVALID",
        path: "$",
        message: "gap ledger must be an array of records",
        severity: "error",
      },
    ]);
  }
  if (value.length === 0) {
    return blocked(
      [],
      "GAP_LEDGER_EMPTY",
      "$",
      "gap ledger is empty; completeness is BLOCKED",
    );
  }
  if (value.length > MAX_M26_LEDGER_RECORDS) {
    return failed([
      {
        code: "GAP_LEDGER_TOO_LARGE",
        path: "$",
        message: `gap ledger exceeds the ${MAX_M26_LEDGER_RECORDS} record bound`,
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  const records: Record<string, unknown>[] = [];
  let hasBlocked = false;
  for (let index = 0; index < value.length; index += 1) {
    const recordResult = validateGapLedgerRecord(value[index]);
    diagnostics.push(
      ...recordResult.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        path:
          diagnostic.path === "$"
            ? `$.records[${index}]`
            : `$.records[${index}].${diagnostic.path.slice(2)}`,
      })),
    );
    if (recordResult.status === "BLOCKED") hasBlocked = true;
    const record: unknown = value[index];
    if (isRecord(record)) {
      records.push(record);
      if (
        record.status !== "fixed" &&
        (record.severity === "release-blocker" ||
          record.disposition === "release-blocking")
      ) {
        hasBlocked = true;
        addDiagnostic(
          diagnostics,
          "OPEN_RELEASE_BLOCKER",
          `$.records[${index}]`,
          "open release-blocking gap must be fixed or explicitly closed",
          "warning",
        );
      }
    }
  }

  const ids = new Set<string>();
  for (let index = 0; index < records.length; index += 1) {
    const id = records[index]?.gap_id;
    if (!isNonEmptyString(id)) continue;
    if (ids.has(id)) {
      addDiagnostic(
        diagnostics,
        "DUPLICATE_GAP_ID",
        `$.records[${index}].gap_id`,
        `gap_id ${id} appears more than once`,
      );
    }
    ids.add(id);
  }

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const supersedes = record.supersedes;
    const supersededBy = record.superseded_by;
    if (isNonEmptyString(supersedes)) {
      if (!ids.has(supersedes)) {
        addDiagnostic(
          diagnostics,
          "MISSING_SUPERSEDED_RECORD",
          `$.records[${index}].supersedes`,
          `superseded record ${supersedes} is not present`,
        );
      }
      const targetIndex = records.findIndex(
        (candidate) => candidate.gap_id === supersedes,
      );
      if (targetIndex >= index) {
        addDiagnostic(
          diagnostics,
          "NON_APPEND_SUPERSESSION",
          `$.records[${index}].supersedes`,
          "supersedes must point to an earlier ledger record",
        );
      }
      if (
        targetIndex >= 0 &&
        isNonEmptyString(record.gap_id) &&
        records[targetIndex]?.superseded_by !== record.gap_id
      ) {
        addDiagnostic(
          diagnostics,
          "SUPERSESSION_LINK_MISMATCH",
          `$.records[${index}].supersedes`,
          "superseded record does not link back through superseded_by",
        );
      }
    }
    if (isNonEmptyString(supersededBy)) {
      if (!ids.has(supersededBy)) {
        addDiagnostic(
          diagnostics,
          "MISSING_SUCCESSOR_RECORD",
          `$.records[${index}].superseded_by`,
          `successor record ${supersededBy} is not present`,
        );
      }
      const targetIndex = records.findIndex(
        (candidate) => candidate.gap_id === supersededBy,
      );
      if (targetIndex >= 0 && targetIndex <= index) {
        addDiagnostic(
          diagnostics,
          "NON_APPEND_SUPERSESSION",
          `$.records[${index}].superseded_by`,
          "superseded_by must point to a later ledger record",
        );
      }
      if (
        targetIndex >= 0 &&
        isNonEmptyString(record.gap_id) &&
        records[targetIndex]?.supersedes !== record.gap_id
      ) {
        addDiagnostic(
          diagnostics,
          "SUPERSESSION_LINK_MISMATCH",
          `$.records[${index}].superseded_by`,
          "successor record does not link back through supersedes",
        );
      }
    }
  }

  for (const cycle of dependencyCycles(records, ids)) {
    addDiagnostic(
      diagnostics,
      "DEPENDENCY_CYCLE",
      "$.records",
      `dependency cycle detected: ${cycle}`,
    );
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }
  if (
    hasBlocked ||
    diagnostics.some((diagnostic) => diagnostic.severity === "warning")
  ) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}

export function validateGapLedgerJsonl(value: unknown): LedgerValidationResult {
  if (typeof value !== "string") {
    return failed([
      {
        code: "GAP_JSONL_INVALID",
        path: "$",
        message: "gap ledger JSONL must be a string",
        severity: "error",
      },
    ]);
  }
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  if (lines.length > 1 && lines[lines.length - 1]?.trim() === "") lines.pop();
  if (lines.length === 1 && lines[0]?.trim() === "") {
    return blocked(
      [],
      "GAP_LEDGER_EMPTY",
      "$",
      "gap ledger JSONL is empty; completeness is BLOCKED",
    );
  }
  if (lines.length > MAX_M26_LEDGER_RECORDS) {
    return failed([
      {
        code: "GAP_LEDGER_TOO_LARGE",
        path: "$",
        message: `gap ledger JSONL exceeds the ${MAX_M26_LEDGER_RECORDS} record bound`,
        severity: "error",
      },
    ]);
  }
  const records: unknown[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (line.trim() === "") {
      return failed([
        {
          code: "GAP_JSONL_BLANK_LINE",
          path: `$.lines[${index}]`,
          message: "blank JSONL lines are not allowed",
          severity: "error",
        },
      ]);
    }
    try {
      const parsed: unknown = JSON.parse(line);
      records.push(parsed);
    } catch {
      return failed([
        {
          code: "GAP_JSONL_PARSE",
          path: `$.lines[${index}]`,
          message: "line is not valid JSON",
          severity: "error",
        },
      ]);
    }
  }
  const result = validateGapLedger(records);
  return {
    ...result,
    diagnostics: result.diagnostics.map((diagnostic) => ({
      ...diagnostic,
      path: diagnostic.path,
    })),
    errors: result.errors,
  };
}

function normalizeDisposition(value: unknown): SupportDisposition | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase().replace(/-/g, "_");
  if (
    normalized === "TESTED" ||
    normalized === "NOT_APPLICABLE" ||
    normalized === "BLOCKED"
  ) {
    return normalized;
  }
  return undefined;
}

function valueOrAlias(
  record: Record<string, unknown>,
  canonical: string,
  alias: string,
): unknown {
  return record[canonical] ?? record[alias];
}

function resourceBudgetIsValid(value: unknown): boolean {
  return (
    isNonEmptyString(value) ||
    (isRecord(value) && Object.keys(value).length > 0)
  );
}

export function validateSupportMatrixRecord(
  value: unknown,
): LedgerValidationResult {
  if (value === undefined || value === null) {
    return blocked(
      [],
      "SUPPORT_MATRIX_RECORD_ABSENT",
      "$",
      "support-matrix record is absent; cell is BLOCKED",
    );
  }
  if (!isRecord(value)) {
    return failed([
      {
        code: "SUPPORT_MATRIX_RECORD_INVALID",
        path: "$",
        message: "support-matrix record must be an object",
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  if (value.schemaVersion !== M26_SCHEMA_VERSION) {
    if (!("schemaVersion" in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.schemaVersion",
        "schemaVersion is required",
        "warning",
      );
    } else {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.schemaVersion",
        "schemaVersion must be 1",
      );
    }
  }

  for (const key of ["axis", "cell"] as const) {
    if (!(key in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        `$.${key}`,
        `${key} is required`,
        "warning",
      );
    } else if (!isNonEmptyString(value[key])) {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        `$.${key}`,
        `${key} must be a non-empty string`,
      );
    }
  }

  if (!("cell_id" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.cell_id",
      "cell_id is required",
      "warning",
    );
  } else if (
    !isNonEmptyString(value.cell_id) ||
    !MATRIX_ID_PATTERN.test(value.cell_id)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_CELL_ID",
      "$.cell_id",
      "cell_id must be a stable MATRIX identifier",
    );
  }

  if (!("disposition" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.disposition",
      "disposition is required",
      "warning",
    );
  }
  const disposition = normalizeDisposition(value.disposition);
  if ("disposition" in value && disposition === undefined) {
    addDiagnostic(
      diagnostics,
      "INVALID_DISPOSITION",
      "$.disposition",
      "disposition must be TESTED, NOT_APPLICABLE, or BLOCKED",
    );
  }

  const owner = value.owner;
  if (!("owner" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.owner",
      "owner is required",
      "warning",
    );
  } else if (!isNonEmptyString(owner)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.owner",
      "owner must be a non-empty string",
    );
  } else if (isUnowned(owner)) {
    addDiagnostic(
      diagnostics,
      "UNOWNED_MATRIX_CELL",
      "$.owner",
      "owner must be a named owner",
    );
  }

  if (!("evidence" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.evidence",
      "evidence is required",
      "warning",
    );
  } else if (!stringArray(value.evidence, "$.evidence", diagnostics, false)) {
    addDiagnostic(
      diagnostics,
      "INVALID_EVIDENCE",
      "$.evidence",
      "evidence must contain at least one non-empty reference",
    );
  }

  const command = valueOrAlias(value, "command", "test_command");
  const fixture = valueOrAlias(value, "fixture", "test_fixture");
  if (command === undefined && fixture === undefined) {
    addDiagnostic(
      diagnostics,
      "MISSING_COMMAND_OR_FIXTURE",
      "$.command",
      "command or fixture is required",
    );
  }
  if (command !== undefined && !isNonEmptyString(command)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.command",
      "command must be a non-empty string",
    );
  }
  if (fixture !== undefined && !isNonEmptyString(fixture)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.fixture",
      "fixture must be a non-empty string",
    );
  }

  const observedResult = valueOrAlias(
    value,
    "observed_result",
    "observedResult",
  );
  if (observedResult === undefined) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.observed_result",
      "observed_result is required",
      "warning",
    );
  } else if (!isNonEmptyString(observedResult)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.observed_result",
      "observed_result must be a non-empty string",
    );
  }

  const budget = valueOrAlias(value, "resource_budget", "budget");
  if (budget === undefined) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.resource_budget",
      "resource_budget is required",
      "warning",
    );
  } else if (!resourceBudgetIsValid(budget)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.resource_budget",
      "resource_budget must be a non-empty string or object",
    );
  }

  const lastCandidate = valueOrAlias(value, "last_candidate", "lastCandidate");
  if (lastCandidate === undefined) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.last_candidate",
      "last_candidate is required",
      "warning",
    );
  } else if (!isNonEmptyString(lastCandidate)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.last_candidate",
      "last_candidate must be a non-empty string",
    );
  }

  if (disposition === "NOT_APPLICABLE") {
    const rationale = value.not_applicable_rationale;
    if (!isNonEmptyString(rationale)) {
      addDiagnostic(
        diagnostics,
        "MISSING_RATIONALE",
        "$.not_applicable_rationale",
        "NOT_APPLICABLE requires a rationale",
      );
    }
  }
  if (disposition === "BLOCKED") {
    if (!isNonEmptyString(value.blocked_reason)) {
      addDiagnostic(
        diagnostics,
        "MISSING_BLOCKED_REASON",
        "$.blocked_reason",
        "BLOCKED requires a blocked_reason",
      );
    }
    if (!isNonEmptyString(value.revisit_trigger)) {
      addDiagnostic(
        diagnostics,
        "MISSING_REVISIT_TRIGGER",
        "$.revisit_trigger",
        "BLOCKED requires a revisit_trigger",
      );
    }
  }
  const normalizedObservedResult = isNonEmptyString(observedResult)
    ? observedResult.trim().toUpperCase().replace(/-/g, "_")
    : undefined;
  if (
    disposition === "TESTED" &&
    (normalizedObservedResult === "NOT_RUN" ||
      normalizedObservedResult === "UNKNOWN" ||
      normalizedObservedResult === "BLOCKED" ||
      normalizedObservedResult === "NOT_APPLICABLE")
  ) {
    addDiagnostic(
      diagnostics,
      "UNTESTED_RESULT",
      "$.observed_result",
      "TESTED cannot use a non-observed result",
    );
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }
  if (disposition === "BLOCKED") {
    return blocked(
      diagnostics,
      "SUPPORT_MATRIX_BLOCKED",
      "$.disposition",
      "support-matrix cell is explicitly BLOCKED",
    );
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}

export function validateSupportMatrix(
  value: unknown,
  expectedCellIds?: readonly string[],
): LedgerValidationResult {
  if (!Array.isArray(value)) {
    return failed([
      {
        code: "SUPPORT_MATRIX_INVALID",
        path: "$",
        message: "support matrix must be an array of records",
        severity: "error",
      },
    ]);
  }
  if (value.length === 0) {
    return blocked(
      [],
      "SUPPORT_MATRIX_EMPTY",
      "$",
      "support matrix is empty; finite coverage is BLOCKED",
    );
  }
  if (value.length > MAX_M26_LEDGER_RECORDS) {
    return failed([
      {
        code: "SUPPORT_MATRIX_TOO_LARGE",
        path: "$",
        message: `support matrix exceeds the ${MAX_M26_LEDGER_RECORDS} record bound`,
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  const ids = new Set<string>();
  let hasBlocked = false;
  for (let index = 0; index < value.length; index += 1) {
    const recordResult = validateSupportMatrixRecord(value[index]);
    diagnostics.push(
      ...recordResult.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        path:
          diagnostic.path === "$"
            ? `$.records[${index}]`
            : `$.records[${index}].${diagnostic.path.slice(2)}`,
      })),
    );
    if (recordResult.status === "BLOCKED") hasBlocked = true;
    const record: unknown = value[index];
    if (isRecord(record) && isNonEmptyString(record.cell_id)) {
      if (ids.has(record.cell_id)) {
        addDiagnostic(
          diagnostics,
          "DUPLICATE_MATRIX_CELL",
          `$.records[${index}].cell_id`,
          `cell_id ${record.cell_id} appears more than once`,
        );
      }
      ids.add(record.cell_id);
    }
  }

  if (expectedCellIds !== undefined) {
    if (!Array.isArray(expectedCellIds)) {
      return failed([
        ...diagnostics,
        {
          code: "EXPECTED_CELL_IDS_INVALID",
          path: "$.expectedCellIds",
          message: "expectedCellIds must be an array",
          severity: "error",
        },
      ]);
    }
    const expected = new Set<string>();
    for (const id of expectedCellIds) {
      if (!isNonEmptyString(id) || !MATRIX_ID_PATTERN.test(id)) {
        addDiagnostic(
          diagnostics,
          "INVALID_EXPECTED_CELL_ID",
          "$.expectedCellIds",
          "expected cell identifiers must be stable MATRIX identifiers",
        );
      } else {
        expected.add(id);
      }
    }
    for (const id of expected) {
      if (!ids.has(id)) {
        addDiagnostic(
          diagnostics,
          "MISSING_MATRIX_CELL",
          "$.records",
          `required cell ${id} is blank`,
          "warning",
        );
      }
    }
    for (const id of ids) {
      if (!expected.has(id)) {
        addDiagnostic(
          diagnostics,
          "UNEXPECTED_MATRIX_CELL",
          "$.records",
          `cell ${id} is not in the finite expected set`,
        );
      }
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }
  if (
    hasBlocked ||
    diagnostics.some((diagnostic) => diagnostic.severity === "warning")
  ) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}

export const EXTERNAL_VALIDATION_DEFAULT_STATUS = "BLOCKED" as const;
export const EXTERNAL_VALIDATION_DEFAULT_EXECUTION_STATUS = "NOT_RUN" as const;

export function createExternalValidationRecord(
  input: ExternalValidationInput = {},
): ExternalValidationRecord {
  return {
    schemaVersion: M26_SCHEMA_VERSION,
    record_id: input.record_id ?? "EXT-UNASSIGNED",
    protocol: input.protocol ?? "UNASSIGNED",
    owner: input.owner ?? "UNASSIGNED",
    status: input.status ?? EXTERNAL_VALIDATION_DEFAULT_STATUS,
    execution_status:
      input.execution_status ?? EXTERNAL_VALIDATION_DEFAULT_EXECUTION_STATUS,
    candidate: input.candidate ?? null,
    observed_at: input.observed_at ?? null,
    consent: input.consent ?? { state: "NOT_REQUESTED", evidence: [] },
    evidence: input.evidence ?? [],
    retention: input.retention ?? {
      policy: "UNSET",
      deletion_status: "NOT_RUN",
    },
    support_requests: input.support_requests ?? [],
    claim_review: input.claim_review ?? { status: "NOT_RUN", evidence: [] },
    limitations: input.limitations ?? [],
    result: input.result ?? null,
  };
}

function validateExternalConsent(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "consent must be an object",
    );
    return false;
  }
  let valid = true;
  if (
    value.state !== "NOT_REQUESTED" &&
    value.state !== "NOT_RECORDED" &&
    value.state !== "CONSENTED"
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.state`,
      "consent state is invalid",
    );
    valid = false;
  }
  if (!stringArray(value.evidence, `${path}.evidence`, diagnostics))
    valid = false;
  return valid;
}

function validateExternalRetention(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "retention must be an object",
    );
    return false;
  }
  let valid = true;
  if (!missingString(value, "policy", `${path}.`, diagnostics)) valid = false;
  if (
    value.deletion_status !== "NOT_RUN" &&
    value.deletion_status !== "BLOCKED" &&
    value.deletion_status !== "COMPLETE"
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.deletion_status`,
      "deletion_status is invalid",
    );
    valid = false;
  }
  return valid;
}

function validateExternalClaimReview(
  value: unknown,
  path: string,
  diagnostics: LedgerDiagnostic[],
): boolean {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      path,
      "claim_review must be an object",
    );
    return false;
  }
  let valid = true;
  if (
    value.status !== "NOT_RUN" &&
    value.status !== "BLOCKED" &&
    value.status !== "COMPLETE"
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.status`,
      "claim_review status is invalid",
    );
    valid = false;
  }
  if (!stringArray(value.evidence, `${path}.evidence`, diagnostics))
    valid = false;
  return valid;
}

export function validateExternalValidationRecord(
  value: unknown,
): LedgerValidationResult {
  if (value === undefined || value === null) {
    return blocked(
      [],
      "EXTERNAL_VALIDATION_DEFAULTED",
      "$",
      "external validation is absent; status is BLOCKED and execution is NOT_RUN",
    );
  }
  if (!isRecord(value)) {
    return failed([
      {
        code: "EXTERNAL_VALIDATION_INVALID",
        path: "$",
        message: "external validation record must be an object",
        severity: "error",
      },
    ]);
  }

  const diagnostics: LedgerDiagnostic[] = [];
  if (value.schemaVersion !== M26_SCHEMA_VERSION) {
    if (!("schemaVersion" in value)) {
      addDiagnostic(
        diagnostics,
        "MISSING_FIELD",
        "$.schemaVersion",
        "schemaVersion is required",
        "warning",
      );
    } else {
      addDiagnostic(
        diagnostics,
        "INVALID_FIELD",
        "$.schemaVersion",
        "schemaVersion must be 1",
      );
    }
  }
  for (const key of ["record_id", "protocol", "owner"] as const) {
    missingString(value, key, "$.", diagnostics);
  }
  if (
    isNonEmptyString(value.record_id) &&
    !EXTERNAL_ID_PATTERN.test(value.record_id)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_RECORD_ID",
      "$.record_id",
      "record_id must be a stable EXT identifier",
    );
  }
  if (
    isNonEmptyString(value.owner) &&
    isUnowned(value.owner) &&
    value.owner.trim().toUpperCase() !== "UNASSIGNED"
  ) {
    addDiagnostic(
      diagnostics,
      "UNOWNED_EXTERNAL_VALIDATION",
      "$.owner",
      "owner must be a named owner for a non-blocked result",
    );
  }

  const status =
    "status" in value ? value.status : EXTERNAL_VALIDATION_DEFAULT_STATUS;
  const executionStatus =
    "execution_status" in value
      ? value.execution_status
      : EXTERNAL_VALIDATION_DEFAULT_EXECUTION_STATUS;
  if (status !== "BLOCKED" && status !== "PASS" && status !== "FAIL") {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.status",
      "status must be BLOCKED, PASS, or FAIL",
    );
  }
  if (executionStatus !== "NOT_RUN" && executionStatus !== "RUN") {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.execution_status",
      "execution_status must be NOT_RUN or RUN",
    );
  }

  if (
    (status === "PASS" || status === "FAIL") &&
    isNonEmptyString(value.owner) &&
    (isUnowned(value.owner) ||
      value.owner.trim().toUpperCase() === "UNASSIGNED")
  ) {
    addDiagnostic(
      diagnostics,
      "UNOWNED_EXTERNAL_VALIDATION",
      "$.owner",
      "owner must be a named owner for a non-blocked result",
    );
  }

  if (
    !("candidate" in value) ||
    (value.candidate !== null && !isNonEmptyString(value.candidate))
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.candidate",
      "candidate must be a non-empty string or null",
    );
  }
  if (!("observed_at" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.observed_at",
      "observed_at is required and may be null",
      "warning",
    );
  } else {
    dateTimeOrNull(value.observed_at, "$.observed_at", diagnostics);
  }
  if (!("consent" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.consent",
      "consent is required",
      "warning",
    );
  } else if (
    !validateExternalConsent(value.consent, "$.consent", diagnostics)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_CONSENT",
      "$.consent",
      "consent evidence is invalid",
    );
  }
  if (!("evidence" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.evidence",
      "evidence is required",
      "warning",
    );
  } else if (!stringArray(value.evidence, "$.evidence", diagnostics)) {
    addDiagnostic(
      diagnostics,
      "INVALID_EVIDENCE",
      "$.evidence",
      "evidence must be an array of non-empty references",
    );
  }
  if (!("retention" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.retention",
      "retention is required",
      "warning",
    );
  } else if (
    !validateExternalRetention(value.retention, "$.retention", diagnostics)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_RETENTION",
      "$.retention",
      "retention evidence is invalid",
    );
  }
  if (!("support_requests" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.support_requests",
      "support_requests is required",
      "warning",
    );
  } else if (
    !stringArray(value.support_requests, "$.support_requests", diagnostics)
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_SUPPORT_REQUESTS",
      "$.support_requests",
      "support_requests must be an array of non-empty references",
    );
  }
  if (!("claim_review" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.claim_review",
      "claim_review is required",
      "warning",
    );
  } else if (
    !validateExternalClaimReview(
      value.claim_review,
      "$.claim_review",
      diagnostics,
    )
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_CLAIM_REVIEW",
      "$.claim_review",
      "claim review evidence is invalid",
    );
  }
  if (!("limitations" in value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      "$.limitations",
      "limitations is required",
      "warning",
    );
  } else if (!stringArray(value.limitations, "$.limitations", diagnostics)) {
    addDiagnostic(
      diagnostics,
      "INVALID_LIMITATIONS",
      "$.limitations",
      "limitations must be an array of non-empty references",
    );
  }
  if (
    !("result" in value) ||
    (value.result !== null && !isNonEmptyString(value.result))
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      "$.result",
      "result must be a non-empty string or null",
    );
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return failed(diagnostics);
  }

  if (status === "BLOCKED" || executionStatus === "NOT_RUN") {
    return blocked(
      diagnostics,
      "EXTERNAL_VALIDATION_BLOCKED",
      "$.status",
      "external validation remains BLOCKED until consented execution and evidence exist",
    );
  }

  if (status === "PASS") {
    const consent = isRecord(value.consent) ? value.consent : {};
    const retention = isRecord(value.retention) ? value.retention : {};
    const claimReview = isRecord(value.claim_review) ? value.claim_review : {};
    const candidateBound =
      isNonEmptyString(value.candidate) &&
      value.candidate.trim().toUpperCase() !== "UNASSIGNED" &&
      value.candidate.trim().toUpperCase() !== "UNKNOWN";
    const resultObserved =
      isNonEmptyString(value.result) &&
      value.result.trim().toUpperCase() !== "NOT_RUN" &&
      value.result.trim().toUpperCase() !== "UNKNOWN";
    const passRequirements = [
      candidateBound,
      isDateTime(value.observed_at),
      Array.isArray(value.evidence) && value.evidence.length > 0,
      consent.state === "CONSENTED" &&
        Array.isArray(consent.evidence) &&
        consent.evidence.length > 0,
      isNonEmptyString(retention.policy) && retention.policy !== "UNSET",
      retention.deletion_status === "COMPLETE",
      claimReview.status === "COMPLETE" &&
        Array.isArray(claimReview.evidence) &&
        claimReview.evidence.length > 0,
      resultObserved,
    ];
    if (passRequirements.some((requirement) => !requirement)) {
      return blocked(
        diagnostics,
        "EXTERNAL_VALIDATION_PASS_UNSUPPORTED",
        "$.status",
        "PASS is not supported without candidate-bound consented evidence",
      );
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "warning")) {
    return resultFrom("BLOCKED", diagnostics);
  }
  return pass(diagnostics);
}
