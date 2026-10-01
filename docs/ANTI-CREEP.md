# Anti-creep law

`CLAUDE.md` law 1: **every addition to the launch set requires an equal-size
removal.** This file records what the launch set is, how the law is executed,
and the one number a change has to move to make a promotion legal.

## The launch set is the shipped set, not the core tier

The law said "the launch set" and named nothing. Three candidates existed:

| Candidate          | Count | Verdict                                                                                                                                             |
| ------------------ | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| All live rules     |    79 | Counting every rule makes the law unfalsifiable — nothing is ever removed                                                                           |
| Rules that gate CI |     0 | Quarantine findings are capped to `info`/`E0` by `src/engine/tier-policy.ts`, so they never gate. A set of zero cannot be grown by removal          |
| The core tier      |     0 | **Was the answer, and was wrong.** The core tier has been empty since 6.0, so "the rules that ship in the default report" resolved to a set of zero |

The third row was chosen for the right reason and landed on the wrong set. The
reasoning above it was correct — "ships by default" is what makes the law mean
something, because adding a rule to the default report adds a claim to every
user's first scan — and `tier === "core"` was the wrong _test_ for it. All 79
rules resolve to 34 `quarantine` and 45 `extended`, so the law governed zero
rules while 45 shipped in every default report, and adding an `extended` rule —
the one change that alters what a user sees — moved nothing the law counted.

The predicate is now `effectiveTier !== "quarantine"`, which is the question the
law was always asking. The count is **45**, so the second cap has a real number
to compare against and the first has 20 free slots instead of 65.

Two consequences worth being explicit about:

- This **raises** the bar. The ratchet now defends the 45 rules users actually
  get, and growth above 45 needs an `ANTI-CREEP-EXCEPTION`.
- Law 3 (north-star, `CLAUDE.md`) still governs the core tier for its ≥10
  verdict requirement. Moving that to the shipped set would fail the check on
  all 45 rules at once, which is a policy decision rather than a defect; it is
  an open question for the law's owner, not something this change settled.

## Two caps, not one

`src/commands/doctor.ts` exports both. They are independent and both are
one-directional.

### 1. The absolute cap — `CORE_CAP = 65`

A catastrophe guard, exactly like the 80% coverage floor in
[`docs/COVERAGE-GATE.md`](COVERAGE-GATE.md). It is not a statement about this
repository and does not need to be; it exists so a change that promotes a
whole category at once cannot pass unnoticed.

With the launch set at 45 it has 20 free slots. It was previously vacuous in
both directions — a set of zero left all 65 free — and a guard that has never
fired is not a policy.

### 2. The net-growth ratchet — `docs/ANTI-CREEP-BASELINE.json`

The cap the law actually describes. The baseline records the launch set at a
commit, plus **its own previous value**:

```json
{
  "baselineCore": 45,
  "previousBaselineCore": 0,
  "recordedAt": "2026-10-01"
}
```

`previousBaselineCore` is 0 rather than 45 on purpose. The law compares against
the _previous_ baseline, so leaving it at 0 keeps the move from 0 to 45 visible
as growth of 45; setting it to 45 in the same edit would make a redefinition of
the governed set read as a legal no-op.

A pull request that leaves the tier bigger than the **previous** baseline
fails. It passes when either of the following is true:

1. **The tier did not grow past `previousBaselineCore`.** Net growth ≤ 0, so
   promoting `QA-PW-117` and demoting `QA-JV-105` is legal in one commit with
   no paperwork.
2. **The unreleased `CHANGELOG.md` entry carries an `ANTI-CREEP-EXCEPTION`
   line**, with the reason.

It is an OR, and deliberately. A marker is a paper trail that says "yes, this
time, and here is why"; requiring one even for a net-zero change would train
people to paste it without reading it. The interlock that matters is not the
OR — it is _which baseline the comparison is against_, which is what closes the
escape the first version had:

> The check compares the tier against `previousBaselineCore`, not against
> `baselineCore`.

Lowering `baselineCore` to match a grown tier makes `core − baselineCore`
zero, and the law reads as satisfied — one uncross-checked JSON edit that
promotes a rule and switches the law off. Against the _previous_ value the
growth is still visible and still needs a marker. The shipped baseline carries
both fields; a file written before `previousBaselineCore` existed falls back to
`baselineCore` for one run, and a test asserts the shipped file carries it so
that fallback can never become the permanent reading.

The marker's scope is the other half. The first version searched the whole
append-only changelog, so a marker written once in any past release disabled
the ratchet for every commit after it, permanently. With an empty tier and a
zero baseline, the FIRST core promotion would have switched the law off for
good — the very change this work makes possible. The marker is now scoped to
the top `## ` entry: a changelog is a sequence of releases and a growth claim
is made in a release, so a marker has to survive exactly until its release is
cut.

That first promotion has now happened, and it was not a promotion: it was the
redefinition of the governed set from an empty core tier to the 45 shipping
rules. The ratchet reports growth of 45 against a previous baseline of 0, and
the unreleased changelog entry carries the `ANTI-CREEP-EXCEPTION` that makes it
legal — with the reason, which is that the 45 rules already shipped and the law
simply was not counting them.

## What this does not do

It does not decide which rules _ought_ to be in core. That is a measured
question, and it is answered by the corpus rather than by a cap:

- The core ceiling is a 10% Wilson upper bound (`CORE_FP_CEILING`,
  `src/rules/measurement.ts`).
- A rule observing zero false positives needs **n ≥ 35** to clear it
  (`samplesForZeroFp`, and this was wrong by a transposition until 6.0 — it
  reported 1).
- The minimum `ciHigh` across all 73 measured rules is **0.138**. Zero rules
  earn core today.

So the core tier is empty, and the 45 rules that ship are `extended` — which is
a _different_ fact from the one the law needs to do its job, and worth stating
plainly because they used to be conflated. "Shipped by default" and "earned
core" are not the same claim. The first is where the rules are; the second is
whether the corpus clears them for a tier the product reserves for its
strongest detectors. The law above now guards the first; the measurement
question above still governs the second, and zero rules clear it.

The queue of candidates is
[`docs/CORE-READINESS.md`](CORE-READINESS.md), generated by
`npm run docs:core-readiness`.

## Moving the baseline

Down as a consequence of a demotion — set `baselineCore` to the new size and
`previousBaselineCore` to the size you are replacing, in the same commit. Up
only alongside an `ANTI-CREEP-EXCEPTION` line in the same unreleased
`CHANGELOG.md` entry that explains the promotion.

Up is now a real possibility rather than a hypothetical. With the launch set at
45, adding one more non-quarantine rule is growth of 1 against a previous
baseline of 45, which needs a marker and a reason — and a rule moving out of
`extended` into `quarantine` is how the set shrinks. That is the mechanism the
law was written to provide, and it is finally pointed at a set large enough for
it to do anything.

The check reports the count and the ids currently in the tier, which together
answer "what moved". It does not report a membership DIFF: the baseline is a
count, and inventing an `added`/`removed` list against a count-only baseline
would be a diff computed from nothing.

Raising the ceiling to make a rule fit is not available. `CORE_FP_CEILING` is
0.1 because the product's thesis is that its false-positive rate is near zero;
moving it to admit a rule with a 13.8% interval is tuning a threshold to fit
data, which is the failure mode this repository exists to detect.
