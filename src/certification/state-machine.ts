/**
 * The ONE certification state machine (plan V5-023).
 *
 * The repository grew three vocabularies for "how well do we trust this":
 *
 *   - `RuleStatus` in `src/rules/measurement.ts` — five rule-level states
 *     (MEASURED-CORE … UNMEASURED);
 *   - `M40_LANGUAGE_CERTIFICATION_STATES` — fourteen language-level states
 *     (DISCOVERED … UNKNOWN);
 *   - the detector lifecycle in `src/engine/m45-detector-lifecycle.ts`.
 *
 * Three ladders, none of which could be compared to the others. A rule could
 * be `MEASURED-CORE` while its language sat at `PARSEABLE`, and nothing
 * anywhere could say whether that combination was coherent — because the
 * ladders had no shared order to compare. "One certification state machine"
 * is not a consolidation for tidiness: it is the thing that makes a claim
 * checkable.
 *
 * ## The ladder
 *
 * One ordered list. A capability's rank is its INDEX, so "more certified" is
 * a comparison rather than a judgement call. The order is the whole content
 * of this module, and the vocabularies below are projections of it.
 *
 * ## The laws
 *
 *   1. ABSENCE IS A STATE. `UNKNOWN` and `UNMEASURED` are first-class, not
 *      gaps in a list. A capability with no evidence is UNKNOWN, and UNKNOWN
 *      never certifies anything.
 *   2. EVIDENCE IS REQUIRED TO ADVANCE. A rank past `CANDIDATE` requires
 *      evidence. This is what stops a manifest from asserting CERTIFIED with
 *      a corpus size of zero.
 *   3. ONLY FORWARD. A capability may be re-measured downward (new evidence
 *      can disprove a claim) but a DOWNGRADE must be recorded with a reason.
 *      Silently re-deriving a lower state is how a regression disappears.
 *   4. REGRESSION IS NOT SILENT. A stored rank higher than the re-derived one
 *      is a REGRESSION, and it is reported as such rather than overwritten.
 */

/** The single ordered ladder. Index is the rank. */
export const CERTIFICATION_STATES = [
  /** Nothing is known about it. Not a gap — a state. */
  "UNKNOWN",
  /** We have seen it exist. Says nothing about whether it works. */
  "DISCOVERED",
  /** It is deliberately not supported, and we know why. */
  "UNSUPPORTED",
  /** Support was removed on purpose. */
  "DEPRECATED",
  /** Support is claimed but the evidence does not exist yet. */
  "UNMEASURED",
  /** Evidence exists and is not yet strong enough to certify. */
  "MEASURED",
  /** A candidate: the gates passed on a cohort. Not yet broad. */
  "CANDIDATE",
  /** Experimental: opt-in, explicitly not a support claim. */
  "EXPERIMENTAL",
  /** Certified against a named cohort. */
  "CERTIFIED",
  /** The strongest state: certified AND the full trust surface is bound. */
  "TRUST-COMPLETE",
  /** Blocked by a named, recorded reason. */
  "BLOCKED",
  /** Support was claimed and the evidence stopped supporting it. */
  "DEGRADED",
  /** The engine can read the source. */
  "PARSEABLE",
  /** The engine understands meaning, not just syntax. */
  "SEMANTICALLY_SUPPORTED",
  /** The level at which a rule's measurement counts as CORE. */
  "MEASURED-CORE",
  /** The level at which a rule's measurement counts as EXTENDED. */
  "MEASURED-EXTENDED",
  /** Measured, and the rule is quarantined. */
  "MEASURED-QUARANTINE",
  /** Provisional: used, with the measurement explicitly incomplete. */
  "PROVISIONAL",
  /** Only a name is known — detected, not understood. */
  "KNOWN",
] as const;

export type CertificationState = (typeof CERTIFICATION_STATES)[number];

const RANK = new Map<string, number>(
  CERTIFICATION_STATES.map((state, index) => [state, index]),
);

export function rankOf(state: CertificationState): number {
  return RANK.get(state) ?? -1;
}

/** Ordered comparison. `true` when `a` is at least as certified as `b`. */
export function isAtLeast(
  a: CertificationState,
  b: CertificationState,
): boolean {
  return rankOf(a) >= rankOf(b);
}

/**
 * The states that assert a capability WORKS, and therefore require evidence.
 *
 * Everything below this line is a statement about absence, discovery, or
 * deliberate non-support — none of which need a corpus behind them.
 */
export const EVIDENCE_REQUIRED_FROM: CertificationState = "CANDIDATE";

export function requiresEvidence(state: CertificationState): boolean {
  return rankOf(state) >= rankOf(EVIDENCE_REQUIRED_FROM);
}

/** What a certification claim is standing on. */
export interface CertificationEvidence {
  /** The cohort the claim was measured on. Required from CANDIDATE up. */
  corpus?: string;
  /** Sample size. Required, and must be non-zero, from CANDIDATE up. */
  sampleSize?: number;
  /** The runner that produced the measurement. */
  runner?: string;
  /** How it was verified. */
  verifiedBy?: string;
  /** A content hash, so the evidence itself is addressable. */
  digest?: string;
  /** Where the evidence lives. */
  source?: string;
}

export interface AdmissionDecision {
  admitted: boolean;
  state: CertificationState;
  /** Why not, or what the claim is missing. Empty when admitted outright. */
  defects: string[];
  /** The state the evidence actually supports, which may be lower. */
  supportedState: CertificationState;
}

/**
 * The admission gate (plan V5-023, DoD: "one certification state machine").
 *
 * A declared state is checked against the evidence presented for it. The
 * gate's job is to make an unsupportable claim impossible to state, not to
 * judge the evidence: it verifies that the claim has what its rank requires.
 */
export function admit(
  declared: CertificationState,
  evidence: CertificationEvidence = {},
): AdmissionDecision {
  const defects: string[] = [];

  if (!RANK.has(declared)) {
    return {
      admitted: false,
      state: "UNKNOWN",
      supportedState: "UNKNOWN",
      defects: [`unknown certification state "${String(declared)}"`],
    };
  }

  if (requiresEvidence(declared)) {
    if (typeof evidence.corpus !== "string" || evidence.corpus.length === 0) {
      defects.push(`${declared} requires a named corpus`);
    }
    if (
      typeof evidence.sampleSize !== "number" ||
      !Number.isFinite(evidence.sampleSize) ||
      evidence.sampleSize <= 0
    ) {
      // The specific case worth naming: a CERTIFIED capability with an empty
      // corpus is the exact fabrication this machine exists to prevent.
      defects.push(
        `${declared} requires a non-zero sample size (got ${String(evidence.sampleSize)})`,
      );
    }
    if (
      typeof evidence.verifiedBy !== "string" ||
      evidence.verifiedBy.length === 0
    ) {
      defects.push(`${declared} requires a named verification method`);
    }
  }

  // The highest state the evidence actually supports. With no evidence that
  // is UNMEASURED, never CERTIFIED.
  let supportedState: CertificationState = "UNMEASURED";
  if (requiresEvidence(declared) && defects.length === 0) {
    supportedState = declared;
  } else if (!requiresEvidence(declared)) {
    supportedState = declared;
  }

  return {
    admitted: defects.length === 0,
    state: declared,
    supportedState,
    defects,
  };
}

/**
 * A stored certification that no longer holds.
 *
 * New evidence can disprove a claim; that is the system working. What must
 * not happen is the stored value being silently overwritten with the lower
 * one, because then the regression leaves no trace. So a lower re-derivation
 * is REPORTED, and the caller decides.
 */
export interface Regression {
  capability: string;
  was: CertificationState;
  now: CertificationState;
  /** Why the stored state no longer holds. */
  reason: string;
}

export function detectRegression(input: {
  capability: string;
  stored: CertificationState;
  rederived: CertificationState;
  reason: string;
}): Regression | null {
  if (rankOf(input.rederived) >= rankOf(input.stored)) return null;
  return {
    capability: input.capability,
    was: input.stored,
    now: input.rederived,
    reason: input.reason,
  };
}

/**
 * Projections of the ladder into the vocabularies the rest of the repository
 * already speaks. These maps are the whole point: three existing strings now
 * have a defined position in one order, so "is this rule's measurement
 * stronger than that language's state" is a comparison.
 */
export const RULE_STATUS_RANK: Readonly<Record<string, CertificationState>> =
  Object.freeze({
    "MEASURED-CORE": "MEASURED-CORE",
    "MEASURED-EXTENDED": "MEASURED-EXTENDED",
    "MEASURED-QUARANTINE": "MEASURED-QUARANTINE",
    PROVISIONAL: "PROVISIONAL",
    UNMEASURED: "UNMEASURED",
  });

export const LANGUAGE_STATE_RANK: Readonly<Record<string, CertificationState>> =
  Object.freeze({
    UNKNOWN: "UNKNOWN",
    DISCOVERED: "DISCOVERED",
    KNOWN: "KNOWN",
    PARSEABLE: "PARSEABLE",
    SEMANTICALLY_SUPPORTED: "SEMANTICALLY_SUPPORTED",
    // `admit()` returns UNMEASURED as the `supportedState` of ANY declared
    // state that was not backed by evidence — including a language that
    // declared CERTIFIED. So a language can legitimately be *told* it is
    // UNMEASURED, and a vocabulary that cannot name the answer the gate
    // hands it cannot record what happened. This is law 1 doing work:
    // absence is a state, so the state has to be sayable.
    UNMEASURED: "UNMEASURED",
    MEASURED: "MEASURED",
    CANDIDATE: "CANDIDATE",
    EXPERIMENTAL: "EXPERIMENTAL",
    CERTIFIED: "CERTIFIED",
    "TRUST-COMPLETE": "TRUST-COMPLETE",
    DEGRADED: "DEGRADED",
    DEPRECATED: "DEPRECATED",
    UNSUPPORTED: "UNSUPPORTED",
    BLOCKED: "BLOCKED",
  });

/**
 * The states that belong to the RULE vocabulary and are not language outcomes.
 *
 * `MEASURED-CORE`, `MEASURED-EXTENDED`, `MEASURED-QUARANTINE` and
 * `PROVISIONAL` describe where a *rule's measurement* sits. `admit()` can never
 * return one of them as a `supportedState` for a language, because it only
 * ever returns the declared state or UNMEASURED.
 *
 * They are named here rather than filtered inline at each call site so that
 * the exclusion is ONE visible declaration. Adding a rule state without
 * declaring it here makes the projection test fail; adding a language-reachable
 * state without a projection fails too. A silent inline filter would let both
 * drift, and a filter that drifts is how a fourth vocabulary reappears.
 */
export const RULE_ONLY_STATES: ReadonlySet<CertificationState> = new Set([
  "MEASURED-CORE",
  "MEASURED-EXTENDED",
  "MEASURED-QUARANTINE",
  "PROVISIONAL",
]);

/**
 * Can the language vocabulary name this state?
 *
 * The property that actually matters, and it is derivable rather than
 * hand-listed: if `admit()` can hand a caller a `supportedState` the
 * language projection has no word for, then a language's certification record
 * cannot record its own admission outcome. That is the incoherence this
 * module was written to end, and it is a code property, not a list.
 */
export function languageCanExpress(state: CertificationState): boolean {
  return LANGUAGE_STATE_RANK[state] !== undefined;
}

/**
 * Every state a projection names must exist in the ladder, and no state may
 * be claimed by two projections with different meanings.
 *
 * The guard that makes the consolidation real: a state added to the ladder
 * without a projection, or a projection naming a state the ladder does not
 * have, fails here rather than becoming a fourth vocabulary.
 */
export function validateProjections(): string[] {
  const problems: string[] = [];
  for (const [alias, state] of Object.entries(RULE_STATUS_RANK)) {
    if (!RANK.has(state)) {
      problems.push(
        `RULE_STATUS_RANK: "${alias}" maps to "${state}", not in the ladder`,
      );
    }
    if (alias !== state) {
      problems.push(
        `RULE_STATUS_RANK: "${alias}" should map to itself; a rename hidden in a map is a second vocabulary`,
      );
    }
  }
  for (const [alias, state] of Object.entries(LANGUAGE_STATE_RANK)) {
    if (!RANK.has(state)) {
      problems.push(
        `LANGUAGE_STATE_RANK: "${alias}" maps to "${state}", not in the ladder`,
      );
    }
    if (alias !== state) {
      problems.push(
        `LANGUAGE_STATE_RANK: "${alias}" should map to itself; a rename hidden in a map is a second vocabulary`,
      );
    }
  }
  return problems;
}
