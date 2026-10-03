# Engine freeze — what a consumer may rely on

Mjölnir's output is consumed by CI systems, agent harnesses and reporting
dashboards that cannot upgrade in lockstep with the npm package. A tool whose
numbers move silently is worse than one whose numbers are coarse, so this file
states the promises, and points at the machine-readable source that enforces
them.

**The source of truth is `CONTRACT_REGISTRY` in `src/engine/contract-versions.ts`.**
Nothing here is a second copy of a version number. If this file and the registry
ever disagree, the registry is right and this file is a bug — the same rule the
census sentinels follow, and for the same reason: a number written down twice is
a number that will be wrong once.

## The eight contracts

`CONTRACT_REGISTRY` lists each contract with an `identifier`, a `version`, a
description, and a `compatibilityPolicy`. The policy is the promise:

| Policy                  | Meaning                                                                  | What a consumer can assume                                                            |
| ----------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `semver`                | Follows the package version                                              | May break within a major, never within a minor or patch                               |
| `additive-only`         | Fields may be **added**; existing ones never change meaning or type      | Unknown fields are safe to ignore; a missing field you relied on is a breaking change |
| `semver + ADR required` | Same as `semver`, and a bump needs an ADR explaining the semantic change | Read the ADR — the version number alone does not tell you what changed                |
| `version-bump`          | Any change bumps the version                                             | Watch the version, not the shape                                                      |

Two of these carry a history worth knowing, because the version number alone
does not explain them:

- **`scoringModelVersion` is 2.0.0**, and the reason is a _semantic_ change, not
  an interface change. Under ADR 0014 a core-tier rule's finding is stamped to
  at least E1, which changes `deductionFor` for every core finding. The
  E0→E1→E2 ladder is unchanged; what changed is which rung a core finding may
  sit on and therefore what it costs. **A consumer comparing scores across that
  boundary is comparing different things** and must re-baseline.
- **`evidenceSchemaVersion` and `forensicsSchemaVersion` are integers.** They are
  the contract for artifacts written to disk. Bumping either is the signal that
  a previously written artifact may not be readable by the new engine — the
  policy is literally `version-bump`, so treat a stored artifact as valid only
  for the version that produced it.

## What is frozen, and what is honestly not yet load-bearing

`frameworkSupportMatrixVersion` is declared in the registry and emitted into
scan output, but **nothing reads it back to make a decision**. It is a
version stamp on a fact, not a negotiated protocol. It is listed here because
removing it would break the emitted shape, not because anything depends on its
value today. A consumer may read it; a consumer must not assume a future engine
will refuse to run against a matrix version it does not recognise.

`engineVersion` is `semver`, which means a **major** bump may break the output
shape. The exit-code map (`0` clean, `1` gate-worthy findings, `2` partial scan
or no baseline) is part of that promise: it is asserted in
`docs/machine-contract.md` and in `tests/contract/`, and changing it is a
major-version event, not a patch.

## How a change to any of this is supposed to happen

1. Change the constant in `src/engine/contract-versions.ts`.
2. For `semver + ADR required`, write the ADR. The number does not substitute
   for it.
3. Run `npm run docs:regen` and commit the result — `npm run docs:staleness`
   fails if you did not.
4. If the tier, evidence or scoring semantics moved, say so in `CHANGELOG.md`
   under the release that carries the bump, in terms a consumer can act on.
   "Internal refactor" is not an acceptable summary for a `semver + ADR`
   contract.

## What this file deliberately does not do

It does not list the current version numbers, and it does not claim the engine
is stable in the sense of "will not change". The engine will change; that is the
point of the registry. What it will not do is change a contract without a
version, a policy, and — where the policy demands it — a written reason. A
consumer who pins a version and reads the ADR can rely on that. A consumer who
wants certainty should read the registry, not this summary.
