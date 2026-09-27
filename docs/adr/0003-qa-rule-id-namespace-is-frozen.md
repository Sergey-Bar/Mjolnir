# ADR 0003 — The `QA-*` rule-id namespace is frozen

**Status:** accepted · **Amends:** A3 · **Affects:** rule registry,
encyclopedia, policy, suppressions, baselines, claim registry

## Context

Rule ids in this repository are **immutable**:

- `QA-*` is the canonical namespace — 79 live ids, 22 retired ids.
- `CHANGELOG.md:8-10` records the retirement policy; a retired id keeps
  its number forever so historical findings, suppressions and baselines
  still resolve.
- `CONTRIBUTING.md` states the same rule for contributors.
- `src/rules/index.ts` holds `RETIRED_RULE_IDS` as a preserved set, and
  the retirement path is documented in `docs/RULE-LIFECYCLE.md`.

The v6 spec proposed a new id format (`TEST_ASSERT_001`) alongside
capability ids (`test.assertion.strength`). Adopting it would break
every consumer holding a rule id: policies, suppression entries,
baselines, SARIF `ruleId` fields, and every rendered finding in history.

## Decision

**`QA-*` remains the canonical rule namespace, frozen forever.** New v6
rules continue the existing `QA-<DOMAIN>-<NNN>` scheme.

**Capability ids are a separate, second namespace** that lives only in
the capability registry and _references_ rule ids. A capability id is
never a rule id and never replaces one:

```
capability id : test.assertion.strength      → rules: [QA-TEST-001, QA-TQUAL-002]
rule id       : QA-TEST-001                  → immutable, forever
```

The spec's taxonomy categories (Assertions, Async, Isolation, Mocking,
Flakiness, CI, Coverage, API, DB) become the **encyclopedia's category
tree**, not a new id format. A category is a grouping; an id is an
identity.

## Consequences

**Forbids**

- Any id that does not match `^QA-[A-Z]+-\d+$`.
- Reusing a retired id for a different detector. The id is permanently
  bound to its original detector and its original _premise_; a rebuilt
  detector under a false premise is retired permanently and its
  successor is a **new** id (D3 bucket A).
- Adding a rule that carries only a capability id and no `QA-*` id.

**Permits**

- A capability id gaining new rule references over time, as long as the
  referenced ids exist and are not retired-without-successor.
- A retired id appearing in a `superseded_by` chain.

**Costs**

- The `QA-*` scheme carries domain prefixes that predate the v6 domain
  model (16 domains vs 9 families). `QA-CYP`, `QA-SE`, `QA-TQUAL` and
  `QA-ENV` have no exact v6 domain counterpart. Resolution: the domain
  mapping is an explicit registry projection, and an unmapped prefix is
  a visible `UNMAPPED` cell — never a silent guess.

## Rejected alternatives

| Alternative                                     | Why rejected                                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adopt `TEST_ASSERT_001`                         | Breaks every policy, suppression, baseline and SARIF consumer that holds a rule id.                                                                                                                                 |
| Renumber the namespace at 6.0                   | A major version is the sanctioned moment for a break, but renumbering buys nothing: the cost is paid and the benefit is cosmetic.                                                                                   |
| Make capability ids and rule ids the same thing | A capability is a _capability_ (a claim about coverage); a rule is a _detector_. Collapsing them forbids the "one capability, several rules" case that already exists (`test.assertion.strength` → multiple rules). |

## Enforcement

| Mechanism                 | Location                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Id pattern                | `src/rules/rule.ts` / `src/rules/index.ts` — every registered id must match `^QA-[A-Z]+-\d+$`              |
| Retirement immutability   | `RETIRED_RULE_IDS` + `docs/RULE-LIFECYCLE.md`; `tests/rules.registry.spec.ts`                              |
| Capability→rule reference | `src/v6/capability-registry.ts` (Wave 1) — a reference to a non-existent or retired id is a registry error |
| Taxonomy mapping          | The encyclopedia category tree; an unmapped domain prefix renders `UNMAPPED`                               |
| Retirement adjudication   | D3 as a machine gate in Wave 4, not prose                                                                  |
