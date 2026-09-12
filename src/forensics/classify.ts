/**
 * Forensic Verdict Taxonomy + Contradiction Handling (growth roadmap
 * §6/§19-20 WI-18; remediation plan §9 R6, executed under the Trust
 * Constitution's state model).
 *
 * The canonical verdict set (forensics-domain metadata, NOT a global
 * verdict enum): likely-real-defect · environmental-failure ·
 * infrastructure-failure · flaky (TRUE-FLAKE) · retry-dependent ·
 * unstable-construction · inconclusive (the default whenever the evidence
 * is insufficient — a single weak signal can never classify confidently).
 *
 * The evidence-state vocabulary (roadmap §5, mandatory when the source
 * supports the signal): evidence exists · absent · unsupported ·
 * contradictory · insufficient. Missing evidence is NEVER negative
 * evidence (Constitution §9.1; roadmap §5 end).
 *
 * Deterministic minimum-signal table: each verdict requires its named
 * minimum signal; where signal families conflict the classification is
 * inconclusive with evidence-state "contradictory" — explicit, never
 * guessed. Contract H (roadmap §5): runtime corroboration may RAISE
 * confidence but can never silently weaken a static claim; a
 * contradiction is reconciled into an explicit inconclusive pairing.
 *
 * Pure and offline: inputs are machine-visible facts (test-record
 * facts + error text markers), never model judgment.
 */

import type { TestVerdict } from "./types.js";

export const FORENSIC_VERDICTS = [
  "likely-real-defect",
  "environmental-failure",
  "infrastructure-failure",
  "flaky",
  "retry-dependent",
  "unstable-construction",
  "inconclusive",
] as const;
export type ForensicVerdict = (typeof FORENSIC_VERDICTS)[number];

export const EVIDENCE_STATES = [
  "exists",
  "absent",
  "unsupported",
  "contradictory",
  "insufficient",
] as const;
export type ForensicEvidenceState = (typeof EVIDENCE_STATES)[number];

/**
 * Strong-signal marker tables. Kept deliberately narrow: a marker here
 * is a named family fact, not a vibe. Unknown text yields no signal —
 * unknown is "insufficient", never a silent classification.
 */
const ENVIRONMENTAL_MARKERS = [
  /browser not found/i,
  /executable doesn.t exist/i,
  /port is already (in use|allocated)/i,
  /missing env(ironment)? (variable|: )/i,
];
const INFRASTRUCTURE_MARKERS = [
  /\bECONNREFUSED\b/,
  /\bconnection refused\b/i,
  /\bENOTFOUND\b/,
  /\bEAI_AGAIN\b/,
  /\bETIMEDOUT\b.+\b(connect|request|network)\b/i,
  /\b50[234]\b.+\b(gateway|bad gateway|service unavailable)\b/i,
  /session (revoked|terminated|closed)/i,
];
const CONSTRUCTION_MARKERS = [
  /waiting for (selector|locator|element)/i,
  /element is not (attached|visible|enabled)/i,
  /strict mode violation/i,
  /Test timeout of \d+ms exceeded.*waiting/i,
];

export interface ForensicSignals {
  /** The executed-test facts the Evidence Core already derives. */
  verdict: Pick<
    TestVerdict,
    "attempts" | "finalStatus" | "passedOnRetry" | "everFailed" | "skipped"
  >;
  /** Error texts across attempts (empty array = the source carries none). */
  errorTexts: string[];
  /** True when the evidence source CANNOT carry error texts (e.g.
   * JUnit class-name reports): signal families are UNSUPPORTED, not absent. */
  errorTextsUnsupported?: boolean;
}

export interface ForensicClassification {
  verdict: ForensicVerdict;
  evidenceState: ForensicEvidenceState;
  /** Which signal family won (audit trail for the classification). */
  signals: {
    environmental: number;
    infrastructure: number;
    construction: number;
  };
}

function matchCount(text: string, table: readonly RegExp[]): number {
  return table.some((re) => re.test(text)) ? 1 : 0;
}

function countMarkers(
  texts: string[],
  tables: readonly [readonly RegExp[], readonly RegExp[], readonly RegExp[]],
): { environmental: number; infrastructure: number; construction: number } {
  const [envTable, infraTable, constrTable] = tables;
  const out = { environmental: 0, infrastructure: 0, construction: 0 };
  for (const t of texts) {
    out.environmental += matchCount(t, envTable);
    out.infrastructure += matchCount(t, infraTable);
    out.construction += matchCount(t, constrTable);
  }
  return out;
}

/**
 * The deterministic minimum-signal table (roadmap §20): apply in order,
 * the first satisfied rule classifies; conflicting signal families force
 * inconclusive/contradictory; nothing satisfied is inconclusive/
 * insufficient or absent as the source dictates.
 */
export function classifyForensicVerdict(
  signals: ForensicSignals,
): ForensicClassification {
  const v = signals.verdict;
  const noErrors =
    signals.errorTexts.length === 0 && signals.errorTextsUnsupported !== true;
  const base = {
    environmental: 0,
    infrastructure: 0,
    construction: 0,
  };

  // Rule 1 (strongest, named fact): TRUE-FLAKE is its own verdict.
  if (v.skipped) {
    return {
      verdict: "inconclusive",
      evidenceState: "insufficient",
      signals: base,
    };
  }
  if (v.passedOnRetry) {
    return { verdict: "flaky", evidenceState: "exists", signals: base };
  }

  const signalCounts = signals.errorTextsUnsupported
    ? { environmental: 0, infrastructure: 0, construction: 0 }
    : countMarkers(signals.errorTexts, [
        ENVIRONMENTAL_MARKERS,
        INFRASTRUCTURE_MARKERS,
        CONSTRUCTION_MARKERS,
      ]);
  const {
    environmental: env,
    infrastructure: infra,
    construction: constr,
  } = signalCounts;
  const families = [env, infra, constr].filter((n) => n > 0).length;

  // Rule 2: conflicting signal families — INCONCLUSIVE, explicit.
  if (families > 1) {
    return {
      verdict: "inconclusive",
      evidenceState: "contradictory",
      signals: signalCounts,
    };
  }
  // Rule 3: a single named family on a failing test classifies.
  if (v.finalStatus === "failed" || v.finalStatus === "timedOut") {
    if (env > 0)
      return {
        verdict: "environmental-failure",
        evidenceState: "exists",
        signals: signalCounts,
      };
    if (infra > 0)
      return {
        verdict: "infrastructure-failure",
        evidenceState: "exists",
        signals: signalCounts,
      };
    if (constr > 0)
      return {
        verdict: "unstable-construction",
        evidenceState: "exists",
        signals: signalCounts,
      };
  }
  // Rule 4: retried but persistently failing — retry-dependent.
  if (v.attempts > 1 && v.finalStatus === "failed") {
    return {
      verdict: "retry-dependent",
      evidenceState: "exists",
      signals: signalCounts,
    };
  }
  // Rule 5: a single-attempt deterministic failure, no competing family:
  // likely-real-defect. The table requires a final failure AND (for the
  // "likely" label) at least one corroborating run attempt set.
  if (v.finalStatus === "failed" && v.everFailed && !noErrors) {
    return {
      verdict: "likely-real-defect",
      evidenceState: "exists",
      signals: signalCounts,
    };
  }
  // Rule 6: insufficient vs absent per the source's capability.
  return {
    verdict: "inconclusive",
    evidenceState:
      signals.errorTextsUnsupported === true
        ? "unsupported"
        : noErrors
          ? "insufficient"
          : "exists",
    signals: signalCounts,
  };
}

export type ContradictionOutcome =
  "corroborates" | "contradicts" | "insufficient";

export interface StaticClaimReconciliation {
  outcome: ContradictionOutcome;
  /**
   * Contract H: the static claim's strength is NEVER downgraded by the
   * runtime — this field reflects what the runtime DOES prove: it can
   * corroborate (raise the trust rung) or conflict (render the PAIR
   * inconclusive for action). The static finding itself is untouched.
   */
  staticClaimPreserved: true;
  /** The reconciled action-safety label for the pair. */
  reconciledClassification: ForensicVerdict | null;
}

/**
 * Reconcile a static claim with runtime execution facts (roadmap §5/§6 —
 * WI-18 "static never silently weakened"). runtimeOutcome:
 *  - undefined  → insufficient (missing evidence ≠ negative evidence)
 *  - "passed"   → corroborates when the static claim predicted
 *    unreliability that also PASSED sometimes (flaky-class claims);
 *    otherwise contradicts (the runtime never observed the predicted
 *    failure — the PAIR is inconclusive, the static claim stands).
 *  - "failed"/"timedOut" → corroborates a defect-class claim.
 */
export function reconcileStaticWithRuntime(
  claimPredictsFailure: boolean,
  runtimeOutcome: "passed" | "failed" | "timedOut" | "flaky" | undefined,
): StaticClaimReconciliation {
  if (runtimeOutcome === undefined) {
    return {
      outcome: "insufficient",
      staticClaimPreserved: true,
      reconciledClassification: null,
    };
  }
  const failureObserved =
    runtimeOutcome === "failed" ||
    runtimeOutcome === "timedOut" ||
    runtimeOutcome === "flaky";
  if (claimPredictsFailure && failureObserved) {
    return {
      outcome: "corroborates",
      staticClaimPreserved: true,
      reconciledClassification:
        runtimeOutcome === "flaky" ? "flaky" : "likely-real-defect",
    };
  }
  if (claimPredictsFailure && runtimeOutcome === "passed") {
    // Contradiction: explicit, never silent — the pair is inconclusive
    // for action purposes; the static claim keeps its own evidence rung.
    return {
      outcome: "contradicts",
      staticClaimPreserved: true,
      reconciledClassification: "inconclusive",
    };
  }
  // Claim about hygiene (predictsFailure = false): passing runtime agrees
  // with "not a defect"; failures neither prove nor disprove it.
  return {
    outcome: runtimeOutcome === "passed" ? "corroborates" : "insufficient",
    staticClaimPreserved: true,
    reconciledClassification: null,
  };
}
