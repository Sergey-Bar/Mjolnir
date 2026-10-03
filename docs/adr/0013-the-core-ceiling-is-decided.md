# ADR 0013 — The core ceiling is decided, not deferred

- **Status:** accepted
- **Date:** 2026-10-02
- **Decides:** `CORE_FP_CEILING` stays at `0.1`; the sample cap a _funded_ candidate may draw rises to `samplesForZeroFp(0.1)`; the default cap does not move
- **Supersedes:** nothing. It records a decision three constants implied and nobody made

## Context

`src/rules/measurement.ts` has carried `CORE_FP_CEILING = 0.1` since the
tempering plan, and a docstring above it that read:

> `!! UNREACHABLE AT THE CURRENT CORPUS CAP` — 10% on the upper bound needs
> n >= 35 with ZERO false positives … The corpus samples at most 20 per rule, so
> the best a rule can look at that cap is 0/20 — and 16.1% is above this
> ceiling. Not "hard to reach": unreachable, for every rule, at every sample
> size the sampler can produce.

That sentence was arithmetically correct and it was also a decision nobody had
made, written as a property of the code. Two constants had been chosen
independently — a 10% gate and a cap of 20 — and their product was empty, so
the shipped tier system had one reachable value out of three. The docstring was
honest about the consequence and silent about the cause, and the consequence is
the part a reader acts on: it said _don't bother_ where it should have said
_this is unresolved_ or _this is decided_.

Two things happened afterwards, and both are evidence:

**6.0 raised the cap globally and reverted it the same day.** 20 → 40 produced
**1,121 unadjudicated rows across 42 rules**, and
`tests/corpus/verdicts/unclassified-ceiling.json` refused them. The refusal was
the gate working. The reasoning behind it still holds: a blank verdict row is
dropped rather than counted, so a mostly-blank corpus reports a rate measured on
whatever subset happened to be adjudicated — a much more flattering number than
the corpus supports. A cap raised without the adjudication budget to fill it
makes the gate stop complaining without adding evidence.

**The budget is the binding constraint, not the statistics.** The nearest two
rules to the ceiling were 11 and 12 rows short:

| Rule        | n   | observed FP | ciHigh | Rows to n=35 |
| ----------- | --- | ----------- | ------ | ------------ |
| `QA-PW-117` | 24  | 0           | 13.8%  | 11           |
| `QA-JV-101` | 23  | 0           | 14.3%  | 12           |

Twenty-three human classifications earn the first core rule in the registry. The
alternative was hundreds.

## Decision

**1. `CORE_FP_CEILING` stays at `0.1`.** Not as a default nobody revisited, but
as a decision with a reason: the Wilson upper bound is what makes a tier claim
checkable by a reader who was not in the room, and a core tier that can be earned
at the sample size the corpus actually collects is not a tier, it is a label.

**2. The cap moves, per rule, and only for a rule that can spend it.**
`scripts/corpus-sample.ts` gained `--core-candidates`: rows are emitted only for
a rule that observes zero false positives and whose `straddleDetail` reports
that more clean samples would settle it, and only those rules may draw up to
`samplesForZeroFp(CORE_FP_CEILING)` instead of 20. `MAX_SAMPLES_PER_RULE` stays
20, so the default behaviour of every existing command is unchanged.

The global raise was the wrong ALLOCATION rather than the wrong idea. It spent
35+ samples on rules that cannot use them — a rule already observed wrong, or one
whose interval already excludes 10% from below — while the adjudication budget is
finite and belongs to a person.

**3. Who gets funded is a separate decision from who can earn.** The predicate is
worth **29 rules** today; the nearest two are the pass that earns the first core
rule. `--core-target` names them. Conflating the two questions would move the
committed ceiling by an amount nobody decided, and the ceiling is the thing that
tells a person how much work they are being asked to do.

**4. The ceiling moves by a number that is known before anyone is asked.**
`tests/corpus/verdicts/unclassified-ceiling.json` is a ratchet on pending
adjudication. The pass prints the rows it may add, derives that from the same
function the sampler stops on, and counts rows an earlier pass left un-adjudicated
— so re-running the identical command adds nothing. The first implementation got
this wrong: it collected 35 samples per rule and appended **46** rows against a
projection of 23, because de-duplication is per verdict file and keycloak's file
already held 19 `QA-PW-117` and 10 `QA-JV-101` rows. A ceiling bump that has to
be guessed is not a ratchet.

**5. The interval is one of two legs, not the whole gate.** `PRODUCT-DECISIONS.md`
D-1 requires a complete four-leg fixture quad **and** an interval under 0.10. Both
plan targets were measured to already have all four legs — must-fire and
must-not-fire fixtures on disk, adjudicated recall and precision verdicts, zero
false positives — so the quad was never the missing thing. The interval was, and
it still is, until a person classifies 23 rows. **An interval under 10% alone does
not unblock 6.0.0.**

## Consequences

**The `core` tier becomes reachable, and nothing else changes.** `MEASURED-CORE` in
`RuleStatus` and `"core"` in `Rule.tier` go from unreachable states to
unearned ones. No rule holds either today.

**The "don't bother" docstring is gone.** `src/rules/measurement.ts` no longer
claims the tier cannot be earned, and `tests/rules/core-tier-reachability.spec.ts`
no longer claims the sampler cannot produce 35. Both changed without a threshold
moving: the first because a mode now exists, the second because the arithmetic it
described became reachable by a different route. A structural fact that is true
and silent is a trap; these two are asserted now.

**A rule that reaches 0/35 stops being sampled.** The predicate's last clause is
`cap > n`, so the day a rule earns the ceiling it leaves the candidate set with
no edit. That is the intended moment, and `core-candidates.spec.ts` fails loudly
when the first rule gets there.

**23 rows are pending adjudication and the ceiling says so.** `31 → 23`, not
`31 → 54`: the live backlog had been classified down to 0 since the 31 was
recorded, so this pass is 0 → 23, and a ceiling of 54 would have authorised 31
rows of pending work nobody asked for. Zero slack is the correct reading.

**The unreachable-by-design ladder is now reachable by design.** `MEASURED-CORE`
was a third of a three-valued system that had two reachable outputs and one
unreachable one; the quarantine side is unchanged and still needs a 75% error rate
to fire on measurement, which is a separate question this ADR does not decide.

## Rejected alternatives

**1. Raise `MAX_SAMPLES_PER_RULE` globally and adjudicate the backlog.** This is
what 6.0 did and reverted: 1,121 rows across 42 rules, refused by the committed
ceiling. It also asks a person to classify evidence for rules that cannot use it —
a rule already observed wrong, or one whose interval already excludes 10% from
below — which is the same mistake in a more expensive form.

**2. Move the ceiling.** 0.162 would make 0/20 clear it, and the tier would open
with no new sampling at all. The cost is that the number stops meaning anything:
`wilsonInterval(0, n).ciHigh` is 16.1% at n=20 because that is what 20 clean
observations support at 95% confidence, and a ceiling set above it is a ceiling
chosen to be reached. `tests/rules/registry-ratchet.spec.ts` pins the shipped
value, and the day it moves should be a decision with a reason on the record.

**3. Leave the decision unmade and keep the "don't bother" docstring.** This was
the status quo and it was the worst of the three, because it was not neutral: it
told the next person the question was closed when it had never been opened.

**4. Re-home the 39 external-evidence boxes to the runbook's 18 rows.** Rejected
as a recorded number lowered to make a gate pass — the change D-7 exists to
prevent. Left as open work with the disposition it protects intact.

**5. Add a fifth quad leg, or require a core rule to ship nothing.** Not proposed
and not needed: D-1's four legs are the standard this repository already holds
itself to, and a rule can earn the tier without shipping anything.

## Enforcement

- `scripts/corpus-sample.ts --core-candidates` — emission filtered by the
  predicate; `--core-target` names the funded set; a target that is not a
  candidate is an error.
- `tests/corpus/core-candidates.spec.ts` — the cap is the arithmetic
  (`wilsonInterval(0, cap).ciHigh <= ceiling` and one sample short of it), the
  predicate has two halves, and the funded projection is `[12, 11] = 23`.
- `tests/rules/core-tier-reachability.spec.ts` — still no rule derives core, the
  candidate cap still exceeds the default one, and the two nearest candidates are
  still fundable. Fails in either direction.
- `tests/rules/registry-ratchet.spec.ts` — `samplesForZeroFp` at the shipped
  ceiling values, unchanged.
- `tests/corpus/verdicts/unclassified-ceiling.json` — the ratchet, re-recorded at
  the reviewed value with the arithmetic in its note.
- `npm run generate-fp-audit-table` — refuses any further growth, per file.

## Not decided here

**The external-evidence gate is broken and this ADR does not fix it.**
`scripts/check-external-evidence.ts` reads `docs/EXTERNAL-EVIDENCE-REQUEST.md`,
deleted by the 6.0 M26-M50 retirement, so `npm run docs:external-evidence` exits
2 and `npm run certify:integrity` cannot complete. Its `EXTERNAL_BOX_CEILING = 39`
is a number about a file that no longer exists, and the runbook that survives has
18 rows. Re-homing it is a decision with a product answer, not a doc fix.

**The quarantine ladder is unchanged and still nearly inert.** `ciLow >= 50%`
fires at 15 of 20, and exactly one rule — `QA-ENV-001`, wrong every time — clears
it. That is the other direction of the same product question this ADR answered,
and it is answered by a different decision.
