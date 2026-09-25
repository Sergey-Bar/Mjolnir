import { createHash } from "node:crypto";

export const M50_RELEASE_PROOF_SCHEMA = "m50.release-proof@1" as const;

export const M50_RELEASE_PROOF_CHAIN = Object.freeze([
  "CHANGE",
  "EVIDENCE",
  "DECISION",
  "RELEASE_PROOF",
] as const);

export const M50_REFERENCE_KINDS = Object.freeze([
  "CLAIM",
  "CAPABILITY",
  "GAP",
  "SUPPORT",
  "POLICY",
] as const);

export const M50_RELEASE_PROOF_LIMITS = Object.freeze({
  maxEvidence: 64,
  maxReferences: 64,
  maxPaths: 256,
  maxDecisionIds: 64,
  maxTextLength: 512,
  maxIdLength: 128,
  maxNodes: 4096,
  maxDepth: 12,
  maxEvidenceAgeMs: 86_400_000,
});

export type M50ReferenceKind = (typeof M50_REFERENCE_KINDS)[number];

export type M50EvidenceState =
  | "FRESH"
  | "STALE"
  | "INVALIDATED"
  | "FOREIGN"
  | "MALFORMED"
  | "CONTRADICTORY"
  | "UNKNOWN";

export type M50DecisionOutcome = "APPROVED" | "REJECTED" | "BLOCKED";

export type M50IndependentAssuranceStatus =
  | "INDEPENDENTLY_ASSURED"
  | "PENDING"
  | "FAILED"
  | "STALE"
  | "FOREIGN"
  | "BLOCKED"
  | "NOT_ASSURED";

export type M50ReadinessState = "READY" | "BLOCKED";

export type M50DiagnosticCode =
  | "INVALID_INPUT"
  | "MISSING_FIELD"
  | "INVALID_FIELD"
  | "MALFORMED_CANDIDATE"
  | "MALFORMED_CHANGE"
  | "MALFORMED_EVIDENCE"
  | "MALFORMED_DECISION"
  | "MALFORMED_REFERENCE"
  | "MALFORMED_ROLLBACK"
  | "MALFORMED_ASSURANCE"
  | "BOUNDED_LIMIT_EXCEEDED"
  | "MISSING_EVIDENCE"
  | "STALE_EVIDENCE"
  | "FOREIGN_EVIDENCE"
  | "CONTRADICTORY_EVIDENCE"
  | "MISSING_REFERENCE"
  | "FOREIGN_REFERENCE"
  | "STALE_CANDIDATE"
  | "FOREIGN_CANDIDATE"
  | "DECISION_NOT_APPROVED"
  | "EVIDENCE_NOT_BOUND"
  | "REFERENCE_NOT_BOUND"
  | "ASSURANCE_NOT_INDEPENDENT"
  | "ASSURANCE_STALE"
  | "ASSURANCE_FOREIGN"
  | "ROLLBACK_UNVERIFIED"
  | "ROLLBACK_INVALID"
  | "PROOF_ID_MISMATCH"
  | "ENVELOPE_ID_MISMATCH"
  | "CHAIN_MISMATCH"
  | "READINESS_MISMATCH"
  | "TRUST_PROMOTION_FORBIDDEN";

export interface M50Diagnostic {
  readonly code: M50DiagnosticCode;
  readonly path: string;
  readonly message: string;
}

export interface M50CandidateBinding {
  readonly candidateId: string;
  readonly commitSha: string;
  readonly treeSha256: string;
  readonly capturedAt: string;
  readonly freshness: "CURRENT" | "STALE";
}

export interface M50Change {
  readonly changeId: string;
  readonly candidateId: string;
  readonly summary: string;
  readonly paths: readonly string[];
  readonly digest: string;
}

export interface M50EvidenceReference {
  readonly evidenceId: string;
  readonly kind: string;
  readonly candidateId: string;
  readonly state: M50EvidenceState;
  readonly capturedAt: string;
  readonly sha256: string;
  readonly scopePaths: readonly string[];
  readonly producer: string;
}

export interface M50Reference {
  readonly kind: M50ReferenceKind;
  readonly referenceId: string;
  readonly candidateId: string;
  readonly reference: string;
  readonly sha256: string;
}

export interface M50Decision {
  readonly decisionId: string;
  readonly candidateId: string;
  readonly outcome: M50DecisionOutcome;
  readonly decidedBy: string;
  readonly decidedAt: string;
  readonly evidenceIds: readonly string[];
  readonly referenceIds: readonly string[];
  readonly rationale: string;
}

export interface M50RollbackTarget {
  readonly candidateId: string;
  readonly targetCandidateId: string;
  readonly targetCommitSha: string;
  readonly targetTreeSha256: string;
  readonly reference: string;
  readonly sha256: string;
  readonly verified: boolean;
  readonly preparedAt: string;
}

export interface M50IndependentAssurance {
  readonly assuranceId: string;
  readonly candidateId: string;
  readonly status: M50IndependentAssuranceStatus;
  readonly independent: boolean;
  readonly assessorId: string;
  readonly assessedAt: string;
  readonly evidenceIds: readonly string[];
}

export interface M50ReleaseProofInput {
  readonly candidate: M50CandidateBinding;
  readonly change: M50Change;
  readonly evidence: readonly M50EvidenceReference[];
  readonly decision: M50Decision;
  readonly references: readonly M50Reference[];
  readonly rollback: M50RollbackTarget;
  readonly independentAssurance: M50IndependentAssurance;
}

export interface M50ReleaseProofContext {
  readonly candidate: M50CandidateBinding;
  readonly evaluatedAt: string;
}

export interface M50Readiness {
  readonly state: M50ReadinessState;
  readonly trustPromotion: "DENIED";
  readonly trustEffect: "PRESERVE";
  readonly blockers: readonly M50Diagnostic[];
}

export interface M50ReleaseProof {
  readonly proofId: string;
  readonly state: M50ReadinessState;
  readonly candidateId: string;
  readonly changeId: string;
  readonly decisionId: string;
  readonly evidenceIds: readonly string[];
  readonly referenceIds: readonly string[];
  readonly assuranceStatus: M50IndependentAssuranceStatus;
  readonly trustPromotion: "DENIED";
  readonly trustEffect: "PRESERVE";
}

export interface M50ReleaseProofEnvelope {
  readonly schema: typeof M50_RELEASE_PROOF_SCHEMA;
  readonly envelopeId: string;
  readonly chain: typeof M50_RELEASE_PROOF_CHAIN;
  readonly candidate: M50CandidateBinding;
  readonly change: M50Change;
  readonly evidence: readonly M50EvidenceReference[];
  readonly decision: M50Decision;
  readonly references: readonly M50Reference[];
  readonly rollback: M50RollbackTarget;
  readonly independentAssurance: M50IndependentAssurance;
  readonly releaseProof: M50ReleaseProof;
  readonly readiness: M50Readiness;
}

export interface M50ReleaseProofValidation {
  readonly valid: boolean;
  readonly ready: boolean;
  readonly errors: readonly string[];
  readonly diagnostics: readonly M50Diagnostic[];
  readonly readiness: M50Readiness;
}

export class M50ReleaseProofError extends Error {
  readonly diagnostics: readonly M50Diagnostic[];

  constructor(diagnostics: readonly M50Diagnostic[]) {
    super(
      `Invalid M50 release proof: ${diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    );
    this.name = "M50ReleaseProofError";
    this.diagnostics = Object.freeze([...diagnostics]);
  }
}

interface ParseState {
  shapeValid: boolean;
  readonly diagnostics: M50Diagnostic[];
}

interface ParsedInput {
  readonly candidate: M50CandidateBinding | undefined;
  readonly change: M50Change | undefined;
  readonly evidence: readonly M50EvidenceReference[];
  readonly decision: M50Decision | undefined;
  readonly references: readonly M50Reference[];
  readonly rollback: M50RollbackTarget | undefined;
  readonly independentAssurance: M50IndependentAssurance | undefined;
}

const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const ID_PATTERN = /^\w[\w.:@/-]{0,127}$/;
const LOCAL_REFERENCE_PATTERN = /^[\w.:@/-]{1,512}$/;
const EVIDENCE_STATES = new Set<M50EvidenceState>([
  "FRESH",
  "STALE",
  "INVALIDATED",
  "FOREIGN",
  "MALFORMED",
  "CONTRADICTORY",
  "UNKNOWN",
]);
const DECISION_OUTCOMES = new Set<M50DecisionOutcome>([
  "APPROVED",
  "REJECTED",
  "BLOCKED",
]);
const ASSURANCE_STATUSES = new Set<M50IndependentAssuranceStatus>([
  "INDEPENDENTLY_ASSURED",
  "PENDING",
  "FAILED",
  "STALE",
  "FOREIGN",
  "BLOCKED",
  "NOT_ASSURED",
]);
const REQUIRED_REFERENCE_KINDS = M50_REFERENCE_KINDS;

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  try {
    const prototype = Reflect.getPrototypeOf(value) as unknown;
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function addDiagnostic(
  state: ParseState,
  code: M50DiagnosticCode,
  path: string,
  message: string,
  shape = false,
): void {
  if (shape) state.shapeValid = false;
  if (
    state.diagnostics.some(
      (diagnostic) =>
        diagnostic.code === code &&
        diagnostic.path === path &&
        diagnostic.message === message,
    )
  ) {
    return;
  }
  state.diagnostics.push(Object.freeze({ code, path, message }));
}

function requireRecord(
  value: unknown,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    addDiagnostic(state, code, path, `${path} must be an object`, true);
    return false;
  }
  return true;
}

function requireKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): boolean {
  const allowed = new Set(keys);
  let valid = true;
  let ownKeys: string[];
  try {
    ownKeys = Object.keys(value);
  } catch {
    addDiagnostic(
      state,
      "INVALID_INPUT",
      path,
      `${path} cannot be inspected`,
      true,
    );
    return false;
  }
  if (ownKeys.length > M50_RELEASE_PROOF_LIMITS.maxNodes) {
    addDiagnostic(
      state,
      "BOUNDED_LIMIT_EXCEEDED",
      path,
      `${path} exceeds the deterministic object bound`,
      true,
    );
    return false;
  }
  for (const key of ownKeys) {
    const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
    if (
      normalized === "trust" ||
      normalized === "trustlevel" ||
      normalized === "trustpromotion"
    ) {
      addDiagnostic(
        state,
        "TRUST_PROMOTION_FORBIDDEN",
        `${path}.${key}`,
        "trust promotion is outside the release-proof contract",
      );
      valid = false;
    } else if (!allowed.has(key)) {
      addDiagnostic(
        state,
        code,
        `${path}.${key}`,
        `${key} is not allowed`,
        true,
      );
      valid = false;
    }
  }
  for (const key of keys) {
    try {
      if (!Object.hasOwn(value, key)) {
        addDiagnostic(
          state,
          "MISSING_FIELD",
          `${path}.${key}`,
          `${key} is required`,
          true,
        );
        valid = false;
      }
    } catch {
      addDiagnostic(
        state,
        "INVALID_INPUT",
        `${path}.${key}`,
        `${path}.${key} cannot be inspected`,
        true,
      );
      valid = false;
    }
  }
  return valid;
}

function requireText(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (
    typeof candidate !== "string" ||
    !isSafeText(candidate, M50_RELEASE_PROOF_LIMITS.maxTextLength)
  ) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be safe text`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireId(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string" || !ID_PATTERN.test(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be a safe identifier`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireSha256(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string" || !SHA256_PATTERN.test(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be a lowercase sha256 digest`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireCommitSha(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string" || !COMMIT_PATTERN.test(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be a lowercase 40-character commit`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireBoolean(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): boolean | undefined {
  const candidate = value[key];
  if (typeof candidate !== "boolean") {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be boolean`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireTimestamp(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string" || !isCanonicalTimestamp(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be a canonical ISO-8601 timestamp`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireLocalReference(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
): string | undefined {
  const candidate = value[key];
  if (typeof candidate !== "string" || !isLocalReference(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be a canonical local reference`,
      true,
    );
    return undefined;
  }
  return candidate;
}

function requireStringArray(
  value: Record<string, unknown>,
  key: string,
  path: string,
  state: ParseState,
  code: M50DiagnosticCode,
  limit: number,
  predicate: (item: string) => boolean,
): string[] {
  const candidate = value[key];
  if (!Array.isArray(candidate)) {
    addDiagnostic(
      state,
      code,
      `${path}.${key}`,
      `${key} must be an array`,
      true,
    );
    return [];
  }
  if (candidate.length > limit) {
    addDiagnostic(
      state,
      "BOUNDED_LIMIT_EXCEEDED",
      `${path}.${key}`,
      `${key} exceeds the bounded limit of ${limit}`,
      true,
    );
  }
  const result: string[] = [];
  candidate.slice(0, limit).forEach((item, index) => {
    if (typeof item !== "string" || !predicate(item)) {
      addDiagnostic(
        state,
        code,
        `${path}.${key}[${index}]`,
        `${key} contains an invalid value`,
        true,
      );
      return;
    }
    result.push(item);
  });
  return result;
}

function isSafeText(value: string, maxLength: number): boolean {
  if (
    value.length === 0 ||
    value.length > maxLength ||
    value.trim() !== value
  ) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) {
      return false;
    }
  }
  return true;
}

function isLocalReference(value: string): boolean {
  if (!LOCAL_REFERENCE_PATTERN.test(value)) return false;
  return value
    .split("/")
    .every(
      (segment) =>
        segment.length > 0 &&
        segment !== "." &&
        segment !== ".." &&
        !(segment.length === 2 && segment.endsWith(":")),
    );
}

function isCanonicalTimestamp(value: string): boolean {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  try {
    return new Date(parsed).toISOString() === value;
  } catch {
    return false;
  }
}

function parseCandidate(
  value: unknown,
  path: string,
  state: ParseState,
): M50CandidateBinding | undefined {
  if (!requireRecord(value, path, state, "MALFORMED_CANDIDATE"))
    return undefined;
  requireKeys(
    value,
    ["candidateId", "commitSha", "treeSha256", "capturedAt", "freshness"],
    path,
    state,
    "MALFORMED_CANDIDATE",
  );
  const candidateId = requireId(
    value,
    "candidateId",
    path,
    state,
    "MALFORMED_CANDIDATE",
  );
  const commitSha = requireCommitSha(
    value,
    "commitSha",
    path,
    state,
    "MALFORMED_CANDIDATE",
  );
  const treeSha256 = requireSha256(
    value,
    "treeSha256",
    path,
    state,
    "MALFORMED_CANDIDATE",
  );
  const capturedAt = requireTimestamp(
    value,
    "capturedAt",
    path,
    state,
    "MALFORMED_CANDIDATE",
  );
  const freshnessValue = value["freshness"];
  if (freshnessValue !== "CURRENT" && freshnessValue !== "STALE") {
    addDiagnostic(
      state,
      "MALFORMED_CANDIDATE",
      `${path}.freshness`,
      "freshness must be CURRENT or STALE",
      true,
    );
    return undefined;
  }
  if (
    candidateId === undefined ||
    commitSha === undefined ||
    treeSha256 === undefined ||
    capturedAt === undefined
  ) {
    return undefined;
  }
  return {
    candidateId,
    commitSha,
    treeSha256,
    capturedAt,
    freshness: freshnessValue,
  };
}

function parseChange(
  value: unknown,
  path: string,
  state: ParseState,
): M50Change | undefined {
  if (!requireRecord(value, path, state, "MALFORMED_CHANGE")) return undefined;
  requireKeys(
    value,
    ["changeId", "candidateId", "summary", "paths", "digest"],
    path,
    state,
    "MALFORMED_CHANGE",
  );
  const changeId = requireId(
    value,
    "changeId",
    path,
    state,
    "MALFORMED_CHANGE",
  );
  const candidateId = requireId(
    value,
    "candidateId",
    path,
    state,
    "MALFORMED_CHANGE",
  );
  const summary = requireText(
    value,
    "summary",
    path,
    state,
    "MALFORMED_CHANGE",
  );
  const paths = requireStringArray(
    value,
    "paths",
    path,
    state,
    "MALFORMED_CHANGE",
    M50_RELEASE_PROOF_LIMITS.maxPaths,
    isLocalReference,
  );
  const digest = requireSha256(
    value,
    "digest",
    path,
    state,
    "MALFORMED_CHANGE",
  );
  if (
    changeId === undefined ||
    candidateId === undefined ||
    summary === undefined ||
    digest === undefined
  ) {
    return undefined;
  }
  if (paths.length === 0)
    addDiagnostic(
      state,
      "MISSING_EVIDENCE",
      `${path}.paths`,
      "change paths are required",
    );
  return {
    changeId,
    candidateId,
    summary,
    paths: [...new Set(paths)].sort(compareText),
    digest,
  };
}

function parseEvidence(
  value: unknown,
  path: string,
  state: ParseState,
): M50EvidenceReference[] {
  if (value === undefined) {
    addDiagnostic(state, "MISSING_FIELD", path, "evidence is required", true);
    return [];
  }
  if (!Array.isArray(value)) {
    addDiagnostic(
      state,
      "MALFORMED_EVIDENCE",
      path,
      "evidence must be an array",
      true,
    );
    return [];
  }
  if (value.length > M50_RELEASE_PROOF_LIMITS.maxEvidence) {
    addDiagnostic(
      state,
      "BOUNDED_LIMIT_EXCEEDED",
      path,
      `evidence exceeds the bounded limit of ${M50_RELEASE_PROOF_LIMITS.maxEvidence}`,
      true,
    );
  }
  const evidence: M50EvidenceReference[] = [];
  value
    .slice(0, M50_RELEASE_PROOF_LIMITS.maxEvidence)
    .forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!requireRecord(entry, entryPath, state, "MALFORMED_EVIDENCE")) return;
      requireKeys(
        entry,
        [
          "evidenceId",
          "kind",
          "candidateId",
          "state",
          "capturedAt",
          "sha256",
          "scopePaths",
          "producer",
        ],
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const evidenceId = requireId(
        entry,
        "evidenceId",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const kind = requireId(
        entry,
        "kind",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const candidateId = requireId(
        entry,
        "candidateId",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const stateValue = entry["state"];
      if (
        typeof stateValue !== "string" ||
        !EVIDENCE_STATES.has(stateValue as M50EvidenceState)
      ) {
        addDiagnostic(
          state,
          "MALFORMED_EVIDENCE",
          `${entryPath}.state`,
          "state is not a lifecycle state",
          true,
        );
      }
      const capturedAt = requireTimestamp(
        entry,
        "capturedAt",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const sha256 = requireSha256(
        entry,
        "sha256",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      const scopePaths = requireStringArray(
        entry,
        "scopePaths",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
        M50_RELEASE_PROOF_LIMITS.maxPaths,
        isLocalReference,
      );
      const producer = requireId(
        entry,
        "producer",
        entryPath,
        state,
        "MALFORMED_EVIDENCE",
      );
      if (
        evidenceId === undefined ||
        kind === undefined ||
        candidateId === undefined ||
        capturedAt === undefined ||
        sha256 === undefined ||
        producer === undefined ||
        typeof stateValue !== "string" ||
        !EVIDENCE_STATES.has(stateValue as M50EvidenceState)
      ) {
        return;
      }
      const existing = evidence.find(
        (entry) => entry.evidenceId === evidenceId,
      );
      if (existing !== undefined) {
        addDiagnostic(
          state,
          "CONTRADICTORY_EVIDENCE",
          `${entryPath}.evidenceId`,
          "evidence IDs must identify one immutable record",
        );
      }
      evidence.push({
        evidenceId,
        kind,
        candidateId,
        state: stateValue as M50EvidenceState,
        capturedAt,
        sha256,
        scopePaths: [...new Set(scopePaths)].sort(compareText),
        producer,
      });
    });
  if (evidence.length === 0)
    addDiagnostic(
      state,
      "MISSING_EVIDENCE",
      path,
      "at least one evidence record is required",
    );
  return evidence.sort((left, right) =>
    compareText(left.evidenceId, right.evidenceId),
  );
}

function parseDecision(
  value: unknown,
  path: string,
  state: ParseState,
): M50Decision | undefined {
  if (!requireRecord(value, path, state, "MALFORMED_DECISION"))
    return undefined;
  requireKeys(
    value,
    [
      "decisionId",
      "candidateId",
      "outcome",
      "decidedBy",
      "decidedAt",
      "evidenceIds",
      "referenceIds",
      "rationale",
    ],
    path,
    state,
    "MALFORMED_DECISION",
  );
  const decisionId = requireId(
    value,
    "decisionId",
    path,
    state,
    "MALFORMED_DECISION",
  );
  const candidateId = requireId(
    value,
    "candidateId",
    path,
    state,
    "MALFORMED_DECISION",
  );
  const outcome = value["outcome"];
  if (
    typeof outcome !== "string" ||
    !DECISION_OUTCOMES.has(outcome as M50DecisionOutcome)
  ) {
    addDiagnostic(
      state,
      "MALFORMED_DECISION",
      `${path}.outcome`,
      "outcome is not a decision state",
      true,
    );
  }
  const decidedBy = requireId(
    value,
    "decidedBy",
    path,
    state,
    "MALFORMED_DECISION",
  );
  const decidedAt = requireTimestamp(
    value,
    "decidedAt",
    path,
    state,
    "MALFORMED_DECISION",
  );
  const evidenceIds = requireStringArray(
    value,
    "evidenceIds",
    path,
    state,
    "MALFORMED_DECISION",
    M50_RELEASE_PROOF_LIMITS.maxDecisionIds,
    (item) => ID_PATTERN.test(item),
  );
  const referenceIds = requireStringArray(
    value,
    "referenceIds",
    path,
    state,
    "MALFORMED_DECISION",
    M50_RELEASE_PROOF_LIMITS.maxDecisionIds,
    (item) => ID_PATTERN.test(item),
  );
  const rationale = requireText(
    value,
    "rationale",
    path,
    state,
    "MALFORMED_DECISION",
  );
  if (
    decisionId === undefined ||
    candidateId === undefined ||
    decidedBy === undefined ||
    decidedAt === undefined ||
    rationale === undefined ||
    typeof outcome !== "string" ||
    !DECISION_OUTCOMES.has(outcome as M50DecisionOutcome)
  ) {
    return undefined;
  }
  if (evidenceIds.length === 0)
    addDiagnostic(
      state,
      "MISSING_EVIDENCE",
      `${path}.evidenceIds`,
      "decision must bind evidence",
    );
  if (referenceIds.length === 0)
    addDiagnostic(
      state,
      "MISSING_REFERENCE",
      `${path}.referenceIds`,
      "decision must bind references",
    );
  return {
    decisionId,
    candidateId,
    outcome: outcome as M50DecisionOutcome,
    decidedBy,
    decidedAt,
    evidenceIds: [...new Set(evidenceIds)].sort(compareText),
    referenceIds: [...new Set(referenceIds)].sort(compareText),
    rationale,
  };
}

function parseReferences(
  value: unknown,
  path: string,
  state: ParseState,
): M50Reference[] {
  if (value === undefined) {
    addDiagnostic(
      state,
      "MISSING_FIELD",
      path,
      "references are required",
      true,
    );
    return [];
  }
  if (!Array.isArray(value)) {
    addDiagnostic(
      state,
      "MALFORMED_REFERENCE",
      path,
      "references must be an array",
      true,
    );
    return [];
  }
  if (value.length > M50_RELEASE_PROOF_LIMITS.maxReferences) {
    addDiagnostic(
      state,
      "BOUNDED_LIMIT_EXCEEDED",
      path,
      `references exceed the bounded limit of ${M50_RELEASE_PROOF_LIMITS.maxReferences}`,
      true,
    );
  }
  const references: M50Reference[] = [];
  const ids = new Set<string>();
  value
    .slice(0, M50_RELEASE_PROOF_LIMITS.maxReferences)
    .forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!requireRecord(entry, entryPath, state, "MALFORMED_REFERENCE"))
        return;
      requireKeys(
        entry,
        ["kind", "referenceId", "candidateId", "reference", "sha256"],
        entryPath,
        state,
        "MALFORMED_REFERENCE",
      );
      const kind = entry["kind"];
      if (
        typeof kind !== "string" ||
        !(M50_REFERENCE_KINDS as readonly string[]).includes(kind)
      ) {
        addDiagnostic(
          state,
          "MALFORMED_REFERENCE",
          `${entryPath}.kind`,
          "kind is not a supported reference kind",
          true,
        );
      }
      const referenceId = requireId(
        entry,
        "referenceId",
        entryPath,
        state,
        "MALFORMED_REFERENCE",
      );
      const candidateId = requireId(
        entry,
        "candidateId",
        entryPath,
        state,
        "MALFORMED_REFERENCE",
      );
      const reference = requireLocalReference(
        entry,
        "reference",
        entryPath,
        state,
        "MALFORMED_REFERENCE",
      );
      const sha256 = requireSha256(
        entry,
        "sha256",
        entryPath,
        state,
        "MALFORMED_REFERENCE",
      );
      if (
        referenceId === undefined ||
        candidateId === undefined ||
        reference === undefined ||
        sha256 === undefined ||
        typeof kind !== "string" ||
        !(M50_REFERENCE_KINDS as readonly string[]).includes(kind)
      )
        return;
      if (ids.has(referenceId))
        addDiagnostic(
          state,
          "MALFORMED_REFERENCE",
          `${entryPath}.referenceId`,
          "reference IDs must be unique",
        );
      ids.add(referenceId);
      references.push({
        kind: kind as M50ReferenceKind,
        referenceId,
        candidateId,
        reference,
        sha256,
      });
    });
  for (const kind of REQUIRED_REFERENCE_KINDS) {
    if (!references.some((entry) => entry.kind === kind)) {
      addDiagnostic(
        state,
        "MISSING_REFERENCE",
        `${path}.${kind}`,
        `a ${kind.toLowerCase()} reference is required`,
      );
    }
  }
  return references.sort((left, right) => {
    const byKind = compareText(left.kind, right.kind);
    return byKind === 0
      ? compareText(left.referenceId, right.referenceId)
      : byKind;
  });
}

function parseRollback(
  value: unknown,
  path: string,
  state: ParseState,
): M50RollbackTarget | undefined {
  if (!requireRecord(value, path, state, "MALFORMED_ROLLBACK"))
    return undefined;
  requireKeys(
    value,
    [
      "candidateId",
      "targetCandidateId",
      "targetCommitSha",
      "targetTreeSha256",
      "reference",
      "sha256",
      "verified",
      "preparedAt",
    ],
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const candidateId = requireId(
    value,
    "candidateId",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const targetCandidateId = requireId(
    value,
    "targetCandidateId",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const targetCommitSha = requireCommitSha(
    value,
    "targetCommitSha",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const targetTreeSha256 = requireSha256(
    value,
    "targetTreeSha256",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const reference = requireLocalReference(
    value,
    "reference",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const sha256 = requireSha256(
    value,
    "sha256",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const verified = requireBoolean(
    value,
    "verified",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  const preparedAt = requireTimestamp(
    value,
    "preparedAt",
    path,
    state,
    "MALFORMED_ROLLBACK",
  );
  if (
    candidateId === undefined ||
    targetCandidateId === undefined ||
    targetCommitSha === undefined ||
    targetTreeSha256 === undefined ||
    reference === undefined ||
    sha256 === undefined ||
    verified === undefined ||
    preparedAt === undefined
  )
    return undefined;
  if (!verified)
    addDiagnostic(
      state,
      "ROLLBACK_UNVERIFIED",
      `${path}.verified`,
      "rollback target must be verified",
    );
  if (candidateId === targetCandidateId)
    addDiagnostic(
      state,
      "ROLLBACK_INVALID",
      `${path}.targetCandidateId`,
      "rollback target must identify a different candidate",
    );
  return {
    candidateId,
    targetCandidateId,
    targetCommitSha,
    targetTreeSha256,
    reference,
    sha256,
    verified,
    preparedAt,
  };
}

function parseAssurance(
  value: unknown,
  path: string,
  state: ParseState,
): M50IndependentAssurance | undefined {
  if (!requireRecord(value, path, state, "MALFORMED_ASSURANCE"))
    return undefined;
  requireKeys(
    value,
    [
      "assuranceId",
      "candidateId",
      "status",
      "independent",
      "assessorId",
      "assessedAt",
      "evidenceIds",
    ],
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const assuranceId = requireId(
    value,
    "assuranceId",
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const candidateId = requireId(
    value,
    "candidateId",
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const status = value["status"];
  if (
    typeof status !== "string" ||
    !ASSURANCE_STATUSES.has(status as M50IndependentAssuranceStatus)
  ) {
    addDiagnostic(
      state,
      "MALFORMED_ASSURANCE",
      `${path}.status`,
      "status is not an assurance state",
      true,
    );
  }
  const independent = requireBoolean(
    value,
    "independent",
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const assessorId = requireId(
    value,
    "assessorId",
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const assessedAt = requireTimestamp(
    value,
    "assessedAt",
    path,
    state,
    "MALFORMED_ASSURANCE",
  );
  const evidenceIds = requireStringArray(
    value,
    "evidenceIds",
    path,
    state,
    "MALFORMED_ASSURANCE",
    M50_RELEASE_PROOF_LIMITS.maxDecisionIds,
    (item) => ID_PATTERN.test(item),
  );
  if (
    assuranceId === undefined ||
    candidateId === undefined ||
    independent === undefined ||
    assessorId === undefined ||
    assessedAt === undefined ||
    typeof status !== "string" ||
    !ASSURANCE_STATUSES.has(status as M50IndependentAssuranceStatus)
  )
    return undefined;
  if (!independent)
    addDiagnostic(
      state,
      "ASSURANCE_NOT_INDEPENDENT",
      `${path}.independent`,
      "assurance must be independent",
    );
  if (evidenceIds.length === 0)
    addDiagnostic(
      state,
      "MISSING_EVIDENCE",
      `${path}.evidenceIds`,
      "assurance must bind evidence",
    );
  return {
    assuranceId,
    candidateId,
    status: status as M50IndependentAssuranceStatus,
    independent,
    assessorId,
    assessedAt,
    evidenceIds: [...new Set(evidenceIds)].sort(compareText),
  };
}

function emptyParsedInput(): ParsedInput {
  return {
    candidate: undefined,
    change: undefined,
    evidence: [],
    decision: undefined,
    references: [],
    rollback: undefined,
    independentAssurance: undefined,
  };
}

function parseInputFields(
  value: unknown,
  path: string,
  state: ParseState,
): ParsedInput {
  try {
    return parseInputFieldsUnsafe(value, path, state);
  } catch {
    addDiagnostic(
      state,
      "INVALID_INPUT",
      path,
      `${path} cannot be inspected`,
      true,
    );
    return emptyParsedInput();
  }
}

function parseInputFieldsUnsafe(
  value: unknown,
  path: string,
  state: ParseState,
): ParsedInput {
  if (!requireRecord(value, path, state, "INVALID_INPUT")) {
    return emptyParsedInput();
  }
  requireKeys(
    value,
    [
      "candidate",
      "change",
      "evidence",
      "decision",
      "references",
      "rollback",
      "independentAssurance",
    ],
    path,
    state,
    "INVALID_INPUT",
  );
  return {
    candidate: parseCandidate(value["candidate"], `${path}.candidate`, state),
    change: parseChange(value["change"], `${path}.change`, state),
    evidence: parseEvidence(value["evidence"], `${path}.evidence`, state),
    decision: parseDecision(value["decision"], `${path}.decision`, state),
    references: parseReferences(
      value["references"],
      `${path}.references`,
      state,
    ),
    rollback: parseRollback(value["rollback"], `${path}.rollback`, state),
    independentAssurance: parseAssurance(
      value["independentAssurance"],
      `${path}.independentAssurance`,
      state,
    ),
  };
}

function sameCandidate(
  left: M50CandidateBinding,
  right: M50CandidateBinding,
): boolean {
  return (
    left.candidateId === right.candidateId &&
    left.commitSha === right.commitSha &&
    left.treeSha256 === right.treeSha256
  );
}

function addCandidateBindingBlocker(
  actual: M50CandidateBinding | undefined,
  expected: M50CandidateBinding | undefined,
  path: string,
  state: ParseState,
): void {
  if (actual === undefined || expected === undefined) return;
  if (!sameCandidate(actual, expected)) {
    addDiagnostic(
      state,
      "FOREIGN_CANDIDATE",
      path,
      "record is bound to a different candidate",
    );
  } else if (
    actual.capturedAt !== expected.capturedAt ||
    actual.freshness === "STALE" ||
    expected.freshness === "STALE"
  ) {
    addDiagnostic(state, "STALE_CANDIDATE", path, "candidate binding is stale");
  }
}

function assessParsed(
  parsed: ParsedInput,
  contextValue: unknown,
  state: ParseState,
): M50Readiness {
  try {
    return assessParsedUnsafe(parsed, contextValue, state);
  } catch {
    addDiagnostic(
      state,
      "INVALID_INPUT",
      "context",
      "candidate context cannot be inspected",
      true,
    );
    return makeReadiness(state);
  }
}

function assessParsedUnsafe(
  parsed: ParsedInput,
  contextValue: unknown,
  state: ParseState,
): M50Readiness {
  let contextCandidate: M50CandidateBinding | undefined;
  let evaluatedAtMs: number | undefined;
  if (!isRecord(contextValue)) {
    addDiagnostic(
      state,
      "INVALID_INPUT",
      "context",
      "context must be an object",
      true,
    );
  } else {
    requireKeys(
      contextValue,
      ["candidate", "evaluatedAt"],
      "context",
      state,
      "INVALID_INPUT",
    );
    contextCandidate = parseCandidate(
      contextValue["candidate"],
      "context.candidate",
      state,
    );
    const evaluatedAt = contextValue["evaluatedAt"];
    if (typeof evaluatedAt === "string" && isCanonicalTimestamp(evaluatedAt))
      evaluatedAtMs = Date.parse(evaluatedAt);
    else
      addDiagnostic(
        state,
        "INVALID_INPUT",
        "context.evaluatedAt",
        "evaluatedAt must be a canonical timestamp",
        true,
      );
  }
  if (contextCandidate === undefined || evaluatedAtMs === undefined) {
    return makeReadiness(state);
  }
  if (contextCandidate.freshness === "STALE")
    addDiagnostic(
      state,
      "STALE_CANDIDATE",
      "context.candidate",
      "current candidate is stale",
    );
  addCandidateBindingBlocker(
    parsed.candidate,
    contextCandidate,
    "candidate",
    state,
  );
  if (parsed.change !== undefined) {
    if (parsed.change.candidateId !== contextCandidate.candidateId)
      addDiagnostic(
        state,
        "FOREIGN_CANDIDATE",
        "change.candidateId",
        "change is bound to a different candidate",
      );
  }
  const evidenceById = new Map<string, M50EvidenceReference>();
  for (const evidence of parsed.evidence) {
    evidenceById.set(evidence.evidenceId, evidence);
    if (evidence.candidateId !== contextCandidate.candidateId) {
      addDiagnostic(
        state,
        "FOREIGN_EVIDENCE",
        `evidence.${evidence.evidenceId}.candidateId`,
        "evidence is bound to a different candidate",
      );
    }
    if (evidence.state === "FOREIGN")
      addDiagnostic(
        state,
        "FOREIGN_EVIDENCE",
        `evidence.${evidence.evidenceId}.state`,
        "evidence is foreign",
      );
    if (evidence.state === "CONTRADICTORY")
      addDiagnostic(
        state,
        "CONTRADICTORY_EVIDENCE",
        `evidence.${evidence.evidenceId}.state`,
        "evidence is contradictory",
      );
    if (evidence.state === "MALFORMED") {
      addDiagnostic(
        state,
        "MALFORMED_EVIDENCE",
        `evidence.${evidence.evidenceId}.state`,
        "evidence is malformed",
      );
    }
    if (evidence.state === "UNKNOWN") {
      addDiagnostic(
        state,
        "MISSING_EVIDENCE",
        `evidence.${evidence.evidenceId}.state`,
        "evidence state is unknown",
      );
    }
    if (evidence.state !== "FRESH") {
      addDiagnostic(
        state,
        "STALE_EVIDENCE",
        `evidence.${evidence.evidenceId}.state`,
        "evidence is not fresh",
      );
    }
    const observedAt = Date.parse(evidence.capturedAt);
    if (observedAt < Date.parse(contextCandidate.capturedAt)) {
      addDiagnostic(
        state,
        "STALE_EVIDENCE",
        `evidence.${evidence.evidenceId}.capturedAt`,
        "evidence predates the candidate",
      );
    }
    if (observedAt > evaluatedAtMs) {
      addDiagnostic(
        state,
        "STALE_EVIDENCE",
        `evidence.${evidence.evidenceId}.capturedAt`,
        "evidence is from the future",
      );
    }
    if (
      evaluatedAtMs - observedAt >
      M50_RELEASE_PROOF_LIMITS.maxEvidenceAgeMs
    ) {
      addDiagnostic(
        state,
        "STALE_EVIDENCE",
        `evidence.${evidence.evidenceId}.capturedAt`,
        "evidence is older than the freshness budget",
      );
    }
  }
  const referenceById = new Map<string, M50Reference>();
  for (const reference of parsed.references) {
    referenceById.set(reference.referenceId, reference);
    if (reference.candidateId !== contextCandidate.candidateId)
      addDiagnostic(
        state,
        "FOREIGN_REFERENCE",
        `references.${reference.referenceId}.candidateId`,
        "reference is bound to a different candidate",
      );
  }
  if (parsed.decision !== undefined) {
    if (parsed.decision.candidateId !== contextCandidate.candidateId)
      addDiagnostic(
        state,
        "FOREIGN_CANDIDATE",
        "decision.candidateId",
        "decision is bound to a different candidate",
      );
    if (parsed.decision.outcome !== "APPROVED")
      addDiagnostic(
        state,
        "DECISION_NOT_APPROVED",
        "decision.outcome",
        "release proof requires an approved decision",
      );
    for (const evidenceId of parsed.decision.evidenceIds) {
      if (!evidenceById.has(evidenceId))
        addDiagnostic(
          state,
          "EVIDENCE_NOT_BOUND",
          "decision.evidenceIds",
          `evidence ${evidenceId} is not present`,
        );
    }
    for (const evidenceId of evidenceById.keys()) {
      if (!parsed.decision.evidenceIds.includes(evidenceId))
        addDiagnostic(
          state,
          "EVIDENCE_NOT_BOUND",
          "decision.evidenceIds",
          `evidence ${evidenceId} is not bound by the decision`,
        );
    }
    for (const referenceId of parsed.decision.referenceIds) {
      if (!referenceById.has(referenceId))
        addDiagnostic(
          state,
          "REFERENCE_NOT_BOUND",
          "decision.referenceIds",
          `reference ${referenceId} is not present`,
        );
    }
    for (const referenceId of referenceById.keys()) {
      if (!parsed.decision.referenceIds.includes(referenceId))
        addDiagnostic(
          state,
          "REFERENCE_NOT_BOUND",
          "decision.referenceIds",
          `reference ${referenceId} is not bound by the decision`,
        );
    }
  }
  if (parsed.rollback !== undefined) {
    if (parsed.rollback.candidateId !== contextCandidate.candidateId)
      addDiagnostic(
        state,
        "FOREIGN_CANDIDATE",
        "rollback.candidateId",
        "rollback is bound to a different candidate",
      );
    if (!parsed.rollback.verified)
      addDiagnostic(
        state,
        "ROLLBACK_UNVERIFIED",
        "rollback.verified",
        "rollback target is not verified",
      );
  }
  if (parsed.independentAssurance !== undefined) {
    const assurance = parsed.independentAssurance;
    if (
      assurance.candidateId !== contextCandidate.candidateId ||
      assurance.status === "FOREIGN"
    )
      addDiagnostic(
        state,
        "ASSURANCE_FOREIGN",
        "independentAssurance.candidateId",
        "assurance is bound to a different candidate",
      );
    if (assurance.status !== "INDEPENDENTLY_ASSURED" || !assurance.independent)
      addDiagnostic(
        state,
        "ASSURANCE_NOT_INDEPENDENT",
        "independentAssurance.status",
        "independent assurance is incomplete",
      );
    if (assurance.status === "STALE")
      addDiagnostic(
        state,
        "ASSURANCE_STALE",
        "independentAssurance.status",
        "assurance is stale",
      );
    const assuranceTime = Date.parse(assurance.assessedAt);
    if (assuranceTime < Date.parse(contextCandidate.capturedAt))
      addDiagnostic(
        state,
        "ASSURANCE_STALE",
        "independentAssurance.assessedAt",
        "assurance predates the candidate",
      );
    if (assuranceTime > evaluatedAtMs)
      addDiagnostic(
        state,
        "ASSURANCE_STALE",
        "independentAssurance.assessedAt",
        "assurance is from the future",
      );
    if (
      evaluatedAtMs - assuranceTime >
      M50_RELEASE_PROOF_LIMITS.maxEvidenceAgeMs
    )
      addDiagnostic(
        state,
        "ASSURANCE_STALE",
        "independentAssurance.assessedAt",
        "assurance is older than the freshness budget",
      );
    if (
      parsed.decision !== undefined &&
      assurance.assessorId === parsed.decision.decidedBy
    )
      addDiagnostic(
        state,
        "ASSURANCE_NOT_INDEPENDENT",
        "independentAssurance.assessorId",
        "assessor must be independent of the decision maker",
      );
    for (const evidenceId of assurance.evidenceIds) {
      if (!evidenceById.has(evidenceId))
        addDiagnostic(
          state,
          "EVIDENCE_NOT_BOUND",
          "independentAssurance.evidenceIds",
          `assurance evidence ${evidenceId} is not present`,
        );
    }
  }
  return makeReadiness(state);
}

function makeReadiness(state: ParseState): M50Readiness {
  const blockers = [...state.diagnostics].sort((left, right) => {
    const byCode = compareText(left.code, right.code);
    return byCode === 0 ? compareText(left.path, right.path) : byCode;
  });
  const frozenBlockers = Object.freeze(
    blockers.map((blocker) => Object.freeze({ ...blocker })),
  );
  return Object.freeze({
    state: frozenBlockers.length === 0 ? "READY" : "BLOCKED",
    trustPromotion: "DENIED",
    trustEffect: "PRESERVE",
    blockers: frozenBlockers,
  });
}

function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  let nodes = 0;
  const visit = (current: unknown, depth: number): string => {
    if (depth > M50_RELEASE_PROOF_LIMITS.maxDepth)
      throw new Error("canonicalization depth exceeded");
    nodes += 1;
    if (nodes > M50_RELEASE_PROOF_LIMITS.maxNodes)
      throw new Error("canonicalization node bound exceeded");
    if (current === null) return "null";
    if (typeof current === "string") return JSON.stringify(current);
    if (typeof current === "boolean") return current ? "true" : "false";
    if (typeof current === "number" && Number.isFinite(current))
      return JSON.stringify(current);
    if (typeof current !== "object")
      throw new Error("value is not canonical JSON");
    if (ancestors.has(current)) throw new Error("cyclic value");
    if (Object.getOwnPropertySymbols(current).length > 0) {
      throw new Error("symbol keys are not canonical JSON");
    }
    ancestors.add(current);
    let result: string;
    if (Array.isArray(current)) {
      result = `[${current
        .map((_, index) => {
          const descriptor = Object.getOwnPropertyDescriptor(
            current,
            String(index),
          );
          if (!descriptor || !("value" in descriptor)) {
            throw new Error("array accessors are not canonical JSON");
          }
          return visit(descriptor.value, depth + 1);
        })
        .join(",")}]`;
    } else {
      const record = current as Record<string, unknown>;
      const keys = Object.keys(record).sort(compareText);
      result = `{${keys
        .map((key) => {
          const descriptor = Object.getOwnPropertyDescriptor(record, key);
          if (!descriptor || !("value" in descriptor)) {
            throw new Error("object accessors are not canonical JSON");
          }
          return `${JSON.stringify(key)}:${visit(descriptor.value, depth + 1)}`;
        })
        .join(",")}}`;
    }
    ancestors.delete(current);
    return result;
  };
  return visit(value, 0);
}

function digest(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return Object.freeze(value);
}

function buildEnvelope(
  parsed: ParsedInput,
  context: M50ReleaseProofContext,
  state: ParseState,
): M50ReleaseProofEnvelope {
  const assessment = assessParsed(parsed, context, state);
  const candidate = parsed.candidate as M50CandidateBinding;
  const change = parsed.change as M50Change;
  const decision = parsed.decision as M50Decision;
  const assurance = parsed.independentAssurance as M50IndependentAssurance;
  const evidenceIds = parsed.evidence.map((entry) => entry.evidenceId);
  const referenceIds = parsed.references.map((entry) => entry.referenceId);
  const proofPayload = {
    schema: M50_RELEASE_PROOF_SCHEMA,
    chain: M50_RELEASE_PROOF_CHAIN,
    candidate,
    change,
    evidence: parsed.evidence,
    decision,
    references: parsed.references,
    rollback: parsed.rollback as M50RollbackTarget,
    independentAssurance: assurance,
  };
  const proofId = digest(proofPayload);
  const releaseProof: M50ReleaseProof = {
    proofId,
    state: assessment.state,
    candidateId: candidate.candidateId,
    changeId: change.changeId,
    decisionId: decision.decisionId,
    evidenceIds,
    referenceIds,
    assuranceStatus: assurance.status,
    trustPromotion: "DENIED",
    trustEffect: "PRESERVE",
  };
  const draft = {
    ...proofPayload,
    releaseProof,
    readiness: assessment,
  };
  const envelopeId = digest(draft);
  return deepFreeze({ ...draft, envelopeId });
}

function resolveContext(
  contextOrCandidate: M50ReleaseProofContext | M50CandidateBinding,
  evaluatedAt?: string,
): M50ReleaseProofContext {
  try {
    if ("candidate" in contextOrCandidate) return contextOrCandidate;
    return {
      candidate: contextOrCandidate,
      evaluatedAt: evaluatedAt ?? contextOrCandidate.capturedAt,
    };
  } catch {
    return {
      candidate: contextOrCandidate as M50CandidateBinding,
      evaluatedAt: evaluatedAt ?? "",
    };
  }
}

function finishValidation(
  diagnostics: readonly M50Diagnostic[],
  readiness: M50Readiness,
  valid: boolean,
): M50ReleaseProofValidation {
  const frozen = Object.freeze(
    [...diagnostics].sort((left, right) => {
      const byCode = compareText(left.code, right.code);
      return byCode === 0 ? compareText(left.path, right.path) : byCode;
    }),
  );
  return Object.freeze({
    valid: valid && frozen.length === 0 && readiness.state === "READY",
    ready: valid && frozen.length === 0 && readiness.state === "READY",
    errors: Object.freeze(frozen.map((diagnostic) => diagnostic.message)),
    diagnostics: frozen,
    readiness,
  });
}

export function createM50ReleaseProof(
  input: M50ReleaseProofInput,
  contextOrCandidate: M50ReleaseProofContext | M50CandidateBinding,
  evaluatedAt?: string,
): M50ReleaseProofEnvelope {
  const context = resolveContext(contextOrCandidate, evaluatedAt);
  const state: ParseState = { shapeValid: true, diagnostics: [] };
  const parsed = parseInputFields(input, "input", state);
  assessParsed(parsed, context, state);
  if (!state.shapeValid) throw new M50ReleaseProofError([...state.diagnostics]);
  try {
    return buildEnvelope(parsed, context, state);
  } catch {
    throw new M50ReleaseProofError([
      {
        code: "INVALID_INPUT",
        path: "input",
        message: "input cannot be canonicalized",
      },
    ]);
  }
}

export function validateM50ReleaseProof(
  value: unknown,
  contextOrCandidate: M50ReleaseProofContext | M50CandidateBinding,
  evaluatedAt?: string,
): M50ReleaseProofValidation {
  const context = resolveContext(contextOrCandidate, evaluatedAt);
  const state: ParseState = { shapeValid: true, diagnostics: [] };
  if (!isRecord(value)) {
    addDiagnostic(
      state,
      "INVALID_INPUT",
      "envelope",
      "envelope must be an object",
      true,
    );
    return finishValidation(state.diagnostics, makeReadiness(state), false);
  }
  requireKeys(
    value,
    [
      "schema",
      "envelopeId",
      "chain",
      "candidate",
      "change",
      "evidence",
      "decision",
      "references",
      "rollback",
      "independentAssurance",
      "releaseProof",
      "readiness",
    ],
    "envelope",
    state,
    "INVALID_INPUT",
  );
  if (value["schema"] !== M50_RELEASE_PROOF_SCHEMA)
    addDiagnostic(
      state,
      "INVALID_INPUT",
      "envelope.schema",
      "schema is not supported",
      true,
    );
  try {
    if (
      canonicalJson(value["chain"]) !== canonicalJson(M50_RELEASE_PROOF_CHAIN)
    ) {
      addDiagnostic(
        state,
        "CHAIN_MISMATCH",
        "envelope.chain",
        "chain is not canonical",
      );
    }
  } catch {
    addDiagnostic(
      state,
      "CHAIN_MISMATCH",
      "envelope.chain",
      "chain cannot be canonicalized",
      true,
    );
  }
  const envelopeId = value["envelopeId"];
  if (typeof envelopeId !== "string" || !SHA256_PATTERN.test(envelopeId))
    addDiagnostic(
      state,
      "INVALID_INPUT",
      "envelope.envelopeId",
      "envelopeId must be a sha256 digest",
      true,
    );
  const input = {
    candidate: value["candidate"],
    change: value["change"],
    evidence: value["evidence"],
    decision: value["decision"],
    references: value["references"],
    rollback: value["rollback"],
    independentAssurance: value["independentAssurance"],
  };
  const parsed = parseInputFields(input, "input", state);
  if (!state.shapeValid)
    return finishValidation(state.diagnostics, makeReadiness(state), false);
  const expected = buildEnvelope(parsed, context, state);
  let exact: boolean;
  try {
    exact = canonicalJson(value) === canonicalJson(expected);
  } catch {
    exact = false;
  }
  if (!exact) {
    addDiagnostic(
      state,
      "ENVELOPE_ID_MISMATCH",
      "envelope",
      "envelope is not canonical",
    );
    const proof = value["releaseProof"];
    if (!isRecord(proof) || proof["proofId"] !== expected.releaseProof.proofId)
      addDiagnostic(
        state,
        "PROOF_ID_MISMATCH",
        "envelope.releaseProof.proofId",
        "proof ID does not match immutable chain",
      );
  }
  const expectedReadiness = expected.readiness;
  try {
    if (
      canonicalJson(value["readiness"]) !== canonicalJson(expectedReadiness)
    ) {
      addDiagnostic(
        state,
        "READINESS_MISMATCH",
        "envelope.readiness",
        "readiness is not derived from the envelope",
      );
    }
    if (
      canonicalJson(value["releaseProof"]) !==
      canonicalJson(expected.releaseProof)
    ) {
      addDiagnostic(
        state,
        "PROOF_ID_MISMATCH",
        "envelope.releaseProof",
        "release proof metadata is not canonical",
      );
    }
  } catch {
    addDiagnostic(
      state,
      "READINESS_MISMATCH",
      "envelope",
      "envelope metadata cannot be canonicalized",
      true,
    );
  }
  return finishValidation(state.diagnostics, expectedReadiness, exact);
}

export function serializeM50ReleaseProof(value: unknown): string {
  return canonicalJson(value);
}

export const validateReleaseProof = validateM50ReleaseProof;
export const createReleaseProof = createM50ReleaseProof;
export const serializeReleaseProof = serializeM50ReleaseProof;
