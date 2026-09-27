# ADR 0007 — One capability inventory, never a parallel one

**Status:** accepted · **Amends:** A7 · **Affects:** `src/frameworks/*`,
`src/rules/registry-census.ts`, `docs/M26-SUPPORT-MATRIX.json`,
`src/capabilities.ts`

## Context

The spec asks for a **universal capability registry** (§2): one
machine-readable entry per capability, driving docs, site, CLI, MCP,
Action, VS Code, dashboard, the support matrix, release notes and the
rule encyclopedia.

The repository already contains **four** capability-adjacent
primitives:

| Existing primitive           | Path                                             | What it actually holds                                  |
| ---------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Framework inventory          | `src/frameworks/framework-inventory.ts`          | framework detection + declared capability per framework |
| Provider capability contract | `src/frameworks/provider-capability-contract.ts` | CI/hosting provider capability envelope                 |
| Universal pack contract      | `src/frameworks/universal-pack-contract.ts`      | the pack interface every domain pack implements         |
| Rule registry census         | `src/rules/registry-census.ts`                   | rule-registry census (ids, families, tiers)             |
| Support matrix               | `docs/M26-SUPPORT-MATRIX.json`                   | 136 cells, 12 axes, `TESTED`/`NOT_APPLICABLE`/`BLOCKED` |
| Capability list              | `src/capabilities.ts`                            | the CLI's capability list                               |

That is already the drift bug the spec is trying to _prevent_. Adding a
seventh list produces the exact failure Law 8 forbids: a hand-maintained
list of what is supported, which is a documentation defect **by
construction**, not by negligence.

The spec's §3 classification already calls the primitives
`MISSING (parallel primitives exist)` and the parallel-inventory risk is
listed as `DUPLICATED` per §100.

## Decision

**The capability registry is an _evolution_ of the existing primitives
into one registry with one schema. A second parallel inventory is a
defect, explicitly classified `DUPLICATED`, and is rejected by a gate.**

Concretely:

1. **One schema, one loader.** `src/v6/capability-registry.ts` reads
   from — never duplicates — the existing sources: the framework
   inventory, the provider capability contract, the pack contract, the
   rule registry census, and the 136-cell support matrix.
2. **The support matrix becomes a projection**, not a second truth. The
   registry is the authority; `docs/M26-SUPPORT-MATRIX.json` is generated
   from it for release gating, exactly as §2.3 requires.
3. **No consumer may hand-write a claim.** Docs, site, CLI, MCP, Action,
   VS Code, dashboard and release notes all _project from the registry_.
   A hand-written support list is a gate failure (`claims:prose`, P4).
4. **The primitives stay where they are.** They are not deleted in v6;
   they are the registry's inputs. Deleting them would be a
   ground-up rewrite of working detection code with no proof gain — the
   exact "core rebuild" the blueprint says v6 is _not_ about.
5. **The registry is additive to the rule registry, not a replacement
   for it.** A rule id still exists and still means what it means
   (ADR 0003). The registry _references_ rule ids; it does not
   renumber them.

## Consequences

**Forbids**

- A new module that enumerates frameworks, languages, providers or packs
  for support purposes.
- A new "support matrix" file alongside `docs/M26-SUPPORT-MATRIX.json`.
- A consumer rendering a support claim without projecting from the
  registry.

**Permits**

- Extending an existing primitive (e.g. adding a framework to
  `framework-inventory.ts`) — that is the _supported_ way to add a
  capability.
- Generating new views (the language / framework / CI matrices of §5.1)
  as projections of the registry.

**Costs**

- A layer of indirection between the primitives and every consumer. This
  is the intended cost: it is the price of never having two truths.

## Rejected alternatives

| Alternative                                        | Why rejected                                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New standalone registry, primitives left as-is     | This is the `DUPLICATED` state §100 rejects. It guarantees drift.                                                                                                  |
| Delete the primitives, reimplement in the registry | Reimplements working detection code (risk of new FP/FN) for zero proof gain, and violates the "no core rebuild after v6" intent in the wrong direction.            |
| Make the support matrix the registry               | The matrix is a 12-axis, 136-cell _projection for release gating_; it has no per-capability precision/recall/evidence structure and cannot express `nextLevelGap`. |
| Make `src/capabilities.ts` the registry            | It is a CLI-facing list, not a provenance-bearing registry. Promoting it would give a user-facing string authority over a claim.                                   |

## Enforcement

| Mechanism              | Location                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Single loader          | `src/v6/capability-registry.ts` — the only module allowed to assemble a capability entry                    |
| No-duplicate gate      | `tests/v6/capability-registry.spec.ts` — a second enumeration module fails the build                        |
| Projection             | `docs/capability-registry.json` + `docs/{LANGUAGE,FRAMEWORK,CI,DOMAIN-COVERAGE}-MATRIX.json`, all generated |
| Claim authority        | `docs/claim-registry.json` gains `authority` + proof per claim (Wave 1)                                     |
| No hand-written claims | `claims:prose` (P4) — Wave 0/13                                                                             |
