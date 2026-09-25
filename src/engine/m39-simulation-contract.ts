import { createHash } from "node:crypto";

type UnknownRecord = Record<string, unknown>;

export const M39_SIMULATION_SCHEMA = "m39.simulation@1" as const;
export const M39_SIMULATION_CONTRACT_VERSION = M39_SIMULATION_SCHEMA;

export const M39_SIMULATION_OUTCOMES = Object.freeze([
  "UNKNOWN",
  "PARTIAL",
  "INCONCLUSIVE",
  "REPRODUCIBLE",
] as const);

export type M39SimulationOutcome = (typeof M39_SIMULATION_OUTCOMES)[number];

export type SimulationOutcome = M39SimulationOutcome;

export const M39_SIMULATION_LIMITS = Object.freeze({
  maxOperations: 32,
  maxOperationDurationMs: 5_000,
  maxTotalDurationMs: 30_000,
  maxWorkspaceEntries: 10_000,
  maxWorkspaceBytes: 8_388_608,
  maxOutputBytes: 262_144,
  maxEvidenceItems: 64,
  maxEvidenceAgeMs: 86_400_000,
  maxIdLength: 128,
  maxTextLength: 4_096,
} as const);

export interface SimulationResourceLimits {
  readonly maxOperations: number;
  readonly maxOperationDurationMs: number;
  readonly maxTotalDurationMs: number;
  readonly maxWorkspaceEntries: number;
  readonly maxWorkspaceBytes: number;
  readonly maxOutputBytes: number;
  readonly maxEvidenceItems: number;
  readonly maxEvidenceAgeMs: number;
  readonly maxIdLength: number;
  readonly maxTextLength: number;
}

export type SimulationPlanLimits = SimulationResourceLimits;
export const M39_SIMULATION_RESOURCE_LIMITS = M39_SIMULATION_LIMITS;

export const M39_SIMULATION_TRUST_POLICY = Object.freeze({
  effect: "PRESERVE_OR_DOWNGRADE",
  canPromoteTrust: false,
  canCertifyRelease: false,
} as const);

export type M39SimulationTrustState = "PASS" | "PARTIAL" | "UNKNOWN";

export interface SimulationCandidate {
  readonly candidateId: string;
  readonly repositoryId: string;
  readonly headSha: string;
  readonly graphDigest: string;
}

export interface SimulationWorkspaceFile {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}

export interface SimulationWorkspaceSnapshot {
  readonly schemaVersion: 1;
  readonly rootId: string;
  readonly files: readonly SimulationWorkspaceFile[];
}

export interface SimulationWorkspaceOverlay {
  readonly upserts: readonly SimulationWorkspaceFile[];
  readonly deletes: readonly string[];
}

export interface CopyOnWriteWorkspaceManifest {
  readonly schemaVersion: 1;
  readonly base: SimulationWorkspaceSnapshot;
  readonly overlay: SimulationWorkspaceOverlay;
}

interface SimulationOperationBase {
  readonly id: string;
  readonly timeoutMs?: number;
}

export interface RemoveTestSimulationOperation extends SimulationOperationBase {
  readonly kind: "REMOVE_TEST";
  readonly path: string;
  readonly testId: string;
}

export interface ChangeApiSimulationOperation extends SimulationOperationBase {
  readonly kind: "CHANGE_API";
  readonly path: string;
  readonly symbol: string;
  readonly change: "ADDED" | "REMOVED" | "CHANGED";
}

export interface AdvisoryGateSimulationOperation extends SimulationOperationBase {
  readonly kind: "ADVISORY_GATE";
  readonly gateId: string;
  readonly action: "ENABLE" | "DISABLE";
}

export interface DependencyUpgradeSimulationOperation extends SimulationOperationBase {
  readonly kind: "DEPENDENCY_UPGRADE";
  readonly packageName: string;
  readonly fromVersion?: string;
  readonly toVersion: string;
}

export interface StaleEvidenceSimulationOperation extends SimulationOperationBase {
  readonly kind: "STALE_EVIDENCE";
  readonly evidenceId: string;
}

export interface EnvironmentChangeSimulationOperation extends SimulationOperationBase {
  readonly kind: "ENVIRONMENT_CHANGE";
  readonly key: string;
  readonly fromValue?: string;
  readonly toValue?: string;
}

export type SimulationOperation =
  | RemoveTestSimulationOperation
  | ChangeApiSimulationOperation
  | AdvisoryGateSimulationOperation
  | DependencyUpgradeSimulationOperation
  | StaleEvidenceSimulationOperation
  | EnvironmentChangeSimulationOperation;

export const M39_SIMULATION_OPERATIONS = Object.freeze([
  "REMOVE_TEST",
  "CHANGE_API",
  "ADVISORY_GATE",
  "DEPENDENCY_UPGRADE",
  "STALE_EVIDENCE",
  "ENVIRONMENT_CHANGE",
] as const);

export type M39SimulationOperationKind =
  (typeof M39_SIMULATION_OPERATIONS)[number];

export const M39_FORBIDDEN_SIDE_EFFECTS = Object.freeze([
  "WRITE_WORKSPACE",
  "NETWORK",
  "PROCESS_SPAWN",
  "ENVIRONMENT_MUTATION",
  "GIT_MUTATION",
  "PERSISTENCE",
] as const);

export type M39ForbiddenSideEffect =
  (typeof M39_FORBIDDEN_SIDE_EFFECTS)[number];

export const FORBIDDEN_SIDE_EFFECTS = M39_FORBIDDEN_SIDE_EFFECTS;
export const M39_SIMULATION_FORBIDDEN_SIDE_EFFECTS = M39_FORBIDDEN_SIDE_EFFECTS;

export interface SimulationEffect {
  readonly kind: M39ForbiddenSideEffect;
  readonly target: string;
  readonly blocked: boolean;
}

export type M39SimulationOperationState =
  | "COMPLETE"
  | "PARTIAL"
  | "TIMED_OUT"
  | "CANCELLED"
  | "UNSUPPORTED"
  | "FORBIDDEN"
  | "UNKNOWN";

export interface SimulationExecution {
  readonly status:
    | "COMPLETE"
    | "COMPLETED"
    | "PARTIAL"
    | "TIMED_OUT"
    | "CANCELLED"
    | "UNSUPPORTED"
    | "UNKNOWN";
  readonly durationMs: number;
  readonly outputBytes: number;
  readonly overlay?: SimulationWorkspaceOverlay;
  readonly effects?: readonly SimulationEffect[];
}

export interface SimulationExecutionContext {
  readonly workspace: SimulationWorkspaceSnapshot;
  readonly planHash: string;
  readonly signal: AbortSignal | undefined;
  readonly readFile: (path: string) => SimulationWorkspaceFile | undefined;
  readonly attemptWrite: (path: string) => SimulationEffect;
  readonly attemptNetwork: (target: string) => SimulationEffect;
}

export type SimulationExecutor = (
  operation: SimulationOperation,
  context: SimulationExecutionContext,
) => SimulationExecution | Promise<SimulationExecution>;

export interface M39SimulationOperationResult {
  readonly operationId: string | null;
  readonly operationKind: string | null;
  readonly outcome: M39SimulationOperationState;
  readonly reason: M39SimulationReason;
  readonly durationMs: number;
  readonly outputBytes: number;
  readonly effectKinds: readonly M39ForbiddenSideEffect[];
  readonly withinResourceBudget: boolean;
  readonly overlay?: SimulationWorkspaceOverlay;
}

export interface M39SimulationEvidence {
  readonly schemaVersion: typeof M39_SIMULATION_SCHEMA;
  readonly id: string;
  readonly planId: string;
  readonly planHash: string;
  readonly candidate: SimulationCandidate;
  readonly capturedAt: string;
  readonly beforeHash: string;
  readonly afterHash: string;
  readonly completeness: "COMPLETE" | "PARTIAL";
  readonly execution:
    "COMPLETE" | "PARTIAL" | "TIMED_OUT" | "CANCELLED" | "UNKNOWN";
  readonly operationIds: readonly string[];
  readonly observations: readonly M39SimulationOperationResult[];
  readonly durationMs: number;
  readonly outputBytes: number;
  readonly effects: readonly SimulationEffect[];
}

export type M39SimulationReason =
  | "REPRODUCIBLE"
  | "REPLAY_MISMATCH"
  | "PLAN_MALFORMED"
  | "WORKSPACE_MALFORMED"
  | "EVIDENCE_MALFORMED"
  | "EVIDENCE_STALE"
  | "EVIDENCE_FOREIGN"
  | "EVIDENCE_FUTURE"
  | "EVIDENCE_PARTIAL"
  | "UNSUPPORTED_OPERATION"
  | "TIMEOUT"
  | "CANCELLED"
  | "PARTIAL_EXECUTION"
  | "EXECUTION_ERROR"
  | "FORBIDDEN_SIDE_EFFECT"
  | "RESOURCE_LIMIT"
  | "DUPLICATE_OPERATION"
  | "OPERATION_MALFORMED"
  | "WORKSPACE_MUTATED"
  | "NO_OPERATIONS"
  | "NO_EXECUTOR";

export interface M39SimulationReport {
  readonly schemaVersion: typeof M39_SIMULATION_SCHEMA;
  readonly inputState: "VALID" | "MALFORMED";
  readonly planId: string | null;
  readonly candidate: SimulationCandidate | null;
  readonly outcome: M39SimulationOutcome;
  readonly reason: M39SimulationReason;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly planHash: string | null;
  readonly replayHash: string;
  readonly operations: readonly M39SimulationOperationResult[];
  readonly submittedOperationCount: number;
  readonly processedOperationCount: number;
  readonly unprocessedOperationCount: number;
  readonly duplicateOperationCount: number;
  readonly resourceState: "WITHIN_BOUNDS" | "EXCEEDED" | "UNDETERMINED";
  readonly evidenceState:
    | "CURRENT"
    | "PARTIAL"
    | "MALFORMED"
    | "STALE"
    | "FOREIGN"
    | "FUTURE"
    | "ABSENT";
  readonly forbiddenEffects: readonly M39ForbiddenSideEffect[];
  readonly hostWorkspaceMutated: false;
  readonly canPromoteTrust: false;
  readonly canCertifyRelease: false;
  readonly recovery: "NOT_REQUIRED" | "RETRYABLE" | "RESTART_REQUIRED";
  readonly trustEffect: typeof M39_SIMULATION_TRUST_POLICY.effect;
}

export type SimulationEvidence = M39SimulationEvidence;
export type SimulationReport = M39SimulationReport;

export interface SimulationPlan {
  readonly schemaVersion: 1;
  readonly planId: string;
  readonly candidate: SimulationCandidate;
  readonly workspace: CopyOnWriteWorkspaceManifest;
  readonly operations: readonly SimulationOperation[];
  readonly limits?: Partial<SimulationResourceLimits>;
}

export interface SimulationRunOptions {
  readonly signal?: AbortSignal;
  readonly capturedAt?: string;
  readonly evaluatedAt?: string;
}

interface ParsedFile {
  readonly file: SimulationWorkspaceFile;
}

interface ParsedSnapshot {
  readonly snapshot: SimulationWorkspaceSnapshot;
  readonly submittedCount: number;
  readonly resourceExceeded: boolean;
}

interface ParsedOverlay {
  readonly overlay: SimulationWorkspaceOverlay;
  readonly resourceExceeded: boolean;
}

interface ParsedManifest {
  readonly manifest: CopyOnWriteWorkspaceManifest;
  readonly initialSnapshot: SimulationWorkspaceSnapshot;
  readonly resourceExceeded: boolean;
}

interface ParsedOperation {
  readonly id: string | null;
  readonly kind: string | null;
  readonly operation: SimulationOperation | null;
  readonly timeoutMs: number | null;
  readonly malformed: boolean;
  readonly unsupported: boolean;
}

interface ParsedPlan {
  readonly planId: string;
  readonly candidate: SimulationCandidate;
  readonly manifest: CopyOnWriteWorkspaceManifest;
  readonly initialSnapshot: SimulationWorkspaceSnapshot;
  readonly beforeHash: string;
  readonly planHash: string;
  readonly operations: readonly ParsedOperation[];
  readonly submittedOperationCount: number;
  readonly limits: SimulationResourceLimits;
  readonly limitViolation: boolean;
  readonly duplicateIds: ReadonlySet<string>;
}

interface ParsedEvidence {
  readonly evidence: M39SimulationEvidence | null;
  readonly state: M39SimulationReport["evidenceState"];
  readonly reason: M39SimulationReason;
}

interface RunnerExecution {
  readonly kind: "execution" | "timeout" | "cancelled" | "error";
  readonly value?: unknown;
}

const DEFAULT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const EMPTY_EFFECTS: readonly M39ForbiddenSideEffect[] = Object.freeze([]);
const REASONS = new Set<M39SimulationReason>([
  "REPRODUCIBLE",
  "REPLAY_MISMATCH",
  "PLAN_MALFORMED",
  "WORKSPACE_MALFORMED",
  "EVIDENCE_MALFORMED",
  "EVIDENCE_STALE",
  "EVIDENCE_FOREIGN",
  "EVIDENCE_FUTURE",
  "EVIDENCE_PARTIAL",
  "UNSUPPORTED_OPERATION",
  "TIMEOUT",
  "CANCELLED",
  "PARTIAL_EXECUTION",
  "EXECUTION_ERROR",
  "FORBIDDEN_SIDE_EFFECT",
  "RESOURCE_LIMIT",
  "DUPLICATE_OPERATION",
  "OPERATION_MALFORMED",
  "WORKSPACE_MUTATED",
  "NO_OPERATIONS",
  "NO_EXECUTOR",
]);
const LIMIT_KEYS = [
  "maxOperations",
  "maxOperationDurationMs",
  "maxTotalDurationMs",
  "maxWorkspaceEntries",
  "maxWorkspaceBytes",
  "maxOutputBytes",
  "maxEvidenceItems",
  "maxEvidenceAgeMs",
  "maxIdLength",
  "maxTextLength",
] as const satisfies readonly (keyof SimulationResourceLimits)[];

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is UnknownRecord {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

function isSafeInteger(value: unknown, minimum = 0): value is number {
  return (
    typeof value === "number" && Number.isSafeInteger(value) && value >= minimum
  );
}

function readString(
  value: unknown,
  key: string,
  maxLength: number,
): string | null {
  try {
    if (!isRecord(value)) return null;
    const candidate = value[key];
    if (
      typeof candidate !== "string" ||
      candidate.length === 0 ||
      candidate.length > maxLength
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function readOptionalString(
  value: unknown,
  key: string,
  maxLength: number,
): string | null | undefined {
  try {
    if (!isRecord(value)) return null;
    const candidate = value[key];
    if (candidate === undefined) return undefined;
    if (
      typeof candidate !== "string" ||
      candidate.length === 0 ||
      candidate.length > maxLength
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value);
}

function stableJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    const keys = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort(compareText);
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  throw new Error("unsupported value");
}

function hashValue(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function normalizePath(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  let normalized = value.replaceAll("\\", "/");
  while (normalized.startsWith("./")) normalized = normalized.slice(2);
  if (
    normalized.length === 0 ||
    normalized.length > M39_SIMULATION_LIMITS.maxTextLength ||
    normalized.startsWith("/") ||
    /^[a-z]:\//i.test(normalized)
  ) {
    return null;
  }
  const parts = normalized.split("/");
  if (
    parts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    return null;
  }
  return parts.join("/");
}

function parseCandidate(value: unknown): SimulationCandidate | null {
  if (!isRecord(value)) return null;
  const candidateId = readString(
    value,
    "candidateId",
    M39_SIMULATION_LIMITS.maxIdLength,
  );
  const repositoryId = readString(
    value,
    "repositoryId",
    M39_SIMULATION_LIMITS.maxIdLength,
  );
  const headSha = readString(
    value,
    "headSha",
    M39_SIMULATION_LIMITS.maxIdLength,
  );
  const graphDigest = readString(
    value,
    "graphDigest",
    M39_SIMULATION_LIMITS.maxTextLength,
  );
  if (
    candidateId === null ||
    repositoryId === null ||
    headSha === null ||
    graphDigest === null
  ) {
    return null;
  }
  return { candidateId, repositoryId, headSha, graphDigest };
}

function parseFile(value: unknown): ParsedFile | null {
  if (!isRecord(value)) return null;
  const path = normalizePath(value["path"]);
  const sha256 = value["sha256"];
  const bytes = value["bytes"];
  if (
    path === null ||
    !isHash(sha256) ||
    !isSafeInteger(bytes) ||
    bytes > M39_SIMULATION_LIMITS.maxWorkspaceBytes
  ) {
    return null;
  }
  return { file: { path, sha256, bytes } };
}

function sortFiles(
  files: readonly SimulationWorkspaceFile[],
): readonly SimulationWorkspaceFile[] {
  return [...files].sort((left, right) => compareText(left.path, right.path));
}

function parseSnapshot(value: unknown): ParsedSnapshot | null {
  if (!isRecord(value) || value["schemaVersion"] !== 1) return null;
  const rootId = readString(value, "rootId", M39_SIMULATION_LIMITS.maxIdLength);
  const filesValue = value["files"];
  if (rootId === null || !Array.isArray(filesValue)) return null;
  const files: SimulationWorkspaceFile[] = [];
  const limit = Math.min(
    filesValue.length,
    M39_SIMULATION_LIMITS.maxWorkspaceEntries,
  );
  let malformed = false;
  for (let index = 0; index < limit; index += 1) {
    const parsed = parseFile(filesValue[index]);
    if (parsed === null) {
      malformed = true;
      break;
    }
    if (files.some((file) => file.path === parsed.file.path)) {
      malformed = true;
      break;
    }
    files.push(parsed.file);
  }
  if (malformed) return null;
  return {
    snapshot: { schemaVersion: 1, rootId, files: sortFiles(files) },
    submittedCount: filesValue.length,
    resourceExceeded: filesValue.length > limit,
  };
}

function parseOverlay(value: unknown): ParsedOverlay | null {
  if (!isRecord(value)) return null;
  const upsertsValue = value["upserts"];
  const deletesValue = value["deletes"];
  if (!Array.isArray(upsertsValue) || !Array.isArray(deletesValue)) return null;
  const upserts: SimulationWorkspaceFile[] = [];
  const deletes: string[] = [];
  const limit = Math.min(
    upsertsValue.length + deletesValue.length,
    M39_SIMULATION_LIMITS.maxWorkspaceEntries,
  );
  let consumed = 0;
  let malformed = false;
  for (
    let index = 0;
    index < upsertsValue.length && consumed < limit;
    index += 1
  ) {
    const parsed = parseFile(upsertsValue[index]);
    if (
      parsed === null ||
      upserts.some((file) => file.path === parsed.file.path) ||
      deletes.includes(normalizePath(parsed.file.path) ?? "")
    ) {
      malformed = true;
      break;
    }
    upserts.push(parsed.file);
    consumed += 1;
  }
  for (
    let index = 0;
    index < deletesValue.length && consumed < limit;
    index += 1
  ) {
    const path = normalizePath(deletesValue[index]);
    if (
      path === null ||
      deletes.includes(path) ||
      upserts.some((file) => file.path === path)
    ) {
      malformed = true;
      break;
    }
    deletes.push(path);
    consumed += 1;
  }
  if (malformed) return null;
  return {
    overlay: {
      upserts: sortFiles(upserts),
      deletes: [...deletes].sort(compareText),
    },
    resourceExceeded: upsertsValue.length + deletesValue.length > limit,
  };
}

function parseManifest(value: unknown): ParsedManifest | null {
  if (!isRecord(value) || value["schemaVersion"] !== 1) return null;
  let baseValue: unknown;
  let overlayValue: unknown;
  if (isRecord(value["base"])) {
    baseValue = value["base"];
    overlayValue = value["overlay"];
  } else {
    baseValue = value;
    overlayValue = { upserts: [], deletes: [] };
  }
  const base = parseSnapshot(baseValue);
  const overlay = parseOverlay(overlayValue);
  if (base === null || overlay === null) return null;
  const initialSnapshot = applyOverlay(base.snapshot, overlay.overlay);
  return {
    manifest: {
      schemaVersion: 1,
      base: base.snapshot,
      overlay: overlay.overlay,
    },
    initialSnapshot,
    resourceExceeded: base.resourceExceeded || overlay.resourceExceeded,
  };
}

function applyOverlay(
  snapshot: SimulationWorkspaceSnapshot,
  overlay: SimulationWorkspaceOverlay,
): SimulationWorkspaceSnapshot {
  const files = new Map(snapshot.files.map((file) => [file.path, file]));
  for (const path of overlay.deletes) files.delete(path);
  for (const file of overlay.upserts) files.set(file.path, file);
  return {
    schemaVersion: 1,
    rootId: snapshot.rootId,
    files: sortFiles([...files.values()]),
  };
}

function hashSnapshot(snapshot: SimulationWorkspaceSnapshot): string {
  return hashValue({
    schemaVersion: snapshot.schemaVersion,
    rootId: snapshot.rootId,
    files: sortFiles(snapshot.files),
  });
}

function resolveLimits(value: unknown): {
  readonly limits: SimulationResourceLimits;
  readonly valid: boolean;
  readonly clamped: boolean;
} {
  const limits: {
    -readonly [
      K in keyof SimulationResourceLimits
    ]: SimulationResourceLimits[K];
  } = {
    ...M39_SIMULATION_LIMITS,
  };
  if (value === undefined) return { limits, valid: true, clamped: false };
  if (!isRecord(value)) return { limits, valid: false, clamped: false };
  let clamped = false;
  try {
    for (const key of LIMIT_KEYS) {
      const supplied = value[key];
      if (supplied === undefined) continue;
      if (!isSafeInteger(supplied, 1)) {
        return { limits, valid: false, clamped };
      }
      if (supplied > limits[key]) {
        clamped = true;
      } else {
        limits[key] = supplied;
      }
    }
  } catch {
    return { limits, valid: false, clamped };
  }
  return { limits, valid: true, clamped };
}

function parseOperation(value: unknown): ParsedOperation {
  try {
    if (!isRecord(value)) {
      return {
        id: null,
        kind: null,
        operation: null,
        timeoutMs: null,
        malformed: true,
        unsupported: true,
      };
    }
    const id = readString(value, "id", M39_SIMULATION_LIMITS.maxIdLength);
    const kind = readString(value, "kind", M39_SIMULATION_LIMITS.maxTextLength);
    const timeoutValue = value["timeoutMs"];
    const timeoutMs =
      timeoutValue === undefined
        ? null
        : isSafeInteger(timeoutValue)
          ? timeoutValue
          : undefined;
    if (id === null || kind === null || timeoutMs === undefined) {
      return {
        id,
        kind,
        operation: null,
        timeoutMs: null,
        malformed: true,
        unsupported: true,
      };
    }
    const base = timeoutMs === null ? { id } : { id, timeoutMs };
    const path = readString(value, "path", M39_SIMULATION_LIMITS.maxTextLength);
    const normalizedPath = normalizePath(path);
    switch (kind) {
      case "REMOVE_TEST": {
        const testId = readString(
          value,
          "testId",
          M39_SIMULATION_LIMITS.maxIdLength,
        );
        if (normalizedPath === null || testId === null) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: { ...base, kind, path: normalizedPath, testId },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      case "CHANGE_API": {
        const symbol = readString(
          value,
          "symbol",
          M39_SIMULATION_LIMITS.maxIdLength,
        );
        const change = value["change"];
        if (
          normalizedPath === null ||
          symbol === null ||
          (change !== "ADDED" && change !== "REMOVED" && change !== "CHANGED")
        ) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: { ...base, kind, path: normalizedPath, symbol, change },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      case "ADVISORY_GATE": {
        const gateId = readString(
          value,
          "gateId",
          M39_SIMULATION_LIMITS.maxIdLength,
        );
        const action = value["action"];
        if (gateId === null || (action !== "ENABLE" && action !== "DISABLE")) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: { ...base, kind, gateId, action },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      case "DEPENDENCY_UPGRADE": {
        const packageName = readString(
          value,
          "packageName",
          M39_SIMULATION_LIMITS.maxIdLength,
        );
        const fromVersion = readOptionalString(
          value,
          "fromVersion",
          M39_SIMULATION_LIMITS.maxTextLength,
        );
        const toVersion = readString(
          value,
          "toVersion",
          M39_SIMULATION_LIMITS.maxTextLength,
        );
        if (
          packageName === null ||
          fromVersion === null ||
          toVersion === null
        ) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: {
            ...base,
            kind,
            packageName,
            toVersion,
            ...(fromVersion === undefined ? {} : { fromVersion }),
          },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      case "STALE_EVIDENCE": {
        const evidenceId = readString(
          value,
          "evidenceId",
          M39_SIMULATION_LIMITS.maxIdLength,
        );
        if (evidenceId === null) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: { ...base, kind, evidenceId },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      case "ENVIRONMENT_CHANGE": {
        const key = readString(value, "key", M39_SIMULATION_LIMITS.maxIdLength);
        const fromValue = readOptionalString(
          value,
          "fromValue",
          M39_SIMULATION_LIMITS.maxTextLength,
        );
        const toValue = readOptionalString(
          value,
          "toValue",
          M39_SIMULATION_LIMITS.maxTextLength,
        );
        if (
          key === null ||
          fromValue === null ||
          toValue === null ||
          (fromValue === undefined && toValue === undefined)
        ) {
          return {
            id,
            kind,
            operation: null,
            timeoutMs,
            malformed: true,
            unsupported: false,
          };
        }
        return {
          id,
          kind,
          operation: {
            ...base,
            kind,
            key,
            ...(fromValue === undefined ? {} : { fromValue }),
            ...(toValue === undefined ? {} : { toValue }),
          },
          timeoutMs,
          malformed: false,
          unsupported: false,
        };
      }
      default:
        return {
          id,
          kind,
          operation: null,
          timeoutMs,
          malformed: false,
          unsupported: true,
        };
    }
  } catch {
    return {
      id: null,
      kind: null,
      operation: null,
      timeoutMs: null,
      malformed: true,
      unsupported: true,
    };
  }
}

function canonicalOperation(operation: ParsedOperation): unknown {
  if (operation.operation !== null) return operation.operation;
  return {
    id: operation.id,
    kind: operation.kind,
    unsupported: operation.unsupported,
  };
}

function planHashView(parsed: ParsedPlan): unknown {
  return {
    schemaVersion: 1,
    planId: parsed.planId,
    candidate: parsed.candidate,
    workspace: parsed.manifest,
    operations: [...parsed.operations]
      .sort((left, right) => compareText(left.id ?? "", right.id ?? ""))
      .map(canonicalOperation),
    limits: parsed.limits,
  };
}

function parsePlan(value: unknown): ParsedPlan | null {
  try {
    if (!isRecord(value) || value["schemaVersion"] !== 1) return null;
    const planId = readString(
      value,
      "planId",
      M39_SIMULATION_LIMITS.maxIdLength,
    );
    const candidate = parseCandidate(value["candidate"]);
    const manifest = parseManifest(value["workspace"]);
    const limitResult = resolveLimits(value["limits"]);
    const operationsValue = value["operations"];
    if (
      planId === null ||
      candidate === null ||
      manifest === null ||
      !limitResult.valid ||
      !Array.isArray(operationsValue)
    ) {
      return null;
    }
    const limits = limitResult.limits;
    const operationLimit = Math.min(
      operationsValue.length,
      limits.maxOperations,
    );
    const operations: ParsedOperation[] = [];
    for (let index = 0; index < operationLimit; index += 1) {
      operations.push(parseOperation(operationsValue[index]));
    }
    const counts = new Map<string, number>();
    for (const operation of operations) {
      if (operation.id !== null) {
        counts.set(operation.id, (counts.get(operation.id) ?? 0) + 1);
      }
    }
    const duplicateIds = new Set<string>();
    for (const [id, count] of counts) {
      if (count > 1) duplicateIds.add(id);
    }
    const initialSnapshot = manifest.initialSnapshot;
    const limitViolation =
      limitResult.clamped ||
      manifest.resourceExceeded ||
      operationsValue.length > limits.maxOperations ||
      initialSnapshot.files.length > limits.maxWorkspaceEntries ||
      initialSnapshot.files.reduce((sum, file) => sum + file.bytes, 0) >
        limits.maxWorkspaceBytes;
    const partial: ParsedPlan = {
      planId,
      candidate,
      manifest: manifest.manifest,
      initialSnapshot,
      beforeHash: hashSnapshot(initialSnapshot),
      planHash: "",
      operations,
      submittedOperationCount: operationsValue.length,
      limits,
      limitViolation,
      duplicateIds,
    };
    return {
      ...partial,
      planHash: hashValue(planHashView(partial)),
    };
  } catch {
    return null;
  }
}

function parseEffect(value: unknown): SimulationEffect | null {
  if (!isRecord(value)) return null;
  const kind = value["kind"];
  const target = readString(
    value,
    "target",
    M39_SIMULATION_LIMITS.maxTextLength,
  );
  const blocked = value["blocked"];
  if (
    typeof kind !== "string" ||
    !M39_FORBIDDEN_SIDE_EFFECTS.includes(kind as M39ForbiddenSideEffect) ||
    target === null ||
    typeof blocked !== "boolean"
  ) {
    return null;
  }
  return { kind: kind as M39ForbiddenSideEffect, target, blocked };
}

function parseEffects(value: unknown): readonly SimulationEffect[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const effects: SimulationEffect[] = [];
  const limit = Math.min(value.length, M39_SIMULATION_LIMITS.maxEvidenceItems);
  for (let index = 0; index < limit; index += 1) {
    const effect = parseEffect(value[index]);
    if (effect === null) return null;
    effects.push(effect);
  }
  return effects;
}

function parseReason(value: unknown): M39SimulationReason | null {
  return typeof value === "string" && REASONS.has(value as M39SimulationReason)
    ? (value as M39SimulationReason)
    : null;
}

function parseOperationResult(
  value: unknown,
): M39SimulationOperationResult | null {
  if (!isRecord(value)) return null;
  const operationId =
    value["operationId"] === null
      ? null
      : readString(value, "operationId", M39_SIMULATION_LIMITS.maxIdLength);
  const operationKind =
    value["operationKind"] === null
      ? null
      : readString(value, "operationKind", M39_SIMULATION_LIMITS.maxTextLength);
  const outcome = value["outcome"];
  const reason = parseReason(value["reason"]);
  const durationMs = value["durationMs"];
  const outputBytes = value["outputBytes"];
  const effectKindsValue = value["effectKinds"];
  const withinResourceBudget = value["withinResourceBudget"];
  if (
    (value["operationId"] !== null && operationId === null) ||
    (value["operationKind"] !== null && operationKind === null) ||
    (outcome !== "COMPLETE" &&
      outcome !== "PARTIAL" &&
      outcome !== "TIMED_OUT" &&
      outcome !== "CANCELLED" &&
      outcome !== "UNSUPPORTED" &&
      outcome !== "FORBIDDEN" &&
      outcome !== "UNKNOWN") ||
    reason === null ||
    !isSafeInteger(durationMs) ||
    !isSafeInteger(outputBytes) ||
    !Array.isArray(effectKindsValue) ||
    typeof withinResourceBudget !== "boolean"
  ) {
    return null;
  }
  const effectKinds: M39ForbiddenSideEffect[] = [];
  for (const effect of effectKindsValue) {
    if (
      typeof effect !== "string" ||
      !M39_FORBIDDEN_SIDE_EFFECTS.includes(effect as M39ForbiddenSideEffect) ||
      effectKinds.includes(effect as M39ForbiddenSideEffect)
    ) {
      return null;
    }
    effectKinds.push(effect as M39ForbiddenSideEffect);
  }
  const overlayValue = value["overlay"];
  const parsedOverlay =
    overlayValue === undefined ? null : parseOverlay(overlayValue);
  if (overlayValue !== undefined && parsedOverlay === null) {
    return null;
  }
  return {
    operationId,
    operationKind,
    outcome,
    reason,
    durationMs,
    outputBytes,
    effectKinds: effectKinds.sort(compareText),
    withinResourceBudget,
    ...(parsedOverlay === null ? {} : { overlay: parsedOverlay.overlay }),
  };
}

function uniqueEffectKinds(
  effects: readonly SimulationEffect[],
): readonly M39ForbiddenSideEffect[] {
  return [...new Set(effects.map((effect) => effect.kind))].sort(compareText);
}

function aggregateEffects(
  effects: readonly SimulationEffect[],
): readonly SimulationEffect[] {
  const byKey = new Map<string, SimulationEffect>();
  for (const effect of effects) {
    const key = `${effect.kind}\u0000${effect.target}\u0000${effect.blocked}`;
    if (!byKey.has(key)) byKey.set(key, effect);
  }
  return [...byKey.values()].sort((left, right) =>
    compareText(
      `${left.kind}\u0000${left.target}\u0000${left.blocked}`,
      `${right.kind}\u0000${right.target}\u0000${right.blocked}`,
    ),
  );
}

function aggregateDuration(values: readonly number[], limit: number): number {
  let total = 0;
  for (const value of values) {
    if (value > limit || total > limit || value > limit - total) {
      return limit + 1;
    }
    total += value;
  }
  return total;
}

function aggregateBytes(values: readonly number[], limit: number): number {
  let total = 0;
  for (const value of values) {
    if (value > limit || total > limit || value > limit - total) {
      return limit + 1;
    }
    total += value;
  }
  return total;
}

function reportCore(input: {
  readonly inputState: M39SimulationReport["inputState"];
  readonly planId: string | null;
  readonly candidate: SimulationCandidate | null;
  readonly outcome: M39SimulationOutcome;
  readonly reason: M39SimulationReason;
  readonly beforeHash: string | null;
  readonly afterHash: string | null;
  readonly planHash: string | null;
  readonly operations: readonly M39SimulationOperationResult[];
  readonly submittedOperationCount: number;
  readonly processedOperationCount: number;
  readonly unprocessedOperationCount: number;
  readonly duplicateOperationCount: number;
  readonly resourceState: M39SimulationReport["resourceState"];
  readonly evidenceState: M39SimulationReport["evidenceState"];
  readonly forbiddenEffects: readonly M39ForbiddenSideEffect[];
  readonly recovery: M39SimulationReport["recovery"];
}): M39SimulationReport {
  const core = {
    schemaVersion: M39_SIMULATION_SCHEMA,
    ...input,
    replayHash: "",
    hostWorkspaceMutated: false as const,
    canPromoteTrust: false as const,
    canCertifyRelease: false as const,
    trustEffect: M39_SIMULATION_TRUST_POLICY.effect,
  };
  return {
    ...core,
    replayHash: hashValue({ ...core, replayHash: null }),
  };
}

function invalidReport(
  reason: M39SimulationReason,
  plan?: ParsedPlan,
): M39SimulationReport {
  return reportCore({
    inputState: "MALFORMED",
    planId: plan?.planId ?? null,
    candidate: plan?.candidate ?? null,
    outcome: "UNKNOWN",
    reason,
    beforeHash: plan?.beforeHash ?? null,
    afterHash: plan?.beforeHash ?? null,
    planHash: plan?.planHash ?? null,
    operations: [],
    submittedOperationCount: plan?.submittedOperationCount ?? 0,
    processedOperationCount: 0,
    unprocessedOperationCount: plan?.submittedOperationCount ?? 0,
    duplicateOperationCount: plan?.duplicateIds.size ?? 0,
    resourceState: "UNDETERMINED",
    evidenceState: "MALFORMED",
    forbiddenEffects: EMPTY_EFFECTS,
    recovery: "RESTART_REQUIRED",
  });
}

function operationResult(
  operation: ParsedOperation,
  outcome: M39SimulationOperationState,
  reason: M39SimulationReason,
  durationMs = 0,
  outputBytes = 0,
  effects: readonly M39ForbiddenSideEffect[] = EMPTY_EFFECTS,
  withinResourceBudget = true,
  overlay?: SimulationWorkspaceOverlay,
): M39SimulationOperationResult {
  return {
    operationId: operation.id,
    operationKind: operation.kind,
    outcome,
    reason,
    durationMs,
    outputBytes,
    effectKinds: [...effects].sort(compareText),
    withinResourceBudget,
    ...(overlay === undefined ? {} : { overlay }),
  };
}

function safeWorkspaceForExecutor(
  snapshot: SimulationWorkspaceSnapshot,
): SimulationWorkspaceSnapshot {
  return {
    schemaVersion: 1,
    rootId: snapshot.rootId,
    files: sortFiles(snapshot.files).map((file) => ({ ...file })),
  };
}

function attemptWrite(path: string): SimulationEffect {
  return { kind: "WRITE_WORKSPACE", target: path, blocked: true };
}

function attemptNetwork(target: string): SimulationEffect {
  return { kind: "NETWORK", target, blocked: true };
}

async function executeWithDeadline(
  executor: SimulationExecutor | undefined,
  operation: SimulationOperation,
  context: SimulationExecutionContext,
  timeoutMs: number,
  signal: AbortSignal | undefined,
): Promise<RunnerExecution> {
  if (executor === undefined) return { kind: "error", value: "NO_EXECUTOR" };
  if (signal?.aborted === true) return { kind: "cancelled" };
  if (timeoutMs === 0) return { kind: "timeout" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abortListener: (() => void) | undefined;
  const timeout = new Promise<RunnerExecution>((resolve) => {
    timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
  });
  const cancellation =
    signal === undefined
      ? new Promise<RunnerExecution>(() => undefined)
      : new Promise<RunnerExecution>((resolve) => {
          abortListener = () => resolve({ kind: "cancelled" });
          signal.addEventListener("abort", abortListener, { once: true });
        });
  const execution = Promise.resolve()
    .then(() => executor(operation, context))
    .then(
      (value): RunnerExecution => ({ kind: "execution", value }),
      (): RunnerExecution => ({ kind: "error" }),
    );
  try {
    return await Promise.race([execution, timeout, cancellation]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (signal !== undefined && abortListener !== undefined) {
      signal.removeEventListener("abort", abortListener);
    }
  }
}

function normalizeExecution(value: unknown): {
  readonly result: SimulationExecution | null;
  readonly malformed: boolean;
} {
  if (!isRecord(value)) return { result: null, malformed: true };
  try {
    const statusValue = value["status"];
    const status =
      statusValue === "COMPLETED"
        ? "COMPLETE"
        : statusValue === "COMPLETE" ||
            statusValue === "PARTIAL" ||
            statusValue === "TIMED_OUT" ||
            statusValue === "CANCELLED" ||
            statusValue === "UNSUPPORTED" ||
            statusValue === "UNKNOWN"
          ? statusValue
          : null;
    const durationMs = value["durationMs"];
    const outputBytes = value["outputBytes"];
    const effects = parseEffects(value["effects"]);
    if (
      status === null ||
      !isSafeInteger(durationMs) ||
      !isSafeInteger(outputBytes) ||
      effects === null
    ) {
      return { result: null, malformed: true };
    }
    const overlayValue = value["overlay"];
    if (overlayValue === undefined) {
      return {
        result: { status, durationMs, outputBytes, effects },
        malformed: false,
      };
    }
    const parsedOverlay = parseOverlay(overlayValue);
    if (parsedOverlay === null) return { result: null, malformed: true };
    return {
      result: {
        status,
        durationMs,
        outputBytes,
        overlay: parsedOverlay.overlay,
        effects,
      },
      malformed: false,
    };
  } catch {
    return { result: null, malformed: true };
  }
}

function applyExecutionOverlay(
  snapshot: SimulationWorkspaceSnapshot,
  overlay: SimulationWorkspaceOverlay | undefined,
  limits: SimulationResourceLimits,
): {
  readonly snapshot: SimulationWorkspaceSnapshot;
  readonly exceeded: boolean;
} {
  if (overlay === undefined) return { snapshot, exceeded: false };
  const next = applyOverlay(snapshot, overlay);
  const bytes = next.files.reduce((sum, file) => sum + file.bytes, 0);
  return {
    snapshot: next,
    exceeded:
      next.files.length > limits.maxWorkspaceEntries ||
      bytes > limits.maxWorkspaceBytes,
  };
}

function evidenceExecution(
  results: readonly M39SimulationOperationResult[],
): M39SimulationEvidence["execution"] {
  if (results.some((item) => item.outcome === "TIMED_OUT")) return "TIMED_OUT";
  if (results.some((item) => item.outcome === "CANCELLED")) return "CANCELLED";
  if (results.some((item) => item.outcome === "PARTIAL")) return "PARTIAL";
  if (
    results.some(
      (item) =>
        item.outcome === "UNKNOWN" ||
        item.outcome === "UNSUPPORTED" ||
        item.outcome === "FORBIDDEN",
    )
  ) {
    return "UNKNOWN";
  }
  return "COMPLETE";
}

function evidenceFromResults(
  parsed: ParsedPlan,
  results: readonly M39SimulationOperationResult[],
  beforeHash: string,
  afterHash: string,
  capturedAt: string,
): M39SimulationEvidence {
  const effects: SimulationEffect[] = [];
  for (const result of results) {
    for (const kind of result.effectKinds) {
      effects.push({ kind, target: "simulation", blocked: true });
    }
  }
  const execution = evidenceExecution(results);
  const complete =
    execution === "COMPLETE" &&
    results.every((item) => item.withinResourceBudget);
  return {
    schemaVersion: M39_SIMULATION_SCHEMA,
    id: `${parsed.planId.slice(0, 100)}:${parsed.planHash.slice(-16)}`,
    planId: parsed.planId,
    planHash: parsed.planHash,
    candidate: parsed.candidate,
    capturedAt,
    beforeHash,
    afterHash,
    completeness: complete ? "COMPLETE" : "PARTIAL",
    execution,
    operationIds: results
      .map((item) => item.operationId)
      .filter((id): id is string => id !== null)
      .sort(compareText),
    observations: results,
    durationMs: aggregateDuration(
      results.map((item) => item.durationMs),
      parsed.limits.maxTotalDurationMs,
    ),
    outputBytes: aggregateBytes(
      results.map((item) => item.outputBytes),
      parsed.limits.maxOutputBytes,
    ),
    effects: aggregateEffects(effects),
  };
}

function parseEvidence(
  value: unknown,
  parsed: ParsedPlan,
  evaluatedAtMs: number,
): ParsedEvidence {
  try {
    if (!isRecord(value)) {
      return { evidence: null, state: "ABSENT", reason: "EVIDENCE_MALFORMED" };
    }
    if (value["schemaVersion"] !== M39_SIMULATION_SCHEMA) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    const id = readString(value, "id", M39_SIMULATION_LIMITS.maxIdLength);
    const planId = readString(
      value,
      "planId",
      M39_SIMULATION_LIMITS.maxIdLength,
    );
    const planHash = value["planHash"];
    const candidate = parseCandidate(value["candidate"]);
    const capturedAt = readString(value, "capturedAt", 64);
    const beforeHash = value["beforeHash"];
    const afterHash = value["afterHash"];
    const completeness = value["completeness"];
    const execution = value["execution"];
    const operationIdsValue = value["operationIds"];
    const observationsValue = value["observations"];
    const durationMs = value["durationMs"];
    const outputBytes = value["outputBytes"];
    const effects = parseEffects(value["effects"]);
    if (
      id === null ||
      planId === null ||
      !isHash(planHash) ||
      candidate === null ||
      capturedAt === null ||
      !isHash(beforeHash) ||
      !isHash(afterHash) ||
      (completeness !== "COMPLETE" && completeness !== "PARTIAL") ||
      (execution !== "COMPLETE" &&
        execution !== "PARTIAL" &&
        execution !== "TIMED_OUT" &&
        execution !== "CANCELLED" &&
        execution !== "UNKNOWN") ||
      !Array.isArray(operationIdsValue) ||
      !Array.isArray(observationsValue) ||
      observationsValue.length > parsed.limits.maxEvidenceItems ||
      !isSafeInteger(durationMs) ||
      !isSafeInteger(outputBytes) ||
      effects === null
    ) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    if (planId !== parsed.planId || candidate === null) {
      return { evidence: null, state: "FOREIGN", reason: "EVIDENCE_FOREIGN" };
    }
    if (
      candidate.candidateId !== parsed.candidate.candidateId ||
      candidate.repositoryId !== parsed.candidate.repositoryId ||
      candidate.headSha !== parsed.candidate.headSha ||
      candidate.graphDigest !== parsed.candidate.graphDigest
    ) {
      return { evidence: null, state: "FOREIGN", reason: "EVIDENCE_FOREIGN" };
    }
    if (planHash !== parsed.planHash) {
      return { evidence: null, state: "STALE", reason: "EVIDENCE_STALE" };
    }
    const capturedAtMs = parseTimestamp(capturedAt);
    if (capturedAtMs === null) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    if (capturedAtMs > evaluatedAtMs) {
      return { evidence: null, state: "FUTURE", reason: "EVIDENCE_FUTURE" };
    }
    if (evaluatedAtMs - capturedAtMs > parsed.limits.maxEvidenceAgeMs) {
      return { evidence: null, state: "STALE", reason: "EVIDENCE_STALE" };
    }
    const operationIds: string[] = [];
    for (const operationId of operationIdsValue) {
      if (
        typeof operationId !== "string" ||
        operationId.length === 0 ||
        operationId.length > M39_SIMULATION_LIMITS.maxIdLength ||
        operationIds.includes(operationId)
      ) {
        return {
          evidence: null,
          state: "MALFORMED",
          reason: "EVIDENCE_MALFORMED",
        };
      }
      operationIds.push(operationId);
    }
    const observations: M39SimulationOperationResult[] = [];
    for (const observationValue of observationsValue) {
      const observation = parseOperationResult(observationValue);
      if (observation === null) {
        return {
          evidence: null,
          state: "MALFORMED",
          reason: "EVIDENCE_MALFORMED",
        };
      }
      observations.push(observation);
    }
    const expectedIds = parsed.operations
      .map((operation) => operation.id)
      .filter((id): id is string => id !== null)
      .sort(compareText);
    if (
      operationIds.length !== expectedIds.length ||
      operationIds.slice().sort(compareText).join("\u0000") !==
        expectedIds.join("\u0000")
    ) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    const observationIds = observations
      .map((item) => item.operationId)
      .filter((id): id is string => id !== null)
      .sort(compareText);
    if (
      observationIds.length !== expectedIds.length ||
      observationIds.join("\u0000") !== expectedIds.join("\u0000")
    ) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    for (const observation of observations) {
      const operation = parsed.operations.find(
        (item) => item.id === observation.operationId,
      );
      if (
        operation === undefined ||
        operation.kind === null ||
        observation.operationKind !== operation.kind ||
        (observation.outcome === "COMPLETE" &&
          (observation.reason !== "REPRODUCIBLE" ||
            observation.effectKinds.length > 0))
      ) {
        return {
          evidence: null,
          state: "MALFORMED",
          reason: "EVIDENCE_MALFORMED",
        };
      }
    }
    const expectedExecution = evidenceExecution(observations);
    if (execution !== expectedExecution) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    const expectedComplete =
      expectedExecution === "COMPLETE" &&
      observations.every((item) => item.withinResourceBudget);
    if (completeness !== (expectedComplete ? "COMPLETE" : "PARTIAL")) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    if (
      durationMs !==
        aggregateDuration(
          observations.map((item) => item.durationMs),
          parsed.limits.maxTotalDurationMs,
        ) ||
      outputBytes !==
        aggregateBytes(
          observations.map((item) => item.outputBytes),
          parsed.limits.maxOutputBytes,
        )
    ) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "EVIDENCE_MALFORMED",
      };
    }
    if (beforeHash !== parsed.beforeHash) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "WORKSPACE_MUTATED",
      };
    }
    let finalSnapshot = parsed.initialSnapshot;
    if (expectedExecution === "COMPLETE") {
      for (const observation of observations) {
        const operation = parsed.operations.find(
          (item) => item.id === observation.operationId,
        );
        if (operation === undefined || operation.operation === null) {
          return {
            evidence: null,
            state: "MALFORMED",
            reason: "EVIDENCE_MALFORMED",
          };
        }
        const overlay = isRecord(observation)
          ? parseOverlay(observation["overlay"])
          : null;
        if (overlay !== null) {
          finalSnapshot = applyOverlay(finalSnapshot, overlay.overlay);
        }
      }
      if (
        finalSnapshot.files.length > parsed.limits.maxWorkspaceEntries ||
        finalSnapshot.files.reduce((sum, file) => sum + file.bytes, 0) >
          parsed.limits.maxWorkspaceBytes
      ) {
        return { evidence: null, state: "PARTIAL", reason: "RESOURCE_LIMIT" };
      }
      if (afterHash !== hashSnapshot(finalSnapshot)) {
        return {
          evidence: null,
          state: "MALFORMED",
          reason: "EVIDENCE_MALFORMED",
        };
      }
    } else if (afterHash !== beforeHash) {
      return {
        evidence: null,
        state: "MALFORMED",
        reason: "WORKSPACE_MUTATED",
      };
    }
    const evidence: M39SimulationEvidence = {
      schemaVersion: M39_SIMULATION_SCHEMA,
      id,
      planId,
      planHash,
      candidate,
      capturedAt,
      beforeHash,
      afterHash,
      completeness,
      execution,
      operationIds: [...operationIds].sort(compareText),
      observations: [...observations].sort((left, right) =>
        compareText(left.operationId ?? "", right.operationId ?? ""),
      ),
      durationMs,
      outputBytes,
      effects,
    };
    return { evidence, state: "CURRENT", reason: "REPRODUCIBLE" };
  } catch {
    return { evidence: null, state: "MALFORMED", reason: "EVIDENCE_MALFORMED" };
  }
}

function classifyEvaluation(
  parsed: ParsedPlan,
  parsedEvidence: ParsedEvidence,
): {
  readonly outcome: M39SimulationOutcome;
  readonly reason: M39SimulationReason;
  readonly evidence: M39SimulationEvidence | null;
  readonly resourceState: M39SimulationReport["resourceState"];
  readonly forbiddenEffects: readonly M39ForbiddenSideEffect[];
} {
  if (parsedEvidence.evidence === null) {
    if (parsedEvidence.state === "PARTIAL") {
      return {
        outcome: "PARTIAL",
        reason:
          parsedEvidence.reason === "NO_OPERATIONS"
            ? "NO_OPERATIONS"
            : parsedEvidence.reason === "RESOURCE_LIMIT"
              ? "RESOURCE_LIMIT"
              : "EVIDENCE_PARTIAL",
        evidence: null,
        resourceState:
          parsedEvidence.reason === "RESOURCE_LIMIT"
            ? "EXCEEDED"
            : "UNDETERMINED",
        forbiddenEffects: EMPTY_EFFECTS,
      };
    }
    return {
      outcome: "UNKNOWN",
      reason: parsedEvidence.reason,
      evidence: null,
      resourceState: "UNDETERMINED",
      forbiddenEffects: EMPTY_EFFECTS,
    };
  }
  const evidence = parsedEvidence.evidence;
  const forbiddenEffects = uniqueEffectKinds(evidence.effects);
  const operationForbidden = evidence.observations.some(
    (item) => item.outcome === "FORBIDDEN" || item.effectKinds.length > 0,
  );
  const operationUnsupported = evidence.observations.some(
    (item) => item.outcome === "UNSUPPORTED",
  );
  const operationFailure = evidence.observations.some(
    (item) =>
      item.outcome === "PARTIAL" ||
      item.outcome === "TIMED_OUT" ||
      item.outcome === "CANCELLED" ||
      item.outcome === "UNKNOWN" ||
      !item.withinResourceBudget,
  );
  const workspaceExceeded =
    parsed.limitViolation ||
    evidence.durationMs > parsed.limits.maxTotalDurationMs ||
    evidence.outputBytes > parsed.limits.maxOutputBytes ||
    evidence.observations.length > parsed.limits.maxEvidenceItems;
  if (parsed.duplicateIds.size > 0) {
    return {
      outcome: "UNKNOWN",
      reason: "DUPLICATE_OPERATION",
      evidence,
      resourceState: workspaceExceeded ? "EXCEEDED" : "WITHIN_BOUNDS",
      forbiddenEffects,
    };
  }
  if (operationForbidden) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "FORBIDDEN_SIDE_EFFECT",
      evidence,
      resourceState: workspaceExceeded ? "EXCEEDED" : "WITHIN_BOUNDS",
      forbiddenEffects,
    };
  }
  if (operationUnsupported) {
    return {
      outcome: "INCONCLUSIVE",
      reason: "UNSUPPORTED_OPERATION",
      evidence,
      resourceState: workspaceExceeded ? "EXCEEDED" : "WITHIN_BOUNDS",
      forbiddenEffects,
    };
  }
  if (workspaceExceeded) {
    return {
      outcome: "PARTIAL",
      reason: "RESOURCE_LIMIT",
      evidence,
      resourceState: "EXCEEDED",
      forbiddenEffects,
    };
  }
  if (operationFailure) {
    return {
      outcome: evidence.observations.some((item) => item.outcome === "UNKNOWN")
        ? "UNKNOWN"
        : "PARTIAL",
      reason:
        evidence.observations.find((item) => item.reason !== "REPRODUCIBLE")
          ?.reason ?? "EVIDENCE_PARTIAL",
      evidence,
      resourceState: "WITHIN_BOUNDS",
      forbiddenEffects,
    };
  }
  return {
    outcome: "REPRODUCIBLE",
    reason: "REPRODUCIBLE",
    evidence,
    resourceState: "WITHIN_BOUNDS",
    forbiddenEffects,
  };
}

function buildEvaluationReport(
  parsed: ParsedPlan,
  parsedEvidence: ParsedEvidence,
): M39SimulationReport {
  const classification = classifyEvaluation(parsed, parsedEvidence);
  const evidence = classification.evidence;
  const operations = evidence?.observations ?? [];
  const afterHash = evidence?.afterHash ?? parsed.beforeHash;
  const resourceState = classification.resourceState;
  const unprocessed = Math.max(
    0,
    parsed.submittedOperationCount - operations.length,
  );
  const recovery =
    classification.outcome === "REPRODUCIBLE" ? "NOT_REQUIRED" : "RETRYABLE";
  return reportCore({
    inputState: parsedEvidence.state === "MALFORMED" ? "MALFORMED" : "VALID",
    planId: parsed.planId,
    candidate: parsed.candidate,
    outcome: classification.outcome,
    reason: classification.reason,
    beforeHash: parsed.beforeHash,
    afterHash,
    planHash: parsed.planHash,
    operations,
    submittedOperationCount: parsed.submittedOperationCount,
    processedOperationCount: operations.length,
    unprocessedOperationCount: unprocessed,
    duplicateOperationCount: parsed.duplicateIds.size,
    resourceState,
    evidenceState:
      parsedEvidence.state === "CURRENT" ? "CURRENT" : parsedEvidence.state,
    forbiddenEffects: classification.forbiddenEffects,
    recovery,
  });
}

export function createM39CopyOnWriteWorkspace(
  snapshotValue: unknown,
  overlayValue: unknown = { upserts: [], deletes: [] },
): CopyOnWriteWorkspaceManifest | null {
  const snapshot = parseSnapshot(snapshotValue);
  const overlay = parseOverlay(overlayValue);
  if (snapshot === null || overlay === null) return null;
  return {
    schemaVersion: 1,
    base: snapshot.snapshot,
    overlay: overlay.overlay,
  };
}

export function hashM39Workspace(value: unknown): string | null {
  const manifest = parseManifest(value);
  if (manifest === null) return null;
  return hashSnapshot(manifest.initialSnapshot);
}

export function evaluateM39Simulation(
  planValue: unknown,
  evidenceValue: unknown,
  evaluatedAtValue: unknown = DEFAULT_TIMESTAMP,
): M39SimulationReport {
  const parsed = parsePlan(planValue);
  if (parsed === null) return invalidReport("PLAN_MALFORMED");
  const evaluatedAtMs = parseTimestamp(evaluatedAtValue);
  if (evaluatedAtMs === null) {
    return buildEvaluationReport(parsed, {
      evidence: null,
      state: "MALFORMED",
      reason: "EVIDENCE_MALFORMED",
    });
  }
  const parsedEvidence = parseEvidence(evidenceValue, parsed, evaluatedAtMs);
  return buildEvaluationReport(parsed, parsedEvidence);
}

export async function runM39Simulation(
  planValue: unknown,
  executor?: SimulationExecutor,
  options: SimulationRunOptions = {},
): Promise<M39SimulationReport> {
  const parsed = parsePlan(planValue);
  if (parsed === null) return invalidReport("PLAN_MALFORMED");
  if (parsed.submittedOperationCount === 0) {
    return buildEvaluationReport(parsed, {
      evidence: null,
      state: "PARTIAL",
      reason: "NO_OPERATIONS",
    });
  }
  const capturedAt = options.capturedAt ?? DEFAULT_TIMESTAMP;
  const evaluatedAt = options.evaluatedAt ?? capturedAt;
  const workspace = safeWorkspaceForExecutor(parsed.initialSnapshot);
  const effectAttempts: SimulationEffect[] = [];
  const makeContext = (
    snapshot: SimulationWorkspaceSnapshot,
  ): SimulationExecutionContext => {
    const safeSnapshot = safeWorkspaceForExecutor(snapshot);
    return {
      workspace: safeSnapshot,
      planHash: parsed.planHash,
      signal: options.signal,
      readFile: (path) => {
        const normalized = normalizePath(path);
        return normalized === null
          ? undefined
          : safeSnapshot.files.find((file) => file.path === normalized);
      },
      attemptWrite: (path) => {
        const effect = attemptWrite(path);
        effectAttempts.push(effect);
        return effect;
      },
      attemptNetwork: (target) => {
        const effect = attemptNetwork(target);
        effectAttempts.push(effect);
        return effect;
      },
    };
  };
  const results: M39SimulationOperationResult[] = [];
  let currentSnapshot = workspace;
  const drainEffectAttempts = (): readonly SimulationEffect[] =>
    effectAttempts.splice(0);
  let stopReason: M39SimulationReason | null = null;
  let stopOutcome: M39SimulationOperationState | null = null;
  const forbiddenEffects: M39ForbiddenSideEffect[] = [];
  for (const operation of parsed.operations) {
    if (stopReason !== null) break;
    if (operation.id !== null && parsed.duplicateIds.has(operation.id)) {
      results.push(
        operationResult(operation, "UNKNOWN", "DUPLICATE_OPERATION"),
      );
      stopReason = "DUPLICATE_OPERATION";
      stopOutcome = "UNKNOWN";
      break;
    }
    if (operation.unsupported) {
      results.push(
        operationResult(operation, "UNSUPPORTED", "UNSUPPORTED_OPERATION"),
      );
      stopReason = "UNSUPPORTED_OPERATION";
      stopOutcome = "UNSUPPORTED";
      break;
    }
    if (operation.malformed || operation.operation === null) {
      results.push(
        operationResult(operation, "UNKNOWN", "OPERATION_MALFORMED"),
      );
      stopReason = "OPERATION_MALFORMED";
      stopOutcome = "UNKNOWN";
      break;
    }
    if (executor === undefined) {
      results.push(operationResult(operation, "UNSUPPORTED", "NO_EXECUTOR"));
      stopReason = "NO_EXECUTOR";
      stopOutcome = "UNSUPPORTED";
      break;
    }
    const timeoutMs = Math.min(
      operation.timeoutMs ?? parsed.limits.maxOperationDurationMs,
      parsed.limits.maxOperationDurationMs,
    );
    const executionResult = await executeWithDeadline(
      executor,
      operation.operation,
      makeContext(currentSnapshot),
      timeoutMs,
      options.signal,
    );
    if (executionResult.kind === "cancelled") {
      const effects = drainEffectAttempts();
      if (effects.length > 0) {
        const effectKinds = uniqueEffectKinds(effects);
        forbiddenEffects.push(...effectKinds);
        results.push(
          operationResult(
            operation,
            "FORBIDDEN",
            "FORBIDDEN_SIDE_EFFECT",
            0,
            0,
            effectKinds,
            false,
          ),
        );
        stopReason = "FORBIDDEN_SIDE_EFFECT";
        stopOutcome = "FORBIDDEN";
        break;
      }
      results.push(operationResult(operation, "CANCELLED", "CANCELLED"));
      stopReason = "CANCELLED";
      stopOutcome = "CANCELLED";
      break;
    }
    if (executionResult.kind === "timeout") {
      const effects = drainEffectAttempts();
      if (effects.length > 0) {
        const effectKinds = uniqueEffectKinds(effects);
        forbiddenEffects.push(...effectKinds);
        results.push(
          operationResult(
            operation,
            "FORBIDDEN",
            "FORBIDDEN_SIDE_EFFECT",
            timeoutMs,
            0,
            effectKinds,
            false,
          ),
        );
        stopReason = "FORBIDDEN_SIDE_EFFECT";
        stopOutcome = "FORBIDDEN";
        break;
      }
      results.push(
        operationResult(
          operation,
          "TIMED_OUT",
          "TIMEOUT",
          timeoutMs,
          0,
          EMPTY_EFFECTS,
          true,
        ),
      );
      stopReason = "TIMEOUT";
      stopOutcome = "TIMED_OUT";
      break;
    }
    if (executionResult.kind === "error") {
      const effects = drainEffectAttempts();
      if (effects.length > 0) {
        const effectKinds = uniqueEffectKinds(effects);
        forbiddenEffects.push(...effectKinds);
        results.push(
          operationResult(
            operation,
            "FORBIDDEN",
            "FORBIDDEN_SIDE_EFFECT",
            0,
            0,
            effectKinds,
            false,
          ),
        );
        stopReason = "FORBIDDEN_SIDE_EFFECT";
        stopOutcome = "FORBIDDEN";
        break;
      }
      const reason =
        executionResult.value === "NO_EXECUTOR"
          ? "NO_EXECUTOR"
          : "EXECUTION_ERROR";
      results.push(
        operationResult(
          operation,
          reason === "NO_EXECUTOR" ? "UNSUPPORTED" : "UNKNOWN",
          reason,
        ),
      );
      stopReason = reason;
      stopOutcome = reason === "NO_EXECUTOR" ? "UNSUPPORTED" : "UNKNOWN";
      break;
    }
    const normalized = normalizeExecution(executionResult.value);
    if (normalized.result === null) {
      results.push(
        operationResult(operation, "UNKNOWN", "OPERATION_MALFORMED"),
      );
      stopReason = "OPERATION_MALFORMED";
      stopOutcome = "UNKNOWN";
      break;
    }
    const execution = normalized.result;
    const effects = [...drainEffectAttempts(), ...(execution.effects ?? [])];
    const effectKinds = uniqueEffectKinds(effects);
    if (effectKinds.length > 0) {
      forbiddenEffects.push(...effectKinds);
      results.push(
        operationResult(
          operation,
          "FORBIDDEN",
          "FORBIDDEN_SIDE_EFFECT",
          execution.durationMs,
          execution.outputBytes,
          effectKinds,
          false,
        ),
      );
      stopReason = "FORBIDDEN_SIDE_EFFECT";
      stopOutcome = "FORBIDDEN";
      break;
    }
    if (execution.durationMs > parsed.limits.maxOperationDurationMs) {
      results.push(
        operationResult(
          operation,
          "PARTIAL",
          "RESOURCE_LIMIT",
          execution.durationMs,
          execution.outputBytes,
          effectKinds,
          false,
        ),
      );
      stopReason = "RESOURCE_LIMIT";
      stopOutcome = "PARTIAL";
      break;
    }
    if (execution.outputBytes > parsed.limits.maxOutputBytes) {
      results.push(
        operationResult(
          operation,
          "PARTIAL",
          "RESOURCE_LIMIT",
          execution.durationMs,
          execution.outputBytes,
          effectKinds,
          false,
        ),
      );
      stopReason = "RESOURCE_LIMIT";
      stopOutcome = "PARTIAL";
      break;
    }
    if (execution.status !== "COMPLETE") {
      const outcome =
        execution.status === "PARTIAL"
          ? "PARTIAL"
          : execution.status === "TIMED_OUT"
            ? "TIMED_OUT"
            : execution.status === "CANCELLED"
              ? "CANCELLED"
              : execution.status === "UNSUPPORTED"
                ? "UNSUPPORTED"
                : "UNKNOWN";
      const reason =
        execution.status === "PARTIAL"
          ? "PARTIAL_EXECUTION"
          : execution.status === "TIMED_OUT"
            ? "TIMEOUT"
            : execution.status === "CANCELLED"
              ? "CANCELLED"
              : execution.status === "UNSUPPORTED"
                ? "UNSUPPORTED_OPERATION"
                : "EXECUTION_ERROR";
      results.push(
        operationResult(
          operation,
          outcome,
          reason,
          execution.durationMs,
          execution.outputBytes,
        ),
      );
      stopReason = reason;
      stopOutcome = outcome;
      break;
    }
    const applied = applyExecutionOverlay(
      currentSnapshot,
      execution.overlay,
      parsed.limits,
    );
    if (applied.exceeded) {
      results.push(
        operationResult(
          operation,
          "PARTIAL",
          "RESOURCE_LIMIT",
          execution.durationMs,
          execution.outputBytes,
          effectKinds,
          false,
        ),
      );
      stopReason = "RESOURCE_LIMIT";
      stopOutcome = "PARTIAL";
      break;
    }
    currentSnapshot = applied.snapshot;
    results.push(
      operationResult(
        operation,
        "COMPLETE",
        "REPRODUCIBLE",
        execution.durationMs,
        execution.outputBytes,
        EMPTY_EFFECTS,
        true,
        execution.overlay,
      ),
    );
  }
  if (stopReason !== null) {
    const unprocessedOutcome: M39SimulationOperationState =
      stopOutcome === "FORBIDDEN"
        ? "FORBIDDEN"
        : stopOutcome === "UNSUPPORTED"
          ? "UNSUPPORTED"
          : stopOutcome === "UNKNOWN"
            ? "UNKNOWN"
            : "PARTIAL";
    const unprocessedReason: M39SimulationReason =
      unprocessedOutcome === "FORBIDDEN"
        ? "FORBIDDEN_SIDE_EFFECT"
        : unprocessedOutcome === "UNSUPPORTED"
          ? "UNSUPPORTED_OPERATION"
          : unprocessedOutcome === "UNKNOWN"
            ? (stopReason ?? "EXECUTION_ERROR")
            : stopReason === "RESOURCE_LIMIT"
              ? "RESOURCE_LIMIT"
              : "PARTIAL_EXECUTION";
    for (const operation of parsed.operations.slice(results.length)) {
      results.push(
        operationResult(operation, unprocessedOutcome, unprocessedReason),
      );
    }
  }
  if (parsed.limitViolation) {
    stopReason = "RESOURCE_LIMIT";
  }
  const afterHash =
    stopReason === null ? hashSnapshot(currentSnapshot) : parsed.beforeHash;
  const evidence = evidenceFromResults(
    parsed,
    results,
    parsed.beforeHash,
    afterHash,
    capturedAt,
  );
  const evaluated = evaluateM39Simulation(planValue, evidence, evaluatedAt);
  if (stopReason === null && evaluated.outcome === "REPRODUCIBLE") {
    return evaluated;
  }
  return {
    ...evaluated,
    forbiddenEffects: [
      ...new Set([...forbiddenEffects, ...evaluated.forbiddenEffects]),
    ].sort(compareText),
    unprocessedOperationCount: Math.max(
      evaluated.unprocessedOperationCount,
      parsed.submittedOperationCount - results.length,
    ),
    recovery: "RETRYABLE",
    replayHash: hashValue({
      first: evaluated.replayHash,
      stopReason,
      stopOutcome,
      submitted: parsed.submittedOperationCount,
      processed: results.length,
    }),
  };
}

export async function replayM39Simulation(
  planValue: unknown,
  executor?: SimulationExecutor,
  options: SimulationRunOptions = {},
): Promise<M39SimulationReport> {
  const capturedAt = options.capturedAt ?? DEFAULT_TIMESTAMP;
  const first = await runM39Simulation(planValue, executor, {
    ...options,
    capturedAt,
    evaluatedAt: options.evaluatedAt ?? capturedAt,
  });
  const second = await runM39Simulation(planValue, executor, {
    ...options,
    capturedAt,
    evaluatedAt: options.evaluatedAt ?? capturedAt,
  });
  if (
    first.outcome === "REPRODUCIBLE" &&
    first.replayHash === second.replayHash
  ) {
    return {
      ...second,
      outcome: "REPRODUCIBLE",
      reason: "REPRODUCIBLE",
      evidenceState: "CURRENT",
      recovery: "NOT_REQUIRED",
      replayHash: hashValue({
        first: first.replayHash,
        second: second.replayHash,
      }),
    };
  }
  return {
    ...second,
    outcome: "INCONCLUSIVE",
    reason: "REPLAY_MISMATCH",
    recovery: "RETRYABLE",
    replayHash: hashValue({
      first: first.replayHash,
      second: second.replayHash,
    }),
  };
}

export const simulateM39 = runM39Simulation;

export function applyM39SimulationReport(
  previousValue: unknown,
  reportValue: unknown,
): M39SimulationTrustState {
  const previous: M39SimulationTrustState =
    previousValue === "PASS" ||
    previousValue === "PARTIAL" ||
    previousValue === "UNKNOWN"
      ? previousValue
      : "UNKNOWN";
  try {
    const outcome = isRecord(reportValue) ? reportValue["outcome"] : undefined;
    if (outcome === "REPRODUCIBLE") return previous;
    if (outcome === "PARTIAL") {
      return previous === "PASS" ? "PARTIAL" : previous;
    }
    if (outcome === "UNKNOWN" || outcome === "INCONCLUSIVE") {
      return previous === "PASS"
        ? "UNKNOWN"
        : previous === "PARTIAL"
          ? "UNKNOWN"
          : "UNKNOWN";
    }
    return "UNKNOWN";
  } catch {
    return "UNKNOWN";
  }
}
