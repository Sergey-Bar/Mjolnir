# ADR 0012 — Optional hosted mode is a declared state, never a default

- **Status:** accepted
- **Date:** 2026-09-29
- **Supersedes:** nothing. **Extends:** [ADR 0008](0008-hosted-enterprise-boundary.md)
- **Gaps:** `GAP-M26-013`, `GAP-M26-015`, `GAP-M26-016`
- **Decisions:** [D-10](../PRODUCT-DECISIONS.md)

## Context

Three gaps need a hosted control plane: multi-tenant sync, a two-repository
consented pilot, and an air-gapped install (`GAP-M26-013/015/016`). Each
reverses the zero-network law as written. `src/governance/m33-m34-contract.ts`
exists (2,659 lines) and is a `CONTRACT_ONLY` entry — implemented, imported by
its own contract test, and reachable by nothing else.

The question is not whether to build it. It is whether admitting it changes
what the product is.

## Decision

**`local-only` remains the default and the zero-network contract is unchanged
for it. Hosted mode exists as a DECLARED STATE, opt-in at install time, and it
is not implementable without an explicit flag.**

Three things follow, and each is a constraint rather than an intention.

**1. The default is not negotiable inside the product.** There is no
configuration file, environment variable or CLI flag that turns hosted mode on
by implication, by a default value, or by a first-run prompt that can be
dismissed. Activation is a build-time declaration or an explicit
`--mode hosted` at every invocation, and the local-only path never reads it.

**2. The switch is observable, and the gate proves it.** `tests/contract/privacy-network-isolation.spec.ts`
passes unchanged, plus two tests that did not exist: one asserting `local-only`
emits zero network calls, and one asserting hosted mode is unreachable without
the explicit opt-in. The second is the one that matters — a mode reachable by
accident is a mode that will be, eventually.

**3. The state is a value, not a flag.** A run records which mode produced it
(`local-only` or `hosted`), in the run identity, so an artifact produced under
one mode is never silently comparable with an artifact produced under the
other. This is the same discipline as the coverage high-water mark and the
`ADAPTER` / `adapter` split: two modes that write the same artifact and cannot
be told apart are one mode that will drift.

## Rejected alternatives

**Against building it.** The market split on this is real. Sentry ships OSS
error reporting, Vercel ships analytics, and neither is unusual. But every one
of those is opt-in at the _product_ level with a documented schema, and none of
them runs in a pre-commit hook.

A static analyser is a different class. It runs on a developer's machine, in a
company that has not disclosed anything, over code nobody consented to
transmit. Opt-out is the wrong default for that class — not because network
calls are inherently wrong, but because the person who would be affected is not
the person who configured the tool.

**Against refusing it.** Refusing outright is a decision the evidence does not
support. `GAP-M26-015` is a real enterprise requirement, and a tool that cannot
run in an air-gapped environment loses those evaluations before it can
demonstrate anything. "Ship it as a declared mode, never a default" is the
right shape, and this ADR exists so the shape survives the implementation.

**Against an env var or a config flag for the default.** It was considered and
rejected for the same reason the pre-commit argument above applies, in a
shorter form: the mode most deployments would actually run is the one a
default selects, and a default that can be flipped by a stray environment
variable in CI is a default nobody chose. Activation is a build-time
declaration or an explicit flag at every invocation, and the local-only path
never reads either.

## Enforcement

Three things check this, and two of them are new.

- `tests/contract/privacy-network-isolation.spec.ts` — passes **unchanged**.
  A record that required editing its own regression test to be accepted was
  never a constraint.
- `tests/contract/hosted-mode-not-reachable.spec.ts` — new. Asserts that
  hosted mode cannot be entered without the explicit opt-in. A mode reachable
  by accident is a mode that eventually will be.
- `docs/PRODUCT-DECISIONS.md` D-10 — the decision itself, with what it
  forecloses.

The run-mode field in the run identity is what makes a hosted artefact and a
local-only artefact distinguishable, and it is asserted rather than assumed:
an artefact produced under one mode that can be compared with one produced
under the other is one mode that will drift.

## Consequences

- `local-only` stays the only mode with external validation. The 39 boxes in
  [`EXTERNAL-EVIDENCE-REQUEST.md`](../EXTERNAL-EVIDENCE-REQUEST.md) are about
  `local-only`; hosted mode does not count toward them, because validating a
  tool that behaves differently under test validates the wrong artefact.
- A hosted-mode run is not evidence for a local-only claim, in either
  direction. This is the `ADAPTER` / `adapter` split generalised.
- The pilot (`GAP-M26-015`) needs a second repository and a written consent
  before any implementation work is funded. Both are `EXTERNAL_PENDING` in
  [`docs/RELEASE-PATH-RUNBOOK.md`](../RELEASE-PATH-RUNBOOK.md), which names the
  actor for each.
- `m33-m34-contract.ts` stays a `CONTRACT_ONLY` entry until something imports
  it. Hosted mode is the obvious first consumer, and that is the honest
  dependency: the contract is written, and the mode that needs it is not built.

## What would change this

An air-gapped deployment requirement (which reverses the reasoning above, since
the absence of a network is then the _constraint_ rather than the default), or
evidence that an opt-in mechanism cannot be made genuinely opt-in. Either would
be a new ADR, not an amendment to this one.
