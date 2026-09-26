/**
 * The ONE answer to "what does this run prove?".
 *
 * The decision used to live in `src/reporter/trust-report.ts` as
 * `trustHeadline()` — a band mapping over (level, confidence) — and five
 * surfaces each re-derived something adjacent to it. That is the wrong place
 * for it on two counts:
 *
 *   - it is ENGINE knowledge, not presentation. A reporter that decides is a
 *     reporter that can be the only place the decision exists, and the next
 *     surface to need it will write its own; and
 *   - a reporter deciding means the CI gate and the PR comment can disagree,
 *     because they read different code. The whole point of one truth is that
 *     they cannot.
 *
 * So the determination lives here, next to the summary it decides from, and
 * the reporter renders whatever this says.
 *
 * ## The law
 *
 * A run that did not finish cannot prove anything, whatever its level says.
 * That check comes FIRST — the same ordering the exit matrix uses, and for
 * the same reason: the completeness of an analysis is a precondition for any
 * claim about what it found.
 */

import type { ScanResult, TrustSummary } from "../types.js";
import { TRUST_ORDER } from "../types.js";

/**
 * What the evidence supports. Deliberately NOT a verdict enum: this is a
 * description of the evidence, and the surfaces turn it into whatever language
 * they need. Inventing a new global enum here would be the exact sprawl this
 * consolidation removes.
 */
export type TrustClaim =
  /** Corroborated by a real run, and the analysis was complete. */
  | "RUN_EVIDENCE_BACKS_FINDINGS"
  /** A run executed the relevant files; the analysis was complete. */
  | "RUNTIME_CORROBORATED"
  /** Deterministic static analysis, complete, uncorroborated by any run. */
  | "DETERMINISTIC_STATIC"
  /** Complete static analysis whose confidence is low. Treat as leads. */
  | "THIN_STATIC_SIGNAL"
  /** The analysis did not finish, so nothing is proven either way. */
  | "INCOMPLETE"
  /** Nothing was analyzed, or nothing ran. An observation, not a verdict. */
  | "NO_EVIDENCE";

export interface TrustClassification {
  claim: TrustClaim;
  /** A level-derived ordering key, so surfaces can rank without re-deciding. */
  order: number;
  /** Whether this claim licenses a clean-result assertion. */
  licensesClean: boolean;
  /** One line, safe to print in any surface. */
  reason: string;
  /** The concrete gaps that hold the claim back. Empty when nothing does. */
  gaps: string[];
}

/**
 * Completeness, decided once.
 *
 * Every branch here treats ABSENCE as "not proven complete" rather than as
 * "complete". That is the whole point: a missing `analysisStatus` is not a
 * clean bill of health, a zero ceiling reason is not a claim, and treating
 * either as completeness is how an unmeasured run gets to say "trust them".
 */
function isComplete(result: ScanResult, summary: TrustSummary): boolean {
  if (result.partial) return false;
  // A confidence ceiling means the measurement was capped — something bounded
  // what this run could conclude, which is an incompleteness.
  if (summary.ceilingReasons.length > 0) return false;
  const status = result.analysisStatus;
  // Absent status: the report says nothing about how far the scan got, so it
  // cannot be read as a complete scan.
  if (status === undefined) return false;
  if (status.discovery !== "complete" || status.rules !== "complete")
    return false;
  if ((status.skippedFiles ?? 0) > 0) return false;
  if ((status.rulesCrashed ?? 0) > 0) return false;
  return (status.reasons ?? []).length === 0;
}

/**
 * The determination. Every surface calls this; none of them re-derives it.
 */
export function classifyTrust(
  result: ScanResult,
  summary: TrustSummary,
): TrustClassification {
  const gaps: string[] = [];
  const complete = isComplete(result, summary);

  if (result.partial) gaps.push("the scan was partial");
  const status = result.analysisStatus;
  if (status === undefined) {
    gaps.push(
      "the report carries no analysisStatus, so completeness is unknown",
    );
  } else {
    if (status.discovery !== "complete") gaps.push("discovery was truncated");
    if (status.rules !== "complete") gaps.push("rule evaluation was truncated");
    if ((status.skippedFiles ?? 0) > 0) {
      gaps.push(`${status.skippedFiles} file(s) were skipped`);
    }
    if ((status.rulesCrashed ?? 0) > 0) {
      gaps.push(`${status.rulesCrashed} rule(s) crashed`);
    }
    for (const reason of status.reasons ?? []) {
      if (!gaps.some((g) => g.includes(reason))) gaps.push(reason);
    }
  }
  for (const ceiling of summary.ceilingReasons) {
    gaps.push(`confidence ceiling: ${ceiling}`);
  }

  // Precondition first. An incomplete analysis says nothing about what it
  // would have found, and that is true regardless of level or confidence.
  if (!complete) {
    return {
      claim: "INCOMPLETE",
      order: 0,
      licensesClean: false,
      reason:
        "the analysis did not finish, so it proves nothing about the surface it did not reach",
      gaps,
    };
  }

  const level = summary.level;
  const rank = TRUST_ORDER.indexOf(level);
  const confident = summary.confidence >= 0.75;

  if (rank >= TRUST_ORDER.indexOf("L4")) {
    return {
      claim: "RUN_EVIDENCE_BACKS_FINDINGS",
      order: 5,
      licensesClean: result.findings.length > 0,
      reason: confident
        ? "a real run corroborates these findings"
        : "a run exists but coverage is thin — verify the gaps",
      gaps,
    };
  }
  if (rank >= TRUST_ORDER.indexOf("L3")) {
    return {
      claim: "RUNTIME_CORROBORATED",
      order: 4,
      licensesClean: result.findings.length > 0,
      reason: confident
        ? "the relevant files executed — static and runtime signal agree"
        : "files executed, but evidence is thin — treat findings as leads",
      gaps,
    };
  }
  if (level === "L0" || summary.evidenceCoverage === 0) {
    return {
      claim: "NO_EVIDENCE",
      order: 1,
      // Zero runtime evidence means an empty result is an OBSERVATION. It is
      // the one complete-and-clean case that still must not read as proven.
      licensesClean: false,
      reason:
        "static signal only, with no runtime evidence — an observation, not a verdict",
      gaps,
    };
  }
  if (confident) {
    return {
      claim: "DETERMINISTIC_STATIC",
      order: 3,
      licensesClean: true,
      reason:
        "deterministic static analysis, complete but uncorroborated by a run",
      gaps,
    };
  }
  return {
    claim: "THIN_STATIC_SIGNAL",
    order: 2,
    licensesClean: true,
    reason:
      "static analysis is complete but low-confidence — treat findings as leads",
    gaps,
  };
}

/** A surface that has no summary to classify reports INCOMPLETE, never clean. */
export function unclassifiable(reason: string): TrustClassification {
  return {
    claim: "INCOMPLETE",
    order: 0,
    licensesClean: false,
    reason,
    gaps: [reason],
  };
}
