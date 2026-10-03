---
name: surface-law
description: Add or remove a Mjölnir capability — a CLI verb, an npm script, a gate, a generator, a documented format — without breaking Law 0 (the surface law) or its caps. Use when adding a CLI verb, a new npm script, a new gate id, a generator, or when a change makes `npm run entry-points:check` or `npm run doctor` fail on surface growth.
---

# The surface law

Law 0 in `CLAUDE.md`. It was added 2026-10-02 because the rule-set arm of the
law was the easy surface to measure, so every other surface grew unchecked:
139 npm scripts, 137 script files, 16 verbs and three overlapping capability
registries, with drift gates that caught none of it.

**The governed surface is every capability the product claims, not only the
rule set.** Adding a CLI verb, an npm script, a gate, a generator or a
documented format requires an equal-size removal or a recorded
`ANTI-CREEP-EXCEPTION` with the reason.

Law 1 is the rule-set arm of this law, not the whole of it. If your change is
a rule, read `CLAUDE.md` law 1 and the `rule-author` skill; everything below
is the other surfaces.

## The named surfaces

`CLAUDE.md`, `README.md`, `docs/ROADMAP.yaml`, `gates/*.json` and
`package.json`. Widening the law is itself gated: `tests/contract/docs-consistency.spec.ts`
reads `CLAUDE.md`, so editing a law means updating the quoting sites and that
assertion in the same commit. The quoting sites are `docs/ANTI-CREEP.md`,
`docs/ANTI-CREEP-BASELINE.json`, `.github/copilot-instructions.md`,
`tests/contract/docs-consistency.spec.ts` and `src/commands/doctor.ts`.

## Adding an npm script

`npm run entry-points:check` is what makes "the surface grew" a fact somebody
measures rather than an opinion. It enforces three things:

1. Both entry points exist and name only scripts that exist.
2. `check` is at most **twelve** leaves, counted on the chain a maintainer
   reads.
3. `certify` is a superset of `check`, transitively.
4. Neither entry point reaches a write-mode script — `check` and `certify`
   rewrite nothing.

So a new script is fine on its own. A new script **inside** `check` is not,
unless something leaves with it. That is the whole rule.

## Adding a CLI verb

The verb budget lives at `npm run verbs:budget`. A verb is a user-visible
promise, and the frozen contracts say the exit-code map, `schemaVersion: 1`
and rule IDs are frozen without explicit approval. Adding a verb means also
checking:

- `npm run check-cli-contract` — the contract gate;
- `docs/cli-contract.json` — the recorded contract;
- `site/reference/` — the published verb documentation;
- `npm run ci-local:parity` — CI and local must agree.

## Adding a gate

`gates/*.json` is a named governed surface. A new gate id is surface growth.
`npm run gates:check` validates tiers; `npm run gates:claim-integrity` chains
the claim and provenance gates. `docs/CERTIFICATION-POLICY.md` governs what a
gate may claim about itself, and `npm run check-certification-surface` enforces
the boundary.

Before adding a gate, answer honestly: **which existing check would have caught
the bug this gate exists to catch?** During 6.0 the answer was six real
defects — which is why the cut from 39 gates to 12 was measured and declined,
with the numbers in the 6.0.0-rc.1 changelog entry. A gate that catches nothing
is not insurance, it is surface debt with a passing test attached.

## The two legal ways to grow

1. **Equal-size removal in the same commit.** Add the verb, retire the verb it
   replaces. Net zero needs no paperwork.
2. **A recorded `ANTI-CREEP-EXCEPTION` in `CHANGELOG.md` with the reason.** The
   reason is the part a reviewer has to check. "Needed" is not a reason.

The ratchet compares the shipped tier against `previousBaselineCore` in
`docs/ANTI-CREEP-BASELINE.json`, **not** against `baselineCore`. That
distinction is the interlock: lowering `baselineCore` to match a grown tier
makes the arithmetic zero and the law read as satisfied, which is one
uncross-checked JSON edit that promotes a rule and switches the law off. If you
are tempted to touch the baseline, re-read `docs/ANTI-CREEP.md` first.

The marker is scoped to the **top** `## ` changelog entry, on purpose. A
changelog is a sequence of releases; a growth claim is made in a release; so a
marker survives exactly until its release is cut. A marker written once in a
past release would disable the ratchet for every commit after it, permanently.

## What this law does not do

It does not decide what ought to exist. The measurement question is answered
by the corpus, not by a cap: the core ceiling is a 10 % Wilson upper bound, a
rule observing zero false positives needs n ≥ 35 to clear it, and almost every
measured rule sits well above that — which is why the core tier holds two rules
and the shipping default remains `extended`. "Shipped by default" and "earned
core" are different claims. Do not conflate them in either direction. Read the
live figure from `npm run rules:census` rather than from this paragraph, which
is prose and has already been wrong once.

## Reporting

State the net surface delta and which of the two paths you took. If you took
the exception path, quote the marker you wrote. A change that added surface and
reported neither is the exact outcome law 0 exists to prevent.