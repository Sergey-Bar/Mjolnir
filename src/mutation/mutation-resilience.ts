/**
 * Mutation resilience reporting (INTEL-006, plan §37.3).
 *
 * Computes the mutation kill rate and derives a contextual evidence
 * signal. The kill-rate formula excludes timeout and noCoverage from
 * the denominator — they are different facts than killed/survived:
 *   killRate = killed / (killed + survived)
 *
 * This module does NOT automatically upgrade trust. The evidence level
 * derived here is a contextual signal for downstream consumers to
 * interpret alongside other evidence.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface MutationReport {
  /** Mutants the test suite killed. */
  killed: number;
  /** Mutants that survived — the suite did not catch the change. */
  survived: number;
  /** Mutants with no test coverage at all. */
  noCoverage: number;
  /** Mutants where the test run timed out. */
  timeout: number;
  /** Total files processed. */
  totalFiles: number;
  /** Total mutants generated. */
  totalMutants: number;
}

// ─── Kill rate ───────────────────────────────────────────────────────

/**
 * Compute the mutation kill rate.
 *
 * Formula: killed / (killed + survived)
 *
 * timeout and noCoverage are excluded from the denominator — they
 * represent different facts (the suite timed out, or the code was
 * never reached) and diluting the rate with them would misrepresent
 * the suite's effectiveness on code it actually exercised.
 *
 * Returns 0 when killed + survived === 0 (no exercised mutants).
 */
export function computeKillRate(report: MutationReport): number {
  const exercised = report.killed + report.survived;
  if (exercised === 0) return 0;
  return report.killed / exercised;
}

// ─── Evidence level ──────────────────────────────────────────────────

/**
 * Derive a contextual evidence signal from the kill rate.
 *
 * This is NOT an automatic trust upgrade. It describes how much the
 * mutation evidence strengthens or weakens the signal:
 *   - "E2": killRate >= 0.8 — strong suite coverage of exercised code
 *   - "E1": killRate >= 0.5 — partial coverage
 *   - "E0": killRate < 0.5 — weak coverage; many survived mutants
 *
 * Downstream consumers combine this with other evidence sources.
 */
export function mutationEvidenceLevel(killRate: number): "E0" | "E1" | "E2" {
  if (killRate >= 0.8) return "E2";
  if (killRate >= 0.5) return "E1";
  return "E0";
}
