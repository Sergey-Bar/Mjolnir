/**
 * `finalizeScanResult` (plan V5-011).
 *
 * The scan pipeline ingests a runtime report, normalizes it into evidence
 * records, stamps findings, computes a score, and then hands back a result.
 * What it used to do with those records was nothing: they were built and
 * dropped on the floor, so every consumer that needed them had to re-parse the
 * report itself. That is G-V5-031, and it is not a tidy-up problem — a
 * re-derivation that reads a report which has since changed produces a
 * projection that disagrees with the verdict it claims to explain.
 *
 * This module is the single post-ingest step. It takes the assembled result
 * and produces the projections that depend on ingested evidence, reading the
 * PERSISTED records rather than the source report. It is pure, so the same
 * result always finalizes to the same output — which is what makes the
 * re-derivation trustworthy enough to re-run.
 */

import {
  countEvidence,
  type EvidenceCounts,
  type EvidenceRecord,
} from "./evidence-core.js";

/** What finalize knows how to derive, and nothing more. */
export interface FinalizeInput {
  /** The persisted evidence records from the scan result. */
  records: readonly EvidenceRecord[];
  /** The ingested report's path, or null when no report was found. */
  artifact: string | null;
  /** The findings as stamped, so corroboration can be re-derived from them. */
  findings: ReadonlyArray<{ file: string; line: number; ruleId: string }>;
}

export interface FinalizedEvidence {
  /** The same records, in canonical order — never re-sorted by a consumer. */
  records: EvidenceRecord[];
  counts: EvidenceCounts;
  artifact: string | null;
  /**
   * Whether the evidence state is PROVEN or merely observed. An empty record
   * set with a null artifact means NO evidence was found, which is NOT the
   * same as an empty report proving anything.
   */
  state: "PROVEN" | "NOT_FOUND" | "EMPTY_REPORT";
  /** The evidence source formats this derivation actually saw. */
  sources: string[];
  /** Files that carry at least one normalized test record. */
  coveredFiles: string[];
}

function canonical(records: readonly EvidenceRecord[]): EvidenceRecord[] {
  // Sorting again is deliberate: a consumer may hand records back in any order
  // (they came off disk), and "finalize" must not depend on their order.
  return [...records].sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const la = a.line ?? Number.POSITIVE_INFINITY;
    const lb = b.line ?? Number.POSITIVE_INFINITY;
    if (la !== lb) return la - lb;
    if (a.title !== b.title) return a.title < b.title ? -1 : 1;
    if (a.source !== b.source) return a.source < b.source ? -1 : 1;
    return 0;
  });
}

/**
 * Re-derive every projection that depends on ingested evidence, from the
 * persisted records alone.
 */
export function finalizeScanResult(input: FinalizeInput): FinalizedEvidence {
  const records = canonical(input.records);
  const counts = countEvidence(records);
  const sources = [...new Set(records.map((r) => r.source))].sort();
  const coveredFiles = [...new Set(records.map((r) => r.file))].sort();

  // The distinction that matters: "no runtime report was found" is not
  // evidence of anything, and must not be reported as an empty passing suite.
  const state: FinalizedEvidence["state"] =
    input.artifact === null
      ? "NOT_FOUND"
      : records.length === 0
        ? "EMPTY_REPORT"
        : "PROVEN";

  return {
    records,
    counts,
    artifact: input.artifact,
    state,
    sources,
    coveredFiles,
  };
}

/**
 * Does this evidence state justify treating a finding in `file` as
 * corroborated?
 *
 * An EMPTY_REPORT and a NOT_FOUND are both no. Only PROVEN evidence over a
 * file that actually contains tests can corroborate anything, and a file with
 * zero records cannot corroborate a file-level claim about that file.
 */
export function canCorroborate(finalized: FinalizedEvidence): boolean {
  return finalized.state === "PROVEN";
}
