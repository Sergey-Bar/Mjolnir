/**
 * Machine Verification Contract (blueprint §12, Contract D).
 *
 * CANONICAL PROJECTION — no parallel model: every field is derived
 * deterministically from a canonical ScanResult (schemaVersion 1). The
 * contract is additive within schemaVersion 1 and versioned as
 * `contractVersion: 1`; the human-readable form lives in the generated,
 * drift-locked docs/machine-contract.md.
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
  type TrustSummary,
} from "../types.js";

/** Version of this projection. Additive-only evolution. */
export const CONTRACT_VERSION = 1;

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
  truncationReasons: string[];
  frameworkDetectionUnknown: boolean;
  durationMs: number;
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
   * WI-4 additive extension (plan §6, 1.1.x WI-18): the forensic-verdict
   * slot. EMPTY in 0.6.x — forensic classifications (likely-real-defect /
   * environmental-failure / infrastructure-failure / flaky /
   * retry-dependent / unstable-construction / INCONCLUSIVE) arrive with
   * the forensic verdict taxonomy work; the slot exists so machine
   * consumers can opt into that future without a breaking change.
   */
  forensicVerdicts?: ForensicVerdictSummary;
}

/**
 * The forensic-verdict slot's 0.6.x shape: classification counts by
 * verdict label, reserved but unpopulated until WI-18 (1.1.x). Additive
 * evolution only.
 */
export interface ForensicVerdictSummary {
  classifications: number;
  byVerdict: Record<string, number>;
  /** INCONCLUSIVE is a first-class outcome — the default when evidence is insufficient. */
  inconclusive: number;
}

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
      truncationReasons: result.analysisStatus.truncationReasons ?? [],
    },
    findings: result.findings.map(digestView),
  });
}

/** Advisory when the DERIVED evidence level is E0 (same rule as scoring). */
function isAdvisory(f: Finding): boolean {
  return (
    (f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence)) ===
    "E0"
  );
}

function levelFor(f: Finding): AnnotationLevel {
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
  const annotations: MachineAnnotation[] = result.findings.map((f) => ({
    path: f.file,
    start_line: f.line,
    annotation_level: levelFor(f),
    message: `${f.ruleId}: ${f.message}`,
    ruleId: f.ruleId,
    ...(f.detectorRevision !== undefined
      ? { detectorRevision: f.detectorRevision }
      : {}),
    advisory: isAdvisory(f),
  }));
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
      truncationReasons: result.analysisStatus.truncationReasons ?? [],
      frameworkDetectionUnknown: result.frameworkDetectionUnknown,
      durationMs: result.analysisStatus.durationMs,
    },
    // WI-4 additive extensions: verbatim pass-through of the canonical
    // measurements (never re-derived here — one semantic truth, §18).
    ...(result.trustSummary !== undefined
      ? { trustSummary: result.trustSummary }
      : {}),
    ...(result.agenticProfile !== undefined
      ? { provenance: result.agenticProfile }
      : {}),
  };
}
