/**
 * Machine Verification Contract (blueprint §12, Contract D).
 *
 * CANONICAL PROJECTION — no parallel model: every field is derived
 * deterministically from a canonical ScanResult (schemaVersion 1). The
 * contract is additive WITHIN a contractVersion and versioned as
 * `contractVersion: 2`; the human-readable form lives in the generated,
 * drift-locked docs/machine-contract.md.
 *
 * WHY v2 AND NOT AN ADDITIVE FIELD. Everything added in 6.0 to this
 * projection — `coverageState`, `rulesApplied`, `rulesWithheld`,
 * `degradations` — is semantic, and semantic fields participate in
 * `canonicalScanJson`. Leaving `contractVersion` at 1 would mean a stored
 * v1 artifact still verified: `verifyPersistedContract` rebuilds `expected`
 * from the stored result and compares with `isDeepStrictEqual`, and a
 * digest that no longer includes the withheld-rule set would keep matching
 * a result produced with different rules in play. A version that does not
 * change when the meaning of the digest changes is a version that lies.
 *
 * What a machine MAY conclude from this object: the listed findings were
 * detected by the named rules at the stated detectorRevision, with the
 * stated evidence/trust/FP metadata; the completeness fields
 * (partial/rulesCrashed/truncationReasons/frameworkDetectionUnknown)
 * accurately describe what the scan actually did; E0 findings are
 * advisory and never gate; `score` is a measurement, not a contract.
 *
 * What a machine MUST NEVER infer from disappearance: that anything was
 * fixed. Absence requires the §15 lifecycle resolution (suppress ·
 * exclude · baseline · partial · truncation · crash · revision change ·
 * scope change · retirement can each explain it) — never absence alone.
 * All completeness/trust/lifecycle facts are machine-readable FIELDS;
 * no consumer may parse human-rendered text to learn them (§22.1).
 */

import { createHash } from "node:crypto";

import {
  deriveEvidenceLevel,
  type ScanResult,
  type Finding,
  type ForensicVerdictSummary,
  type TrustSummary,
} from "../types.js";

/** Version of this projection. Additive-only evolution. */
export const CONTRACT_VERSION = 2;

/**
 * GitHub check-run annotation level, derived from finding severity.
 * Advisory findings (E0) are REPORTED at notice level — never upgraded,
 * never dropped.
 */
export type AnnotationLevel = "failure" | "warning" | "notice";

/** One CI annotation (GitHub check-run shape). */
export interface MachineAnnotation {
  path: string;
  /** 1-based; findings are line-anchored by contract. */
  start_line: number;
  /** GitHub annotations cap at 50 per check run. */
  annotation_level: AnnotationLevel;
  /** `ruleId: message` — identity and presentation, never inference. */
  message: string;
  /**
   * The finding's rule id — machines that want identity without parsing
   * the message text (§22.1) read this field.
   */
  ruleId: string;
  /** Detector revision of the rule that produced the finding (§13). */
  detectorRevision?: number;
  /** Advisory findings (E0) — never gate CI. */
  advisory: boolean;
}

/** Completeness facts a machine must consult before trusting anything. */
export interface MachineCompleteness {
  partial: boolean;
  discovery: "complete" | "partial";
  rules: "complete" | "partial";
  skippedFiles: number;
  rulesCrashed: number;
  parseFallbacks?: number;
  /**
   * Whether the scan could see the whole rule registry (contract v2).
   *
   * Separate from `partial` and from `rules` on purpose. `partial` is
   * "this run lost something mid-run"; `rules` is "a rule was attempted
   * and failed"; this is "rules were removed before the run started".
   * A v1 consumer reading only the first two is told a 45-of-79 scan was
   * complete, which is the reason this is a version bump rather than a
   * silent additive field: `isDeepStrictEqual` against a rebuilt `expected`
   * is how the verification path checks a stored artifact, and a new
   * semantic field with no version change is a contract that looks valid
   * and proves less than it did.
   */
  coverageState?: "COMPLETE" | "PARTIAL";
  /** Rules that ran. Absent when the producing scan predates v2. */
  rulesApplied?: number;
  /** Rules withheld by the quarantine filter. Absent when predates v2. */
  rulesWithheld?: number;
  truncationReasons: string[];
  reasons?: string[];
  /**
   * Per-reason capability losses from the degradation ledger, verbatim.
   * Computed by the scan, dropped from both the digest and the completeness
   * literal through 5.x — so a scan that lost the AST mask and one that did
   * not produced the same digest, and the count was computed and thrown
   * away (contract v2).
   */
  degradations?: Array<{ reason: string; count: number }>;
  frameworkDetectionUnknown: boolean;
  durationMs: number;
  scopeIntegrity?: ScanResult["scopeIntegrity"];
  runIdentity?: ScanResult["runIdentity"];
}

/** Deterministic verification digest over the canonical findings. */
export interface MachineSummary {
  /**
   * SHA-256 over the canonical JSON serialization of
   * {score, partial, analysisStatus, findings (identity+evidence
   * fields, presentation excluded)}. Same inputs → same digest, so two
   * runs can be compared without parsing anything. This is a FINGERPRINT
   * of what was seen — never a claim that anything was fixed.
   */
  digest: string;
  /** Number of findings in the canonical result. */
  findings: number;
  /** Score as measured, or null when the repo has no tests (R2). */
  score: number | null;
  /** Findings at each severity — the exit-code decision surface. */
  errors: number;
  warnings: number;
  infos: number;
  /** Advisory (E0) count — reported, never gated. */
  advisory: number;
}

/** The additive contract field on a scan JSON result (schemaVersion 1). */
export interface MachineContract {
  contractVersion: typeof CONTRACT_VERSION;
  summary: MachineSummary;
  annotations: MachineAnnotation[];
  /** GitHub's per-check-run cap — annotations beyond this are summarized. */
  annotationsTruncated: boolean;
  completeness: MachineCompleteness;
  /**
   * WI-4 additive extension (plan §6/§26): the scan-level trust
   * measurement, verbatim from the canonical result's `trustSummary`
   * (built by engine/trust-summary.ts — this projection never
   * re-derives it). Measurement, not contract: consumers treat it per
   * docs/SCORING.md; `confidence` is ceiling-capped. Present when the
   * producing scan carried a trust summary (v0.6.0+).
   */
  trustSummary?: TrustSummary;
  /**
   * WI-4 additive extension (plan §17): per-scan provenance, verbatim
   * from the canonical `agenticProfile` — share of test files carrying
   * detected generative markers. PROVENANCE IS NOT TRUST (§17.4): the
   * contract carries it for disclosure only; it must never gate, score,
   * or filter. Present when the producing scan computed a profile.
   */
  provenance?: ScanResult["agenticProfile"];
  /**
   * Forensic classifications aggregated from the ingested runtime
   * report (plan §10.4, WAVE 5). Populated when a runtime report was
   * discovered and produced ≥1 classified verdict (likely-real-defect /
   * environmental-failure / infrastructure-failure / flaky /
   * retry-dependent / unstable-construction / inconclusive). Absent when
   * no runtime evidence was ingested — never fabricated.
   */
  forensicVerdicts?: ForensicVerdictSummary;
}

/**
 * The forensic-verdict summary shape. Re-exported from `types.js` —
 * the canonical definition lives there so the ScanResult producer and
 * the machine contract share one type. Additive evolution only.
 */
export type { ForensicVerdictSummary } from "../types.js";

/** GitHub's hard cap on annotations per check run. */
export const ANNOTATIONS_LIMIT = 50;

/**
 * Fields that participate in the verification digest: identity (ruleId,
 * detectorRevision, file, line, column) + evidence (severity,
 * evidenceLevel, trustLevel, confidence, findingType) + lifecycle-adjacent
 * metadata (fixGroupId). PRESENTATION (message/why/fix) is excluded by
 * design: rewording a detector's prose must not change the digest of a
 * scan whose semantics are identical.
 */
function digestView(f: Finding): Record<string, unknown> {
  return {
    ruleId: f.ruleId,
    detectorRevision: f.detectorRevision ?? null,
    file: f.file,
    line: f.line,
    column: f.column,
    severity: f.severity,
    evidenceLevel: f.evidenceLevel ?? null,
    trustLevel: f.trustLevel ?? null,
    confidence: f.confidence,
    findingType: f.findingType,
    qaImpact: f.qaImpact,
    findingId: f.findingId ?? null,
    rootCauseId: f.rootCauseId ?? null,
    deduplicationGroup: f.deduplicationGroup ?? null,
    fixGroupId: f.fixGroupId ?? null,
  };
}

/**
 * Deterministic canonical serialization: findings in ScanResult order
 * (already compareFindings-sorted), stable key insertion order, no
 * indentation. JSON.stringify of plain objects with fixed key order is
 * deterministic across runs and platforms. `durationMs` is EXCLUDED —
 * it is wall-clock, not semantics; including it would make two runs of
 * the same repo produce different digests.
 */
function canonicalScanJson(result: ScanResult): string {
  return JSON.stringify({
    score: result.score,
    partial: result.partial,
    analysisStatus: {
      discovery: result.analysisStatus.discovery,
      rules: result.analysisStatus.rules,
      skippedFiles: result.analysisStatus.skippedFiles,
      rulesCrashed: result.analysisStatus.rulesCrashed ?? 0,
      parseFallbacks: result.analysisStatus.parseFallbacks ?? 0,
      // The coverage pair and the degradation ledger are in the digest
      // because they are SEMANTIC: two scans that differ only in how much
      // of the registry they could see, or only in which capability a
      // swallowed `catch` took away, are different results and must not
      // hash alike. `durationMs` is excluded for the opposite reason — it
      // is wall-clock, and including it would make every run of an
      // unchanged repository a new digest.
      coverageState: result.analysisStatus.coverageState ?? "COMPLETE",
      rulesApplied: result.analysisStatus.rulesApplied ?? null,
      rulesWithheld: result.analysisStatus.rulesWithheld ?? 0,
      degradations: result.analysisStatus.degradations ?? [],
      truncationReasons: result.analysisStatus.truncationReasons ?? [],
      reasons: result.analysisStatus.reasons ?? [],
    },
    scopeIntegrity: result.scopeIntegrity ?? null,
    runIdentity: result.runIdentity ?? null,
    findings: result.findings.map(digestView),
  });
}

/** Advisory when the DERIVED evidence level is E0 (same rule as scoring). */
function effectiveEvidenceLevel(f: Finding): Finding["evidenceLevel"] {
  return f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
}

function isAdvisory(f: Finding): boolean {
  return effectiveEvidenceLevel(f) === "E0";
}

function levelFor(
  f: Finding,
  evidenceLevel: Finding["evidenceLevel"] = effectiveEvidenceLevel(f),
): AnnotationLevel {
  if (evidenceLevel === "E0") return "notice";
  if (f.severity === "error") return "failure";
  if (f.severity === "warning") return "warning";
  return "notice";
}

function countBy(
  findings: Finding[],
  predicate: (f: Finding) => boolean,
): number {
  return findings.filter(predicate).length;
}

/**
 * Project a canonical ScanResult into the machine contract. Pure:
 * same input → same output, always (§16 semantic integrity, §25.1).
 */
export function buildMachineContract(result: ScanResult): MachineContract {
  const digest = createHash("sha256")
    .update(canonicalScanJson(result))
    .digest("hex");
  const annotations: MachineAnnotation[] = result.findings.map((f) => {
    const evidenceLevel = effectiveEvidenceLevel(f);
    return {
      path: f.file,
      start_line: f.line,
      annotation_level: levelFor(f, evidenceLevel),
      message: `${f.ruleId}: ${f.message}`,
      ruleId: f.ruleId,
      ...(f.detectorRevision !== undefined
        ? { detectorRevision: f.detectorRevision }
        : {}),
      advisory: evidenceLevel === "E0",
    };
  });
  return {
    contractVersion: CONTRACT_VERSION,
    summary: {
      digest: `sha256:${digest}`,
      findings: result.findings.length,
      score: result.score,
      errors: countBy(result.findings, (f) => f.severity === "error"),
      warnings: countBy(result.findings, (f) => f.severity === "warning"),
      infos: countBy(result.findings, (f) => f.severity === "info"),
      advisory: countBy(result.findings, isAdvisory),
    },
    annotations: annotations.slice(0, ANNOTATIONS_LIMIT),
    annotationsTruncated: result.findings.length > ANNOTATIONS_LIMIT,
    completeness: {
      partial: result.partial,
      discovery: result.analysisStatus.discovery,
      rules: result.analysisStatus.rules,
      skippedFiles: result.analysisStatus.skippedFiles,
      rulesCrashed: result.analysisStatus.rulesCrashed ?? 0,
      ...(result.analysisStatus.parseFallbacks !== undefined
        ? { parseFallbacks: result.analysisStatus.parseFallbacks }
        : {}),
      truncationReasons: result.analysisStatus.truncationReasons ?? [],
      ...(result.analysisStatus.reasons !== undefined
        ? { reasons: result.analysisStatus.reasons }
        : {}),
      ...(result.analysisStatus.degradations !== undefined
        ? { degradations: result.analysisStatus.degradations }
        : {}),
      ...(result.analysisStatus.coverageState !== undefined
        ? { coverageState: result.analysisStatus.coverageState }
        : {}),
      ...(result.analysisStatus.rulesApplied !== undefined
        ? { rulesApplied: result.analysisStatus.rulesApplied }
        : {}),
      ...(result.analysisStatus.rulesWithheld !== undefined
        ? { rulesWithheld: result.analysisStatus.rulesWithheld }
        : {}),
      frameworkDetectionUnknown: result.frameworkDetectionUnknown,
      durationMs: result.analysisStatus.durationMs,
      ...(result.scopeIntegrity !== undefined
        ? { scopeIntegrity: result.scopeIntegrity }
        : {}),
      ...(result.runIdentity !== undefined
        ? { runIdentity: result.runIdentity }
        : {}),
    },
    // WI-4 additive extensions: verbatim pass-through of the canonical
    // measurements (never re-derived here — one semantic truth, §18).
    ...(result.trustSummary !== undefined
      ? { trustSummary: result.trustSummary }
      : {}),
    ...(result.agenticProfile !== undefined
      ? { provenance: result.agenticProfile }
      : {}),
    ...(result.forensicVerdicts !== undefined
      ? { forensicVerdicts: result.forensicVerdicts }
      : {}),
  };
}
