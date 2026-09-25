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
