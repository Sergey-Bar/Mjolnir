# ADR 0002 — The v6 exit-code contract

**Status:** accepted · **Amends:** A2 · **Affects:** CLI, GitHub Action,
CI consumers, `docs/VERSIONING.md`, `tests/contract/`

## Context

`src/exit-codes.ts` freezes the exit-code set as `{0, 1, 2, 10, 20}`,
and `docs/VERSIONING.md` publishes it. The contract is drift-locked in
`tests/contract/`.

The v6 spec requires **semantically distinct** codes with **no
overloading**, and names six conditions:

`SUCCESS · POLICY_FAIL · CONFIG_ERROR · EXECUTION_ERROR ·
UNSUPPORTED_ENVIRONMENT · INTERNAL_ERROR`

The current set cannot express two of them without overloading:

- **`UNSUPPORTED_ENVIRONMENT` has no home.** The closest existing code
  (`2`, partial) is _already_ used for "the scan was incomplete but the
  result is not a failure". Reusing it for "this environment is not
  supported" collapses the exact distinction the product's thesis
  depends on: _incomplete scan_ vs _cannot scan here at all_.
- **`INTERNAL_ERROR` has no home** distinct from `EXECUTION_ERROR`. Today
  a rule crash and a runner crash both land in the same bucket, so a
  consumer cannot tell "your repo failed to scan" from "the tool is
  broken" — and both look like the consumer's problem.

## Decision

v6 is a major version and takes the break. The frozen set:

| Code | Name                      | Meaning                                                                                                                                             | Blocking for a consumer?                     |
| ---- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `0`  | `SUCCESS`                 | The requested analysis completed and the policy passed.                                                                                             | no                                           |
| `1`  | `POLICY_FAIL`             | The analysis completed and the policy rejected the result.                                                                                          | **yes** — a real quality verdict             |
| `2`  | `PARTIAL`                 | The analysis completed **incompletely** (budget, timeout, partial scope, parser coverage). The result is honest but not exhaustive.                 | no, but never render as `PASS`               |
| `3`  | `UNSUPPORTED_ENVIRONMENT` | The requested analysis **cannot be performed here** (unhandled platform, missing required tooling, air-gapped hosted path). No verdict was reached. | **yes** — a silent no-op is a false green    |
| `10` | `CONFIG_ERROR`            | The invocation or configuration is invalid. Nothing was scanned.                                                                                    | **yes**                                      |
| `20` | `EXECUTION_ERROR`         | The scan started and failed (I/O, parse, environment fault).                                                                                        | **yes**                                      |
| `40` | `INTERNAL_ERROR`          | Mjölnir itself is defective. **Not the consumer's fault**; must be reported, never retried silently.                                                | **yes**, and must be distinguished from `20` |

**`2` is preserved, not repurposed.** "Partial scan" and "unsupported
environment" stay distinct, forever.

Requires, in the same change:

1. `mjolnir.release-trust@1` → `@2` machine-contract version bump.
2. `action.yml`, `docs/VERSIONING.md`, `README.md` and the 24 README
   locales updated.
3. A migration table (this section is the authority for it).
4. A contract test that locks the _set_ and each _name_.

## Consequences

**Forbids**

- Reusing `2` for any condition other than an incomplete scan.
- Adding a code that is not in the table without bumping the machine
  contract and this record.
- Any surface mapping two codes onto one name. A shared name across two
  codes is overloading by another name.

**Costs**

- **Breaking for automation pinned to the old set.** A consumer that
  treated `2` as "failed" now gets a non-blocking partial, and a
  consumer that treated `10` as "internal" now gets "config error".
  This is why the record is explicit that `2` keeps its _number_ and
  _meaning_, and why the migration rehearsal on a clean checkout is a
  Wave-13 DoD line.

## Rejected alternatives

| Alternative                             | Why rejected                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Keep `{0,1,2,10,20}` and overload       | The two missing conditions are exactly the ones whose confusion produces a false green.                                     |
| Add only `3` and skip `40`              | Leaves "your scan failed" and "the tool is broken" indistinguishable, which is how tools hide their own defects from users. |
| Reuse `2` for `UNSUPPORTED_ENVIRONMENT` | Explicitly forbidden by the blueprint's mapping note: the honest distinction collapses.                                     |
| Break codes at 6.0 _and_ 7.0            | Two breaks for one problem. Take it once, in the version that already breaks commands.                                      |

## Enforcement

| Mechanism             | Location                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| Single implementation | `src/exit-codes.ts` — the frozen set plus the per-code name table                                         |
| Contract test         | `tests/contract/exit-codes.spec.ts` — the set, the names, uniqueness, and the `2`-means-partial invariant |
| Documentation         | `docs/VERSIONING.md` — the published table, generated from `src/exit-codes.ts`                            |
| Action parity         | `tests/contract/` — `action.yml` must not re-declare a code                                               |
| Migration             | Wave 13 rehearsal on a clean checkout is a DoD line                                                       |
