/**
 * Mutation evidence types (product-gap-remediation master plan P5,
 * plan 1788853205786 — flag 6, decision 8).
 *
 * The Finding-facing provenance shape (`MutationEvidence`) lives in
 * src/types.ts — it is part of the JSON contract and types.ts is its
 * canonical home. This module owns the ingestion-side shapes.
 */

export type MutationEvidenceSource = "stryker" | "mutmut";

/** One survived mutant, normalized to the engine's coordinate space. */
export interface SurvivedMutant {
  /** Repo-relative POSIX path (engine convention). */
  file: string;
  /** Stryker mutator name, or "mutmut" (mutmut's XML carries no op). */
  mutator: string;
  /**
   * 1-based inclusive span. mutmut evidence is FILE-level: the report
   * carries no per-mutant lines, so the span is the whole file
   * (1..MAX_SAFE_INTEGER) — matching stays file-level and is never
   * claimed as line-level (same prefer-claiming-less rule as the
   * runtime corroboration's test-granularity fallback).
   */
  startLine: number;
  endLine: number;
}

export interface MutationReport {
  tool: MutationEvidenceSource;
  survived: SurvivedMutant[];
  /** Mutants the suite never executed — a DIFFERENT fact than survived. */
  noCoverage: number;
  /** Mutants the suite killed (or timed out) — the suite working. */
  killed: number;
}

/**
 * The provenance stamped on a finding when mutation evidence matched —
 * declared in src/types.ts (JSON contract canonical home); re-exported
 * here for the derive module's typing convenience.
 */
export type { MutationEvidence } from "../types.js";
