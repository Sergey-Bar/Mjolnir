import { createHash } from "node:crypto";

import { parseJunitXml } from "../forensics/parse-junit.js";
import { parsePlaywrightJson } from "../forensics/parse-playwright-json.js";
import type {
  ForensicsReport,
  RunStatus,
  TestRecord,
  TestVerdict,
} from "../forensics/types.js";
import { computeAgenticProfile } from "./provenance.js";
import { buildEvidenceGraph, type RunIdentity } from "./run-identity.js";
import type {
  EvidenceEdge,
  EvidenceGraphResult,
  EvidenceNode,
} from "./evidence-graph.js";

export const RUNTIME_EVIDENCE_GRAPH_SCHEMA_VERSION = 1 as const;

export const RUNTIME_EVIDENCE_LIMITS = {
  maxArtifacts: 128,
  maxRecordsPerArtifact: 10_000,
  maxRecords: 100_000,
  maxRawBytes: 8 * 1024 * 1024,
  maxTextLength: 16_384,
  maxPathLength: 1_024,
} as const;

export const RUNTIME_EVIDENCE_FRESHNESS_STATES = [
  "FRESH",
  "STALE",
  "FOREIGN",
  "MALFORMED",
  "CONTRADICTORY",
  "PARTIAL",
  "INVALIDATED",
  "UNKNOWN",
] as const;

export type RuntimeEvidenceFreshnessState =
  (typeof RUNTIME_EVIDENCE_FRESHNESS_STATES)[number];

export type RuntimeEvidenceSource =
  ForensicsReport["source"] | "playwright" | "junit" | "unknown";

export interface RuntimeEvidenceBinding {
  repositoryIdentity?: string;
  repository?: string;
  commit?: string;
  scanId?: string;
  runId?: string;
}

export interface RuntimeEvidenceContext extends RuntimeEvidenceBinding {
  now?: string;
  evaluatedAt?: string;
  maxAgeMs?: number;
  runIdentity?: RunIdentity;
}

export interface RuntimeEvidenceArtifactInput {
  source?: RuntimeEvidenceSource;
  path?: string;
  artifactPath?: string;
  producer?: string;
  schemaVersion?: number;
  content?: string | Uint8Array;
  text?: string;
  report?: ForensicsReport;
  records?: readonly unknown[];
  verdicts?: readonly TestVerdict[];
  contentDigest?: string;
  digest?: string;
  acquiredAt?: string;
  producedAt?: string;
  capturedAt?: string;
  repositoryIdentity?: string;
  repository?: string;
  commit?: string;
  scanId?: string;
  runId?: string;
  runIdentity?: RunIdentity;
  expected?: RuntimeEvidenceBinding;
  binding?: RuntimeEvidenceBinding;
  truncated?: boolean;
  malformed?: boolean;
  complete?: boolean;
  analysisComplete?: boolean;
  skippedReports?: number;
  incompleteReasons?: readonly string[];
  freshness?: RuntimeEvidenceFreshnessState;
  foreign?: boolean;
  stale?: boolean;
  invalidated?: boolean;
  partial?: boolean;
}

export interface RuntimeEvidenceGraphInput extends RuntimeEvidenceContext {
  artifacts?: readonly RuntimeEvidenceArtifactInput[];
  evidence?: readonly RuntimeEvidenceArtifactInput[];
  records?: readonly unknown[];
  verdicts?: readonly TestVerdict[];
  source?: RuntimeEvidenceSource;
  context?: RuntimeEvidenceContext;
  current?: RuntimeEvidenceContext;
}

export type RuntimeEvidenceGraphRequest =
  | RuntimeEvidenceGraphInput
  | RuntimeEvidenceArtifactInput
  | ForensicsReport
  | readonly RuntimeEvidenceArtifactInput[];

export interface RuntimeEvidenceProvenance {
  source: RuntimeEvidenceSource;
  producer: string;
  artifactPath: string;
  contentDigest: string;
  declaredContentDigest?: string;
  schemaVersion: number;
  acquiredAt?: string;
  repositoryIdentity?: string;
  commit?: string;
  scanId?: string;
}

export interface RuntimeEvidenceFreshness {
  state: RuntimeEvidenceFreshnessState;
  status: RuntimeEvidenceFreshnessState;
  reasons: string[];
  evaluatedAt?: string;
}

export interface RuntimeEvidenceArtifact {
  id: string;
  source: RuntimeEvidenceSource;
  path: string;
  paths: string[];
  producer: string;
  schemaVersion: number;
  contentDigest: string;
  declaredContentDigest?: string;
  acquiredAt?: string;
  binding: RuntimeEvidenceBinding;
  provenance: RuntimeEvidenceProvenance;
  freshness: RuntimeEvidenceFreshness;
  recordIds: string[];
  recordCount: number;
  duplicateCount: number;
  duplicateRecordCount: number;
  partial: boolean;
  malformed: boolean;
  truncated: boolean;
  reasons: string[];
}

export interface RuntimeEvidenceRecord {
  id: string;
  testId: string;
  artifactId: string;
  source: RuntimeEvidenceSource;
  file: string;
  title: string;
  line?: number;
  finalStatus: RunStatus;
  status: RunStatus;
  attempts: number;
  durationMs: number;
  passedOnRetry: boolean;
  everFailed: boolean;
  skipped: boolean;
  provenance: RuntimeEvidenceProvenance;
  freshness: RuntimeEvidenceFreshness;
}

export interface RuntimeEvidenceNode extends EvidenceNode {
  provenance?: RuntimeEvidenceProvenance;
  freshness?: RuntimeEvidenceFreshness;
}

export interface RuntimeEvidenceEdge extends EvidenceEdge {
  id: string;
  provenance?: RuntimeEvidenceProvenance;
  freshness?: RuntimeEvidenceFreshness;
}

export interface RuntimeEvidenceContradiction {
  id: string;
  testId: string;
  file: string;
  title: string;
  statuses: RunStatus[];
  eventIds: string[];
  artifactIds: string[];
  reason: string;
}

export interface RuntimeEvidenceGraphFreshness {
  state: RuntimeEvidenceFreshnessState;
  counts: Record<RuntimeEvidenceFreshnessState, number>;
}

export interface RuntimeEvidenceGraphResult extends EvidenceGraphResult {
  schemaVersion: typeof RUNTIME_EVIDENCE_GRAPH_SCHEMA_VERSION;
  nodes: RuntimeEvidenceNode[];
  edges: RuntimeEvidenceEdge[];
  runtimeArtifacts: RuntimeEvidenceArtifact[];
  runtimeRecords: RuntimeEvidenceRecord[];
  runtimeContradictions: RuntimeEvidenceContradiction[];
  artifacts: RuntimeEvidenceArtifact[];
  records: RuntimeEvidenceRecord[];
  contradictions: RuntimeEvidenceContradiction[];
  freshness: RuntimeEvidenceGraphFreshness;
  partial: boolean;
  diagnostics: string[];
  trustPromotion: "NOT_CLAIMED";
}

export interface RuntimeEvidenceQuery {
  file?: string;
  testId?: string;
  title?: string;
  source?: RuntimeEvidenceSource;
  status?: RunStatus;
  freshness?: RuntimeEvidenceFreshnessState;
  artifactId?: string;
}

export interface RuntimeEvidenceTrace {
  record?: RuntimeEvidenceRecord;
  artifact?: RuntimeEvidenceArtifact;
  testNode?: RuntimeEvidenceNode;
  fileNode?: RuntimeEvidenceNode;
  eventNode?: RuntimeEvidenceNode;
  edges: RuntimeEvidenceEdge[];
}

const STATUS_VALUES: readonly string[] = [
  "passed",
  "failed",
  "timedOut",
  "skipped",
  "interrupted",
];

const STATE_PRIORITY: Record<RuntimeEvidenceFreshnessState, number> = {
  FRESH: 1,
  UNKNOWN: 2,
  PARTIAL: 3,
  CONTRADICTORY: 4,
  STALE: 5,
  FOREIGN: 6,
  MALFORMED: 7,
  INVALIDATED: 8,
};

function canonical(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): string {
  if (depth > 64) return JSON.stringify("[Depth]");
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? JSON.stringify(value)
      : JSON.stringify(String(value));
  }
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (typeof value !== "object") return JSON.stringify(null);
  if (seen.has(value)) return JSON.stringify("[Circular]");
  seen.add(value);
  if (Array.isArray(value)) {
    const entries = value
      .slice(0, 10_000)
      .map((entry) => canonical(entry, seen, depth + 1));
    if (value.length > 10_000) entries.push(JSON.stringify("[Truncated]"));
    seen.delete(value);
    return `[${entries.join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort().slice(0, 256);
  const entries = keys.map((key) => {
    let child: unknown;
    try {
      child = record[key];
    } catch {
      child = "[Thrown]";
    }
    return `${JSON.stringify(key)}:${canonical(child, seen, depth + 1)}`;
  });
  seen.delete(value);
  return `{${entries.join(",")}}`;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function digestBytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function copyUnknownArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  const result: unknown[] = [];
  for (const entry of value as unknown[]) result.push(entry);
  return result;
}

function boundedText(value: unknown, fallback: string, limit: number): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (text.length === 0) return fallback;
  return text.length > limit ? text.slice(0, limit) : text;
}

function normalizedPath(value: unknown): string {
  const path = boundedText(
    value,
    "unknown",
    RUNTIME_EVIDENCE_LIMITS.maxPathLength,
  );
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function normalizedSource(value: unknown): RuntimeEvidenceSource {
  switch (value) {
    case "playwright-json":
    case "playwright":
      return "playwright-json";
    case "junit-xml":
    case "junit":
      return "junit-xml";
    case "jest-json":
    case "vitest-json":
    case "playwright-trace":
    case "har":
      return value;
    default:
      return "unknown";
  }
}

function statusValue(value: unknown): RunStatus | undefined {
  return typeof value === "string" && STATUS_VALUES.includes(value)
    ? (value as RunStatus)
    : undefined;
}

function finiteNonnegative(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function integerLine(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function bindingFrom(
  input: RuntimeEvidenceArtifactInput,
  report?: ForensicsReport,
): RuntimeEvidenceBinding {
  const expected = input.expected;
  const declared = input.binding;
  const runId =
    input.runId ??
    (input.runIdentity ? input.runIdentity.scanId : undefined) ??
    (isRecord(report) && typeof report["runId"] === "string"
      ? report["runId"]
      : undefined);
  const binding: RuntimeEvidenceBinding = {};
  const repositoryIdentity =
    input.repositoryIdentity ??
    input.repository ??
    expected?.repositoryIdentity ??
    expected?.repository ??
    declared?.repositoryIdentity ??
    declared?.repository;
  const commit = input.commit ?? expected?.commit ?? declared?.commit;
  const scanId = input.scanId ?? expected?.scanId ?? declared?.scanId ?? runId;
  if (typeof repositoryIdentity === "string" && repositoryIdentity.length > 0) {
    binding.repositoryIdentity = repositoryIdentity;
  }
  if (typeof commit === "string" && commit.length > 0) binding.commit = commit;
  if (typeof scanId === "string" && scanId.length > 0) {
    binding.scanId = scanId;
    binding.runId = scanId;
  }
  if (
    typeof runId === "string" &&
    runId.length > 0 &&
    binding.runId === undefined
  ) {
    binding.runId = runId;
    binding.scanId = runId;
  }
  return binding;
}

function hasOwn(value: unknown, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isGraphInput(
  value: RuntimeEvidenceGraphRequest,
): value is RuntimeEvidenceGraphInput {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  if (
    hasOwn(value, "artifacts") ||
    hasOwn(value, "evidence") ||
    hasOwn(value, "context") ||
    hasOwn(value, "current")
  ) {
    return true;
  }
  const hasArtifactShape = [
    "source",
    "path",
    "artifactPath",
    "content",
    "text",
    "report",
    "producer",
    "acquiredAt",
    "contentDigest",
    "digest",
  ].some((key) => hasOwn(value, key));
  if (hasArtifactShape) return false;
  return true;
}

function graphInputFrom(
  input: RuntimeEvidenceGraphRequest,
): RuntimeEvidenceGraphInput {
  if (
    isRecord(input) &&
    hasOwn(input, "forensicsSchemaVersion") &&
    hasOwn(input, "verdicts")
  ) {
    return { artifacts: [{ report: input as unknown as ForensicsReport }] };
  }
  if (isGraphInput(input)) return input;
  if (Array.isArray(input)) {
    return { artifacts: input as readonly RuntimeEvidenceArtifactInput[] };
  }
  return { artifacts: [input as RuntimeEvidenceArtifactInput] };
}

function contextFrom(
  input: RuntimeEvidenceGraphInput | undefined,
  fallback?: RuntimeEvidenceContext,
): RuntimeEvidenceContext {
  const current = input?.current;
  const context = input?.context;
  const direct: RuntimeEvidenceContext =
    input === undefined
      ? {}
      : {
          ...(input.repositoryIdentity !== undefined
            ? { repositoryIdentity: input.repositoryIdentity }
            : {}),
          ...(input.repository !== undefined
            ? { repository: input.repository }
            : {}),
          ...(input.commit !== undefined ? { commit: input.commit } : {}),
          ...(input.scanId !== undefined ? { scanId: input.scanId } : {}),
          ...(input.runId !== undefined ? { runId: input.runId } : {}),
          ...(input.runIdentity !== undefined
            ? { runIdentity: input.runIdentity }
            : {}),
          ...(input.now !== undefined ? { now: input.now } : {}),
          ...(input.evaluatedAt !== undefined
            ? { evaluatedAt: input.evaluatedAt }
            : {}),
          ...(input.maxAgeMs !== undefined ? { maxAgeMs: input.maxAgeMs } : {}),
        };
  return {
    ...(fallback ?? {}),
    ...direct,
    ...(context ?? {}),
    ...(current ?? {}),
  };
}

function strictState(
  left: RuntimeEvidenceFreshnessState,
  right: RuntimeEvidenceFreshnessState,
): RuntimeEvidenceFreshnessState {
  return STATE_PRIORITY[left] >= STATE_PRIORITY[right] ? left : right;
}

function freshness(
  state: RuntimeEvidenceFreshnessState,
  reasons: string[],
  evaluatedAt?: string,
): RuntimeEvidenceFreshness {
  const uniqueReasons = [...new Set(reasons)].sort();
  return {
    state,
    status: state,
    reasons: uniqueReasons,
    ...(evaluatedAt !== undefined ? { evaluatedAt } : {}),
  };
}

function bindingMatches(
  binding: RuntimeEvidenceBinding,
  context: RuntimeEvidenceContext,
): { foreign: boolean; missing: boolean } {
  let missing = false;
  let foreign = false;
  const expectedRepository = context.repositoryIdentity ?? context.repository;
  const actualRepository = binding.repositoryIdentity ?? binding.repository;
  if (expectedRepository !== undefined) {
    if (actualRepository === undefined) missing = true;
    else if (actualRepository !== expectedRepository) foreign = true;
  }
  if (context.commit !== undefined) {
    if (binding.commit === undefined) missing = true;
    else if (binding.commit !== context.commit) foreign = true;
  }
  if (
    context.scanId !== undefined ||
    context.runId !== undefined ||
    context.runIdentity !== undefined
  ) {
    const expectedRun =
      context.scanId ?? context.runId ?? context.runIdentity?.scanId;
    if (binding.runId === undefined) missing = true;
    else if (binding.runId !== expectedRun) foreign = true;
  }
  return { foreign, missing };
}

function initialFreshness(
  input: RuntimeEvidenceArtifactInput,
  binding: RuntimeEvidenceBinding,
  context: RuntimeEvidenceContext,
  reasons: string[],
  malformed: boolean,
  partial: boolean,
): RuntimeEvidenceFreshness {
  const evaluatedAt = context.now ?? context.evaluatedAt;
  const match = bindingMatches(binding, context);
  let stale = input.stale === true;
  let foreign = input.foreign === true || match.foreign;
  let invalidated = input.invalidated === true;
  const contradictory = input.freshness === "CONTRADICTORY";
  let unknown = false;
  if (Object.keys(binding).length === 0 && input.freshness !== "FRESH") {
    unknown = true;
  }
  if (match.missing) unknown = true;
  if (input.freshness === "STALE") stale = true;
  if (input.freshness === "FOREIGN") foreign = true;
  if (input.freshness === "MALFORMED") malformed = true;
  if (input.freshness === "PARTIAL") partial = true;
  if (input.freshness === "INVALIDATED") invalidated = true;
  if (contradictory) reasons.push("contradiction");
  if (input.freshness === "UNKNOWN") unknown = true;
  const acquiredAt = input.acquiredAt ?? input.producedAt ?? input.capturedAt;
  const acquiredTime = parseTime(acquiredAt);
  const evaluatedTime = parseTime(evaluatedAt);
  if (
    context.maxAgeMs !== undefined &&
    Number.isFinite(context.maxAgeMs) &&
    context.maxAgeMs >= 0 &&
    acquiredTime !== undefined &&
    evaluatedTime !== undefined &&
    evaluatedTime - acquiredTime > context.maxAgeMs
  ) {
    stale = true;
    reasons.push("age-limit");
  }
  if (foreign) reasons.push("foreign-binding");
  if (stale) reasons.push("stale-binding");
  if (invalidated) reasons.push("invalidated");
  if (unknown) reasons.push("missing-binding");
  if (!acquiredTime && input.freshness !== "FRESH") unknown = true;
  if (unknown) reasons.push("missing-timestamp");
  if (malformed) reasons.push("malformed-payload");
  if (partial) reasons.push("partial-payload");
  let state: RuntimeEvidenceFreshnessState;
  if (invalidated) state = "INVALIDATED";
  else if (malformed) state = "MALFORMED";
  else if (foreign) state = "FOREIGN";
  else if (stale) state = "STALE";
  else if (contradictory) state = "CONTRADICTORY";
  else if (partial) state = "PARTIAL";
  else if (unknown) state = "UNKNOWN";
  else state = "FRESH";
  return freshness(state, reasons, evaluatedAt);
}

function contentValue(input: RuntimeEvidenceArtifactInput): {
  value?: string | Uint8Array;
  invalid: boolean;
  oversized: boolean;
} {
  const value = input.content ?? input.text;
  if (value === undefined) return { invalid: false, oversized: false };
  if (typeof value === "string") {
    const bytes = Buffer.byteLength(value, "utf8");
    return {
      value:
        bytes > RUNTIME_EVIDENCE_LIMITS.maxRawBytes
          ? value.slice(0, RUNTIME_EVIDENCE_LIMITS.maxRawBytes)
          : value,
      invalid: false,
      oversized: bytes > RUNTIME_EVIDENCE_LIMITS.maxRawBytes,
    };
  }
  if (value instanceof Uint8Array) {
    return {
      value:
        value.byteLength > RUNTIME_EVIDENCE_LIMITS.maxRawBytes
          ? value.slice(0, RUNTIME_EVIDENCE_LIMITS.maxRawBytes)
          : value,
      invalid: false,
      oversized: value.byteLength > RUNTIME_EVIDENCE_LIMITS.maxRawBytes,
    };
  }
  return { invalid: true, oversized: false };
}

function contentText(value: string | Uint8Array): string {
  return typeof value === "string"
    ? value
    : Buffer.from(value).toString("utf8");
}

function payloadDigest(
  input: RuntimeEvidenceArtifactInput,
  source: RuntimeEvidenceSource,
): string {
  const declared = input.contentDigest ?? input.digest;
  const content = contentValue(input);
  if (content.value !== undefined) {
    const actual =
      typeof content.value === "string"
        ? digest(content.value)
        : digestBytes(content.value);
    return actual;
  }
  if (typeof declared === "string" && declared.length > 0)
    return declared.toLowerCase();
  const payload = input.report ?? input.records ?? input.verdicts ?? source;
  return digest(canonical(payload));
}

function digestMatches(input: RuntimeEvidenceArtifactInput): boolean {
  const declared = input.contentDigest ?? input.digest;
  if (typeof declared !== "string" || declared.length === 0) return true;
  if (input.content === undefined && input.text === undefined) return true;
  const bytes = contentValue(input).value;
  if (bytes === undefined) return false;
  const computed =
    typeof bytes === "string" ? digest(bytes) : digestBytes(bytes);
  return computed === declared.toLowerCase();
}

function malformedPlaywrightNode(value: unknown, depth = 0): boolean {
  if (depth > 32 || !isRecord(value)) return true;
  for (const key of ["suites", "specs", "tests", "results"]) {
    const child = value[key];
    if (child !== undefined && !Array.isArray(child)) return true;
  }
  for (const key of ["suites", "specs", "tests"]) {
    const child = value[key];
    if (!Array.isArray(child)) continue;
    for (const entry of child as unknown[]) {
      if (key === "results") continue;
      if (malformedPlaywrightNode(entry, depth + 1)) return true;
    }
  }
  return false;
}

function rawRecords(
  input: RuntimeEvidenceArtifactInput,
  source: RuntimeEvidenceSource,
): {
  records: unknown[];
  malformed: boolean;
  partial: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let malformed = input.malformed === true;
  let partial =
    input.truncated === true ||
    input.partial === true ||
    input.complete === false ||
    input.analysisComplete === false ||
    (input.skippedReports ?? 0) > 0 ||
    (input.incompleteReasons?.length ?? 0) > 0;
  if (input.truncated === true) reasons.push("truncated");
  if (input.partial === true) reasons.push("partial");
  if (input.complete === false) reasons.push("incomplete");
  if (input.analysisComplete === false) reasons.push("analysis-incomplete");
  if ((input.skippedReports ?? 0) > 0) reasons.push("skipped-reports");
  if ((input.incompleteReasons?.length ?? 0) > 0)
    reasons.push("incomplete-reasons");
  if (input.report !== undefined) {
    if (!isRecord(input.report)) {
      return {
        records: [],
        malformed: true,
        partial,
        reasons: [...reasons, "invalid-report"],
      };
    }
    const report = input.report;
    const reportSource = normalizedSource(report["source"]);
    if (reportSource === "unknown") malformed = true;
    if (typeof report["forensicsSchemaVersion"] !== "number") malformed = true;
    if (!Array.isArray(report["verdicts"])) malformed = true;
    if (report["analysisComplete"] !== true) partial = true;
    if (
      typeof report["skippedReports"] === "number" &&
      report["skippedReports"] > 0
    )
      partial = true;
    if (
      Array.isArray(report["incompleteReasons"]) &&
      report["incompleteReasons"].length > 0
    )
      partial = true;
    return {
      records: copyUnknownArray(report["verdicts"]),
      malformed,
      partial,
      reasons,
    };
  }
  if (input.records !== undefined) {
    if (!Array.isArray(input.records))
      return {
        records: [],
        malformed: true,
        partial,
        reasons: [...reasons, "invalid-records"],
      };
    return {
      records: copyUnknownArray(input.records),
      malformed,
      partial,
      reasons,
    };
  }
  if (input.verdicts !== undefined) {
    return {
      records: copyUnknownArray(input.verdicts),
      malformed,
      partial,
      reasons,
    };
  }
  const content = contentValue(input);
  if (content.invalid)
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "invalid-content"],
    };
  if (content.value === undefined)
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "missing-payload"],
    };
  if (content.oversized) {
    partial = true;
    reasons.push("raw-size-limit");
  }
  const rawText = contentText(content.value);
  const text =
    rawText.length > RUNTIME_EVIDENCE_LIMITS.maxTextLength
      ? rawText.slice(0, RUNTIME_EVIDENCE_LIMITS.maxTextLength)
      : rawText;
  if (rawText.length > RUNTIME_EVIDENCE_LIMITS.maxTextLength) {
    partial = true;
    reasons.push("text-length-limit");
  }
  if (source === "junit-xml") {
    let records: TestRecord[] = [];
    try {
      records = parseJunitXml(text);
    } catch {
      malformed = true;
      reasons.push("invalid-junit");
    }
    if (!/<testcase\b/i.test(text) || !/<\/testsuites?>/i.test(text)) {
      malformed = true;
      addReason(reasons, "invalid-junit");
    }
    return { records, malformed, partial, reasons };
  }
  if (source !== "playwright-json") {
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "unsupported-source"],
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "invalid-json"],
    };
  }
  if (
    !isRecord(parsed) ||
    !Array.isArray(parsed["suites"]) ||
    malformedPlaywrightNode(parsed)
  ) {
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "invalid-playwright-shape"],
    };
  }
  try {
    return {
      records: parsePlaywrightJson(parsed),
      malformed,
      partial,
      reasons,
    };
  } catch {
    return {
      records: [],
      malformed: true,
      partial,
      reasons: [...reasons, "invalid-playwright-shape"],
    };
  }
}

function attemptValues(value: unknown): {
  attempts: number;
  durationMs: number;
  invalid: boolean;
} {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return { attempts: value, durationMs: 0, invalid: false };
  }
  if (!Array.isArray(value))
    return { attempts: 1, durationMs: 0, invalid: value !== undefined };
  let total = 0;
  let valid = 0;
  let invalid = false;
  for (const attempt of value.slice(
    0,
    RUNTIME_EVIDENCE_LIMITS.maxRecordsPerArtifact,
  )) {
    if (!isRecord(attempt) || statusValue(attempt["status"]) === undefined) {
      invalid = true;
      continue;
    }
    valid++;
    total +=
      finiteNonnegative(attempt["durationMs"]) ??
      finiteNonnegative(attempt["duration"]) ??
      0;
  }
  return { attempts: valid, durationMs: total, invalid };
}

function normalizeRecord(
  value: unknown,
  source: RuntimeEvidenceSource,
  artifactId: string,
  provenance: RuntimeEvidenceProvenance,
  state: RuntimeEvidenceFreshness,
  reasons: string[],
): RuntimeEvidenceRecord | undefined {
  if (!isRecord(value)) {
    reasons.push("invalid-record");
    return undefined;
  }
  if (typeof value["file"] !== "string" || value["file"].trim().length === 0) {
    reasons.push("missing-file");
    return undefined;
  }
  const file = normalizedPath(value["file"]);
  if (
    typeof value["title"] !== "string" ||
    value["title"].trim().length === 0
  ) {
    reasons.push("missing-title");
    return undefined;
  }
  const title = boundedText(
    value["title"],
    "(unnamed)",
    RUNTIME_EVIDENCE_LIMITS.maxTextLength,
  );
  const attemptList = copyUnknownArray(value["attempts"]);
  const parsedAttempts = attemptValues(value["attempts"]);
  if (parsedAttempts.invalid) reasons.push("invalid-attempts");
  const lastAttempt = attemptList[attemptList.length - 1];
  const finalStatus =
    statusValue(value["finalStatus"]) ??
    statusValue(value["status"]) ??
    statusValue(isRecord(lastAttempt) ? lastAttempt["status"] : undefined);
  if (finalStatus === undefined) {
    reasons.push("invalid-status");
    return undefined;
  }
  const attempts = Math.max(1, parsedAttempts.attempts || 1);
  const durationMs = Math.min(
    Number.MAX_SAFE_INTEGER,
    finiteNonnegative(value["totalDurationMs"]) ??
      finiteNonnegative(value["durationMs"]) ??
      parsedAttempts.durationMs,
  );
  const everFailed =
    typeof value["everFailed"] === "boolean"
      ? value["everFailed"]
      : attempts > 1 && finalStatus !== "passed";
  const passedOnRetry =
    typeof value["passedOnRetry"] === "boolean"
      ? value["passedOnRetry"]
      : finalStatus === "passed" && attempts > 1 && everFailed;
  const skipped =
    typeof value["skipped"] === "boolean"
      ? value["skipped"]
      : finalStatus === "skipped";
  const line = integerLine(value["line"]);
  const testId = `test:${digest(canonical({ file, title }))}`;
  const eventIdentity = {
    artifactId,
    testId,
    finalStatus,
    attempts,
    durationMs,
    everFailed,
    passedOnRetry,
    skipped,
  };
  return {
    id: `event:${digest(canonical(eventIdentity))}`,
    testId,
    artifactId,
    source,
    file,
    title,
    ...(line !== undefined ? { line } : {}),
    finalStatus,
    status: finalStatus,
    attempts,
    durationMs,
    passedOnRetry,
    everFailed,
    skipped,
    provenance,
    freshness: state,
  };
}

function addReason(reasons: string[], value: string): void {
  if (!reasons.includes(value)) reasons.push(value);
}

function artifactBase(
  input: RuntimeEvidenceArtifactInput,
  context: RuntimeEvidenceContext,
): {
  source: RuntimeEvidenceSource;
  path: string;
  paths: string[];
  duplicateCount: number;
  producer: string;
  schemaVersion: number;
  contentDigest: string;
  binding: RuntimeEvidenceBinding;
  provenance: RuntimeEvidenceProvenance;
  freshness: RuntimeEvidenceFreshness;
  records: RuntimeEvidenceRecord[];
  malformed: boolean;
  partial: boolean;
  truncated: boolean;
  reasons: string[];
  id: string;
} {
  const report = input.report;
  const source = normalizedSource(
    input.source ?? (isRecord(report) ? report["source"] : undefined),
  );
  const path = normalizedPath(
    input.artifactPath ?? input.path ?? "runtime-evidence",
  );
  const producer = boundedText(input.producer, source, 256);
  const reportSchemaVersion = isRecord(report)
    ? report["forensicsSchemaVersion"]
    : undefined;
  const schemaVersion =
    Number.isInteger(input.schemaVersion) && (input.schemaVersion ?? 0) > 0
      ? (input.schemaVersion as number)
      : Number.isInteger(reportSchemaVersion) && (reportSchemaVersion ?? 0) > 0
        ? (reportSchemaVersion as number)
        : 1;
  const digestValue = payloadDigest(input, source);
  const binding = bindingFrom(input, report);
  const acquiredAt = input.acquiredAt ?? input.producedAt ?? input.capturedAt;
  const declaredDigest = input.contentDigest ?? input.digest;
  const provenance: RuntimeEvidenceProvenance = {
    source,
    producer,
    artifactPath: path,
    contentDigest: digestValue,
    ...(declaredDigest !== undefined
      ? { declaredContentDigest: declaredDigest.toLowerCase() }
      : {}),
    schemaVersion,
    ...(typeof acquiredAt === "string" ? { acquiredAt } : {}),
    ...(binding.repositoryIdentity !== undefined
      ? { repositoryIdentity: binding.repositoryIdentity }
      : {}),
    ...(binding.commit !== undefined ? { commit: binding.commit } : {}),
    ...(binding.runId !== undefined ? { scanId: binding.runId } : {}),
  };
  const parsed = rawRecords(input, source);
  let malformed =
    parsed.malformed || source === "unknown" || !digestMatches(input);
  let partial = parsed.partial || input.truncated === true;
  const reasons = [...parsed.reasons];
  if (!digestMatches(input)) addReason(reasons, "content-digest-mismatch");
  if (source === "unknown") addReason(reasons, "unknown-source");
  if (input.malformed === true) addReason(reasons, "declared-malformed");
  const state = initialFreshness(
    input,
    binding,
    context,
    reasons,
    malformed,
    partial,
  );
  const id = `artifact:${digest(canonical({ source, contentDigest: digestValue, binding }))}`;
  const records: RuntimeEvidenceRecord[] = [];
  for (const raw of parsed.records.slice(
    0,
    RUNTIME_EVIDENCE_LIMITS.maxRecordsPerArtifact,
  )) {
    const record = normalizeRecord(raw, source, id, provenance, state, reasons);
    if (record !== undefined) records.push(record);
  }
  if (
    reasons.includes("invalid-record") ||
    reasons.includes("invalid-status") ||
    reasons.includes("missing-file") ||
    reasons.includes("missing-title") ||
    reasons.includes("invalid-attempts")
  ) {
    malformed = true;
    addReason(reasons, "malformed-record");
  }
  if (parsed.records.length > RUNTIME_EVIDENCE_LIMITS.maxRecordsPerArtifact) {
    partial = true;
    addReason(reasons, "record-count-limit");
  }
  if (reasons.length > state.reasons.length) {
    const nextState = malformed
      ? "MALFORMED"
      : partial
        ? "PARTIAL"
        : state.state;
    return {
      source,
      path,
      paths: [path],
      duplicateCount: 0,
      producer,
      schemaVersion,
      contentDigest: digestValue,
      binding,
      provenance,
      freshness: freshness(nextState, reasons, state.evaluatedAt),
      records,
      malformed,
      partial,
      truncated:
        input.truncated === true ||
        reasons.includes("truncated") ||
        reasons.includes("raw-size-limit") ||
        reasons.includes("record-count-limit"),
      reasons,
      id,
    };
  }
  return {
    source,
    path,
    paths: [path],
    duplicateCount: 0,
    producer,
    schemaVersion,
    contentDigest: digestValue,
    binding,
    provenance,
    freshness: state,
    records,
    malformed,
    partial,
    truncated:
      input.truncated === true ||
      reasons.includes("truncated") ||
      reasons.includes("raw-size-limit") ||
      reasons.includes("record-count-limit"),
    reasons,
    id,
  };
}

function mergeArtifacts(
  values: ReturnType<typeof artifactBase>[],
): ReturnType<typeof artifactBase>[] {
  const groups = new Map<string, ReturnType<typeof artifactBase>[]>();
  for (const value of values) {
    const group = groups.get(value.id) ?? [];
    group.push(value);
    groups.set(value.id, group);
  }
  const merged: ReturnType<typeof artifactBase>[] = [];
  for (const [id, group] of groups) {
    const ordered = [...group].sort((a, b) =>
      canonical(a).localeCompare(canonical(b)),
    );
    const first = ordered[0];
    if (first === undefined) continue;
    const reasons = [...first.reasons];
    let malformed = first.malformed;
    let partial = first.partial;
    let truncated = first.truncated;
    let state = first.freshness;
    for (const value of ordered.slice(1)) {
      reasons.push(...value.reasons);
      malformed ||= value.malformed;
      partial ||= value.partial;
      truncated ||= value.truncated;
      state = freshness(
        strictState(state.state, value.freshness.state),
        [...state.reasons, ...value.freshness.reasons],
        state.evaluatedAt ?? value.freshness.evaluatedAt,
      );
      if (value.freshness.state !== first.freshness.state)
        addReason(reasons, "duplicate-provenance-mismatch");
    }
    const records = ordered.flatMap((value) => value.records);
    const paths = [...new Set(ordered.map((value) => value.path))].sort();
    const canonicalPath = paths[0] ?? first.path;
    const provenance: RuntimeEvidenceProvenance = {
      ...first.provenance,
      artifactPath: canonicalPath,
    };
    const nextState = malformed
      ? "MALFORMED"
      : partial
        ? "PARTIAL"
        : state.state;
    merged.push({
      ...first,
      id,
      path: canonicalPath,
      paths,
      duplicateCount: Math.max(0, ordered.length - 1),
      provenance,
      freshness: freshness(nextState, reasons, state.evaluatedAt),
      records,
      malformed,
      partial,
      truncated,
      reasons: [...new Set(reasons)].sort(),
    });
  }
  return merged.sort((a, b) => a.id.localeCompare(b.id));
}

function graphFreshness(
  artifacts: RuntimeEvidenceArtifact[],
): RuntimeEvidenceGraphFreshness {
  const counts: Record<RuntimeEvidenceFreshnessState, number> = {
    FRESH: 0,
    STALE: 0,
    FOREIGN: 0,
    MALFORMED: 0,
    CONTRADICTORY: 0,
    PARTIAL: 0,
    INVALIDATED: 0,
    UNKNOWN: 0,
  };
  let state: RuntimeEvidenceFreshnessState = "FRESH";
  for (const artifact of artifacts) {
    counts[artifact.freshness.state]++;
    state = strictState(state, artifact.freshness.state);
  }
  if (artifacts.length === 0) state = "UNKNOWN";
  return { state, counts };
}

function addNode(
  nodes: Map<string, RuntimeEvidenceNode>,
  node: RuntimeEvidenceNode,
): void {
  const existing = nodes.get(node.id);
  if (existing === undefined) {
    nodes.set(node.id, node);
    return;
  }
  const state =
    existing.freshness && node.freshness
      ? freshness(
          strictState(existing.freshness.state, node.freshness.state),
          [...existing.freshness.reasons, ...node.freshness.reasons],
          existing.freshness.evaluatedAt ?? node.freshness.evaluatedAt,
        )
      : (existing.freshness ?? node.freshness);
  nodes.set(node.id, {
    ...existing,
    label: existing.label < node.label ? existing.label : node.label,
    properties: {
      ...existing.properties,
      ...node.properties,
      ...(state !== undefined ? { freshness: state.state } : {}),
    },
    ...((existing.provenance ?? node.provenance)
      ? { provenance: existing.provenance ?? node.provenance }
      : {}),
    ...(state !== undefined ? { freshness: state } : {}),
  });
}

function addEdge(
  edges: Map<string, RuntimeEvidenceEdge>,
  edge: RuntimeEvidenceEdge,
): void {
  const existing = edges.get(edge.id);
  if (existing === undefined) {
    edges.set(edge.id, edge);
    return;
  }
  const state =
    existing.freshness && edge.freshness
      ? freshness(
          strictState(existing.freshness.state, edge.freshness.state),
          [...existing.freshness.reasons, ...edge.freshness.reasons],
          existing.freshness.evaluatedAt ?? edge.freshness.evaluatedAt,
        )
      : (existing.freshness ?? edge.freshness);
  edges.set(edge.id, {
    ...existing,
    properties: {
      ...existing.properties,
      ...edge.properties,
      ...(state !== undefined ? { freshness: state.state } : {}),
    },
    ...((existing.provenance ?? edge.provenance)
      ? { provenance: existing.provenance ?? edge.provenance }
      : {}),
    ...(state !== undefined ? { freshness: state } : {}),
  });
}

function edgeId(
  source: string,
  target: string,
  type: string,
  key: unknown,
): string {
  return `edge:${digest(canonical({ source, target, type, key }))}`;
}

function artifactOutput(
  value: ReturnType<typeof artifactBase>,
  recordIds: string[],
  duplicateRecordCount: number,
): RuntimeEvidenceArtifact {
  return {
    id: value.id,
    source: value.source,
    path: value.path,
    paths: value.paths,
    producer: value.producer,
    schemaVersion: value.schemaVersion,
    contentDigest: value.contentDigest,
    ...(value.provenance.declaredContentDigest !== undefined
      ? { declaredContentDigest: value.provenance.declaredContentDigest }
      : {}),
    ...(value.provenance.acquiredAt !== undefined
      ? { acquiredAt: value.provenance.acquiredAt }
      : {}),
    binding: value.binding,
    provenance: value.provenance,
    freshness: value.freshness,
    recordIds,
    recordCount: recordIds.length,
    duplicateCount: value.duplicateCount,
    duplicateRecordCount,
    partial: value.partial,
    malformed: value.malformed,
    truncated: value.truncated,
    reasons: value.reasons,
  };
}

export function buildRuntimeEvidenceGraph(
  input: RuntimeEvidenceGraphRequest,
  fallbackContext?: RuntimeEvidenceContext,
): RuntimeEvidenceGraphResult {
  const graphInput = graphInputFrom(input);
  const context = contextFrom(graphInput, fallbackContext);
  const suppliedArtifacts = graphInput.artifacts ?? graphInput.evidence;
  const rawArtifacts =
    suppliedArtifacts ??
    (graphInput.records !== undefined || graphInput.verdicts !== undefined
      ? [
          {
            source: graphInput.source ?? "playwright-json",
            path: "runtime-evidence",
            ...(graphInput.records !== undefined
              ? { records: graphInput.records }
              : {}),
            ...(graphInput.verdicts !== undefined
              ? { verdicts: graphInput.verdicts }
              : {}),
          },
        ]
      : []);
  const orderedInputs = [...rawArtifacts].sort((left, right) => {
    const leftKey = canonical({
      source: left.source,
      path: left.artifactPath ?? left.path,
      digest: left.contentDigest ?? left.digest,
    });
    const rightKey = canonical({
      source: right.source,
      path: right.artifactPath ?? right.path,
      digest: right.contentDigest ?? right.digest,
    });
    return leftKey.localeCompare(rightKey);
  });
  const selectedInputs = orderedInputs.slice(
    0,
    RUNTIME_EVIDENCE_LIMITS.maxArtifacts,
  );
  const diagnostics: string[] = [];
  if (orderedInputs.length > selectedInputs.length)
    diagnostics.push("artifact-count-limit");
  const working = selectedInputs.map((artifact) =>
    artifactBase(artifact, context),
  );
  const merged = mergeArtifacts(working);
  const artifactMap = new Map<string, RuntimeEvidenceArtifact>();
  const recordMap = new Map<string, RuntimeEvidenceRecord>();
  for (const value of merged) {
    const uniqueRecords = new Map<string, RuntimeEvidenceRecord>();
    for (const record of value.records) uniqueRecords.set(record.id, record);
    const records = [...uniqueRecords.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const duplicateRecordCount = value.records.length - records.length;
    const artifact = artifactOutput(
      value,
      records.map((record) => record.id),
      duplicateRecordCount,
    );
    artifactMap.set(artifact.id, artifact);
    for (const record of records) {
      const previous = recordMap.get(record.id);
      if (previous === undefined) recordMap.set(record.id, record);
      else if (previous.freshness.state !== record.freshness.state) {
        previous.freshness = freshness(
          strictState(previous.freshness.state, record.freshness.state),
          [...previous.freshness.reasons, ...record.freshness.reasons],
        );
      }
    }
  }
  const artifacts = [...artifactMap.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  let records = [...recordMap.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  if (records.length > RUNTIME_EVIDENCE_LIMITS.maxRecords) {
    records = records.slice(0, RUNTIME_EVIDENCE_LIMITS.maxRecords);
    diagnostics.push("record-count-limit");
    const retained = new Set(records.map((record) => record.id));
    for (const artifact of artifacts) {
      const retainedIds = artifact.recordIds.filter((id) => retained.has(id));
      if (retainedIds.length === artifact.recordIds.length) continue;
      artifact.recordIds = retainedIds;
      artifact.recordCount = retainedIds.length;
      artifact.partial = true;
      artifact.truncated = true;
      addReason(artifact.reasons, "record-count-limit");
      artifact.freshness = freshness(
        strictState(artifact.freshness.state, "PARTIAL"),
        [...artifact.freshness.reasons, "record-count-limit"],
        artifact.freshness.evaluatedAt,
      );
    }
  }
  const contradictions: RuntimeEvidenceContradiction[] = [];
  const byTest = new Map<string, RuntimeEvidenceRecord[]>();
  for (const record of records) {
    const group = byTest.get(record.testId) ?? [];
    group.push(record);
    byTest.set(record.testId, group);
  }
  const contradictionEventPairs = new Map<string, [string, string]>();
  for (const [testId, group] of byTest) {
    const statuses = [
      ...new Set(group.map((record) => record.finalStatus)),
    ].sort();
    if (statuses.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
    const contradiction: RuntimeEvidenceContradiction = {
      id: `contradiction:${digest(canonical({ testId, eventIds: sorted.map((record) => record.id) }))}`,
      testId,
      file: sorted[0]?.file ?? "unknown",
      title: sorted[0]?.title ?? "(unnamed)",
      statuses,
      eventIds: sorted.map((record) => record.id),
      artifactIds: [
        ...new Set(sorted.map((record) => record.artifactId)),
      ].sort(),
      reason: "conflicting-runtime-outcomes",
    };
    contradictions.push(contradiction);
    for (const record of sorted) {
      const artifact = artifactMap.get(record.artifactId);
      if (artifact !== undefined) {
        artifact.freshness = freshness(
          strictState(artifact.freshness.state, "CONTRADICTORY"),
          [...artifact.freshness.reasons, "contradiction"],
          artifact.freshness.evaluatedAt,
        );
      }
      record.freshness = freshness(
        strictState(record.freshness.state, "CONTRADICTORY"),
        [...record.freshness.reasons, "contradiction"],
        record.freshness.evaluatedAt,
      );
    }
    for (let left = 0; left < sorted.length; left++) {
      for (let right = left + 1; right < sorted.length; right++) {
        const first = sorted[left];
        const second = sorted[right];
        if (
          first === undefined ||
          second === undefined ||
          first.finalStatus === second.finalStatus
        )
          continue;
        const pair = [first.id, second.id].sort();
        const firstId = pair[0];
        const secondId = pair[1];
        if (firstId === undefined || secondId === undefined) continue;
        contradictionEventPairs.set(`${firstId}:${secondId}`, [
          firstId,
          secondId,
        ]);
      }
    }
  }
  contradictions.sort((a, b) => a.id.localeCompare(b.id));
  for (const artifact of artifacts) {
    for (const reason of artifact.reasons)
      addReason(diagnostics, `${artifact.id}:${reason}`);
    if (artifact.freshness.reasons.includes("contradiction")) {
      addReason(diagnostics, `${artifact.id}:contradiction`);
    }
  }
  if (contradictions.length > 0) diagnostics.push("contradiction");
  const repositoryIdentity =
    context.repositoryIdentity ?? context.repository ?? "unknown";
  const repositoryId = `repo:${digest(repositoryIdentity)}`;
  const nodes = new Map<string, RuntimeEvidenceNode>();
  const edges = new Map<string, RuntimeEvidenceEdge>();
  const repositoryNode: RuntimeEvidenceNode = {
    id: repositoryId,
    type: "repository",
    label: "Runtime Evidence Repository",
    properties: { repositoryIdentity },
  };
  addNode(nodes, repositoryNode);
  for (const artifact of artifacts) {
    const artifactNode: RuntimeEvidenceNode = {
      id: artifact.id,
      type: "artifact",
      label: `${artifact.source}:${artifact.path}`,
      properties: {
        source: artifact.source,
        path: artifact.path,
        contentDigest: artifact.contentDigest,
        freshness: artifact.freshness.state,
        recordCount: artifact.recordCount,
      },
      provenance: artifact.provenance,
      freshness: artifact.freshness,
    };
    addNode(nodes, artifactNode);
    addEdge(edges, {
      id: edgeId(repositoryId, artifact.id, "CONTAINS", artifact.id),
      source: repositoryId,
      target: artifact.id,
      type: "CONTAINS",
      properties: { freshness: artifact.freshness.state },
      provenance: artifact.provenance,
      freshness: artifact.freshness,
    });
  }
  for (const record of records) {
    const fileId = `file:${record.file}`;
    const fileNode: RuntimeEvidenceNode = {
      id: fileId,
      type: "file",
      label: record.file,
      properties: { path: record.file, freshness: record.freshness.state },
      provenance: record.provenance,
      freshness: record.freshness,
    };
    addNode(nodes, fileNode);
    addEdge(edges, {
      id: edgeId(repositoryId, fileId, "CONTAINS", fileId),
      source: repositoryId,
      target: fileId,
      type: "CONTAINS",
      properties: { freshness: record.freshness.state },
      provenance: record.provenance,
      freshness: record.freshness,
    });
    const testNode: RuntimeEvidenceNode = {
      id: record.testId,
      type: "test",
      label: `${record.file}:${record.title}`,
      properties: {
        file: record.file,
        title: record.title,
        ...(record.line !== undefined ? { line: record.line } : {}),
        freshness: record.freshness.state,
      },
      provenance: record.provenance,
      freshness: record.freshness,
    };
    addNode(nodes, testNode);
    addEdge(edges, {
      id: edgeId(fileId, record.testId, "CONTAINS", record.testId),
      source: fileId,
      target: record.testId,
      type: "CONTAINS",
      properties: { freshness: record.freshness.state },
      provenance: record.provenance,
      freshness: record.freshness,
    });
    addEdge(edges, {
      id: edgeId(
        record.testId,
        record.artifactId,
        "OBSERVED_IN",
        record.artifactId,
      ),
      source: record.testId,
      target: record.artifactId,
      type: "OBSERVED_IN",
      properties: { freshness: record.freshness.state },
      provenance: record.provenance,
      freshness: record.freshness,
    });
    const eventNode: RuntimeEvidenceNode = {
      id: record.id,
      type: "runtime-event",
      label: `${record.title}:${record.finalStatus}`,
      properties: {
        testId: record.testId,
        file: record.file,
        status: record.finalStatus,
        attempts: record.attempts,
        durationMs: record.durationMs,
        freshness: record.freshness.state,
      },
      provenance: record.provenance,
      freshness: record.freshness,
    };
    addNode(nodes, eventNode);
    addEdge(edges, {
      id: edgeId(record.artifactId, record.id, "PRODUCED_BY", record.id),
      source: record.artifactId,
      target: record.id,
      type: "PRODUCED_BY",
      properties: { freshness: record.freshness.state },
      provenance: record.provenance,
      freshness: record.freshness,
    });
    addEdge(edges, {
      id: edgeId(record.id, record.testId, "CONFIRMS", record.testId),
      source: record.id,
      target: record.testId,
      type: "CONFIRMS",
      properties: {
        status: record.finalStatus,
        freshness: record.freshness.state,
      },
      provenance: record.provenance,
      freshness: record.freshness,
    });
  }
  for (const pair of contradictionEventPairs.values()) {
    const first = pair[0];
    const second = pair[1];
    if (first === undefined || second === undefined) continue;
    const firstRecord = records.find((record) => record.id === first);
    const secondRecord = records.find((record) => record.id === second);
    const state = freshness("CONTRADICTORY", ["contradiction"]);
    addEdge(edges, {
      id: edgeId(first, second, "CONTRADICTS", [first, second]),
      source: first,
      target: second,
      type: "CONTRADICTS",
      properties: {
        statuses: [firstRecord?.finalStatus, secondRecord?.finalStatus].filter(
          (value): value is RunStatus => value !== undefined,
        ),
        freshness: "CONTRADICTORY",
      },
      freshness: state,
    });
  }
  const graphState = graphFreshness(artifacts);
  const partial =
    graphState.state !== "FRESH" ||
    diagnostics.includes("artifact-count-limit") ||
    diagnostics.includes("contradiction");
  const finalNodes = [...nodes.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const finalEdges = [...edges.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  const finalRecords = records;
  const failed = finalRecords.filter(
    (record) =>
      record.finalStatus === "failed" || record.finalStatus === "timedOut",
  ).length;
  const skipped = finalRecords.filter((record) => record.skipped).length;
  const flaky = finalRecords.filter((record) => record.passedOnRetry).length;
  const graph = buildEvidenceGraph({
    source: "runtime-evidence",
    ...(context.runIdentity !== undefined
      ? { runId: context.runIdentity }
      : {}),
  });
  return {
    schemaVersion: RUNTIME_EVIDENCE_GRAPH_SCHEMA_VERSION,
    graph,
    nodes: finalNodes,
    edges: finalEdges,
    agenticProfile: computeAgenticProfile([], []),
    evidenceCounts: {
      total: finalRecords.length,
      failed,
      flaky,
      skipped,
      timedOut: finalRecords.filter(
        (record) => record.finalStatus === "timedOut",
      ).length,
    },
    provenanceSummary: {
      totalFiles: new Set(finalRecords.map((record) => record.file)).size,
      generatedMarkedFiles: 0,
      codegenLikeFiles: 0,
      shareMarkedGenerated: 0,
    },
    runtimeArtifacts: artifacts,
    runtimeRecords: finalRecords,
    runtimeContradictions: contradictions,
    artifacts,
    records: finalRecords,
    contradictions,
    freshness: graphState,
    partial,
    diagnostics: [...new Set(diagnostics)].sort(),
    trustPromotion: "NOT_CLAIMED",
  };
}

export function ingestRuntimeEvidence(
  input: RuntimeEvidenceGraphRequest,
  context?: RuntimeEvidenceContext,
): RuntimeEvidenceGraphResult {
  return buildRuntimeEvidenceGraph(input, context);
}

export function ingestRuntimeEvidenceArtifacts(
  input: RuntimeEvidenceGraphRequest,
  context?: RuntimeEvidenceContext,
): RuntimeEvidenceGraphResult {
  return buildRuntimeEvidenceGraph(input, context);
}

export function replayRuntimeEvidence(
  input: RuntimeEvidenceGraphRequest,
  context?: RuntimeEvidenceContext,
): RuntimeEvidenceGraphResult {
  return buildRuntimeEvidenceGraph(input, context);
}

export function replayRuntimeEvidenceGraph(
  input: RuntimeEvidenceGraphRequest,
  context?: RuntimeEvidenceContext,
): RuntimeEvidenceGraphResult {
  return buildRuntimeEvidenceGraph(input, context);
}

export function serializeRuntimeEvidenceGraph(
  result: RuntimeEvidenceGraphResult,
): string {
  return canonical(result);
}

export function stableSerializeRuntimeEvidenceGraph(
  result: RuntimeEvidenceGraphResult,
): string {
  return serializeRuntimeEvidenceGraph(result);
}

export function queryRuntimeEvidence(
  result: RuntimeEvidenceGraphResult,
  query: RuntimeEvidenceQuery = {},
): RuntimeEvidenceRecord[] {
  const file =
    query.file === undefined ? undefined : normalizedPath(query.file);
  const source =
    query.source === undefined ? undefined : normalizedSource(query.source);
  return result.runtimeRecords.filter((record) => {
    if (file !== undefined && record.file !== file) return false;
    if (query.testId !== undefined && record.testId !== query.testId)
      return false;
    if (query.title !== undefined && record.title !== query.title) return false;
    if (source !== undefined && record.source !== source) return false;
    if (query.status !== undefined && record.finalStatus !== query.status)
      return false;
    if (
      query.freshness !== undefined &&
      record.freshness.state !== query.freshness
    )
      return false;
    if (
      query.artifactId !== undefined &&
      record.artifactId !== query.artifactId
    )
      return false;
    return true;
  });
}

export function queryRuntimeEvidenceGraph(
  result: RuntimeEvidenceGraphResult,
  query: RuntimeEvidenceQuery = {},
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidence(result, query);
}

export function queryRuntimeEvidenceByFile(
  result: RuntimeEvidenceGraphResult,
  file: string,
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidence(result, { file });
}

export function queryRuntimeEvidenceByTest(
  result: RuntimeEvidenceGraphResult,
  testId: string,
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidence(result, { testId });
}

export function queryRuntimeEvidenceByArtifact(
  result: RuntimeEvidenceGraphResult,
  artifactId: string,
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidence(result, { artifactId });
}

export function queryEvidenceGraphByFile(
  result: RuntimeEvidenceGraphResult,
  file: string,
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidenceByFile(result, file);
}

export function queryEvidenceGraphByTest(
  result: RuntimeEvidenceGraphResult,
  testId: string,
): RuntimeEvidenceRecord[] {
  return queryRuntimeEvidenceByTest(result, testId);
}

export function traceRuntimeEvidence(
  result: RuntimeEvidenceGraphResult,
  recordId: string,
): RuntimeEvidenceTrace {
  const record = result.runtimeRecords.find((entry) => entry.id === recordId);
  const artifact =
    record === undefined
      ? undefined
      : result.runtimeArtifacts.find((entry) => entry.id === record.artifactId);
  const testNode =
    record === undefined
      ? undefined
      : result.nodes.find((node) => node.id === record.testId);
  const fileNode =
    record === undefined
      ? undefined
      : result.nodes.find((node) => node.id === `file:${record.file}`);
  const eventNode = result.nodes.find((node) => node.id === recordId);
  const edges = result.edges.filter(
    (edge): edge is RuntimeEvidenceEdge =>
      "id" in edge && (edge.source === recordId || edge.target === recordId),
  );
  return {
    ...(record !== undefined ? { record } : {}),
    ...(artifact !== undefined ? { artifact } : {}),
    ...(testNode !== undefined ? { testNode } : {}),
    ...(fileNode !== undefined ? { fileNode } : {}),
    ...(eventNode !== undefined ? { eventNode } : {}),
    edges,
  };
}
