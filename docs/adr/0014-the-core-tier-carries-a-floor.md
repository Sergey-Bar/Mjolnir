# ADR 0014 — The core tier carries a floor

- **Status:** accepted
- **Date:** 2026-10-02
- **Decides:** `capForTier` becomes `policyForTier`; core gains `CORE_FLOOR = { evidenceLevel: "E1" }`; `SCORING_MODEL_VERSION` → `2.0.0`; `TRUST_MODEL_VERSION` stays at `1.0.0`
- **Supersedes:** nothing. It records a decision the tier system implied and never made — the mirror of ADR 0013

## Context

ADR 0013 made the core tier reachable. It did not make it _mean_ anything.

`capForTier` in `src/engine/tier-policy.ts` was:

```ts
export function capForTier(tier: Tier | undefined): TierCap | null {
  return tier === "quarantine" ? QUARANTINE_CAP : null;
}
```

One branch. Every non-quarantine tier — including `core` and including the
`undefined` default that `effectiveTier` resolves to core — got `null`, meaning
"this tier has no opinion on its findings". So core and extended were enforced
identically: same severity, same evidence level, same gating, same score.

The tier ladder in `src/rules/measurement.ts` is a claim about **trust** — this
rule's measured false-positive rate is under 10%. Reaching core changed four
things, and none of them was about the finding:

- `TIER_RANK` in `src/engine/overlap-dedup.ts` (core wins tie-breaks),
- the `M3_FIXTURE_VERIFIED` ceiling in the maturity ladder,
- the census and capability-matrix readouts,
- the `MEASURED-CORE` status string.

A consumer reading a scan could not distinguish a core finding from an extended
one. Not by severity, not by evidence, not by whether it blocked. The only way
to tell was to go and read the rule registry — which is precisely the thing the
tier was supposed to make unnecessary.

The asymmetry is the tell. Quarantine had a cap; core had a docstring. A tier
that can only be described is not enforced.

## Decision

**1. A tier's policy is a CAP and a FLOOR, and the type says so.** `policyForTier`
returns a `TierPolicy { cap?, floor? }`. `extended` returns `{}` — the middle is
the default and an empty policy is the honest encoding of "no opinion". The
return type is a policy object rather than `TierCap | null` because a floor is
the same two fields moving in the opposite direction, and a type that can only
express the cap would have to be widened again to add it.

**2. `CORE_FLOOR = { evidenceLevel: "E1" }`.** `E1`, not `E2`.

`E0` is zero deduction _and_ non-blocking — `isAdvisoryFinding` is exactly
`level === "E0"` (`src/types.ts:306`). So an E0 finding is free and cannot fail
a gate. A rule whose measured false-positive rate clears the 10% ceiling at a
sample size large enough to trust the interval should not be able to emit one.
That is the whole floor, and it is the same shape as quarantine's cap: the tier
overrides the declaration.

`E2` would be a claim that the finding is **proven**, and no tier policy may make
that claim. `E2` is what runtime corroboration asserts, per finding, at the moment
of the scan (`src/engine/runtime-corroboration.ts`). A measurement says the
detector is rarely wrong; it does not say this particular finding is true.

**3. Severity is deliberately untouched.** Forcing it up would convert advisory
findings into blocking ones across a contract nobody asked to change, and a
`severity` floor is the same shape of argument that quarantine's cap already
settles in the other direction. One bounded field, changed on purpose, is
reviewable. Two is a rewrite.

**4. `enforceTierPolicy` applies the cap first, the floor second.** The pipeline
already runs it after `stampEvidenceLevels` (`scan-pipeline.ts:1052` → `:1064`),
so the floor wins over a declared `evidenceLevel` for the same reason the cap
does: the tier is a _decision_ about a rule and the declared level is a
_declaration_ by it.

The floor is stated against the **effective** level, deriving from
`findingType`+`confidence` when the field is unset. That makes the function
order-independent instead of quietly dependent on a caller three modules away,
and it stops the floor from _demoting_ an unstamped finding — a deterministic
defect derives E2, and stamping it E1 would lower a strong claim.

**5. A core rule may not declare `E0` in its own metadata.** `checkEvidenceHonesty`
cannot catch this and the gap is structural: it fails a rule for claiming _more_
than its `findingType` supports, and `E0` is the bottom of the ladder, so a core
rule declaring E0 is never "too strong" by its arithmetic. E0 is perfectly legal
for an extended rule. For a core rule it is a declaration that the measurement
earning the promotion is also a declaration that the detector proves nothing.
Doctor's `core-floor-declaration` check fails on exactly that case.

This is the honesty interlock. A floor that silently overrode a deliberate
declaration would itself be the defect: the rule's `explain` page would publish
E0 while the scan emitted E1, and the two would disagree with no error anywhere.

**6. An absent tier is NOT core.** `policyForTier(undefined)` returns an empty
policy, and the reason is worth recording because the previous docstring said
the opposite and the sentence would have become load-bearing the moment a floor
existed.

`buildUniversalRules` (`src/engine/scan-pipeline.ts:211`) sets
`tierByRuleId.set(r.id, effectiveTier(r))` for every **registry** rule — never
undefined — and adds a plugin or workspace-local rule only `if (r.tier)`. So a
missing entry means "a third-party rule that declared no tier", and that
population must not inherit a trust bound. Before this floor an absent entry cost
nothing, so the old claim was inert. With a floor it would raise every plugin's
E0 finding to E1 and start charging third-party detections for deductions — the
exact trust escalation TI-013 exists to prevent, introduced by the ADR written to
close a trust gap.

A plugin that wants the core floor declares `tier: "core"` and is reviewed for
it, which is the same bar a core registry rule clears.

## Consequences

**`SCORING_MODEL_VERSION` → `2.0.0`.** `deductionFor` (`src/scorer/scorer.ts:48`)
returns `0` at E0 and `floor(base/2)` at E1, so a core finding's deduction moves
from 0 to half its severity. That is a change to the scoring model, and the
entry's own policy (`src/engine/contract-versions.ts`) says `semver + ADR
required`. This is the ADR.

**`TRUST_MODEL_VERSION` stays at `1.0.0`, and the reason is stated rather than
assumed.** L0–L5 derivation _does_ consume `evidenceLevel` —
`deriveTrustLevel` (`src/engine/runtime-corroboration.ts:134`) maps E0→L0,
E1→L1, E2→L2. The condition in the plan for considering the bump is therefore
met, and here is the finding rather than a reflex either way: **the mapping is
unchanged.** The derivation function is byte-for-byte the same and will produce
the same answer for the same input. What moved is the _distribution of inputs_ —
a core finding now arrives as E1 instead of E0 — and a consumer that reads
`evidenceLevel` directly already sees the same fact. The visible consequence is
that no core finding can be L0, which is a consequence of the scoring-model
change and is documented here so it is a stated decision rather than a surprise.

A reviewer who reads the trust model as "the observed L-distribution" rather
than "the E→L function" should treat that as the argument for a bump, and the
argument is not nothing. It is answered by the version's own name:
`TRUST_MODEL_VERSION` is described in the registry as "Trust level derivation
model version (L0–L5)", and derivation is what did not change.

**The floor is inert today.** No rule declares `tier: "core"`, so this changes
no output until the first promotion. That is deliberate sequencing, not an
accident: enforcement lands before the tier is earned, so the first core rule is
born with teeth instead of earning them after the fact.

**`capForTier` is kept, not deleted.** Two callers ask a genuinely different
question — "may this tier ever gate CI?" (`checkQuarantineEnforcement`,
`registry-ratchet.spec.ts`) is a cap question and knows nothing about floors.
Keeping the narrow accessor means neither caller has to learn the floor's
existence, and the ratchet's existing invariant — non-null exactly for
quarantine — is still true.

## Rejected alternatives

**1. Leave `capForTier` alone and add a separate `floorForTier` walk.** Two maps
to keep in sync, and the question "what is this tier's policy" would have two
answers that could disagree. Merged into one function that returns both.

**2. Floor core at `E2`.** Rejected above: it is a truth claim no tier policy
may make, and it would charge a full deduction for a pattern observation.

**3. Floor severity too.** Rejected above: it converts advisory findings into
blocking ones across an unrequested contract.

**4. Bump both version constants.** This is the "look thorough" move. The
trust-derivation function is unchanged, and bumping a version a consumer uses to
detect a changed mapping is how a version stops meaning anything. Stated here so
the decision is reviewable rather than invisible.

**5. Make the floor advisory — log it, don't apply it.** A warning a scan emits
is not enforcement, and the entire failure this fixes is that reaching core
changed nothing observable. A floor that logs is a cap that logs.

**6. Treat an absent tier as core, matching the old docstring.** Rejected, and it
is the alternative that would have shipped by accident — the docstring said
"undefined tier = core" and the refactor was the first time anyone read it
against what a floor would do with it. It charges third-party detections
(`tier-isolation.spec.ts` asserts plugins load as extended or lower) and makes
the trust bound depend on a plugin's silence rather than its declaration.

## Enforcement

- `src/engine/tier-policy.ts` — `CORE_FLOOR`, `policyForTier`, and a floor
  applied against the effective level via an E-ladder (`"E0" > "E1"` is `true` in
  JavaScript, and a floor compared as strings inverts).
- `src/commands/doctor.ts` `checkCoreFloorDeclaration` — no core rule declares
  E0; reports the rule count and says the floor is inert at zero.
- `tests/engine/tier-policy.spec.ts` — cap still applies to quarantine and to
  nothing else; the floor raises a core E0 to E1, leaves core E1/E2 alone, never
  touches extended, and is idempotent.
- `tests/contract/scoring-model-version.spec.ts` — `SCORING_MODEL_VERSION` is a
  major and this ADR exists. The version bump cannot be reverted silently.

## Not decided here

**Whether the floor should be `E1` forever.** It is the weakest sufficient bound
today. If a rule earns core on measured evidence, `E1` is the honest claim about
a static finding. Raising it per-rule on the strength of a measurement would be
the same over-claim `E2` is here, with a statistical wrapper on it.

**What happens to extended.** Extended has no floor and, on this evidence, no
defensible reason to have one: it is the tier you are in when the measurement
does not clear a ceiling, which is a statement about the measurement, not a
licence to emit free findings. A rule that is measurably good enough for extended
is measurably good enough to have earned core. If that is wrong, the fix is a
middle tier with a stated threshold — not a second floor invented by analogy.
