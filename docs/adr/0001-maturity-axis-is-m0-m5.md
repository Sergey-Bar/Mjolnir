# ADR 0001 — The maturity axis is `M0`–`M5`, not `L0`–`L5`

**Status:** accepted · **Amends:** A1 · **Affects:** every capability,
rule, parser, adapter, policy, surface and pack

## Context

`L0`–`L5` is **already taken in this repository, with a different meaning.**

`src/types.ts:106-117` defines `L0`–`L5` as the **trust level of a
finding**: L3–L5 require runtime corroboration, and the documented
invariant is that _a static-only finding can never claim L4/L5_.

That vocabulary is not confined to a type alias. It is baked into the
brand layer:

- `src/brand/tokens.ts:174-180` — the ladder is part of the token set.
- `src/brand/tokens.ts:467-472` — and part of the exported scale.
- `--mj-l0` … `--mj-l5` — and the CLI flag surface.

The v6 blueprint proposed reusing `L0…L5` for **capability maturity**. A
product whose thesis is _"every claim must be unambiguous"_ cannot carry
the same six tokens for two orthogonal axes. Worse, the two axes have
different derivations, so a renderer that merges them produces a claim
that is wrong in both directions at once.

A third vocabulary was also on the table
(`EXPERIMENTAL→DETECTED→PARTIAL→GENERIC→SUPPORTED→CERTIFIED`). Two
ladders in one product is the exact drift class the M26 ledger work
exists to kill.

## Decision

**The capability-maturity axis is named `M0`–`M5`.** `L0`–`L5` remains
**exclusively** the finding trust level. The `M` ladder replaces the
`EXPERIMENTAL…CERTIFIED` ladder outright, so the product has exactly two
level vocabularies, each with one meaning.

| Level | Name               | Promotion criterion (machine-checked)                                                                                                                       |
| ----- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `M0`  | `UNKNOWN`          | Nothing declared. Default for any unclassified capability.                                                                                                  |
| `M1`  | `DECLARED`         | Declared in the capability registry with an owner and a claim; no implementation proof.                                                                     |
| `M2`  | `IMPLEMENTED`      | Implementation exists, unit-tested; no fixtures or corpus proof.                                                                                            |
| `M3`  | `FIXTURE_VERIFIED` | Positive + negative + boundary + adversarial fixtures pass, deterministically, in CI.                                                                       |
| `M4`  | `CORPUS_VERIFIED`  | Real-repository corpus run: `n ≥ 10` classified verdicts, Wilson CI recorded, precision **and** recall measured, no unresolved crash, `detectorRev` locked. |
| `M5`  | `FIELD_PROVEN`     | Independent real-world repositories + declared field support + stable confidence interval + candidate-bound evidence.                                       |

`src/v6/maturity.ts` is the single implementation: the ordered level
list, the rank function, the promotion-criterion identifiers, and the
`six orthogonal axes` table below. No module may re-declare the ladder.

## Consequences

**Forbids**

- Emitting a field named `maturity` whose values are `L0`–`L5`.
- Any new ladder with a different name for the same six stages. Adding a
  seventh level is a v7 architectural change, not a v6 feature.
- Reusing `M0`–`M5` for anything that is not _capability_ maturity
  (finding confidence uses `L0`–`L5`; evidence state uses `E-*`;
  determination uses the closed `PASS/FAILED/…` set).

**Permits**

- Co-displaying a trust level and a maturity on the same line — the
  orthogonality table in ADR 0011 is what makes that safe.
- Deriving a _display_ label from a maturity, as long as the label
  resolves from `src/v6/maturity.ts` and not from a hardcoded string.

**Costs**

- One more token family in a codebase that already has a token sprawl
  problem. Mitigated by `--check` verification in the v6 maturation wave:
  every ladder constant must resolve to `src/v6/maturity.ts`.

## Rejected alternatives

| Alternative                                | Why rejected                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse `L0`–`L5` for maturity               | Directly collides with a live, documented, brand-baked axis. Breaks the brand layer and the CLI flags.                                        |
| Rename the finding axis instead            | `L0`–`L5` is the _older_ vocabulary and appears in the finding contract; renaming it breaks every consumer of a shipped artifact for no gain. |
| Keep `EXPERIMENTAL…CERTIFIED` for maturity | A third ladder for the same concept is the drift class itself.                                                                                |
| Use free-text maturity                     | Law 8: an unversioned free-text axis cannot be gated, diffed or demoted.                                                                      |

## Enforcement

| Mechanism             | Location                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single implementation | `src/v6/maturity.ts` (`MATURITY_LEVELS`, `maturityRank`, `PROMOTION_CRITERIA`)                                                                    |
| Ladder identity test  | `tests/v6/maturity.spec.ts` — asserts the exact ordered level list, the exact names, and that no `L`-prefixed value appears in any maturity field |
| Ladder consumer test  | `tests/v6/maturity.spec.ts` — greps `src/` for a second `L0`–`L5` maturity declaration and fails                                                  |
| Orthogonality         | ADR 0011; `ORTHOGONAL_AXES` in `src/v6/maturity.ts`                                                                                               |
| Live promotion        | `rules:quality:check` (Wave 4) — promotion is a machine transition, never a hand edit                                                             |
