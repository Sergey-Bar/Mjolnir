export const M40_LANGUAGE_CONTRACT_SCHEMA = "m40.language-expansion@1" as const;

export const M40_LANGUAGE_CERTIFICATION_SCHEMA = M40_LANGUAGE_CONTRACT_SCHEMA;

export const M40_LANGUAGE_SUPPORT_STATES = Object.freeze([
  "SUPPORTED",
  "CANDIDATE",
  "UNKNOWN",
  "UNSUPPORTED",
] as const);

export const M40_LANGUAGE_TIERS = Object.freeze([
  "A",
  "B",
  "C",
  "D",
  "E",
] as const);

export type M40LanguageTier = (typeof M40_LANGUAGE_TIERS)[number];

export const M40_PARSER_TIERS = Object.freeze([
  "native-semantic",
  "tree-sitter",
  "language-server",
  "structural",
  "lexical-fallback",
] as const);

export type M40ParserTier = (typeof M40_PARSER_TIERS)[number];

export const M40_PARSER_TIER_MODES = Object.freeze({
  A: "native-semantic",
  B: "tree-sitter",
  C: "language-server",
  D: "structural",
  E: "lexical-fallback",
} as const satisfies Record<M40LanguageTier, M40ParserTier>);

export const M40_LANGUAGE_CERTIFICATION_STATES = Object.freeze([
  "DISCOVERED",
  "KNOWN",
  "PARSEABLE",
  "SEMANTICALLY_SUPPORTED",
  "MEASURED",
  "CANDIDATE",
  "EXPERIMENTAL",
  "CERTIFIED",
  "TRUST-COMPLETE",
  "DEGRADED",
  "DEPRECATED",
  "UNSUPPORTED",
  "BLOCKED",
  "UNKNOWN",
] as const);

export const M40_CERTIFICATION_STATES = M40_LANGUAGE_CERTIFICATION_STATES;

export type M40LanguageCertificationState =
  (typeof M40_LANGUAGE_CERTIFICATION_STATES)[number];

export type M40CertificationState = M40LanguageCertificationState;

export const M40_LANGUAGE_STATES = M40_LANGUAGE_CERTIFICATION_STATES;

export const M40_EVIDENCE_STATES = Object.freeze([
  "FRESH",
  "CURRENT",
  "STALE",
  "INVALIDATED",
  "FOREIGN",
  "MALFORMED",
  "CONTRADICTORY",
  "PARTIAL",
  "UNKNOWN",
  "BLOCKED",
  "UNSUPPORTED",
  "MISSING",
] as const);

export type M40EvidenceState = (typeof M40_EVIDENCE_STATES)[number];

export const M40_EVIDENCE_KINDS = Object.freeze([
  "vir",
  "cross-file",
  "runtime",
  "unsupported",
] as const);

export type M40EvidenceKind = (typeof M40_EVIDENCE_KINDS)[number];

export const M40_EVIDENCE_OUTCOMES = Object.freeze([
  "PASS",
  "PARTIAL",
  "UNKNOWN",
  "BLOCKED",
  "UNSUPPORTED",
  "STALE",
  "FOREIGN",
] as const);

export type M40EvidenceOutcome = (typeof M40_EVIDENCE_OUTCOMES)[number];

export const M40_SATURATION_STATES = Object.freeze([
  "PASS",
  "PARTIAL",
  "UNKNOWN",
  "BLOCKED",
  "UNSUPPORTED",
  "STALE",
  "FOREIGN",
  "INVALID",
] as const);

export type M40SaturationState = (typeof M40_SATURATION_STATES)[number];

export const M40_SATURATION_GATES = Object.freeze([
  "discovery",
  "syntax",
  "semantic",
  "vir",
  "cross-file",
  "runtime",
  "unsupported",
  "version",
  "malformed",
  "precision",
  "performance",
  "security",
  "privacy",
  "explainability",
  "actionability",
  "documentation",
  "regression",
  "real-repository",
] as const);

export type M40SaturationGate = (typeof M40_SATURATION_GATES)[number];

export const M40_MINIMUM_SATURATION_GATES = Object.freeze([
  "vir",
  "cross-file",
  "runtime",
  "unsupported",
] as const satisfies readonly M40SaturationGate[]);

export const M40_SATURATION_DIMENSIONS = M40_SATURATION_GATES;

export const M40_REQUIRED_SATURATION_GATES = M40_MINIMUM_SATURATION_GATES;

export const M40_LANGUAGE_LIMITS = Object.freeze({
  maxLanguages: 128,
  maxEvidenceItems: 64,
  maxSaturationGates: 64,
  maxIdLength: 128,
  maxTextLength: 1_024,
  maxDenominator: 1_000_000,
  maxEvidenceAgeMs: 86_400_000,
} as const);

export const M40_LIMITS = M40_LANGUAGE_LIMITS;

export const M40_LANGUAGE_INTAKE_IDS = Object.freeze([
  "javascript",
  "typescript",
  "python",
  "java",
  "kotlin",
  "csharp",
  "fsharp",
  "vbnet",
  "c",
  "cpp",
  "objectivec",
  "swift",
  "go",
  "rust",
  "ruby",
  "php",
  "scala",
  "dart",
  "groovy",
  "shell",
  "powershell",
  "lua",
  "perl",
  "r",
  "julia",
  "elixir",
  "erlang",
  "haskell",
  "clojure",
  "ocaml",
  "zig",
  "fortran",
  "cobol",
  "abap",
  "apex",
  "plsql",
  "tsql",
  "sql",
  "matlab",
  "yaml",
  "json",
  "xml",
  "toml",
  "dockerfile",
  "terraform",
  "hcl",
  "kubernetes",
  "helm",
  "cloudformation",
  "ansible",
  "azurearm",
  "bicep",
] as const);

const M40_LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  "c#": "csharp",
  "c-sharp": "csharp",
  "c++": "cpp",
  "objective-c": "objectivec",
  bash: "shell",
  sh: "shell",
  ps1: "powershell",
  "pl/sql": "plsql",
  "t-sql": "tsql",
  "azure-arm": "azurearm",
  docker: "dockerfile",
};

const M40_KNOWN_LANGUAGE_IDS = new Set<string>(M40_LANGUAGE_INTAKE_IDS);

export type M40LanguageSupport =
  "SUPPORTED" | "CANDIDATE" | "UNKNOWN" | "UNSUPPORTED";

export interface M40CandidateBinding {
  readonly candidateId: string;
  readonly candidateDigest?: string;
  readonly commit?: string;
  readonly tree?: string;
}

export interface M40EvidenceBase {
  readonly candidateId: string;
  readonly candidateDigest?: string;
  readonly evidenceId: string;
  readonly producer: string;
  readonly capturedAt: string;
  readonly state: M40EvidenceState;
}

export interface M40VirEvidence extends M40EvidenceBase {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly requiredNodeKinds: number;
  readonly coveredNodeKinds: number;
}

export interface M40CrossFileEvidence extends M40EvidenceBase {
  readonly caseCount: number;
  readonly passedCases: number;
  readonly edgeCount: number;
  readonly unresolvedEdges: number;
}

export interface M40RuntimeEvidence extends M40EvidenceBase {
  readonly executedTests: number;
  readonly passedTests: number;
  readonly failedTests: number;
  readonly skippedTests: number;
  readonly complete: boolean;
  readonly reportDigest: string;
}

export interface M40UnsupportedEvidence extends M40EvidenceBase {
  readonly checkedConstructs: number;
  readonly classifiedConstructs: number;
  readonly unsupportedConstructs: number;
  readonly limitations: readonly string[];
}

export interface M40SaturationGateEvidence {
  readonly gate: M40SaturationGate;
  readonly status: M40SaturationState;
  readonly denominator: number;
  readonly passed: number;
  readonly reason?: string;
}

export interface M40SaturationEvidence extends M40EvidenceBase {
  readonly requiredGates: readonly M40SaturationGate[];
  readonly gates: readonly M40SaturationGateEvidence[];
  readonly denominator: number;
  readonly passed: number;
  readonly partial: number;
  readonly unknown: number;
  readonly blocked: number;
  readonly unsupported: number;
  readonly invalid: number;
}

export interface M40LanguageEvidenceBundle {
  readonly vir?: M40VirEvidence;
  readonly crossFile?: M40CrossFileEvidence;
  readonly runtime?: M40RuntimeEvidence;
  readonly unsupported?: M40UnsupportedEvidence;
}

export interface M40LanguageExpansionRequest {
  readonly schemaVersion: 1;
  readonly languageId: string;
  readonly tier: M40LanguageTier;
  readonly support: M40LanguageSupport;
  readonly candidate: M40CandidateBinding;
  readonly evidence: M40LanguageEvidenceBundle;
  readonly saturation: M40SaturationEvidence;
}

export interface M40LanguageEvaluationContext {
  readonly candidateId: string;
  readonly candidateDigest?: string;
  readonly evaluatedAt: string;
  readonly maxEvidenceAgeMs?: number;
  readonly evaluatedAtMs?: number;
}

export interface M40EvidenceAssessment {
  readonly kind: M40EvidenceKind;
  readonly state: M40EvidenceState;
  readonly outcome: M40EvidenceOutcome;
  readonly reason: M40Reason;
  readonly candidateBound: boolean;
}

export interface M40SaturationDenominators {
  readonly required: number;
  readonly total: number;
  readonly passed: number;
  readonly partial: number;
  readonly unknown: number;
  readonly blocked: number;
  readonly unsupported: number;
  readonly invalid: number;
  readonly complete: boolean;
}

export interface M40SaturationAssessment {
  readonly state: M40EvidenceState;
  readonly outcome: M40EvidenceOutcome;
  readonly reason: M40Reason;
  readonly denominators: M40SaturationDenominators | null;
  readonly complete: boolean;
  readonly candidateBound: boolean;
}

export interface M40LanguageExpansionReport {
  readonly schemaVersion: 1;
  readonly languageId: string | null;
  readonly tier: M40LanguageTier | null;
  readonly support: M40LanguageSupport | null;
  readonly demandRank: number | null;
  readonly state: M40LanguageCertificationState;
  readonly outcome: M40LanguageCertificationState;
  readonly certificationState: M40LanguageCertificationState;
  readonly certified: boolean;
  readonly canCertify: boolean;
  readonly reason: M40Reason;
  readonly evidence: readonly M40EvidenceAssessment[];
  readonly saturation: M40SaturationAssessment;
  readonly limitations: readonly string[];
  readonly trustEffect: "PRESERVE_OR_DOWNGRADE";
}

export type M40LanguageCandidate = M40LanguageExpansionRequest;

export type M40LanguageEvaluation = M40LanguageExpansionReport;

export type M40SaturationMatrix = M40SaturationEvidence;

export const M40_CERTIFICATION_TRUST_POLICY = Object.freeze({
  effect: "PRESERVE_OR_DOWNGRADE",
  canIncreaseTrust: false,
  candidateBindingRequired: true,
  freshnessRequired: true,
  completeSaturationRequired: true,
  selfCertificationAllowed: false,
} as const);

export type M40Reason =
  | "CERTIFIED"
  | "LANGUAGE_UNKNOWN"
  | "LANGUAGE_UNSUPPORTED"
  | "CANDIDATE_NOT_CERTIFIED"
  | "MALFORMED_REQUEST"
  | "MALFORMED_CONTEXT"
  | "MALFORMED_EVIDENCE"
  | "MISSING_EVIDENCE"
  | "VIR_EVIDENCE_MISSING"
  | "CROSS_FILE_EVIDENCE_MISSING"
  | "RUNTIME_EVIDENCE_MISSING"
  | "UNSUPPORTED_EVIDENCE_MISSING"
  | "EVIDENCE_STALE"
  | "EVIDENCE_FOREIGN"
  | "EVIDENCE_FUTURE"
  | "EVIDENCE_INVALIDATED"
  | "EVIDENCE_CONTRADICTORY"
  | "EVIDENCE_PARTIAL"
  | "EVIDENCE_BLOCKED"
  | "EVIDENCE_UNSUPPORTED"
  | "CANDIDATE_BINDING_MISSING"
  | "SATURATION_MISSING"
  | "SATURATION_INVALID"
  | "SATURATION_INCOMPLETE"
  | "SATURATION_STALE"
  | "SATURATION_FOREIGN"
  | "SATURATION_UNSUPPORTED"
  | "TIER_MISSING"
  | "RESOURCE_LIMIT";

type UnknownRecord = Record<string, unknown>;

type EvidenceAssessment = M40EvidenceAssessment;

interface ParsedContext {
  readonly valid: boolean;
  readonly candidateId: string | null;
  readonly candidateDigest: string | null;
  readonly evaluatedAtMs: number | null;
  readonly maxEvidenceAgeMs: number;
  readonly reason: M40Reason | null;
}

interface ParsedEnvelope {
  readonly valid: boolean;
  readonly state: M40EvidenceState;
  readonly candidateBound: boolean;
  readonly candidateDigest: string | null;
  readonly capturedAtMs: number | null;
  readonly reason: M40Reason;
}

interface ParsedRequest {
  readonly valid: boolean;
  readonly languageId: string | null;
  readonly normalizedLanguageId: string | null;
  readonly tier: M40LanguageTier | null;
  readonly support: M40LanguageSupport | null;
  readonly candidate: M40CandidateBinding | null;
  readonly evidence: M40LanguageEvidenceBundle | null;
  readonly saturation: M40SaturationEvidence | null;
  readonly reason: M40Reason;
}

function own(value: UnknownRecord, key: string): unknown {
  try {
    return value[key];
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function text(
  value: unknown,
  max: number = M40_LANGUAGE_LIMITS.maxTextLength,
): string | null {
  if (typeof value !== "string") return null;
  const result = value.trim();
  if (result.length === 0 || result.length > max) return null;
  return result;
}

function id(value: unknown): string | null {
  return text(value, M40_LANGUAGE_LIMITS.maxIdLength);
}

function nonNegativeInteger(
  value: unknown,
  max: number = M40_LANGUAGE_LIMITS.maxDenominator,
): number | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return null;
  }
  return value <= max ? value : null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

function boolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function parseTime(value: unknown): number | null {
  const valueText = text(value, 64);
  if (valueText === null) return null;
  const parsed = Date.parse(valueText);
  return Number.isFinite(parsed) ? parsed : null;
}

function array(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > M40_LANGUAGE_LIMITS.maxSaturationGates) return null;
  return Array.from<unknown>(value);
}

function isTier(value: unknown): value is M40LanguageTier {
  return (
    typeof value === "string" &&
    (M40_LANGUAGE_TIERS as readonly string[]).includes(value)
  );
}

function isCertificationState(
  value: unknown,
): value is M40LanguageCertificationState {
  return (
    typeof value === "string" &&
    (M40_LANGUAGE_CERTIFICATION_STATES as readonly string[]).includes(value)
  );
}

function isEvidenceState(value: unknown): value is M40EvidenceState {
  if (value === "CURRENT") return true;
  return (
    typeof value === "string" &&
    (M40_EVIDENCE_STATES as readonly string[]).includes(value)
  );
}

function isSaturationState(value: unknown): value is M40SaturationState {
  return (
    typeof value === "string" &&
    (M40_SATURATION_STATES as readonly string[]).includes(value)
  );
}

function normalizeLanguageId(value: unknown): string | null {
  const valueText = text(value, M40_LANGUAGE_LIMITS.maxIdLength);
  if (valueText === null) return null;
  const compact = valueText.toLowerCase().replace(/\s+/g, "");
  const mapped = M40_LANGUAGE_ALIASES[compact] ?? compact;
  return M40_KNOWN_LANGUAGE_IDS.has(mapped) ? mapped : null;
}

function demandRank(languageId: string | null): number | null {
  if (languageId === null) return null;
  const index = M40_LANGUAGE_INTAKE_IDS.indexOf(
    languageId as (typeof M40_LANGUAGE_INTAKE_IDS)[number],
  );
  return index < 0 ? null : index + 1;
}

function parseSupport(value: unknown): M40LanguageSupport | null {
  if (
    value === "SUPPORTED" ||
    value === "CANDIDATE" ||
    value === "UNSUPPORTED" ||
    value === "UNKNOWN"
  ) {
    return value;
  }
  return null;
}

function parseCandidate(value: unknown): M40CandidateBinding | null {
  if (!isRecord(value)) return null;
  const candidateId = id(own(value, "candidateId"));
  if (candidateId === null) return null;
  const candidateDigest = id(own(value, "candidateDigest"));
  const commit = id(own(value, "commit"));
  const tree = id(own(value, "tree"));
  return {
    candidateId,
    ...(candidateDigest === null ? {} : { candidateDigest }),
    ...(commit === null ? {} : { commit }),
    ...(tree === null ? {} : { tree }),
  };
}

function parseContext(
  value: unknown,
  candidate: M40CandidateBinding | null,
): ParsedContext {
  const fallbackId = candidate?.candidateId ?? null;
  const fallbackDigest = candidate?.candidateDigest ?? null;
  if (!isRecord(value)) {
    return {
      valid: false,
      candidateId: fallbackId,
      candidateDigest: fallbackDigest,
      evaluatedAtMs: null,
      maxEvidenceAgeMs: M40_LANGUAGE_LIMITS.maxEvidenceAgeMs,
      reason: "MALFORMED_CONTEXT",
    };
  }
  const candidateId = id(own(value, "candidateId")) ?? fallbackId;
  const candidateDigest =
    id(own(value, "candidateDigest")) ??
    id(own(value, "candidateSha")) ??
    id(own(value, "digest")) ??
    fallbackDigest;
  const evaluatedAtValue = own(value, "evaluatedAt");
  const evaluatedAtMs = own(value, "evaluatedAtMs");
  const parsedTime =
    typeof evaluatedAtValue === "string" || evaluatedAtValue === undefined
      ? parseTime(evaluatedAtValue)
      : null;
  const parsedNumericTime = finiteNumber(evaluatedAtMs);
  const time = parsedNumericTime ?? parsedTime;
  const maxValue = own(value, "maxEvidenceAgeMs");
  const maxParsed =
    maxValue === undefined
      ? M40_LANGUAGE_LIMITS.maxEvidenceAgeMs
      : nonNegativeInteger(maxValue, M40_LANGUAGE_LIMITS.maxEvidenceAgeMs);
  if (
    candidateId === null ||
    time === null ||
    maxParsed === null ||
    (parsedNumericTime !== null &&
      parsedTime !== null &&
      parsedNumericTime !== parsedTime) ||
    (candidate !== null && candidateId !== candidate.candidateId) ||
    (candidateDigest !== null &&
      fallbackDigest !== null &&
      candidateDigest !== fallbackDigest)
  ) {
    return {
      valid: false,
      candidateId,
      candidateDigest,
      evaluatedAtMs: null,
      maxEvidenceAgeMs: M40_LANGUAGE_LIMITS.maxEvidenceAgeMs,
      reason: "MALFORMED_CONTEXT",
    };
  }
  return {
    valid: true,
    candidateId,
    candidateDigest,
    evaluatedAtMs: time,
    maxEvidenceAgeMs: maxParsed,
    reason: null,
  };
}

function parseRequest(value: unknown): ParsedRequest {
  if (
    !isRecord(value) ||
    (own(value, "schemaVersion") !== 1 &&
      own(value, "schema") !== M40_LANGUAGE_CONTRACT_SCHEMA)
  ) {
    return {
      valid: false,
      languageId: null,
      normalizedLanguageId: null,
      tier: null,
      support: null,
      candidate: null,
      evidence: null,
      saturation: null,
      reason: "MALFORMED_REQUEST",
    };
  }
  const languageId =
    id(own(value, "languageId")) ??
    id(own(value, "language")) ??
    id(own(value, "languageName"));
  const normalizedLanguageId = normalizeLanguageId(languageId);
  const tierValue = own(value, "tier") ?? own(value, "parserTier");
  const tier = isTier(tierValue) ? tierValue : null;
  const supportValue =
    own(value, "support") ??
    own(value, "supportState") ??
    own(value, "adapterState") ??
    own(value, "maturity");
  const support =
    supportValue === undefined
      ? normalizedLanguageId === null
        ? "UNKNOWN"
        : "CANDIDATE"
      : parseSupport(supportValue);
  const candidate =
    parseCandidate(own(value, "candidate") ?? own(value, "candidateBinding")) ??
    parseCandidate({
      candidateId: own(value, "candidateId"),
      candidateDigest:
        own(value, "candidateDigest") ??
        own(value, "candidateSha") ??
        own(value, "commitSha") ??
        own(value, "treeSha256"),
    });
  const evidence = own(value, "evidence");
  const saturation = own(value, "saturation") ?? own(value, "saturationMatrix");
  if (
    languageId === null ||
    tier === null ||
    support === null ||
    candidate === null ||
    !isRecord(evidence) ||
    !isRecord(saturation)
  ) {
    return {
      valid: false,
      languageId,
      normalizedLanguageId,
      tier,
      support,
      candidate,
      evidence: null,
      saturation: null,
      reason:
        languageId !== null && tier === null
          ? "TIER_MISSING"
          : "MALFORMED_REQUEST",
    };
  }
  return {
    valid: true,
    languageId,
    normalizedLanguageId,
    tier,
    support,
    candidate,
    evidence,
    saturation: saturation as unknown as M40SaturationEvidence,
    reason: "MALFORMED_REQUEST",
  };
}

function parseEnvelope(
  value: unknown,
  context: ParsedContext,
  kind: M40EvidenceKind,
): ParsedEnvelope {
  if (value === undefined || value === null) {
    return {
      valid: false,
      state: "MISSING",
      candidateBound: false,
      candidateDigest: null,
      capturedAtMs: null,
      reason:
        kind === "vir"
          ? "VIR_EVIDENCE_MISSING"
          : kind === "cross-file"
            ? "CROSS_FILE_EVIDENCE_MISSING"
            : kind === "runtime"
              ? "RUNTIME_EVIDENCE_MISSING"
              : "UNSUPPORTED_EVIDENCE_MISSING",
    };
  }
  if (!isRecord(value)) {
    return {
      valid: false,
      state: "MALFORMED",
      candidateBound: false,
      candidateDigest: null,
      capturedAtMs: null,
      reason: "MALFORMED_EVIDENCE",
    };
  }
  const stateValue = own(value, "state") ?? own(value, "status");
  const state: M40EvidenceState =
    stateValue === "CURRENT"
      ? "FRESH"
      : stateValue === "PASS"
        ? "FRESH"
        : (stateValue as M40EvidenceState);
  if (!isEvidenceState(state)) {
    return {
      valid: false,
      state: "MALFORMED",
      candidateBound: false,
      candidateDigest: null,
      capturedAtMs: null,
      reason: "MALFORMED_EVIDENCE",
    };
  }
  const evidenceId = id(own(value, "evidenceId"));
  const producer = id(own(value, "producer"));
  const evidenceCandidateId = id(own(value, "candidateId"));
  const evidenceCandidateDigest =
    id(own(value, "candidateDigest")) ??
    id(own(value, "candidateSha")) ??
    id(own(value, "digest"));
  const capturedAtMs = parseTime(
    own(value, "capturedAt") ?? own(value, "observedAt"),
  );
  if (
    evidenceId === null ||
    producer === null ||
    evidenceCandidateId === null ||
    capturedAtMs === null
  ) {
    return {
      valid: false,
      state: "MALFORMED",
      candidateBound: false,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs: null,
      reason: "MALFORMED_EVIDENCE",
    };
  }
  const candidateIdMatches = evidenceCandidateId === context.candidateId;
  const digestMatches =
    context.candidateDigest === null ||
    (evidenceCandidateDigest !== null &&
      evidenceCandidateDigest === context.candidateDigest);
  const candidateBound = candidateIdMatches && digestMatches;
  if (!candidateIdMatches) {
    return {
      valid: false,
      state: "FOREIGN",
      candidateBound: false,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs,
      reason: "EVIDENCE_FOREIGN",
    };
  }
  if (!digestMatches) {
    return {
      valid: false,
      state: evidenceCandidateDigest === null ? "UNKNOWN" : "FOREIGN",
      candidateBound: false,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs,
      reason:
        evidenceCandidateDigest === null
          ? "CANDIDATE_BINDING_MISSING"
          : "EVIDENCE_FOREIGN",
    };
  }
  if (context.evaluatedAtMs === null) {
    return {
      valid: false,
      state: "UNKNOWN",
      candidateBound: true,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs,
      reason: "MALFORMED_CONTEXT",
    };
  }
  if (capturedAtMs > context.evaluatedAtMs) {
    return {
      valid: false,
      state: "UNKNOWN",
      candidateBound: true,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs,
      reason: "EVIDENCE_FUTURE",
    };
  }
  if (context.evaluatedAtMs - capturedAtMs > context.maxEvidenceAgeMs) {
    return {
      valid: false,
      state: "STALE",
      candidateBound: true,
      candidateDigest: evidenceCandidateDigest,
      capturedAtMs,
      reason: "EVIDENCE_STALE",
    };
  }
  return {
    valid: true,
    state,
    candidateBound,
    candidateDigest: evidenceCandidateDigest,
    capturedAtMs,
    reason: "MALFORMED_EVIDENCE",
  };
}

function assessment(
  kind: M40EvidenceKind,
  state: M40EvidenceState,
  outcome: M40EvidenceOutcome,
  reason: M40Reason,
  candidateBound: boolean,
): EvidenceAssessment {
  return { kind, state, outcome, reason, candidateBound };
}

function numberOr(
  value: UnknownRecord,
  keys: readonly string[],
  max = M40_LANGUAGE_LIMITS.maxDenominator,
): number | null {
  for (const key of keys) {
    const candidate = own(value, key);
    if (candidate !== undefined) return nonNegativeInteger(candidate, max);
  }
  return null;
}

function assessEvidence(
  value: unknown,
  kind: M40EvidenceKind,
  context: ParsedContext,
): EvidenceAssessment {
  const envelope = parseEnvelope(value, context, kind);
  if (!envelope.valid) {
    if (envelope.state === "FOREIGN") {
      return assessment(kind, "FOREIGN", "FOREIGN", "EVIDENCE_FOREIGN", false);
    }
    if (envelope.state === "STALE") {
      return assessment(
        kind,
        "STALE",
        "STALE",
        "EVIDENCE_STALE",
        envelope.candidateBound,
      );
    }
    if (envelope.state === "MISSING") {
      return assessment(kind, "MISSING", "BLOCKED", envelope.reason, false);
    }
    return assessment(
      kind,
      envelope.state,
      "UNKNOWN",
      envelope.reason,
      envelope.candidateBound,
    );
  }
  if (envelope.state === "MISSING") {
    return assessment(
      kind,
      "MISSING",
      "BLOCKED",
      "MISSING_EVIDENCE",
      envelope.candidateBound,
    );
  }
  if (
    envelope.state === "STALE" ||
    envelope.state === "INVALIDATED" ||
    envelope.state === "FOREIGN" ||
    envelope.state === "CONTRADICTORY" ||
    envelope.state === "PARTIAL" ||
    envelope.state === "BLOCKED" ||
    envelope.state === "UNSUPPORTED" ||
    envelope.state === "UNKNOWN"
  ) {
    const outcome: M40EvidenceOutcome =
      envelope.state === "UNSUPPORTED"
        ? "UNSUPPORTED"
        : envelope.state === "PARTIAL" || envelope.state === "CONTRADICTORY"
          ? "PARTIAL"
          : envelope.state === "BLOCKED"
            ? "BLOCKED"
            : envelope.state === "FOREIGN"
              ? "FOREIGN"
              : envelope.state === "STALE" || envelope.state === "INVALIDATED"
                ? "STALE"
                : "UNKNOWN";
    const reason: M40Reason =
      envelope.state === "UNSUPPORTED"
        ? "EVIDENCE_UNSUPPORTED"
        : envelope.state === "PARTIAL"
          ? "EVIDENCE_PARTIAL"
          : envelope.state === "CONTRADICTORY"
            ? "EVIDENCE_CONTRADICTORY"
            : envelope.state === "BLOCKED"
              ? "EVIDENCE_BLOCKED"
              : envelope.state === "INVALIDATED"
                ? "EVIDENCE_INVALIDATED"
                : envelope.state === "FOREIGN"
                  ? "EVIDENCE_FOREIGN"
                  : envelope.state === "STALE"
                    ? "EVIDENCE_STALE"
                    : "MALFORMED_EVIDENCE";
    return assessment(
      kind,
      envelope.state,
      outcome,
      reason,
      envelope.candidateBound,
    );
  }
  if (!isRecord(value)) {
    return assessment(
      kind,
      "MALFORMED",
      "UNKNOWN",
      "MALFORMED_EVIDENCE",
      false,
    );
  }
  if (kind === "vir") {
    const nodes = numberOr(value, ["nodeCount", "nodes"]);
    const edges = numberOr(value, ["edgeCount", "edges"]);
    const required = numberOr(value, ["requiredNodeKinds", "requiredKinds"]);
    const covered = numberOr(value, ["coveredNodeKinds", "coveredKinds"]);
    if (
      nodes === null ||
      edges === null ||
      required === null ||
      covered === null
    ) {
      return assessment(
        kind,
        "MALFORMED",
        "UNKNOWN",
        "MALFORMED_EVIDENCE",
        true,
      );
    }
    if (nodes === 0 || edges === 0 || required === 0) {
      return assessment(
        kind,
        "BLOCKED",
        "BLOCKED",
        "VIR_EVIDENCE_MISSING",
        true,
      );
    }
    if (covered < required) {
      return assessment(kind, "PARTIAL", "PARTIAL", "EVIDENCE_PARTIAL", true);
    }
    return assessment(kind, "FRESH", "PASS", "CERTIFIED", true);
  }
  if (kind === "cross-file") {
    const cases = numberOr(value, ["caseCount", "totalCases", "denominator"]);
    const passed = numberOr(value, ["passedCases", "passed", "satisfied"]);
    const edges = numberOr(value, ["edgeCount", "edges"]);
    const unresolved = numberOr(value, ["unresolvedEdges", "unresolved"]);
    if (
      cases === null ||
      passed === null ||
      edges === null ||
      unresolved === null
    ) {
      return assessment(
        kind,
        "MALFORMED",
        "UNKNOWN",
        "MALFORMED_EVIDENCE",
        true,
      );
    }
    if (cases === 0) {
      return assessment(
        kind,
        "BLOCKED",
        "BLOCKED",
        "CROSS_FILE_EVIDENCE_MISSING",
        true,
      );
    }
    if (passed !== cases || unresolved !== 0) {
      return assessment(kind, "PARTIAL", "PARTIAL", "EVIDENCE_PARTIAL", true);
    }
    return assessment(kind, "FRESH", "PASS", "CERTIFIED", true);
  }
  if (kind === "runtime") {
    const executed = numberOr(value, ["executedTests", "executed"]);
    const passed = numberOr(value, ["passedTests", "passed"]);
    const failed = numberOr(value, ["failedTests", "failed"]);
    const skipped = numberOr(value, ["skippedTests", "skipped"]);
    const complete = boolean(own(value, "complete"));
    const digest = id(own(value, "reportDigest") ?? own(value, "digest"));
    if (
      executed === null ||
      passed === null ||
      failed === null ||
      skipped === null ||
      complete === null ||
      digest === null
    ) {
      return assessment(
        kind,
        "MALFORMED",
        "UNKNOWN",
        "MALFORMED_EVIDENCE",
        true,
      );
    }
    if (!complete || executed === 0) {
      return assessment(
        kind,
        "BLOCKED",
        "BLOCKED",
        "RUNTIME_EVIDENCE_MISSING",
        true,
      );
    }
    if (passed + failed + skipped !== executed) {
      return assessment(
        kind,
        "MALFORMED",
        "UNKNOWN",
        "MALFORMED_EVIDENCE",
        true,
      );
    }
    if (failed !== 0 || skipped !== 0 || passed !== executed) {
      return assessment(kind, "PARTIAL", "PARTIAL", "EVIDENCE_PARTIAL", true);
    }
    return assessment(kind, "FRESH", "PASS", "CERTIFIED", true);
  }
  const checked = numberOr(value, [
    "checkedConstructs",
    "checked",
    "denominator",
  ]);
  const classified = numberOr(value, ["classifiedConstructs", "classified"]);
  const unsupported = numberOr(value, ["unsupportedConstructs", "unsupported"]);
  const limitationsValue = own(value, "limitations");
  if (
    checked === null ||
    classified === null ||
    unsupported === null ||
    !Array.isArray(limitationsValue) ||
    limitationsValue.length > M40_LANGUAGE_LIMITS.maxEvidenceItems
  ) {
    return assessment(kind, "MALFORMED", "UNKNOWN", "MALFORMED_EVIDENCE", true);
  }
  if (checked === 0) {
    return assessment(
      kind,
      "BLOCKED",
      "BLOCKED",
      "UNSUPPORTED_EVIDENCE_MISSING",
      true,
    );
  }
  if (classified !== checked) {
    return assessment(kind, "PARTIAL", "PARTIAL", "EVIDENCE_PARTIAL", true);
  }
  if (unsupported > 0) {
    return assessment(
      kind,
      "UNSUPPORTED",
      "UNSUPPORTED",
      "EVIDENCE_UNSUPPORTED",
      true,
    );
  }
  return assessment(kind, "FRESH", "PASS", "CERTIFIED", true);
}

function normalizeGate(value: unknown): M40SaturationGate | null {
  const valueText = text(value, M40_LANGUAGE_LIMITS.maxTextLength);
  if (valueText === null) return null;
  const normalized = valueText.toLowerCase().replaceAll("_", "-");
  const alias: Record<string, M40SaturationGate> = {
    "cross-file": "cross-file",
    crossfile: "cross-file",
    "real-repository": "real-repository",
    realrepository: "real-repository",
  };
  const candidate = alias[normalized] ?? normalized;
  return (M40_SATURATION_GATES as readonly string[]).includes(candidate)
    ? (candidate as M40SaturationGate)
    : null;
}

function normalizeGateStatus(value: unknown): M40SaturationState | null {
  if (value === "SATISFIED") return "PASS";
  if (isSaturationState(value)) return value;
  return null;
}

function saturationResult(
  state: M40EvidenceState,
  outcome: M40EvidenceOutcome,
  reason: M40Reason,
  denominators: M40SaturationDenominators | null,
  candidateBound: boolean,
): M40SaturationAssessment {
  return {
    state,
    outcome,
    reason,
    denominators,
    complete: denominators?.complete === true,
    candidateBound,
  };
}

function assessSaturation(
  value: unknown,
  context: ParsedContext,
): M40SaturationAssessment {
  const envelope = parseEnvelope(value, context, "runtime");
  if (!envelope.valid) {
    if (envelope.state === "STALE") {
      return saturationResult(
        "STALE",
        "STALE",
        "SATURATION_STALE",
        null,
        envelope.candidateBound,
      );
    }
    if (envelope.state === "FOREIGN") {
      return saturationResult(
        "FOREIGN",
        "FOREIGN",
        "SATURATION_FOREIGN",
        null,
        false,
      );
    }
    if (envelope.state === "MISSING") {
      return saturationResult(
        "MISSING",
        "BLOCKED",
        "SATURATION_MISSING",
        null,
        false,
      );
    }
    return saturationResult(
      envelope.state,
      "UNKNOWN",
      envelope.reason,
      null,
      envelope.candidateBound,
    );
  }
  if (envelope.state === "MISSING") {
    return saturationResult(
      "MISSING",
      "BLOCKED",
      "SATURATION_MISSING",
      null,
      false,
    );
  }
  if (
    envelope.state === "STALE" ||
    envelope.state === "INVALIDATED" ||
    envelope.state === "FOREIGN" ||
    envelope.state === "CONTRADICTORY" ||
    envelope.state === "PARTIAL" ||
    envelope.state === "BLOCKED" ||
    envelope.state === "UNSUPPORTED" ||
    envelope.state === "UNKNOWN"
  ) {
    if (envelope.state === "STALE" || envelope.state === "INVALIDATED") {
      return saturationResult(
        envelope.state,
        "STALE",
        "SATURATION_STALE",
        null,
        true,
      );
    }
    if (envelope.state === "FOREIGN") {
      return saturationResult(
        "FOREIGN",
        "FOREIGN",
        "SATURATION_FOREIGN",
        null,
        true,
      );
    }
    if (envelope.state === "UNSUPPORTED") {
      return saturationResult(
        "UNSUPPORTED",
        "UNSUPPORTED",
        "SATURATION_UNSUPPORTED",
        null,
        true,
      );
    }
    return saturationResult(
      envelope.state,
      envelope.state === "PARTIAL" || envelope.state === "CONTRADICTORY"
        ? "PARTIAL"
        : "UNKNOWN",
      envelope.state === "PARTIAL"
        ? "SATURATION_INCOMPLETE"
        : "SATURATION_INVALID",
      null,
      true,
    );
  }
  if (!isRecord(value)) {
    return saturationResult(
      "MALFORMED",
      "UNKNOWN",
      "SATURATION_INVALID",
      null,
      false,
    );
  }
  const requiredValue = own(value, "requiredGates");
  const gatesValue = array(own(value, "gates"));
  if (
    requiredValue !== undefined &&
    (!Array.isArray(requiredValue) ||
      requiredValue.length > M40_LANGUAGE_LIMITS.maxSaturationGates)
  ) {
    return saturationResult(
      "MALFORMED",
      "UNKNOWN",
      "SATURATION_INVALID",
      null,
      true,
    );
  }
  if (gatesValue === null || gatesValue.length === 0) {
    return saturationResult(
      "UNKNOWN",
      "UNKNOWN",
      "SATURATION_INVALID",
      null,
      true,
    );
  }
  const requiredGates: M40SaturationGate[] = [];
  const requestedGates = Array.isArray(requiredValue)
    ? requiredValue
    : [...M40_MINIMUM_SATURATION_GATES];
  for (const requested of requestedGates) {
    const gate = normalizeGate(requested);
    if (gate === null || requiredGates.includes(gate)) {
      return saturationResult(
        "MALFORMED",
        "UNKNOWN",
        "SATURATION_INVALID",
        null,
        true,
      );
    }
    requiredGates.push(gate);
  }
  for (const required of M40_MINIMUM_SATURATION_GATES) {
    if (!requiredGates.includes(required)) {
      return saturationResult(
        "PARTIAL",
        "PARTIAL",
        "SATURATION_INCOMPLETE",
        null,
        true,
      );
    }
  }
  const counts = {
    passed: 0,
    partial: 0,
    unknown: 0,
    blocked: 0,
    unsupported: 0,
    invalid: 0,
    denominator: 0,
  };
  const seen = new Set<M40SaturationGate>();
  for (const gateValue of gatesValue) {
    if (!isRecord(gateValue)) {
      return saturationResult(
        "MALFORMED",
        "UNKNOWN",
        "SATURATION_INVALID",
        null,
        true,
      );
    }
    const gate = normalizeGate(own(gateValue, "gate"));
    const status = normalizeGateStatus(own(gateValue, "status"));
    const denominator = nonNegativeInteger(own(gateValue, "denominator"));
    const passed = nonNegativeInteger(own(gateValue, "passed"));
    if (
      gate === null ||
      status === null ||
      denominator === null ||
      passed === null ||
      seen.has(gate) ||
      !requiredGates.includes(gate)
    ) {
      return saturationResult(
        "MALFORMED",
        "UNKNOWN",
        "SATURATION_INVALID",
        null,
        true,
      );
    }
    if (
      denominator === 0 ||
      passed > denominator ||
      (status === "PASS" && passed !== denominator)
    ) {
      return saturationResult(
        "MALFORMED",
        "UNKNOWN",
        "SATURATION_INVALID",
        null,
        true,
      );
    }
    seen.add(gate);
    counts.denominator += denominator;
    if (status === "PASS") counts.passed += denominator;
    else if (status === "PARTIAL") counts.partial += denominator;
    else if (status === "UNKNOWN") counts.unknown += denominator;
    else if (status === "BLOCKED") counts.blocked += denominator;
    else if (status === "UNSUPPORTED") counts.unsupported += denominator;
    else counts.invalid += denominator;
  }
  if (
    seen.size !== requiredGates.length ||
    counts.denominator > M40_LANGUAGE_LIMITS.maxDenominator
  ) {
    return saturationResult(
      "MALFORMED",
      "UNKNOWN",
      "SATURATION_INVALID",
      null,
      true,
    );
  }
  const declaredDenominator = own(value, "denominator") ?? own(value, "total");
  const declaredPassed = own(value, "passed") ?? own(value, "satisfied");
  const declaredPartial = own(value, "partial");
  const declaredUnknown = own(value, "unknown");
  const declaredBlocked = own(value, "blocked");
  const declaredUnsupported = own(value, "unsupported");
  const declaredInvalid = own(value, "invalid");
  const declared = [
    declaredDenominator,
    declaredPassed,
    declaredPartial,
    declaredUnknown,
    declaredBlocked,
    declaredUnsupported,
    declaredInvalid,
  ];
  const hasDeclared = declared.some((item) => item !== undefined);
  if (hasDeclared) {
    const values = declared.map((item) =>
      item === undefined ? 0 : nonNegativeInteger(item),
    );
    if (
      values.some((item) => item === null) ||
      values[0] !== counts.denominator ||
      values[1] !== counts.passed ||
      values[2] !== counts.partial ||
      values[3] !== counts.unknown ||
      values[4] !== counts.blocked ||
      values[5] !== counts.unsupported ||
      values[6] !== counts.invalid
    ) {
      return saturationResult(
        "MALFORMED",
        "UNKNOWN",
        "SATURATION_INVALID",
        null,
        true,
      );
    }
  }
  const denominators: M40SaturationDenominators = {
    required: requiredGates.length,
    total: counts.denominator,
    passed: counts.passed,
    partial: counts.partial,
    unknown: counts.unknown,
    blocked: counts.blocked,
    unsupported: counts.unsupported,
    invalid: counts.invalid,
    complete: counts.denominator > 0 && counts.passed === counts.denominator,
  };
  if (!denominators.complete) {
    const reason: M40Reason =
      counts.unsupported > 0
        ? "SATURATION_UNSUPPORTED"
        : counts.invalid > 0 || counts.unknown > 0 || counts.blocked > 0
          ? "SATURATION_INVALID"
          : "SATURATION_INCOMPLETE";
    return saturationResult("PARTIAL", "PARTIAL", reason, denominators, true);
  }
  return saturationResult("FRESH", "PASS", "CERTIFIED", denominators, true);
}

function emptySaturation(): M40SaturationAssessment {
  return saturationResult(
    "MISSING",
    "BLOCKED",
    "SATURATION_MISSING",
    null,
    false,
  );
}

function emptyReport(reason: M40Reason): M40LanguageExpansionReport {
  return {
    schemaVersion: 1,
    languageId: null,
    tier: null,
    support: null,
    demandRank: null,
    state: "BLOCKED",
    outcome: "BLOCKED",
    certificationState: "BLOCKED",
    certified: false,
    canCertify: false,
    reason,
    evidence: [],
    saturation: emptySaturation(),
    limitations: [reason],
    trustEffect: M40_CERTIFICATION_TRUST_POLICY.effect,
  };
}

function buildReport(
  request: ParsedRequest,
  context: ParsedContext,
  evidence: readonly EvidenceAssessment[],
  saturation: M40SaturationAssessment,
  state: M40LanguageCertificationState,
  reason: M40Reason,
  limitations: readonly string[],
): M40LanguageExpansionReport {
  const certified = state === "TRUST-COMPLETE";
  return {
    schemaVersion: 1,
    languageId: request.languageId,
    tier: request.tier,
    support: request.support,
    demandRank: demandRank(request.normalizedLanguageId),
    state,
    outcome: state,
    certificationState: certified ? "CERTIFIED" : state,
    certified,
    canCertify: certified,
    reason,
    evidence,
    saturation,
    limitations: [...new Set(limitations)].sort(),
    trustEffect: M40_CERTIFICATION_TRUST_POLICY.effect,
  };
}

function evidenceValue(
  evidence: M40LanguageEvidenceBundle | null,
  kind: M40EvidenceKind,
): unknown {
  if (evidence === null) return undefined;
  const record = evidence as unknown as UnknownRecord;
  if (kind === "vir") return own(record, "vir") ?? own(record, "virEvidence");
  if (kind === "cross-file") {
    return own(record, "crossFile") ?? own(record, "crossFileEvidence");
  }
  if (kind === "runtime") {
    return own(record, "runtime") ?? own(record, "runtimeEvidence");
  }
  return own(record, "unsupported") ?? own(record, "unsupportedEvidence");
}

function chooseState(
  request: ParsedRequest,
  evidence: readonly EvidenceAssessment[],
  saturation: M40SaturationAssessment,
): {
  state: M40LanguageCertificationState;
  reason: M40Reason;
  limitations: string[];
} {
  if (request.normalizedLanguageId === null) {
    return {
      state: "UNKNOWN",
      reason: "LANGUAGE_UNKNOWN",
      limitations: ["LANGUAGE_UNKNOWN"],
    };
  }
  if (request.support === "UNSUPPORTED") {
    return {
      state: "UNSUPPORTED",
      reason: "LANGUAGE_UNSUPPORTED",
      limitations: ["LANGUAGE_UNSUPPORTED"],
    };
  }
  if (request.support === "UNKNOWN") {
    return {
      state: "UNKNOWN",
      reason: "LANGUAGE_UNKNOWN",
      limitations: ["LANGUAGE_UNKNOWN"],
    };
  }
  if (request.support === "CANDIDATE") {
    return {
      state: "CANDIDATE",
      reason: "CANDIDATE_NOT_CERTIFIED",
      limitations: ["CANDIDATE_NOT_CERTIFIED"],
    };
  }
  if (request.support !== "SUPPORTED") {
    return {
      state: "BLOCKED",
      reason: "MALFORMED_REQUEST",
      limitations: ["MALFORMED_REQUEST"],
    };
  }
  const missing = evidence.find(
    (item) => item.state === "MISSING" || item.state === "BLOCKED",
  );
  if (missing !== undefined) {
    return {
      state: "BLOCKED",
      reason: missing.reason,
      limitations: [missing.reason],
    };
  }
  const foreign = evidence.find((item) => item.state === "FOREIGN");
  if (foreign !== undefined) {
    return {
      state: "DEGRADED",
      reason: "EVIDENCE_FOREIGN",
      limitations: ["EVIDENCE_FOREIGN"],
    };
  }
  const stale = evidence.find(
    (item) => item.state === "STALE" || item.state === "INVALIDATED",
  );
  if (stale !== undefined) {
    return {
      state: "DEGRADED",
      reason: "EVIDENCE_STALE",
      limitations: ["EVIDENCE_STALE"],
    };
  }
  const partial = evidence.find(
    (item) => item.state === "PARTIAL" || item.state === "CONTRADICTORY",
  );
  if (partial !== undefined) {
    return {
      state: "DEGRADED",
      reason: partial.reason,
      limitations: [partial.reason],
    };
  }
  const unsupported = evidence.find((item) => item.state === "UNSUPPORTED");
  if (unsupported !== undefined) {
    return {
      state: "UNSUPPORTED",
      reason: "EVIDENCE_UNSUPPORTED",
      limitations: ["EVIDENCE_UNSUPPORTED"],
    };
  }
  const malformed = evidence.find(
    (item) => item.state === "MALFORMED" || item.state === "UNKNOWN",
  );
  if (malformed !== undefined) {
    return {
      state: "DEGRADED",
      reason: malformed.reason,
      limitations: [malformed.reason],
    };
  }
  if (
    saturation.state === "MISSING" ||
    saturation.state === "FOREIGN" ||
    saturation.state === "STALE" ||
    saturation.state === "PARTIAL" ||
    saturation.state === "BLOCKED" ||
    saturation.state === "MALFORMED"
  ) {
    return {
      state: "BLOCKED",
      reason: saturation.reason,
      limitations: [saturation.reason],
    };
  }
  if (saturation.state === "UNSUPPORTED") {
    return {
      state: "UNSUPPORTED",
      reason: saturation.reason,
      limitations: [saturation.reason],
    };
  }
  if (!saturation.complete) {
    return {
      state: "BLOCKED",
      reason: "SATURATION_INCOMPLETE",
      limitations: ["SATURATION_INCOMPLETE"],
    };
  }
  return { state: "TRUST-COMPLETE", reason: "CERTIFIED", limitations: [] };
}

export function evaluateM40LanguageExpansion(
  requestValue: unknown,
  contextValue?: unknown,
): M40LanguageExpansionReport {
  const request = parseRequest(requestValue);
  if (!request.valid) return emptyReport(request.reason);
  const context = parseContext(
    contextValue === undefined ? requestValue : contextValue,
    request.candidate,
  );
  if (!context.valid) return emptyReport("MALFORMED_CONTEXT");
  const evidence = M40_EVIDENCE_KINDS.map((kind) =>
    assessEvidence(evidenceValue(request.evidence, kind), kind, context),
  );
  const saturation = assessSaturation(request.saturation, context);
  const selected = chooseState(request, evidence, saturation);
  return buildReport(
    request,
    context,
    evidence,
    saturation,
    selected.state,
    selected.reason,
    selected.limitations,
  );
}

export const evaluateM40Language = evaluateM40LanguageExpansion;

export const analyzeM40LanguageExpansion = evaluateM40LanguageExpansion;

export const evaluateM40LanguageCertification = evaluateM40LanguageExpansion;

export const evaluateM40LanguageContract = evaluateM40LanguageExpansion;

export function validateM40LanguageCandidate(
  requestValue: unknown,
  contextValue?: unknown,
): M40LanguageExpansionReport {
  return evaluateM40LanguageExpansion(requestValue, contextValue);
}

export function isM40LanguageTier(value: unknown): value is M40LanguageTier {
  return isTier(value);
}

export function isM40CertificationState(
  value: unknown,
): value is M40LanguageCertificationState {
  return isCertificationState(value);
}

export function isM40EvidenceState(value: unknown): value is M40EvidenceState {
  return isEvidenceState(value);
}
