/**
 * Canonical Evidence Core (Mega MVP Master Plan v3.1 §26 WI-2, §4/§5).
 *
 * ONE normalized evidence shape that every runtime source normalizes
 * into, with deterministic ordering and stable identities. The scan
 * pipeline fans runtime evidence in HERE; downstream consumers
 * (runtime corroboration today, trustSummary + forensic verdicts later)
 * read from the core instead of re-deriving facts from raw reports.
 *
 * Extraction, not rewrite (WI-2 Impact): the matching semantics that
 * stamping used before this module existed are preserved verbatim —
 * same inputs produce byte-identical stamped findings. New fields
 * (`errors`, `attachments`) exist for the 1.1.x runtime-evidence work
 * (WI-17/18) and are empty today — evidence that does not exist is
 * absent, never fabricated (plan §5 evidence-state vocabulary).
 *
 * Pure module: no filesystem, no clock, no randomness — the core is
 * deterministic by construction (plan §21).
 */

import type { RunStatus } from "../forensics/types.js";
import type { ForensicsReport, TestVerdict } from "../forensics/types.js";

/**
 * The core's own version — stamped into every record's provenance so a
 * consumer can tell which normalization contract produced a record.
 * Bump ONLY on a semantic change to the normalization itself.
 */
export const EVIDENCE_CORE_VERSION = "evidence-core@1";

/** Evidence source formats the core understands today (WI-17 adds trace.zip). */
export type EvidenceSource = ForensicsReport["source"];

/** Normalized per-test runtime evidence (plan WI-2 field contract). */
export interface EvidenceRecord {
  /** Where this evidence came from (format identity). */
  source: EvidenceSource;
  /** Ingested artifact identity — the report path the records derive from. */
  artifact: string;
  /** Test identity: file + title (+ declaration line when known). */
  file: string;
  title: string;
  /** 1-based declaration line when the source carries one (JUnit: absent). */
  line?: number;
  /** Normalized execution status facts. */
  status: {
    /** Last attempt's outcome. */
    final: RunStatus;
    /** Failed at least once across attempts. */
    failed: boolean;
    /** Executed more than once. */
    retried: boolean;
    /** Passed only on attempt >= 2 (TRUE-FLAKE). */
    passedOnRetry: boolean;
    skipped: boolean;
    /** Final attempt timed out. */
    timedOut: boolean;
  };
  /** Number of attempts (retries = attempts − 1). */
  attempts: number;
  /** Total duration across attempts. */
  durationMs: number;
  /** Error messages, in report order. Empty: not captured by this source yet. */
  errors: string[];
  /** Attachment names/paths. Empty: not captured by this source yet (WI-17). */
  attachments: string[];
  /** Where the record came from and under which normalization contract. */
  provenance: {
    core: typeof EVIDENCE_CORE_VERSION;
    ingest: "mjolnir.forensics";
  };
}

/** Deterministic canonical order: file → line (absent last) → title → source. */
function compareRecords(a: EvidenceRecord, b: EvidenceRecord): number {
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  const la = a.line ?? Number.POSITIVE_INFINITY;
  const lb = b.line ?? Number.POSITIVE_INFINITY;
  if (la !== lb) return la - lb;
  if (a.title !== b.title) return a.title < b.title ? -1 : 1;
  if (a.source !== b.source) return a.source < b.source ? -1 : 1;
  return 0;
}

function normalizeOne(
  report: ForensicsReport,
  artifact: string,
  v: TestVerdict,
): EvidenceRecord {
  const last = v.attempts > 0 ? v.finalStatus : "skipped";
  return {
    source: report.source,
    artifact,
    file: v.file,
    title: v.title,
    ...(v.line !== undefined ? { line: v.line } : {}),
    status: {
      final: last,
      failed: v.everFailed,
      retried: v.attempts > 1,
      passedOnRetry: v.passedOnRetry,
      skipped: v.skipped,
      timedOut: v.finalStatus === "timedOut",
    },
    attempts: v.attempts,
    durationMs: v.totalDurationMs,
    errors: [],
    attachments: [],
    provenance: {
      core: EVIDENCE_CORE_VERSION,
      ingest: "mjolnir.forensics",
    },
  };
}

/**
 * Normalize a forensics report into deterministically-ordered evidence
 * records. The same report + artifact identity ALWAYS produces the same
 * record list — report verdict order never leaks into the output.
 */
export function buildEvidenceRecords(
  report: ForensicsReport,
  artifact: string,
): EvidenceRecord[] {
  return report.verdicts
    .map((v) => normalizeOne(report, artifact, v))
    .sort(compareRecords);
}

/**
 * The test whose declaration span contains `line` — the exact matching
 * semantics runtime corroboration has always used, extracted verbatim
 * (Audit W8 honesty rule included: a verdict without a line can never
 * be a test-level match). Returns the record with the greatest
 * declaration line ≤ the finding's line in that file; ties resolve by
 * the canonical order (deterministic refinement over report order).
 */
export function findTestAt(
  records: readonly EvidenceRecord[],
  file: string,
  line: number,
): EvidenceRecord | undefined {
  const inFile = records.filter((r) => r.file === file);
  if (inFile.length === 0) return undefined;
  if (inFile.length === 1) {
    const only = inFile[0] as EvidenceRecord;
    return only.line !== undefined && only.line <= line ? only : undefined;
  }
  for (const r of inFile) {
    if (r.line === undefined) return undefined;
  }
  let match: EvidenceRecord | undefined;
  for (const r of inFile) {
    if (r.line === undefined) continue;
    if (
      r.line <= line &&
      (match === undefined || (match.line as number) <= r.line)
    )
      match = r;
  }
  return match;
}

/** Per-file test count — the honest ceiling for file-level corroboration. */
export function countTestsIn(
  records: readonly EvidenceRecord[],
  file: string,
): number {
  return records.filter((r) => r.file === file).length;
}

/** Coarse per-status counts over the whole core (pure; used by summaries). */
export interface EvidenceCounts {
  total: number;
  failed: number;
  flaky: number;
  skipped: number;
  timedOut: number;
}

export function countEvidence(
  records: readonly EvidenceRecord[],
): EvidenceCounts {
  const counts: EvidenceCounts = {
    total: records.length,
    failed: 0,
    flaky: 0,
    skipped: 0,
    timedOut: 0,
  };
  for (const r of records) {
    if (r.status.failed) counts.failed++;
    if (r.status.passedOnRetry) counts.flaky++;
    if (r.status.skipped) counts.skipped++;
    if (r.status.timedOut) counts.timedOut++;
  }
  return counts;
}
