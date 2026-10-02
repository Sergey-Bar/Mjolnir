---
name: quarantine-remediation
description: Use when a rule is stuck in quarantine — emitting only info, or nothing — and you need to decide whether to promote, rework or retire it. Covers the FP ladder, the Wilson-interval criterion, the quarantinePromotion commitment, and the retire path. Also use when the doctor reports "34/34 quarantine rules carry no quarantinePromotion", or when choosing which quarantined rule to work on next.
---

# Work the quarantine backlog

A quarantined rule is capped to `severity: "info"` and `evidence: "E0"` —
it cannot fail a build. It is off, wearing a badge. **34 of 79 rules are in
this state**, so the shipped tool's detection surface is 45 rules out of 79
authored ones.

`npm run doctor` reports: *34/34 quarantine rules carry no
`quarantinePromotion` — no owner, no review date, no exit condition. A
quarantine with none is permanent by default.* That count is reported, not
gated, which is exactly why it has not moved: nothing forces anyone to look.

## Read the ledger before you choose

`docs/QUARANTINE-REMEDIATION.md` — regenerated with `npm run
docs:quarantine-ledger`, hand edits are futile and the drift-lock test fails
them. Each row carries the measured FP, the failure-mode class, and the
disposition.

Dispositions tell you the state of play:

- **open / "re-derive at its wave (no corpus evidence yet)"** — nothing has been
  tried yet. The cheapest population to move.
- **REWORKED (final attempt shipped)** — the rework landed with a
  `detectorRevision`. It needs a corpus re-run and owner re-adjudication of
  surviving findings, not another edit.
- **OPEN — fix measured and rejected** — read the whole disposition. QA-TEST-003
  is the worked example: the proposed fix was built, diffed, and deleted because
  it changed 2 findings in both directions and reintroduced a false positive.
  Writing another fix without reading that first repeats the dead end.

## The ladder is an interval, not a point

`src/rules/measurement.ts` sets the criterion, and it moved in 6.0 from a point
estimate to a 95% Wilson interval. This is the single most common way to get
this wrong.

| Threshold | Constant | Meaning |
| --- | --- | --- |
| `CORE_FP_CEILING = 0.1` | on `ciHigh` | the interval's upper bound clears 10 % → core |
| `POINT_QUARANTINE_FLOOR = 0.3` | on `fpRate` | the point estimate above 30 % → quarantine |
| `QUARANTINE_FP_FLOOR = 0.5` | on `ciLow` | the interval's lower bound clears 50 % → confidently bad |

**A rule at n=10 observing zero false positives has `ciHigh` of 27.8 %.** The
data is consistent with it being wrong more than a quarter of the time. So
`fpRate: 0, n: 10` earns `extended`, never `core`. Reaching core on measurement
alone needs roughly **n ≥ 35** at zero false positives — which is why the core
tier is empty, and the emptiness is correct rather than unfinished.

`src/rules/tier-evidence.ts` documents the 6.0 demotion of nineteen rules that
cleared the old point criterion and none of them cleared the interval. Read it
before arguing that a rule qualifies.

## Decide, then record the commitment

Three outcomes. Each is a legitimate answer; leaving it undecided is not.

**Promote out of quarantine** when the point estimate is at or under 30 % and
the failure mode is understood. Set `tier: "extended"` and attach a
`quarantinePromotion` — the `CorePromotion` shape, so:

```ts
quarantinePromotion: {
  rationale: "<what the corpus now shows, and why this rule is trustworthy>",
  owner: "<a named human — an unowned claim is a default nobody chose>",
  grantedAt: "<ISO-8601>",
  expiresOn: "<ISO-8601 — on this date it resolves back to quarantine>",
  evidenceRefs: ["<corpus verdict id, contract path, or ADR>"],
}
```

`evidenceRefs` may legitimately be empty for a structural premise, and the
registry does not demand one — but an empty list is reported as
`NEEDS-SAMPLES` in `docs/CORE-READINESS.md` rather than passing silently.

**Rework** when the FP rate is high for an understood reason. Change the
detector, bump `detectorRevision`, then `npm run detector-hashes:update` — the
hash is the evidence for that revision. Update the ledger row's prose with the
real failure mode. A row that says "too noisy" has told the next person
nothing.

**Retire** when the rule stays at or above 75 % after its final attempt. That
is the governed path in `docs/RULE-LIFECYCLE.md` — downgrade severity first,
never repurpose the ID, add a `### Deprecated` changelog entry naming the
conceptual flaw. A rule that is conceptually wrong should not be permanently
retired as noise; the distinction is the whole policy.

## Then run what the change invalidates

```
npm run frontier:contracts          # registry contract, tier enforcement
npm run rules:promotion:check       # the D5 ratchet — core growth needs a demotion
npm run docs:quarantine-ledger      # regenerate the ledger from the live registry
npm run docs:regen                  # counts, capability matrix, FP-audit table
npm run doctor                      # the quarantine count must move
npm run rules:quality:check
npm run test
```

`tier` is an escalate-everything change: a severity or tier edit changes every
score where that rule fired, so `npm run golden:update` may be required. Read
the diff and explain every line.

## Report honestly

State which rule, which outcome, and what the measurement was **before** and
**after**. A promotion backed by a rising FP rate is a false-green with a
promotion attached.

If you leave a rule in quarantine, say so and say why — "unmeasured", "the
proposed fix was measured and rejected, disposition says re-run the corpus",
"awaiting a corpus re-run after detectorRevision 4". Those are answers. Silence
is the 34-count.

## The meta-problem worth fixing once

`quarantinePromotion` exists on the `Rule` type and **zero rules use it**. The
mechanism was built for exactly this backlog and nothing has been applied. If
you take one thing from this skill: for the rule you touch, add the commitment
even when you leave the rule quarantined. A quarantine with an owner and an
expiry is a task; a quarantine without one is a decision nobody made.