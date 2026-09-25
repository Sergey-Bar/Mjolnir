import { createHash } from "node:crypto";

export const DECISION_RECEIPT_SCHEMA_VERSION = 1 as const;
export const MAX_DECISION_RECEIPT_COMMANDS = 32;
export const MAX_DECISION_RECEIPT_ARGUMENTS = 64;
export const MAX_DECISION_RECEIPT_EVIDENCE = 32;
export const MAX_DECISION_RECEIPT_NODES = 1024;
export const MAX_DECISION_RECEIPT_DEPTH = 8;

export type CandidateFreshness = "CURRENT" | "STALE";
export type EvidenceKind = "TEST" | "SCAN" | "CHALLENGE";

export interface CandidateBinding {
  readonly candidateId: string;
  readonly commitSha: string;
  readonly treeSha256: string;
  readonly capturedAt: string;
  readonly freshness: CandidateFreshness;
}

export interface FindingReference {
  readonly findingId: string;
  readonly ruleId: string;
  readonly fingerprintSha256: string;
  readonly candidateId: string;
}

export interface VersionedIdentity {
  readonly id: string;
  readonly version: string;
}

export interface AgentModelToolIdentity {
  readonly agent: VersionedIdentity;
  readonly model: VersionedIdentity & { readonly provider: string };
  readonly tool: VersionedIdentity;
}

export interface ProposedPatchReference {
  readonly reference: string;
  readonly sha256: string;
  readonly candidateId: string;
  readonly verified: boolean;
  readonly proposedAt: string;
}

export interface DecisionCommand {
  readonly commandId: string;
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly exitCode: number;
  readonly networkAccess: false;
  readonly executedAt: string;
  readonly candidateId: string;
}

export interface EvidenceReference {
  readonly evidenceId: string;
  readonly kind: EvidenceKind;
  readonly reference: string;
  readonly sha256: string;
  readonly candidateId: string;
  readonly observedAt: string;
}

export interface VerificationResult {
  readonly result: "VERIFIED";
  readonly independentRescan: true;
  readonly verifier: {
    readonly name: "mjolnir";
    readonly version: string;
  };
  readonly candidateId: string;
  readonly findingId: string;
  readonly patchSha256: string;
  readonly evidenceIds: readonly string[];
  readonly verifiedAt: string;
}

export interface ReceiptApproval {
  readonly decision: "APPROVED";
  readonly approverId: string;
  readonly candidateId: string;
  readonly patchSha256: string;
  readonly approvedAt: string;
}

export interface RollbackReference {
  readonly strategy: "REVERT_PATCH";
  readonly reference: string;
  readonly sha256: string;
  readonly candidateId: string;
  readonly preparedAt: string;
}

export interface DecisionReceipt {
  readonly schemaVersion: typeof DECISION_RECEIPT_SCHEMA_VERSION;
  readonly receiptId: string;
  readonly finding: FindingReference;
  readonly identity: AgentModelToolIdentity;
  readonly patch: ProposedPatchReference;
  readonly commands: readonly DecisionCommand[];
  readonly evidence: readonly EvidenceReference[];
  readonly verification: VerificationResult;
  readonly approval: ReceiptApproval;
  readonly rollback: RollbackReference;
  readonly candidate: CandidateBinding;
}

export type DecisionReceiptInput = Omit<
  DecisionReceipt,
  "schemaVersion" | "receiptId"
>;

export interface DecisionReceiptDiagnostic {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface DecisionReceiptValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly diagnostics: readonly DecisionReceiptDiagnostic[];
}

export class DecisionReceiptError extends Error {
  readonly diagnostics: readonly DecisionReceiptDiagnostic[];

  constructor(diagnostics: readonly DecisionReceiptDiagnostic[]) {
    super(
      `Invalid decision receipt: ${diagnostics
        .map((diagnostic) => diagnostic.message)
        .join("; ")}`,
    );
    this.name = "DecisionReceiptError";
    this.diagnostics = Object.freeze([...diagnostics]);
  }
}

const TOKEN_PATTERN = /^[\w./:@+-]{1,128}$/;
const LOCAL_REFERENCE_PATTERN = /^[\w./@+-]{1,512}$/;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const SECRET_VALUE_PATTERN =
  /-----BEGIN[A-Z ]*PRIVATE KEY-----|bearer\s+\S{8,}|(?:api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|client[_-]?secret|password|passwd|pwd|authorization|cookie|token|secret)\s*[:=]\s*\S+|(?:AKIA|ASIA)[A-Z0-9]{16}|(?:gh[pousr]_|github_pat_)\w{20,}|eyJ\w+\.eyJ\w+\.[\w-]+/i;
const SECRET_FLAG_PATTERN =
  /^--(?:api[-_]?key|access[-_]?token|auth[-_]?token|token|password|passwd|secret|credential|authorization)(?:=|$)/i;
const AUTHORITY_KEYS = new Set([
  "pass",
  "severity",
  "trust",
  "trustlevel",
  "verdict",
  "gateverdict",
  "gatestatus",
]);

type DiagnosticList = DecisionReceiptDiagnostic[];

function addDiagnostic(
  diagnostics: DiagnosticList,
  code: string,
  path: string,
  message: string,
): void {
  diagnostics.push(Object.freeze({ code, path, message }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Reflect.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isAuthorityKey(value: string): boolean {
  return AUTHORITY_KEYS.has(normalizedKey(value));
}

function isSecretKey(value: string): boolean {
  const key = normalizedKey(value);
  return (
    key === "authorization" ||
    key === "cookie" ||
    key === "credential" ||
    key === "credentials" ||
    key === "password" ||
    key === "passwd" ||
    key === "pwd" ||
    key === "token" ||
    key === "secret" ||
    key.endsWith("apikey") ||
    key.endsWith("authtoken") ||
    key.endsWith("accesstoken") ||
    key.endsWith("refreshtoken") ||
    key.endsWith("clientsecret") ||
    key.endsWith("privatekey")
  );
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)) {
      return true;
    }
  }
  return false;
}

function isSafeText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    value.trim() === value &&
    !hasControlCharacter(value)
  );
}

function isLocalReference(value: unknown): value is string {
  if (typeof value !== "string" || !LOCAL_REFERENCE_PATTERN.test(value)) {
    return false;
  }
  return value.split("/").every((segment) => {
    return (
      segment.length > 0 &&
      segment !== "." &&
      segment !== ".." &&
      !(segment.length === 2 && segment.endsWith(":"))
    );
  });
}

function scanForbidden(value: unknown, diagnostics: DiagnosticList): void {
  const ancestors = new WeakSet<object>();
  let nodes = 0;
  let bounded = false;

  const visit = (current: unknown, path: string, depth: number): void => {
    if (bounded) return;
    nodes += 1;
    if (nodes > MAX_DECISION_RECEIPT_NODES) {
      bounded = true;
      addDiagnostic(
        diagnostics,
        "RECEIPT_TOO_LARGE",
        path,
        `receipt exceeds ${MAX_DECISION_RECEIPT_NODES} bounded nodes`,
      );
      return;
    }
    if (depth > MAX_DECISION_RECEIPT_DEPTH) {
      bounded = true;
      addDiagnostic(
        diagnostics,
        "RECEIPT_TOO_LARGE",
        path,
        `receipt exceeds depth ${MAX_DECISION_RECEIPT_DEPTH}`,
      );
      return;
    }
    if (typeof current === "string") {
      if (current.length > 2048) {
        bounded = true;
        addDiagnostic(
          diagnostics,
          "RECEIPT_TOO_LARGE",
          path,
          "receipt string exceeds 2048 characters",
        );
        return;
      }
      if (current.trim().toUpperCase() === "PASS") {
        addDiagnostic(
          diagnostics,
          "FORBIDDEN_AUTHORITY_VALUE",
          path,
          "receipts cannot set PASS",
        );
      }
      if (SECRET_VALUE_PATTERN.test(current)) {
        addDiagnostic(
          diagnostics,
          "SECRET_VALUE",
          path,
          "secret-like values are forbidden",
        );
      }
      return;
    }
    if (typeof current !== "object" || current === null) return;
    if (ancestors.has(current)) {
      bounded = true;
      addDiagnostic(
        diagnostics,
        "RECEIPT_CYCLE",
        path,
        "cyclic values are forbidden",
      );
      return;
    }
    ancestors.add(current);
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        visit(current[index], `${path}[${index}]`, depth + 1);
        if (bounded) {
          ancestors.delete(current);
          return;
        }
      }
      ancestors.delete(current);
      return;
    }
    const record = current as Record<string, unknown>;
    const keys = Reflect.ownKeys(record).filter(
      (key): key is string => typeof key === "string",
    );
    for (const key of keys) {
      const childPath = `${path}.${key}`;
      if (isAuthorityKey(key)) {
        addDiagnostic(
          diagnostics,
          "FORBIDDEN_AUTHORITY_FIELD",
          childPath,
          `${key} cannot be set by a decision receipt`,
        );
      } else if (isSecretKey(key)) {
        addDiagnostic(
          diagnostics,
          "SECRET_FIELD",
          childPath,
          `${key} is forbidden in decision receipts`,
        );
      }
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      ) {
        addDiagnostic(
          diagnostics,
          "NON_SERIALIZABLE_FIELD",
          childPath,
          `${key} must be an enumerable data property`,
        );
        ancestors.delete(current);
        return;
      }
      visit(descriptor.value, childPath, depth + 1);
      if (bounded) {
        ancestors.delete(current);
        return;
      }
    }
    if (Object.getOwnPropertySymbols(record).length > 0) {
      addDiagnostic(
        diagnostics,
        "UNKNOWN_FIELD",
        path,
        "symbol fields are forbidden",
      );
    }
    ancestors.delete(current);
  };

  visit(value, "receipt", 0);
}

function checkKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  diagnostics: DiagnosticList,
): void {
  const allowedKeys = new Set(allowed);
  const keys = Reflect.ownKeys(record).filter(
    (key): key is string => typeof key === "string",
  );
  for (const key of keys.slice(0, 65)) {
    if (!allowedKeys.has(key)) {
      const code = isAuthorityKey(key)
        ? "FORBIDDEN_AUTHORITY_FIELD"
        : isSecretKey(key)
          ? "SECRET_FIELD"
          : "UNKNOWN_FIELD";
      addDiagnostic(
        diagnostics,
        code,
        `${path}.${key}`,
        `${key} is not allowed`,
      );
    }
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (
      descriptor === undefined ||
      !descriptor.enumerable ||
      !Object.hasOwn(descriptor, "value")
    ) {
      addDiagnostic(
        diagnostics,
        "NON_SERIALIZABLE_FIELD",
        `${path}.${key}`,
        `${key} must be an enumerable data property`,
      );
    }
  }
  if (keys.length > 65) {
    addDiagnostic(
      diagnostics,
      "RECEIPT_TOO_LARGE",
      path,
      "receipt object exceeds 65 fields",
    );
  }
  if (Object.getOwnPropertySymbols(record).length > 0) {
    addDiagnostic(
      diagnostics,
      "UNKNOWN_FIELD",
      path,
      "symbol fields are forbidden",
    );
  }
}

function requireText(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!Object.hasOwn(record, key)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}.${key}`,
      `${key} is required`,
    );
    return undefined;
  }
  const value = record[key];
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.${key}`,
      `${key} must be a safe identifier no longer than 128 characters`,
    );
    return undefined;
  }
  return value;
}

function requireLocalReference(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!Object.hasOwn(record, key)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}.${key}`,
      `${key} is required`,
    );
    return undefined;
  }
  const value = record[key];
  if (!isLocalReference(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_REFERENCE",
      `${path}.${key}`,
      `${key} must be a canonical local artifact reference`,
    );
    return undefined;
  }
  return value;
}

function requireSha256(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!Object.hasOwn(record, key)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}.${key}`,
      `${key} is required`,
    );
    return undefined;
  }
  const value = record[key];
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.${key}`,
      `${key} must be a lowercase sha256 digest`,
    );
    return undefined;
  }
  return value;
}

function requireTimestamp(
  record: Record<string, unknown>,
  key: string,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!Object.hasOwn(record, key)) {
    addDiagnostic(
      diagnostics,
      "MISSING_FIELD",
      `${path}.${key}`,
      `${key} is required`,
    );
    return undefined;
  }
  const value = record[key];
  if (typeof value !== "string") {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.${key}`,
      `${key} must be an ISO-8601 timestamp`,
    );
    return undefined;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    addDiagnostic(
      diagnostics,
      "INVALID_FIELD",
      `${path}.${key}`,
      `${key} must be a canonical ISO-8601 timestamp`,
    );
    return undefined;
  }
  return value;
}

function requireLiteral(
  record: Record<string, unknown>,
  key: string,
  expected: string,
  path: string,
  diagnostics: DiagnosticList,
  code = "INVALID_FIELD",
): boolean {
  if (record[key] !== expected) {
    addDiagnostic(
      diagnostics,
      code,
      `${path}.${key}`,
      `${key} must be ${expected}`,
    );
    return false;
  }
  return true;
}

function requireBoundId(
  record: Record<string, unknown>,
  key: string,
  candidateId: string,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  const value = requireText(record, key, path, diagnostics);
  if (value !== undefined && value !== candidateId) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_CANDIDATE",
      `${path}.${key}`,
      `${key} must bind candidate ${candidateId}`,
    );
  }
  return value;
}

interface CandidateParts {
  readonly candidateId: string | undefined;
  readonly commitSha: string | undefined;
  readonly treeSha256: string | undefined;
  readonly capturedAt: string | undefined;
  readonly freshness: string | undefined;
}

function validateCandidate(
  value: unknown,
  path: string,
  diagnostics: DiagnosticList,
): CandidateParts {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_CANDIDATE",
      path,
      "candidate must be an object",
    );
    return {
      candidateId: undefined,
      commitSha: undefined,
      treeSha256: undefined,
      capturedAt: undefined,
      freshness: undefined,
    };
  }
  checkKeys(
    value,
    ["candidateId", "commitSha", "treeSha256", "capturedAt", "freshness"],
    path,
    diagnostics,
  );
  const candidateId = requireText(value, "candidateId", path, diagnostics);
  const commitSha = requireText(value, "commitSha", path, diagnostics);
  if (commitSha !== undefined && !COMMIT_PATTERN.test(commitSha)) {
    addDiagnostic(
      diagnostics,
      "INVALID_CANDIDATE",
      `${path}.commitSha`,
      "commitSha must be a 40-character lowercase commit",
    );
  }
  const treeSha256 = requireSha256(value, "treeSha256", path, diagnostics);
  const capturedAt = requireTimestamp(value, "capturedAt", path, diagnostics);
  const freshness = requireText(value, "freshness", path, diagnostics);
  if (
    freshness !== undefined &&
    freshness !== "CURRENT" &&
    freshness !== "STALE"
  ) {
    addDiagnostic(
      diagnostics,
      "INVALID_CANDIDATE",
      `${path}.freshness`,
      "freshness must be CURRENT or STALE",
    );
  }
  if (freshness === "STALE") {
    addDiagnostic(
      diagnostics,
      "STALE_CANDIDATE",
      `${path}.freshness`,
      "stale candidate bindings are forbidden",
    );
  }
  return { candidateId, commitSha, treeSha256, capturedAt, freshness };
}

function sameCandidateIdentity(
  left: CandidateParts,
  right: CandidateParts,
): boolean {
  return (
    left.candidateId === right.candidateId &&
    left.commitSha === right.commitSha &&
    left.treeSha256 === right.treeSha256
  );
}

function validateVersionedIdentity(
  value: unknown,
  path: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_IDENTITY",
      path,
      "identity must be an object",
    );
    return undefined;
  }
  checkKeys(value, ["id", "version"], path, diagnostics);
  requireText(value, "id", path, diagnostics);
  requireText(value, "version", path, diagnostics);
  return typeof value["id"] === "string" ? value["id"] : undefined;
}

function validateIdentity(
  value: unknown,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_IDENTITY",
      "receipt.identity",
      "identity must be an object",
    );
    return undefined;
  }
  checkKeys(value, ["agent", "model", "tool"], "receipt.identity", diagnostics);
  const agentId = validateVersionedIdentity(
    value["agent"],
    "receipt.identity.agent",
    diagnostics,
  );
  if (isRecord(value["model"])) {
    checkKeys(
      value["model"],
      ["id", "version", "provider"],
      "receipt.identity.model",
      diagnostics,
    );
    requireText(value["model"], "id", "receipt.identity.model", diagnostics);
    requireText(
      value["model"],
      "version",
      "receipt.identity.model",
      diagnostics,
    );
    requireText(
      value["model"],
      "provider",
      "receipt.identity.model",
      diagnostics,
    );
  } else {
    addDiagnostic(
      diagnostics,
      "INVALID_IDENTITY",
      "receipt.identity.model",
      "model identity must be an object",
    );
  }
  validateVersionedIdentity(
    value["tool"],
    "receipt.identity.tool",
    diagnostics,
  );
  return agentId;
}

function validateFinding(
  value: unknown,
  candidateId: string,
  diagnostics: DiagnosticList,
): { readonly findingId: string | undefined } {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_FINDING",
      "receipt.finding",
      "finding must be an object",
    );
    return { findingId: undefined };
  }
  checkKeys(
    value,
    ["findingId", "ruleId", "fingerprintSha256", "candidateId"],
    "receipt.finding",
    diagnostics,
  );
  const findingId = requireText(
    value,
    "findingId",
    "receipt.finding",
    diagnostics,
  );
  requireText(value, "ruleId", "receipt.finding", diagnostics);
  requireSha256(value, "fingerprintSha256", "receipt.finding", diagnostics);
  requireBoundId(
    value,
    "candidateId",
    candidateId,
    "receipt.finding",
    diagnostics,
  );
  return { findingId };
}

function validatePatch(
  value: unknown,
  candidateId: string,
  diagnostics: DiagnosticList,
): {
  readonly sha256: string | undefined;
  readonly proposedAt: string | undefined;
} {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "UNVERIFIED_PATCH",
      "receipt.patch",
      "proposed patch reference is required",
    );
    return { sha256: undefined, proposedAt: undefined };
  }
  checkKeys(
    value,
    ["reference", "sha256", "candidateId", "verified", "proposedAt"],
    "receipt.patch",
    diagnostics,
  );
  requireLocalReference(value, "reference", "receipt.patch", diagnostics);
  const sha256 = requireSha256(value, "sha256", "receipt.patch", diagnostics);
  requireBoundId(
    value,
    "candidateId",
    candidateId,
    "receipt.patch",
    diagnostics,
  );
  if (value["verified"] !== true) {
    addDiagnostic(
      diagnostics,
      "UNVERIFIED_PATCH",
      "receipt.patch.verified",
      "patch must be independently verified",
    );
  }
  const proposedAt = requireTimestamp(
    value,
    "proposedAt",
    "receipt.patch",
    diagnostics,
  );
  return { sha256, proposedAt };
}

interface CommandParts {
  readonly executedAt: string | undefined;
}

function validateCommands(
  value: unknown,
  candidateId: string,
  diagnostics: DiagnosticList,
): CommandParts[] {
  if (!Array.isArray(value) || value.length === 0) {
    addDiagnostic(
      diagnostics,
      "INVALID_COMMAND",
      "receipt.commands",
      "commands must be a non-empty array",
    );
    return [];
  }
  if (value.length > MAX_DECISION_RECEIPT_COMMANDS) {
    addDiagnostic(
      diagnostics,
      "RECEIPT_TOO_LARGE",
      "receipt.commands",
      `commands exceed ${MAX_DECISION_RECEIPT_COMMANDS}`,
    );
  }
  const identifiers = new Set<string>();
  const commands: CommandParts[] = [];
  value.slice(0, MAX_DECISION_RECEIPT_COMMANDS).forEach((entry, index) => {
    const path = `receipt.commands[${index}]`;
    if (!isRecord(entry)) {
      addDiagnostic(
        diagnostics,
        "INVALID_COMMAND",
        path,
        "command must be an object",
      );
      return;
    }
    checkKeys(
      entry,
      [
        "commandId",
        "executable",
        "arguments",
        "exitCode",
        "networkAccess",
        "executedAt",
        "candidateId",
      ],
      path,
      diagnostics,
    );
    const commandId = requireText(entry, "commandId", path, diagnostics);
    if (commandId !== undefined) {
      if (identifiers.has(commandId)) {
        addDiagnostic(
          diagnostics,
          "DUPLICATE_ID",
          `${path}.commandId`,
          "command IDs must be unique",
        );
      }
      identifiers.add(commandId);
    }
    requireText(entry, "executable", path, diagnostics);
    const args = entry["arguments"];
    if (!Array.isArray(args)) {
      addDiagnostic(
        diagnostics,
        "INVALID_COMMAND",
        `${path}.arguments`,
        "arguments must be an array",
      );
    } else {
      if (args.length > MAX_DECISION_RECEIPT_ARGUMENTS) {
        addDiagnostic(
          diagnostics,
          "RECEIPT_TOO_LARGE",
          `${path}.arguments`,
          `arguments exceed ${MAX_DECISION_RECEIPT_ARGUMENTS}`,
        );
      }
      args
        .slice(0, MAX_DECISION_RECEIPT_ARGUMENTS)
        .forEach((argument, argumentIndex) => {
          if (!isSafeText(argument, 512)) {
            addDiagnostic(
              diagnostics,
              "INVALID_COMMAND",
              `${path}.arguments[${argumentIndex}]`,
              "command argument must be a safe non-empty string",
            );
          } else if (SECRET_FLAG_PATTERN.test(argument)) {
            addDiagnostic(
              diagnostics,
              "SECRET_VALUE",
              `${path}.arguments[${argumentIndex}]`,
              "secret-like command arguments are forbidden",
            );
          }
        });
    }
    const exitCode = entry["exitCode"];
    if (
      !Number.isInteger(exitCode) ||
      (exitCode as number) < 0 ||
      (exitCode as number) > 255
    ) {
      addDiagnostic(
        diagnostics,
        "INVALID_COMMAND",
        `${path}.exitCode`,
        "exitCode must be an integer from 0 to 255",
      );
    } else if (exitCode !== 0) {
      addDiagnostic(
        diagnostics,
        "UNVERIFIED_PATCH",
        `${path}.exitCode`,
        "verified patches require every command to succeed",
      );
    }
    if (entry["networkAccess"] !== false) {
      addDiagnostic(
        diagnostics,
        "NETWORK_ACCESS",
        `${path}.networkAccess`,
        "decision receipt commands must be local and networkAccess must be false",
      );
    }
    const executedAt = requireTimestamp(entry, "executedAt", path, diagnostics);
    requireBoundId(entry, "candidateId", candidateId, path, diagnostics);
    commands.push({ executedAt });
  });
  return commands;
}

interface EvidenceParts {
  readonly ids: ReadonlySet<string>;
  readonly observedAt: readonly (string | undefined)[];
  readonly hasScan: boolean;
}

function validateEvidence(
  value: unknown,
  candidateId: string,
  diagnostics: DiagnosticList,
): EvidenceParts {
  if (!Array.isArray(value) || value.length === 0) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      "receipt.evidence",
      "evidence must be a non-empty array",
    );
    return { ids: new Set(), observedAt: [], hasScan: false };
  }
  if (value.length > MAX_DECISION_RECEIPT_EVIDENCE) {
    addDiagnostic(
      diagnostics,
      "RECEIPT_TOO_LARGE",
      "receipt.evidence",
      `evidence exceeds ${MAX_DECISION_RECEIPT_EVIDENCE}`,
    );
  }
  const ids = new Set<string>();
  const observedAt: (string | undefined)[] = [];
  let hasScan = false;
  value.slice(0, MAX_DECISION_RECEIPT_EVIDENCE).forEach((entry, index) => {
    const path = `receipt.evidence[${index}]`;
    if (!isRecord(entry)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_EVIDENCE",
        path,
        "evidence reference must be an object",
      );
      return;
    }
    const diagnosticCount = diagnostics.length;
    checkKeys(
      entry,
      [
        "evidenceId",
        "kind",
        "reference",
        "sha256",
        "candidateId",
        "observedAt",
      ],
      path,
      diagnostics,
    );
    const evidenceId = requireText(entry, "evidenceId", path, diagnostics);
    if (evidenceId !== undefined) {
      if (ids.has(evidenceId)) {
        addDiagnostic(
          diagnostics,
          "MALFORMED_EVIDENCE",
          `${path}.evidenceId`,
          "evidence IDs must be unique",
        );
      }
      ids.add(evidenceId);
    }
    const kind = requireText(entry, "kind", path, diagnostics);
    if (
      kind !== undefined &&
      kind !== "TEST" &&
      kind !== "SCAN" &&
      kind !== "CHALLENGE"
    ) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_EVIDENCE",
        `${path}.kind`,
        "evidence kind must be TEST, SCAN, or CHALLENGE",
      );
    }
    if (kind === "SCAN") hasScan = true;
    requireLocalReference(entry, "reference", path, diagnostics);
    requireSha256(entry, "sha256", path, diagnostics);
    requireBoundId(entry, "candidateId", candidateId, path, diagnostics);
    observedAt.push(requireTimestamp(entry, "observedAt", path, diagnostics));
    if (diagnostics.length > diagnosticCount) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_EVIDENCE",
        path,
        "evidence reference is malformed",
      );
    }
  });
  return { ids, observedAt, hasScan };
}

interface VerificationParts {
  readonly verifiedAt: string | undefined;
}

function validateVerification(
  value: unknown,
  candidateId: string,
  findingId: string,
  patchSha256: string,
  evidenceIds: ReadonlySet<string>,
  diagnostics: DiagnosticList,
): VerificationParts {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "UNVERIFIED_PATCH",
      "receipt.verification",
      "verification result is required",
    );
    return { verifiedAt: undefined };
  }
  checkKeys(
    value,
    [
      "result",
      "independentRescan",
      "verifier",
      "candidateId",
      "findingId",
      "patchSha256",
      "evidenceIds",
      "verifiedAt",
    ],
    "receipt.verification",
    diagnostics,
  );
  if (
    !requireLiteral(
      value,
      "result",
      "VERIFIED",
      "receipt.verification",
      diagnostics,
      "UNVERIFIED_PATCH",
    )
  ) {
    return { verifiedAt: undefined };
  }
  if (value["independentRescan"] !== true) {
    addDiagnostic(
      diagnostics,
      "INDEPENDENT_RESCAN_MISSING",
      "receipt.verification.independentRescan",
      "patch verification requires an independent rescan",
    );
  }
  const verifier = value["verifier"];
  if (isRecord(verifier)) {
    checkKeys(
      verifier,
      ["name", "version"],
      "receipt.verification.verifier",
      diagnostics,
    );
    requireLiteral(
      verifier,
      "name",
      "mjolnir",
      "receipt.verification.verifier",
      diagnostics,
    );
    requireText(
      verifier,
      "version",
      "receipt.verification.verifier",
      diagnostics,
    );
  } else {
    addDiagnostic(
      diagnostics,
      "UNVERIFIED_PATCH",
      "receipt.verification.verifier",
      "deterministic mjolnir verifier identity is required",
    );
  }
  requireBoundId(
    value,
    "candidateId",
    candidateId,
    "receipt.verification",
    diagnostics,
  );
  const boundFindingId = requireBoundId(
    value,
    "findingId",
    findingId,
    "receipt.verification",
    diagnostics,
  );
  if (boundFindingId !== undefined && boundFindingId !== findingId) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_FINDING",
      "receipt.verification.findingId",
      "verification must bind the receipt finding",
    );
  }
  const boundPatchSha256 = requireSha256(
    value,
    "patchSha256",
    "receipt.verification",
    diagnostics,
  );
  if (boundPatchSha256 !== undefined && boundPatchSha256 !== patchSha256) {
    addDiagnostic(
      diagnostics,
      "UNVERIFIED_PATCH",
      "receipt.verification.patchSha256",
      "verification must bind the proposed patch digest",
    );
  }
  const listedIds = new Set<string>();
  const listedValue = value["evidenceIds"];
  if (!Array.isArray(listedValue) || listedValue.length === 0) {
    addDiagnostic(
      diagnostics,
      "MALFORMED_EVIDENCE",
      "receipt.verification.evidenceIds",
      "verification must reference evidence",
    );
  } else {
    if (listedValue.length > MAX_DECISION_RECEIPT_EVIDENCE) {
      addDiagnostic(
        diagnostics,
        "RECEIPT_TOO_LARGE",
        "receipt.verification.evidenceIds",
        `evidence IDs exceed ${MAX_DECISION_RECEIPT_EVIDENCE}`,
      );
    }
    listedValue
      .slice(0, MAX_DECISION_RECEIPT_EVIDENCE)
      .forEach((evidenceId, index) => {
        if (
          typeof evidenceId !== "string" ||
          !TOKEN_PATTERN.test(evidenceId) ||
          listedIds.has(evidenceId)
        ) {
          addDiagnostic(
            diagnostics,
            "MALFORMED_EVIDENCE",
            `receipt.verification.evidenceIds[${index}]`,
            "evidence IDs must be unique safe identifiers",
          );
        } else {
          listedIds.add(evidenceId);
        }
      });
  }
  for (const evidenceId of listedIds) {
    if (!evidenceIds.has(evidenceId)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_EVIDENCE",
        "receipt.verification.evidenceIds",
        `unknown evidence reference ${evidenceId}`,
      );
    }
  }
  for (const evidenceId of evidenceIds) {
    if (!listedIds.has(evidenceId)) {
      addDiagnostic(
        diagnostics,
        "MALFORMED_EVIDENCE",
        "receipt.verification.evidenceIds",
        `evidence reference ${evidenceId} is unbound`,
      );
    }
  }
  const verifiedAt = requireTimestamp(
    value,
    "verifiedAt",
    "receipt.verification",
    diagnostics,
  );
  return { verifiedAt };
}

function validateApproval(
  value: unknown,
  candidateId: string,
  patchSha256: string,
  agentId: string | undefined,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_APPROVAL",
      "receipt.approval",
      "human approval is required",
    );
    return undefined;
  }
  checkKeys(
    value,
    ["decision", "approverId", "candidateId", "patchSha256", "approvedAt"],
    "receipt.approval",
    diagnostics,
  );
  if (
    !requireLiteral(
      value,
      "decision",
      "APPROVED",
      "receipt.approval",
      diagnostics,
      "MISSING_APPROVAL",
    )
  ) {
    return undefined;
  }
  const approverId = requireText(
    value,
    "approverId",
    "receipt.approval",
    diagnostics,
  );
  if (approverId !== undefined && approverId === agentId) {
    addDiagnostic(
      diagnostics,
      "SELF_APPROVAL",
      "receipt.approval.approverId",
      "the agent cannot approve its own patch",
    );
  }
  requireBoundId(
    value,
    "candidateId",
    candidateId,
    "receipt.approval",
    diagnostics,
  );
  const approvalPatchSha256 = requireSha256(
    value,
    "patchSha256",
    "receipt.approval",
    diagnostics,
  );
  if (
    approvalPatchSha256 !== undefined &&
    approvalPatchSha256 !== patchSha256
  ) {
    addDiagnostic(
      diagnostics,
      "FOREIGN_PATCH",
      "receipt.approval.patchSha256",
      "approval must bind the proposed patch",
    );
  }
  return requireTimestamp(value, "approvedAt", "receipt.approval", diagnostics);
}

function validateRollback(
  value: unknown,
  candidateId: string,
  diagnostics: DiagnosticList,
): string | undefined {
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "MISSING_ROLLBACK",
      "receipt.rollback",
      "rollback reference is required",
    );
    return undefined;
  }
  checkKeys(
    value,
    ["strategy", "reference", "sha256", "candidateId", "preparedAt"],
    "receipt.rollback",
    diagnostics,
  );
  requireLiteral(
    value,
    "strategy",
    "REVERT_PATCH",
    "receipt.rollback",
    diagnostics,
  );
  requireLocalReference(value, "reference", "receipt.rollback", diagnostics);
  requireSha256(value, "sha256", "receipt.rollback", diagnostics);
  requireBoundId(
    value,
    "candidateId",
    candidateId,
    "receipt.rollback",
    diagnostics,
  );
  return requireTimestamp(value, "preparedAt", "receipt.rollback", diagnostics);
}

function validateTimeline(
  candidateCapturedAt: string | undefined,
  approvedAt: string | undefined,
  proposedAt: string | undefined,
  commands: readonly CommandParts[],
  evidence: EvidenceParts,
  verifiedAt: string | undefined,
  rollbackPreparedAt: string | undefined,
  diagnostics: DiagnosticList,
): void {
  if (
    candidateCapturedAt === undefined ||
    approvedAt === undefined ||
    proposedAt === undefined ||
    verifiedAt === undefined ||
    rollbackPreparedAt === undefined
  ) {
    return;
  }
  const captured = Date.parse(candidateCapturedAt);
  const approved = Date.parse(approvedAt);
  const proposed = Date.parse(proposedAt);
  const verified = Date.parse(verifiedAt);
  const rolledBack = Date.parse(rollbackPreparedAt);
  const commandTimes = commands
    .map((command) =>
      command.executedAt === undefined
        ? undefined
        : Date.parse(command.executedAt),
    )
    .filter((value): value is number => value !== undefined);
  const evidenceTimes = evidence.observedAt
    .filter((value): value is string => value !== undefined)
    .map((value) => Date.parse(value));
  const valid =
    captured <= approved &&
    approved < proposed &&
    proposed <= rolledBack &&
    rolledBack <= verified &&
    commandTimes.every((value) => proposed <= value && value <= verified) &&
    evidenceTimes.every((value) => proposed <= value && value <= verified);
  if (!valid) {
    addDiagnostic(
      diagnostics,
      "TIMELINE_INVALID",
      "receipt",
      "candidate, approval, patch, command, evidence, verification, and rollback timestamps are not ordered",
    );
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function receiptIdFor(payload: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalJson(payload)).digest("hex")}`;
}

function finishValidation(
  diagnostics: DiagnosticList,
): DecisionReceiptValidationResult {
  const frozenDiagnostics = Object.freeze([...diagnostics]);
  return Object.freeze({
    valid: frozenDiagnostics.length === 0,
    errors: Object.freeze(
      frozenDiagnostics.map((diagnostic) => diagnostic.message),
    ),
    diagnostics: frozenDiagnostics,
  });
}

export function validateDecisionReceipt(
  value: unknown,
  currentCandidate: CandidateBinding,
): DecisionReceiptValidationResult {
  const diagnostics: DiagnosticList = [];
  scanForbidden(value, diagnostics);
  scanForbidden(currentCandidate, diagnostics);
  if (
    diagnostics.some(
      (diagnostic) => diagnostic.code === "NON_SERIALIZABLE_FIELD",
    )
  ) {
    return finishValidation(diagnostics);
  }
  if (!isRecord(value)) {
    addDiagnostic(
      diagnostics,
      "INVALID_RECEIPT",
      "receipt",
      "receipt must be an object",
    );
    return finishValidation(diagnostics);
  }
  checkKeys(
    value,
    [
      "schemaVersion",
      "receiptId",
      "finding",
      "identity",
      "patch",
      "commands",
      "evidence",
      "verification",
      "approval",
      "rollback",
      "candidate",
    ],
    "receipt",
    diagnostics,
  );
  if (value["schemaVersion"] !== DECISION_RECEIPT_SCHEMA_VERSION) {
    addDiagnostic(
      diagnostics,
      "UNSUPPORTED_SCHEMA_VERSION",
      "receipt.schemaVersion",
      `schemaVersion must be ${DECISION_RECEIPT_SCHEMA_VERSION}`,
    );
  }
  const receiptId = requireSha256(value, "receiptId", "receipt", diagnostics);
  const currentParts = validateCandidate(
    currentCandidate,
    "currentCandidate",
    diagnostics,
  );
  const candidateParts = validateCandidate(
    value["candidate"],
    "receipt.candidate",
    diagnostics,
  );
  if (currentParts.candidateId === undefined) {
    addDiagnostic(
      diagnostics,
      "INVALID_CANDIDATE",
      "currentCandidate",
      "a current candidate binding is required",
    );
  }
  if (
    currentParts.candidateId !== undefined &&
    candidateParts.candidateId !== undefined
  ) {
    if (!sameCandidateIdentity(currentParts, candidateParts)) {
      addDiagnostic(
        diagnostics,
        "FOREIGN_CANDIDATE",
        "receipt.candidate",
        "receipt is bound to a different candidate",
      );
    } else if (
      currentParts.capturedAt !== candidateParts.capturedAt ||
      currentParts.freshness !== candidateParts.freshness
    ) {
      addDiagnostic(
        diagnostics,
        "STALE_CANDIDATE",
        "receipt.candidate",
        "receipt candidate snapshot is stale",
      );
    }
  }
  const candidateId = currentParts.candidateId ?? "";
  const agentId = validateIdentity(value["identity"], diagnostics);
  const finding = validateFinding(value["finding"], candidateId, diagnostics);
  const patch = validatePatch(value["patch"], candidateId, diagnostics);
  const commands = validateCommands(
    value["commands"],
    candidateId,
    diagnostics,
  );
  const evidence = validateEvidence(
    value["evidence"],
    candidateId,
    diagnostics,
  );
  if (!evidence.hasScan) {
    addDiagnostic(
      diagnostics,
      "INDEPENDENT_RESCAN_MISSING",
      "receipt.evidence",
      "verification evidence must include an independent scan",
    );
  }
  const verification = validateVerification(
    value["verification"],
    candidateId,
    finding.findingId ?? "",
    patch.sha256 ?? "",
    evidence.ids,
    diagnostics,
  );
  const approvedAt = validateApproval(
    value["approval"],
    candidateId,
    patch.sha256 ?? "",
    agentId,
    diagnostics,
  );
  const rollbackPreparedAt = validateRollback(
    value["rollback"],
    candidateId,
    diagnostics,
  );
  validateTimeline(
    candidateParts.capturedAt,
    approvedAt,
    patch.proposedAt,
    commands,
    evidence,
    verification.verifiedAt,
    rollbackPreparedAt,
    diagnostics,
  );
  if (diagnostics.length === 0 && receiptId !== undefined) {
    const payload = { ...value };
    delete payload["receiptId"];
    const expectedReceiptId = receiptIdFor(payload);
    if (receiptId !== expectedReceiptId) {
      addDiagnostic(
        diagnostics,
        "RECEIPT_ID_MISMATCH",
        "receipt.receiptId",
        "receiptId does not match the canonical receipt content",
      );
    }
  }
  return finishValidation(diagnostics);
}

function cloneInput(input: DecisionReceiptInput): DecisionReceiptInput {
  return {
    finding: { ...input.finding },
    identity: {
      agent: { ...input.identity.agent },
      model: { ...input.identity.model },
      tool: { ...input.identity.tool },
    },
    patch: { ...input.patch },
    commands: input.commands.map((command) => ({
      ...command,
      arguments: [...command.arguments],
    })),
    evidence: input.evidence.map((entry) => ({ ...entry })),
    verification: {
      ...input.verification,
      verifier: { ...input.verification.verifier },
      evidenceIds: [...input.verification.evidenceIds],
    },
    approval: { ...input.approval },
    rollback: { ...input.rollback },
    candidate: { ...input.candidate },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

export function createDecisionReceipt(
  input: DecisionReceiptInput,
  currentCandidate: CandidateBinding,
): DecisionReceipt {
  if (!isRecord(input)) {
    throw new DecisionReceiptError([
      Object.freeze({
        code: "INVALID_RECEIPT",
        path: "receipt",
        message: "receipt input must be an object",
      }),
    ]);
  }
  const inputDiagnostics: DiagnosticList = [];
  scanForbidden(input, inputDiagnostics);
  checkKeys(
    input,
    [
      "finding",
      "identity",
      "patch",
      "commands",
      "evidence",
      "verification",
      "approval",
      "rollback",
      "candidate",
    ],
    "input",
    inputDiagnostics,
  );
  if (inputDiagnostics.length > 0) {
    throw new DecisionReceiptError(inputDiagnostics);
  }
  const source = input as unknown as Record<string, unknown>;
  const payload: DecisionReceiptInput = {
    finding: source["finding"] as FindingReference,
    identity: source["identity"] as AgentModelToolIdentity,
    patch: source["patch"] as ProposedPatchReference,
    commands: source["commands"] as readonly DecisionCommand[],
    evidence: source["evidence"] as readonly EvidenceReference[],
    verification: source["verification"] as VerificationResult,
    approval: source["approval"] as ReceiptApproval,
    rollback: source["rollback"] as RollbackReference,
    candidate: source["candidate"] as CandidateBinding,
  };
  const unsigned = {
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    ...payload,
  };
  let computedReceiptId: string;
  try {
    computedReceiptId = receiptIdFor(unsigned);
  } catch {
    throw new DecisionReceiptError([
      Object.freeze({
        code: "RECEIPT_NOT_CANONICALIZABLE",
        path: "receipt",
        message: "receipt content cannot be deterministically canonicalized",
      }),
    ]);
  }
  const draft = {
    ...unsigned,
    receiptId: computedReceiptId,
  };
  const validation = validateDecisionReceipt(draft, currentCandidate);
  if (!validation.valid) {
    throw new DecisionReceiptError(validation.diagnostics);
  }
  return deepFreeze({
    ...cloneInput(unsigned),
    schemaVersion: DECISION_RECEIPT_SCHEMA_VERSION,
    receiptId: draft.receiptId,
  });
}
