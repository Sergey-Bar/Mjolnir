/**
 * Tier policy (audit H-1): the declared tier is authoritative over a
 * rule's severity and evidence claims.
 *
 * Quarantine-tier rules exist because their real-world false-positive
 * rate is unproven or proven bad (docs/FP-AUDIT.md records several at
 * 100% measured FP). A rule known to be wrong every single time it
 * fires must never gate CI or deduct score — regardless of the
 * severity/evidenceLevel its metadata declares. The pipeline therefore
 * caps every quarantine finding to severity=info, evidence=E0, which
 * makes it advisory by construction (isAdvisoryFinding excludes E0).
 *
 * The core tier carries the opposite bound (ADR 0014). A CAP says a tier
 * may not be stronger than this; a FLOOR says it may not be weaker. Core
 * is earned — it means the measurement cleared the false-positive
 * ceiling with enough samples to trust the interval — so a core rule
 * emitting a finding that costs nothing and blocks nothing is claiming a
 * promotion it has not cashed in. Before the floor existed, core and
 * extended were enforced identically, and reaching core changed only the
 * dedup tie-break, the M3 ceiling and the census readout: a consumer
 * could not tell them apart.
 */

import {
  deriveEvidenceLevel,
  type EvidenceLevel,
  type Finding,
  type Severity,
} from "../types.js";

export type Tier = "core" | "extended" | "quarantine";

/** The ceiling a tier may not exceed: the finding is demoted to this. */
export interface TierCap {
  severity: Severity;
  evidenceLevel: EvidenceLevel;
}

/**
 * The bound a tier may not fall below. Same two fields, opposite
 * direction — a floor RAISES a finding that declared itself weaker than
 * the tier it ships in, exactly as a cap LOWERS one that declared itself
 * stronger.
 */
export type TierFloor = Partial<TierCap>;

/**
 * What a tier does to its findings' declared severity and evidence.
 * An empty policy is a tier with no opinion, which is what `extended`
 * legitimately is — and what an undeclared third-party rule is, for the
 * reason `policyForTier` gives.
 */
export interface TierPolicy {
  cap?: TierCap;
  floor?: TierFloor;
}

/** Cap applied to every finding of a quarantine-tier rule (H-1). */
export const QUARANTINE_CAP: TierCap = {
  severity: "info",
  evidenceLevel: "E0",
};

/**
 * Floor applied to every finding of a core-tier rule (ADR 0014).
 *
 * `E1`, not `E2`, and the reason is the difference between the two.
 * `E2` would be a claim that the finding is proven, which is a statement
 * about the code that no tier policy may make — corroboration does that,
 * at runtime, per finding. `E1` is the weaker and sufficient claim: a
 * core rule is measured, so its finding is pattern evidence rather than
 * an observation, and it is worth half the deduction.
 *
 * `E0` is what the floor exists to forbid. `isAdvisoryFinding` is
 * `level === "E0"`, so an E0 finding is simultaneously worth zero points
 * and unable to fail a gate. A rule whose false-positive rate is
 * measured under the 10% ceiling should never be able to produce one.
 */
export const CORE_FLOOR: TierFloor = { evidenceLevel: "E1" };

/**
 * Which rules may void the suite's pass claim, and why each one earns it.
 *
 * `RuleMeta.suiteInvalidating` caps the score into the UNWORTHY band regardless
 * of exposure — a finding that means "the green you are reporting does not
 * cover what it claims". That cap is real and load-bearing: density
 * normalisation must not be able to average away the fact that the suite did
 * not run.
 *
 * What was missing is any check on the DECLARATION. `suiteInvalidating: true` is
 * a rule asserting something about itself, and self-assertion is precisely what
 * the rest of this file exists to bound. So the capability is an allowlist: a
 * rule may claim it only with a stated reason here, and `doctor`'s
 * registry-sanity check rejects the claim otherwise.
 *
 * Both entries are the same mechanism in two languages — a focused test makes
 * the runner skip every other test, so the suite reports green without having
 * run. That is not "a finding that weakens one test"; it is the difference
 * between evidence and its absence. A rule that merely suspects slowness does
 * not belong here, and adding one to this file is the review that admitting it
 * requires.
 */
export const SUITE_INVALIDATING_JUSTIFICATIONS: Readonly<
  Record<string, string>
> = {
  "QA-PW-003":
    "`test.only()` in an e2e spec. The runner skips every other test, so a " +
    "green run is a report about one test. Two-test repo or two-thousand, the " +
    "claim is equally uncovered.",
  "QA-TEST-001":
    "`test.only()` in a unit spec. Same mechanism as QA-PW-003: the focused " +
    "test's neighbours never ran, and nothing in the output says so.",
  "QA-PY-001":
    "pytest `-k`/`-m` selection committed alongside a focused marker. Same " +
    "mechanism in a different runner: the selection is invisible in a passing " +
    "exit code.",
};

/**
 * The policy for a tier.
 *
 * `undefined` returns an EMPTY policy, and this is a decision, not a
 * convenience. `buildUniversalRules` in `scan-pipeline.ts` populates
 * `tierByRuleId` with `effectiveTier(rule)` for every registry rule — never
 * undefined — and adds a plugin or workspace-local rule only when that rule
 * DECLARES a tier. So an absent entry means "a third-party rule that claimed no
 * tier", and it is the one population that must not inherit a trust bound.
 *
 * It used to read "undefined tier = core" in this docstring, and that sentence
 * was load-bearing in the wrong direction. Before the floor, an absent entry
 * cost nothing, so the claim was inert. With a core floor, treating undefined as
 * core would raise every plugin's E0 finding to E1 and start charging
 * third-party detections for deductions — the exact trust escalation TI-013
 * exists to prevent, introduced by the ADR written to close a trust gap. A
 * plugin that wants the core floor has to declare `tier: "core"` and be
 * reviewed for it.
 */
export function policyForTier(tier: Tier | undefined): TierPolicy {
  if (tier === "quarantine") return { cap: QUARANTINE_CAP };
  if (tier === "core") return { floor: CORE_FLOOR };
  return {};
}

/**
 * The cap for a tier, or null when the tier has no ceiling.
 *
 * Kept as its own export because callers that only ask "may this tier ever
 * gate CI?" do not want to know about floors. `registry-ratchet.spec.ts`
 * asserts this is non-null for quarantine and null for every other tier,
 * which is still true and is the invariant worth keeping.
 */
export function capForTier(tier: Tier | undefined): TierCap | null {
  return policyForTier(tier).cap ?? null;
}

/** The floor for a tier, or null when the tier has no floor. */
export function floorForTier(tier: Tier | undefined): TierFloor | null {
  return policyForTier(tier).floor ?? null;
}

/**
 * E-ladder order. "E2" > "E1" > "E0" is a claim about how much evidence a
 * finding carries, and the floor is only meaningful if "at least E1" can be
 * stated. Declared as a ladder rather than compared as strings because
 * `"E0" > "E1"` is true in JavaScript and would invert the floor.
 */
const EVIDENCE_RANK: Record<EvidenceLevel, number> = { E0: 0, E1: 1, E2: 2 };

/**
 * In-place enforcement over a scan's findings. Idempotent; runs AFTER
 * evidence stamping so it wins over rule-declared evidenceLevel — for the
 * cap and the floor alike. A rule's own `evidenceLevel` in `RuleMeta` is a
 * declaration about the rule; the tier is a decision about the rule, and
 * the decision outranks the declaration.
 *
 * Idempotence: cap-then-floor is a fixed point. A finding already at the
 * cap stays at the cap, and one already at or above the floor stays put,
 * so running this twice cannot walk a finding up the ladder.
 */
export function enforceTierPolicy(
  findings: Finding[],
  tierByRuleId: ReadonlyMap<string, Tier>,
): void {
  for (const f of findings) {
    const { cap, floor } = policyForTier(tierByRuleId.get(f.ruleId));
    if (cap) {
      f.severity = cap.severity;
      f.evidenceLevel = cap.evidenceLevel;
    }
    if (floor?.evidenceLevel === undefined) continue;
    // The floor is stated against the EFFECTIVE level, not the field. The
    // pipeline stamps first, so `f.evidenceLevel` is always set by the time we
    // get here; deriving when it is not makes the function order-independent
    // rather than quietly dependent on a caller three modules away. It also
    // keeps the floor from DEMOTING an unstamped finding: a deterministic
    // defect derives E2, and stamping it E1 would lower a strong claim.
    const effective =
      f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
    if (EVIDENCE_RANK[effective] < EVIDENCE_RANK[floor.evidenceLevel]) {
      f.evidenceLevel = floor.evidenceLevel;
    }
  }
}
