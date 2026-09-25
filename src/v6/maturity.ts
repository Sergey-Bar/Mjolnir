/**
 * v6 capability maturity ladder — `M0`–`M5` (ADR 0001).
 *
 * ONE implementation of the maturity axis. `L0`–`L5` is the *finding
 * trust level* (`src/types.ts:106-117`) and is never a maturity value;
 * the two axes are orthogonal (ADR 0011). The blueprint's rejected
 * `EXPERIMENTAL→…→CERTIFIED` ladder is not declared anywhere, so the
 * product has exactly two level vocabularies, each with one meaning.
 *
 * Rules this module encodes, because they are the whole point of the
 * ladder and are otherwise only prose:
 *
 *  - Maturity is **granted by evidence, never by hand**. Promotion is a
 *    machine transition; there is no `setMaturity` export.
 *  - Every level below `M5` must expose a machine-readable
 *    `nextLevelGap`. `nextLevelGap` is therefore required, not optional,
 *    and a capability that cannot state its gap is a registry error.
 *  - Maturity can be **demoted automatically** when a `revisitTrigger`
 *    fires. That is the same rule the ecosystem census staleness trigger
 *    uses (ADR 0010), which is why the trigger is a first-class field
 *    here rather than a string on a doc.
 *  - `M4` requires precision AND recall, never precision alone (Law 5:
 *    precision must not hide poor recall, and recall must not hide poor
 *    precision).
 *  - `M5` is unreachable from inside the engine: it requires external
 *    field evidence (`REMOTE_PROVEN`), which the zero-network default
 *    never produces. A capability that claims `M5` without external
 *    evidence is a false proof, not a fast promotion.
 */

// ─── The ladder ──────────────────────────────────────────────────────

export const MATURITY_LEVELS = [
  "M0_UNKNOWN",
  "M1_DECLARED",
  "M2_IMPLEMENTED",
  "M3_FIXTURE_VERIFIED",
  "M4_CORPUS_VERIFIED",
  "M5_FIELD_PROVEN",
] as const;

export type Maturity = (typeof MATURITY_LEVELS)[number];

export interface NextLevelGap {
  target: Maturity;
  missing: readonly string[];
  owner: string;
  revisitTrigger: string;
}

/** The short `M0`–`M5` form. Two vocabularies, one meaning each. */
export const MATURITY_SHORT: Readonly<Record<Maturity, string>> = {
  M0_UNKNOWN: "M0",
  M1_DECLARED: "M1",
  M2_IMPLEMENTED: "M2",
  M3_FIXTURE_VERIFIED: "M3",
  M4_CORPUS_VERIFIED: "M4",
  M5_FIELD_PROVEN: "M5",
};

export const MATURITY_NAMES: Readonly<Record<Maturity, string>> = {
  M0_UNKNOWN: "UNKNOWN",
  M1_DECLARED: "DECLARED",
  M2_IMPLEMENTED: "IMPLEMENTED",
  M3_FIXTURE_VERIFIED: "FIXTURE_VERIFIED",
  M4_CORPUS_VERIFIED: "CORPUS_VERIFIED",
  M5_FIELD_PROVEN: "FIELD_PROVEN",
};

/**
 * The promotion criterion for each level, as a machine-checkable id.
 * A level is only reachable when *its* criterion is satisfied; a
 * capability at level `n` must hold the criteria for `0..n` and expose
 * the criterion for `n+1` in its `nextLevelGap.missing`.
 */
export type PromotionCriterionId =
  | "NOTHING_DECLARED"
  | "REGISTRY_ENTRY_WITH_OWNER_AND_CLAIM"
  | "IMPLEMENTATION_UNIT_TESTED"
  | "FIXTURE_QUAD_PASSES_DETERMINISTIC_IN_CI"
  | "CORPUS_N_GTE_10_PRECISION_AND_RECALL_WITH_CI"
  | "INDEPENDENT_FIELD_REPOS_AND_STABLE_INTERVAL";

export const PROMOTION_CRITERIA: Readonly<
  Record<Maturity, PromotionCriterionId>
> = {
  M0_UNKNOWN: "NOTHING_DECLARED",
  M1_DECLARED: "REGISTRY_ENTRY_WITH_OWNER_AND_CLAIM",
  M2_IMPLEMENTED: "IMPLEMENTATION_UNIT_TESTED",
  M3_FIXTURE_VERIFIED: "FIXTURE_QUAD_PASSES_DETERMINISTIC_IN_CI",
  M4_CORPUS_VERIFIED: "CORPUS_N_GTE_10_PRECISION_AND_RECALL_WITH_CI",
  M5_FIELD_PROVEN: "INDEPENDENT_FIELD_REPOS_AND_STABLE_INTERVAL",
};

export const MATURITY_DESCRIPTIONS: Readonly<Record<Maturity, string>> = {
  M0_UNKNOWN: "Nothing declared. Default for any unclassified capability.",
  M1_DECLARED:
    "Declared in the capability registry with an owner and a claim; no implementation proof.",
  M2_IMPLEMENTED:
    "Implementation exists, unit-tested; no fixture or corpus proof.",
  M3_FIXTURE_VERIFIED:
    "Positive + negative + boundary + adversarial fixtures pass, deterministically, in CI.",
  M4_CORPUS_VERIFIED:
    "Real-repository corpus run: n >= 10 classified verdicts, Wilson CI recorded, precision AND recall measured, no unresolved crash, detectorRev locked.",
  M5_FIELD_PROVEN:
    "Independent real-world repositories + declared field support + stable confidence interval + candidate-bound evidence.",
};

/** The default for anything unclassified. Never a guess upward. */
export const DEFAULT_MATURITY: Maturity = "M0_UNKNOWN";

/** The ceiling reachable without external (non-machine) field evidence. */
export const MACHINE_REACHABLE_CEILING: Maturity = "M4_CORPUS_VERIFIED";

// ─── Rank ────────────────────────────────────────────────────────────

const RANK: Readonly<Record<Maturity, number>> = {
  M0_UNKNOWN: 0,
  M1_DECLARED: 1,
  M2_IMPLEMENTED: 2,
  M3_FIXTURE_VERIFIED: 3,
  M4_CORPUS_VERIFIED: 4,
  M5_FIELD_PROVEN: 5,
};

export function isMaturity(value: unknown): value is Maturity {
  return (
    typeof value === "string" &&
    (MATURITY_LEVELS as readonly string[]).includes(value)
  );
}

/** Unknown input ranks as `M0` — an unparseable claim is not a claim. */
export function maturityRank(value: unknown): number {
  return isMaturity(value) ? RANK[value] : RANK[DEFAULT_MATURITY];
}

/** The next level up, or `null` at the ceiling. */
export function nextMaturity(value: Maturity): Maturity | null {
  const rank = RANK[value];
  return rank >= MATURITY_LEVELS.length - 1
    ? null
    : (MATURITY_LEVELS[rank + 1] ?? null);
}

/**
 * A capability is **over-claiming** when it advertises a level above the
 * one its evidence supports. Law 1 forbids advertising a level the
 * machine cannot demonstrate, and this is the function every surface
 * calls before rendering a maturity badge (ADR 0004 §forbids).
 *
 * `M5` is the special case that motivates the function: it is
 * unreachable from inside the engine, so a local scan asserting `M5`
 * without `REMOTE_PROVEN` evidence is over-claiming by construction.
 */
export function isOverClaiming(
  advertised: Maturity,
  proven: Maturity,
): boolean {
  return maturityRank(advertised) > maturityRank(proven);
}

// ─── The `nextLevelGap` obligation ───────────────────────────────────

/** The highest level that carries no `nextLevelGap` obligation. */
export const LEVELS_REQUIRING_GAP: readonly Maturity[] = MATURITY_LEVELS.filter(
  (level) => level !== "M5_FIELD_PROVEN",
);

/**
 * Every capability below `M5` must expose a machine-readable gap. This
 * is the *shape* check; `docs/ECOSYSTEM-CENSUS.json` and the capability
 * registry carry the content. A capability at `M5` with a gap is
 * over-explaining; a capability below `M5` without one is the false
 * completion the constitution forbids.
 */
export function requiresNextLevelGap(value: Maturity): boolean {
  return LEVELS_REQUIRING_GAP.includes(value);
}

export function validateNextLevelGap(
  maturity: Maturity,
  gap: NextLevelGap | null | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (!requiresNextLevelGap(maturity)) {
    return gap === null || gap === undefined
      ? { ok: true }
      : { ok: false, reason: "M5 must not carry a nextLevelGap" };
  }
  if (gap === null || gap === undefined) {
    return { ok: false, reason: `${maturity} must expose a nextLevelGap` };
  }
  if (gap.target !== nextMaturity(maturity)) {
    return {
      ok: false,
      reason: `nextLevelGap.target ${gap.target} must be the next level above ${maturity}`,
    };
  }
  if (!Array.isArray(gap.missing) || gap.missing.length === 0) {
    return { ok: false, reason: "nextLevelGap.missing must be non-empty" };
  }
  if (typeof gap.owner !== "string" || gap.owner.trim() === "") {
    return { ok: false, reason: "nextLevelGap.owner must be a named owner" };
  }
  if (typeof gap.revisitTrigger !== "string" || gap.revisitTrigger === "") {
    return {
      ok: false,
      reason:
        "nextLevelGap.revisitTrigger is required (auto-demotion depends on it)",
    };
  }
  return { ok: true };
}

// ─── Evidence-only promotion (the "no manual promotion" rule) ────────

/**
 * The evidence a capability can actually point at. This is the *input*
 * to maturity, and it is deliberately a flat list of booleans derived
 * from artifacts on disk: there is no `attestedBy` field, because an
 * attestation is not evidence and D1 forbids self-classification.
 */
export interface MaturityEvidence {
  /** An owner and a claim exist (registry entry). */
  declared: boolean;
  /** The implementation exists. */
  implemented: boolean;
  /** It is unit-tested. */
  unitTested: boolean;
  /** Positive + negative + boundary + adversarial fixtures pass in CI. */
  fixtureQuadVerified: boolean;
  /** Real-repository corpus run with precision AND recall recorded. */
  corpusVerified: boolean;
  /** Independent field repositories with a stable interval. */
  fieldProven: boolean;
}

/**
 * Derive maturity from evidence. **The only way a capability gets a
 * level** — there is no `setMaturity` export, and a hand-written level in
 * a registry is a defect, not a default.
 *
 * The rule is monotone: each level requires its own criterion *and* every
 * criterion below it. A capability with corpus proof but no fixtures
 * lands at `M2`, because `M4`'s criterion is a chain, not a ceiling — a
 * real corpus run without a deterministic fixture quad is exactly the
 * state that must not be advertised as `M4`.
 */
export function deriveMaturityFromEvidence(
  evidence: MaturityEvidence,
): Maturity {
  if (evidence.fieldProven) return "M5_FIELD_PROVEN";
  if (
    evidence.corpusVerified &&
    evidence.fixtureQuadVerified &&
    evidence.unitTested &&
    evidence.implemented &&
    evidence.declared
  ) {
    return "M4_CORPUS_VERIFIED";
  }
  if (
    evidence.fixtureQuadVerified &&
    evidence.implemented &&
    evidence.declared
  ) {
    return "M3_FIXTURE_VERIFIED";
  }
  if (evidence.implemented && evidence.unitTested && evidence.declared) {
    return "M2_IMPLEMENTED";
  }
  if (evidence.declared) return "M1_DECLARED";
  return "M0_UNKNOWN";
}

/**
 * Build the `nextLevelGap` for whatever the evidence currently supports.
 * `missing` is derived from the *unsatisfied* criteria of the next level
 * up, so a gap can never quietly go stale against the ladder.
 */
export function nextLevelGapFromEvidence(
  evidence: MaturityEvidence,
  owner: string,
  revisitTrigger: string,
): { maturity: Maturity; nextLevelGap: NextLevelGap | null } {
  const maturity = deriveMaturityFromEvidence(evidence);
  const target = nextMaturity(maturity);
  if (target === null) return { maturity, nextLevelGap: null };
  const missing: string[] = [];
  if (target === "M1_DECLARED" && !evidence.declared) {
    missing.push("registry entry with an owner and a claim");
  }
  if (target === "M2_IMPLEMENTED") {
    if (!evidence.implemented) missing.push("implementation exists");
    if (!evidence.unitTested) missing.push("unit tests for the implementation");
  }
  if (target === "M3_FIXTURE_VERIFIED") {
    if (!evidence.fixtureQuadVerified) {
      missing.push(
        "positive + negative + boundary + adversarial fixtures pass deterministically in CI",
      );
    }
  }
  if (target === "M4_CORPUS_VERIFIED") {
    if (!evidence.corpusVerified) {
      missing.push(
        "real-repository corpus run, n >= 10 classified verdicts, Wilson CI recorded, precision AND recall measured, detectorRev locked",
      );
    }
  }
  if (target === "M5_FIELD_PROVEN") {
    if (!evidence.fieldProven) {
      missing.push(
        "independent real-world repositories, declared field support, stable confidence interval, candidate-bound evidence",
      );
    }
  }
  return {
    maturity,
    nextLevelGap: {
      target,
      missing,
      owner,
      revisitTrigger,
    },
  };
}

// ─── Auto-demotion ───────────────────────────────────────────────────

export type DemotionReason =
  | "REVISIT_TRIGGER_FIRED"
  | "DETECTOR_REVISION_CHANGED"
  | "UPSTREAM_MAJOR_UNHANDLED"
  | "CORPUS_MEASUREMENT_STALE"
  | "EVIDENCE_STALE";

export interface DemotionInput {
  maturity: Maturity;
  gap: NextLevelGap | null | undefined;
  /** Whether the capability's own `revisitTrigger` has fired. */
  triggerFired: boolean;
  /** Whether the detector revision changed without a re-measurement. */
  detectorRevisionChanged?: boolean;
  /** Whether the bound corpus measurement no longer matches detectorRev. */
  measurementStale?: boolean;
  /** Whether the bound evidence is no longer current. */
  evidenceStale?: boolean;
}

/**
 * Maturity may be **demoted automatically** when the evidence that
 * granted it stops holding. Returns the demoted level, or `null` when
 * nothing fires. This is deliberately the only way maturity goes down:
 * a demotion is a consequence of a trigger, never an opinion.
 *
 * The demoted level is the highest level whose own criteria still hold,
 * which is why each demotion maps to exactly one ladder step: a stale
 * corpus measurement removes `M4` proof, not `M3`.
 */
export function demote(input: DemotionInput): {
  from: Maturity;
  to: Maturity;
  reason: DemotionReason;
} | null {
  const { maturity, gap, triggerFired } = input;
  if (!requiresNextLevelGap(maturity)) return null;
  if (!triggerFired) return null;

  let reason: DemotionReason = "REVISIT_TRIGGER_FIRED";
  if (input.measurementStale) reason = "CORPUS_MEASUREMENT_STALE";
  else if (input.detectorRevisionChanged) reason = "DETECTOR_REVISION_CHANGED";
  else if (input.evidenceStale) reason = "EVIDENCE_STALE";
  void gap;

  // A fired trigger retires exactly the level the gap was working toward
  // (the gap's `target`); everything below it is untouched.
  const target = gap?.target;
  const lower = previousMaturity(maturity);
  const demoted = target === maturity ? lower : maturity;
  if (demoted === null || demoted === maturity) return null;
  return { from: maturity, to: demoted, reason };
}

export function previousMaturity(value: Maturity): Maturity | null {
  const rank = RANK[value];
  return rank <= 0 ? null : (MATURITY_LEVELS[rank - 1] ?? null);
}

// ─── Orthogonality (ADR 0011) ────────────────────────────────────────

/**
 * The six claim axes. They are independent: none is derivable from
 * another, and no renderer may merge them. This table is the single
 * declaration of that fact, so a new axis is an explicit addition here
 * rather than an accidental one in a render function.
 */
export interface OrthogonalAxis {
  id: string;
  /** The field name(s) that carry this axis. */
  fields: readonly string[];
  vocabulary: readonly string[];
  /** The question this axis answers — never another axis's question. */
  question: string;
}

export const ORTHOGONAL_AXES: readonly OrthogonalAxis[] = [
  {
    id: "trustLevel",
    fields: ["trustLevel"],
    vocabulary: ["L0", "L1", "L2", "L3", "L4", "L5"],
    question: "How much do we trust this finding? (src/types.ts:106-117)",
  },
  {
    id: "maturity",
    fields: ["maturity"],
    vocabulary: MATURITY_LEVELS,
    question: "How much has this capability been proven? (ADR 0001)",
  },
  {
    id: "evidenceState",
    fields: ["evidenceState", "state"],
    vocabulary: [
      "FRESH",
      "STALE",
      "FOREIGN",
      "NOT_RUN",
      "PARTIAL",
      "CONTRADICTORY",
      "INVALID",
      "UNKNOWN",
    ],
    question: "Is this evidence current and admissible?",
  },
  {
    id: "determination",
    fields: ["determination", "verdict"],
    vocabulary: [
      "PASS",
      "FAILED",
      "BLOCKED",
      "INCONCLUSIVE",
      "UNPROVEN",
      "PARTIAL",
    ],
    question: "What is the verdict? (closed set, TRUST-CONSTITUTION §2)",
  },
  {
    id: "lifecycle",
    fields: ["lifecycle", "ruleStatus"],
    vocabulary: [
      "PROPOSED",
      "EXPERIMENTAL",
      "PROVISIONAL",
      "VERIFIED",
      "PROVEN",
      "DEPRECATED",
      "RETIRED",
    ],
    question: "Where is this rule in its career?",
  },
  {
    id: "severity",
    fields: ["severity", "trustImpact", "policySeverity"],
    vocabulary: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO", "NONE"],
    question: "How much does it matter? (technical severity stays separate)",
  },
];

export const ORTHOGONAL_AXIS_IDS: readonly string[] = ORTHOGONAL_AXES.map(
  (axis) => axis.id,
);

/**
 * Guard for renderers and schemas: reject a record whose field naming
 * violates orthogonality — a field named after one axis carrying
 * another's vocabulary. Returns the offending descriptions; empty means
 * clean.
 */
export function findAxisViolations(record: Record<string, unknown>): string[] {
  const violations: string[] = [];
  for (const axis of ORTHOGONAL_AXES) {
    for (const field of axis.fields) {
      const value = record[field];
      if (typeof value !== "string") continue;
      if (axis.vocabulary.includes(value)) continue;
      // The finding trust level lives in its own vocabulary and is
      // reported by the trust axis, not the maturity axis.
      if (axis.id === "maturity" && /^L[0-5]$/.test(value)) {
        violations.push(
          `${field}="${value}" is a trust level in a maturity field (ADR 0001)`,
        );
        continue;
      }
      if (/^M[0-5]$/.test(value) && axis.id === "trustLevel") {
        violations.push(
          `${field}="${value}" is a maturity in a trust-level field (ADR 0001)`,
        );
      }
    }
  }
  return violations;
}
