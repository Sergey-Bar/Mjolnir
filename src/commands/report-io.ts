/**
 * Shared saved-report loading (agent-handoff plan §9.0).
 *
 * `summary`, `handoff` and `why` all consume a saved `--json` report.
 * One loader, one validation, one error shape — previously
 * validateReportJson was private to summary.ts; extracting it keeps
 * the three commands byte-identical in their loading behavior without
 * duplication. The exit-code mapping stays in the callers (they own
 * their io), but the error MESSAGES are identical because they come
 * from here.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import {
  RULE_CATEGORIES,
  SEVERITY_ORDER,
  TRUST_ORDER,
  type ScanResult,
} from "../types.js";

const MAX_REPORT_BYTES = 32 * 1024 * 1024;
const MAX_FINDINGS = 10_000;
const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);
const FINDING_TYPE_VALUES = new Set([
  "deterministic-defect",
  "heuristic-risk",
  "observation",
]);
const QA_IMPACT_VALUES = new Set([
  "BLOCKS-RELEASE",
  "FLAKY-RISK",
  "FALSE-GREEN",
  "HYGIENE",
]);
const EVIDENCE_VALUES = new Set(["E0", "E1", "E2"]);
// Derived from the ladder, not re-listed: a validator that disagrees with the
// ladder about which levels exist rejects reports the engine itself produces.
const TRUST_VALUES = new Set<string>(TRUST_ORDER);

/** Human message for any thrown value — never "undefined"/"[object Object]". */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (typeof err === "object" && err !== null) return JSON.stringify(err);
  return String(err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new Error(message);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`${label} must be a boolean`);
  return value;
}

function requireFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function requireInteger(value: unknown, label: string, minimum = 0): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    fail(`${label} must be an integer >= ${minimum}`);
  }
  return value;
}

function validateDimension(value: unknown, index: number): void {
  const dimension = requireRecord(value, `dimensions[${index}]`);
  const category = requireString(
    dimension.category,
    `dimensions[${index}].category`,
  );
  if (!(RULE_CATEGORIES as readonly string[]).includes(category)) {
    fail(`dimensions[${index}].category is unknown`);
  }
  const score = requireFiniteNumber(
    dimension.score,
    `dimensions[${index}].score`,
  );
  if (score < 0 || score > 100) {
    fail(`dimensions[${index}].score must be between 0 and 100`);
  }
  requireInteger(dimension.errors, `dimensions[${index}].errors`);
  requireInteger(dimension.warnings, `dimensions[${index}].warnings`);
  requireInteger(dimension.infos, `dimensions[${index}].infos`);
}

function validateFinding(value: unknown, index: number): void {
  const finding = requireRecord(value, `findings[${index}]`);
  requireString(finding.ruleId, `findings[${index}].ruleId`);
  const category = requireString(
    finding.category,
    `findings[${index}].category`,
  );
  if (!(RULE_CATEGORIES as readonly string[]).includes(category)) {
    fail(`findings[${index}].category is unknown`);
  }
  const severity = requireString(
    finding.severity,
    `findings[${index}].severity`,
  );
  if (!(SEVERITY_ORDER as readonly string[]).includes(severity)) {
    fail(`findings[${index}].severity is unknown`);
  }
  const confidence = requireString(
    finding.confidence,
    `findings[${index}].confidence`,
  );
  if (!CONFIDENCE_VALUES.has(confidence)) {
    fail(`findings[${index}].confidence is unknown`);
  }
  const findingType = requireString(
    finding.findingType,
    `findings[${index}].findingType`,
  );
  if (!FINDING_TYPE_VALUES.has(findingType)) {
    fail(`findings[${index}].findingType is unknown`);
  }
  const qaImpact = requireString(
    finding.qaImpact,
    `findings[${index}].qaImpact`,
  );
  if (!QA_IMPACT_VALUES.has(qaImpact)) {
    fail(`findings[${index}].qaImpact is unknown`);
  }
  requireString(finding.file, `findings[${index}].file`);
  requireInteger(finding.line, `findings[${index}].line`, 1);
  requireInteger(finding.column, `findings[${index}].column`, 1);
  requireString(finding.message, `findings[${index}].message`);
  requireString(finding.why, `findings[${index}].why`);
  requireString(finding.fix, `findings[${index}].fix`);

  if (
    finding.evidenceLevel !== undefined &&
    (typeof finding.evidenceLevel !== "string" ||
      !EVIDENCE_VALUES.has(finding.evidenceLevel))
  ) {
    fail(`findings[${index}].evidenceLevel is unknown`);
  }
  if (
    finding.trustLevel !== undefined &&
    (typeof finding.trustLevel !== "string" ||
      !TRUST_VALUES.has(finding.trustLevel))
  ) {
    fail(`findings[${index}].trustLevel is unknown`);
  }
  if (finding.detectorRevision !== undefined) {
    requireInteger(
      finding.detectorRevision,
      `findings[${index}].detectorRevision`,
      1,
    );
  }
  if (finding.measuredFpRate !== undefined) {
    const rate = requireFiniteNumber(
      finding.measuredFpRate,
      `findings[${index}].measuredFpRate`,
    );
    if (rate < 0 || rate > 1) {
      fail(`findings[${index}].measuredFpRate must be between 0 and 1`);
    }
  }
  if (finding.measuredFpN !== undefined) {
    requireInteger(finding.measuredFpN, `findings[${index}].measuredFpN`);
  }
}

function validateAnalysisStatus(value: unknown): void {
  const status = requireRecord(value, "analysisStatus");
  if (status.discovery !== "complete" && status.discovery !== "partial") {
    fail('analysisStatus.discovery must be "complete" or "partial"');
  }
  if (status.rules !== "complete" && status.rules !== "partial") {
    fail('analysisStatus.rules must be "complete" or "partial"');
  }
  requireInteger(status.skippedFiles, "analysisStatus.skippedFiles");
  requireFiniteNumber(status.durationMs, "analysisStatus.durationMs");
  if (status.rulesCrashed !== undefined) {
    requireInteger(status.rulesCrashed, "analysisStatus.rulesCrashed");
  }
  if (status.parseFallbacks !== undefined) {
    requireInteger(status.parseFallbacks, "analysisStatus.parseFallbacks");
  }
  if (status.truncationReasons !== undefined) {
    if (!Array.isArray(status.truncationReasons)) {
      fail("analysisStatus.truncationReasons must be an array");
    }
    status.truncationReasons.forEach((reason, index) =>
      requireString(reason, `analysisStatus.truncationReasons[${index}]`),
    );
  }
  if (status.reasons !== undefined) {
    if (!Array.isArray(status.reasons)) {
      fail("analysisStatus.reasons must be an array");
    }
    status.reasons.forEach((reason, index) =>
      requireString(reason, `analysisStatus.reasons[${index}]`),
    );
  }
}

function validateScopeIntegrity(value: unknown): void {
  const scope = requireRecord(value, "scopeIntegrity");
  requireInteger(scope.discovered, "scopeIntegrity.discovered");
  requireInteger(scope.analyzed, "scopeIntegrity.analyzed");
  requireInteger(scope.ignored, "scopeIntegrity.ignored");
  requireInteger(scope.unrecognized, "scopeIntegrity.unrecognized");
  requireInteger(scope.parseFailed, "scopeIntegrity.parseFailed");
  requireInteger(scope.truncated, "scopeIntegrity.truncated");
  if (scope.scopeVerdict !== "PROVEN" && scope.scopeVerdict !== "PARTIAL") {
    fail('scopeIntegrity.scopeVerdict must be "PROVEN" or "PARTIAL"');
  }
  if (scope.reasons !== undefined) {
    if (!Array.isArray(scope.reasons)) {
      fail("scopeIntegrity.reasons must be an array");
    }
    scope.reasons.forEach((reason, index) =>
      requireString(reason, `scopeIntegrity.reasons[${index}]`),
    );
  }
}

/**
 * Parse-and-validate a saved report. Throws Error with a
 * human-explanatory message on invalid JSON, shape, or contract values.
 */
export function validateReportJson(text: string): ScanResult {
  if (Buffer.byteLength(text, "utf8") > MAX_REPORT_BYTES) {
    fail(`report exceeds the ${MAX_REPORT_BYTES}-byte limit`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`not valid JSON (${errorText(err)})`, { cause: err });
  }
  const doc = requireRecord(parsed, "the report is not an object");
  if (doc.schemaVersion !== 1) {
    fail(
      `unsupported schemaVersion ${JSON.stringify(doc.schemaVersion)} — expected schemaVersion 1`,
    );
  }
  requireBoolean(doc.partial, "partial");
  if (doc.score !== null) {
    const score = requireFiniteNumber(doc.score, "score");
    if (score < 0 || score > 100)
      fail("score must be null or between 0 and 100");
  }
  if (doc.reason !== undefined && doc.reason !== "no-tests-found") {
    fail('reason must be "no-tests-found" when present');
  }
  if (doc.frameworks === undefined) {
    fail(
      'missing a "frameworks" array — is this a complete Mjölnir --json report?',
    );
  }
  if (
    !Array.isArray(doc.frameworks) ||
    doc.frameworks.some((value) => typeof value !== "string")
  ) {
    fail("frameworks must be an array of strings");
  }
  requireBoolean(doc.frameworkDetectionUnknown, "frameworkDetectionUnknown");
  if (!Array.isArray(doc.dimensions)) fail("dimensions must be an array");
  doc.dimensions.forEach(validateDimension);
  if (!Array.isArray(doc.findings)) {
    fail('missing a "findings" array — is this a Mjölnir --json report?');
  }
  if (doc.findings.length > MAX_FINDINGS) {
    fail(`findings exceeds the ${MAX_FINDINGS}-finding limit`);
  }
  doc.findings.forEach(validateFinding);
  validateAnalysisStatus(doc.analysisStatus);
  if (doc.scopeIntegrity !== undefined) {
    validateScopeIntegrity(doc.scopeIntegrity);
  }
  const status = requireRecord(doc.analysisStatus, "analysisStatus");
  const partialMarkers =
    status["discovery"] !== "complete" ||
    status["rules"] !== "complete" ||
    Number(status["skippedFiles"]) > 0 ||
    Number(status["rulesCrashed"] ?? 0) > 0 ||
    (Array.isArray(status["reasons"]) && status["reasons"].length > 0);
  if (doc.partial === false && partialMarkers) {
    fail("partial=false conflicts with analysisStatus");
  }
  if (
    doc.partial === true &&
    typeof doc.score === "number" &&
    doc.score === 100
  ) {
    fail("partial reports cannot have a perfect score");
  }
  const scopeStatus = isRecord(doc.scopeIntegrity)
    ? doc.scopeIntegrity
    : undefined;
  if (scopeStatus?.["scopeVerdict"] === "PARTIAL" && doc.partial === false) {
    fail("partial=false conflicts with scopeIntegrity");
  }
  return parsed as ScanResult;
}

/** Load + validate a saved report from disk. Throws on any problem. */
export function loadSavedReport(reportPath: string): ScanResult {
  const stat = statSync(reportPath);
  if (!stat.isFile()) fail(`report path is not a file: ${reportPath}`);
  if (stat.size > MAX_REPORT_BYTES) {
    fail(`report exceeds the ${MAX_REPORT_BYTES}-byte limit`);
  }
  return validateReportJson(readFileSync(reportPath, "utf8"));
}

/** True when the report file exists (callers own the not-found message). */
export function reportExists(reportPath: string): boolean {
  return existsSync(reportPath);
}

/**
 * How much a saved report can be trusted (plan V5-012, G-V5-034).
 *
 * The report JSON has always been validated for SHAPE. What it was never
 * validated for is IDENTITY: a structurally perfect report produced by a
 * different tree, a different commit, or a different candidate loaded exactly
 * like a fresh one, and every trust conclusion drawn from it was attributed to
 * whatever machine happened to read the file.
 *
 * The states, in descending order of what they license:
 *
 *   VERIFIED — the report carries a machine-anchored run identity and, when the
 *             caller supplied an expected identity, it matches. Replayable.
 *   UNBOUND  — a current-format report with no run identity. Readable, but no
 *             claim about which build produced it.
 *   OPEN     — a legacy report, or one whose identity is absent. Replayable as
 *             HISTORY, never as proof. This is the state that must never be
 *             upgraded: importing a legacy artifact cannot increase trust
 *             (Trust Constitution law 12 — provenance is not conferred by
 *             import).
 */
export type SavedReportTrust =
  | {
      state: "VERIFIED";
      scanId: string;
      commit?: string;
      candidateManifestId?: string;
    }
  | { state: "UNBOUND"; reason: string }
  | { state: "OPEN"; reason: string };

/** What the caller believes the current identity to be. */
export interface ExpectedIdentity {
  scanId?: string;
  commit?: string;
  candidateManifestId?: string;
}

function identityOf(result: ScanResult): Record<string, unknown> | undefined {
  const identity = result.runIdentity;
  return isRecord(identity) ? identity : undefined;
}

/**
 * Classify a loaded report. Pure — it reads the report and the caller's
 * expectation, touches nothing else.
 *
 * `expected` is optional on purpose: a caller with no expectation still gets an
 * honest classification, it just cannot detect a cross-identity read.
 */
export function classifySavedReport(
  result: ScanResult,
  expected?: ExpectedIdentity,
): SavedReportTrust {
  const identity = identityOf(result);
  if (identity === undefined) {
    return {
      state: "OPEN",
      reason:
        "report carries no run identity — it predates machine-anchored identity, or was written by hand. Usable as history, not as proof.",
    };
  }
  const scanId = identity["scanId"];
  if (typeof scanId !== "string" || scanId.length === 0) {
    return {
      state: "OPEN",
      reason: "run identity has no scanId — the identity is unusable.",
    };
  }
  const commit =
    typeof identity["commit"] === "string" ? identity["commit"] : undefined;
  const candidate = identity["candidate"];
  const candidateManifestId =
    isRecord(candidate) && typeof candidate["manifestId"] === "string"
      ? candidate["manifestId"]
      : undefined;

  if (expected !== undefined) {
    if (expected.scanId !== undefined && expected.scanId !== scanId) {
      return {
        state: "OPEN",
        reason: `report was produced by a different run (${scanId}) than the current one (${expected.scanId})`,
      };
    }
    if (expected.commit !== undefined && expected.commit !== commit) {
      return {
        state: "OPEN",
        reason: `report was produced against commit ${commit ?? "unknown"}, not ${expected.commit}`,
      };
    }
    if (
      expected.candidateManifestId !== undefined &&
      expected.candidateManifestId !== candidateManifestId
    ) {
      return {
        state: "OPEN",
        reason: `report is bound to candidate ${candidateManifestId ?? "none"}, not ${expected.candidateManifestId}`,
      };
    }
  }

  return {
    state: "VERIFIED",
    scanId,
    ...(commit !== undefined ? { commit } : {}),
    ...(candidateManifestId !== undefined ? { candidateManifestId } : {}),
  };
}

export interface LoadedReport {
  result: ScanResult;
  trust: SavedReportTrust;
  path: string;
}

/**
 * Load a saved report AND classify it.
 *
 * `loadSavedReport` stays for callers that genuinely only need the parse; the
 * trust-aware path is here so that no consumer reaches a report's contents
 * without having been told how much they may believe.
 */
export function loadSavedReportStrict(
  reportPath: string,
  expected?: ExpectedIdentity,
): LoadedReport {
  const result = loadSavedReport(reportPath);
  return {
    result,
    trust: classifySavedReport(result, expected),
    path: reportPath,
  };
}

/**
 * Fail unless a saved report is VERIFIED.
 *
 * For the callers whose output IS a trust claim — a release verdict, a
 * published proof, a badge. Refusing is the whole point: a command that can
 * render "OPEN" as a pass has reintroduced the defect at a higher layer.
 */
export function requireVerifiedReport(
  loaded: LoadedReport,
  onUnverified: (trust: SavedReportTrust) => string,
): void {
  if (loaded.trust.state === "VERIFIED") return;
  fail(onUnverified(loaded.trust));
}
