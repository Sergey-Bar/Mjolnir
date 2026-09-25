/**
 * The one place a rendered surface decides whether it may claim "clean".
 *
 * Trust Constitution laws 1, 2 and 11:
 *   1. Unknown is not Pass.
 *   2. Unsupported is not Pass.
 *  11. Partial is never clean; a complete empty result may be clean, an
 *      incomplete empty result is INCONCLUSIVE.
 *
 * The prototype commands each grew their own version of this decision, and
 * each of them got it subtly wrong — a hardcoded zero that read as a
 * measurement, a fabricated pass on an empty run, a partial scan that exited
 * clean. One function, one decision, so a surface cannot be more confident
 * than the evidence it was given.
 */

import { EXIT_CLEAN, EXIT_FINDINGS, EXIT_PARTIAL } from "./exit-codes.js";

export type ClaimState = "READY" | "BLOCKED" | "INCONCLUSIVE";

/** The evidence a surface is allowed to reason about. */
export interface ClaimEvidence {
  /** The analysis did not cover the whole surface. */
  partial: boolean;
  /** Findings at the surface's own gate. */
  blockingFindings: number;
  /** The surface ran at all. Absent/undefined means the capability is unsupported here. */
  supported: boolean;
  /** Why the surface cannot make a claim at all. */
  unsupportedReason?: string;
}

export interface ClaimDecision {
  state: ClaimState;
  /** The frozen exit code this decision maps to. */
  exitCode: number;
  /** One line, safe to print verbatim in any renderer. */
  reason: string;
}

/**
 * The single determination. Callers may not compute their own.
 */
export function decideClaim(evidence: ClaimEvidence): ClaimDecision {
  if (!evidence.supported) {
    return {
      state: "INCONCLUSIVE",
      exitCode: EXIT_PARTIAL,
      reason: evidence.unsupportedReason
        ? `UNSUPPORTED: ${evidence.unsupportedReason}`
        : "UNSUPPORTED: this surface cannot make a claim about the target.",
    };
  }
  if (evidence.partial) {
    return {
      state: "INCONCLUSIVE",
      exitCode: EXIT_PARTIAL,
      reason:
        "PARTIAL: the analysis did not cover the whole surface, so no clean or blocking claim is made.",
    };
  }
  if (evidence.blockingFindings > 0) {
    return {
      state: "BLOCKED",
      exitCode: EXIT_FINDINGS,
      reason: `BLOCKED: ${evidence.blockingFindings} finding(s) at the configured gate.`,
    };
  }
  return {
    state: "READY",
    exitCode: EXIT_CLEAN,
    reason: "READY: complete analysis, no findings at the configured gate.",
  };
}

/**
 * Fail-closed for a surface that has no measurement of its own. A prototype
 * command that cannot measure must say so rather than render a plausible
 * number, and must not exit clean while doing it.
 */
export function unmeasuredClaim(surface: string, why: string): ClaimDecision {
  return {
    state: "INCONCLUSIVE",
    exitCode: EXIT_PARTIAL,
    reason: `UNMEASURED: ${surface} cannot measure this. ${why}`,
  };
}

/**
 * The gate level a command applies to its findings. `advisory` is the
 * `--blocking none` posture: findings are reported and never gate.
 */
export type GateLevel = "advisory" | "error" | "warning";

/**
 * The one exit-code matrix (plan V5-002).
 *
 * Every command that finishes an analysis routes its exit code through this
 * function. The previous arrangement had each surface compute its own, and
 * the gaps were not subtle:
 *
 *   - `--score` returned `exitForFindings(...)` with no `partial` check at
 *     all, so `--score` on a truncated scan with zero findings exited 0. That
 *     is the flag CI badge and baseline tooling use.
 *   - `exitForFindings` knew nothing about partial, so any caller that forgot
 *     the check silently produced a clean result.
 *
 * The order is the contract: an incomplete analysis is INCONCLUSIVE before
 * findings are considered at all. There is no gate setting that turns a
 * partial scan into a pass — `--blocking none` suppresses *findings*, not the
 * fact that the analysis did not finish.
 */
export function scanExitCode<T extends { severity: string }>(input: {
  /** False only when the analysis covered the whole surface. */
  partial: boolean;
  findings: readonly T[];
  gate: GateLevel;
  /** Advisory (E0) findings never gate at any level. */
  isAdvisory?: (finding: T) => boolean;
}): number {
  if (input.partial) return EXIT_PARTIAL;
  if (input.gate === "advisory") return EXIT_CLEAN;
  const gateSeverities: readonly string[] =
    input.gate === "warning" ? ["error", "warning"] : ["error"];
  return input.findings.some(
    (f) =>
      gateSeverities.includes(f.severity) && input.isAdvisory?.(f) !== true,
  )
    ? EXIT_FINDINGS
    : EXIT_CLEAN;
}

/**
 * The exit-code truth table, exported so the contract test asserts the same
 * values the code uses rather than a hand-copied duplicate that can drift.
 */
export const EXIT_MATRIX: ReadonlyArray<{
  partial: boolean;
  gate: GateLevel;
  findings: "none" | "error" | "warning";
  exitCode: number;
}> = [
  { partial: false, gate: "error", findings: "none", exitCode: EXIT_CLEAN },
  { partial: false, gate: "error", findings: "error", exitCode: EXIT_FINDINGS },
  { partial: false, gate: "error", findings: "warning", exitCode: EXIT_CLEAN },
  { partial: false, gate: "warning", findings: "none", exitCode: EXIT_CLEAN },
  {
    partial: false,
    gate: "warning",
    findings: "error",
    exitCode: EXIT_FINDINGS,
  },
  {
    partial: false,
    gate: "warning",
    findings: "warning",
    exitCode: EXIT_FINDINGS,
  },
  { partial: false, gate: "advisory", findings: "error", exitCode: EXIT_CLEAN },
  {
    partial: false,
    gate: "advisory",
    findings: "warning",
    exitCode: EXIT_CLEAN,
  },
  // Partial is INCONCLUSIVE at every gate. These four rows are the ones that
  // used to be green.
  { partial: true, gate: "error", findings: "none", exitCode: EXIT_PARTIAL },
  { partial: true, gate: "error", findings: "error", exitCode: EXIT_PARTIAL },
  { partial: true, gate: "warning", findings: "none", exitCode: EXIT_PARTIAL },
  { partial: true, gate: "advisory", findings: "none", exitCode: EXIT_PARTIAL },
] as const;
