# ADR 0010 — The ecosystem census is the authority on "what exists"

**Status:** accepted · **Amends:** Law 8 · **Affects:** framework
detection, adapter planning, `docs/ECOSYSTEM-CENSUS.json`,
`docs/ECOSYSTEM-GAPS.md`, roadmap

## Context

**Every list of what Mjölnir supports is hand-maintained today.**
Framework names, language names, CI provider names, test-tool names —
all of them are strings somebody typed into a file, and the difference
between the list and reality is discovered by users.

The blueprint classifies this honestly: _support lists are hand-maintained
today (Law 8 violation by construction)_.

Three failure modes follow, and all three have already occurred or are
one dependency bump away:

1. **Silent omission.** A tool the engine cannot handle is not in the
   list, so the engine never claims to handle it — and never says it
   cannot either. The repository just analyses as if the tool were not
   there.
2. **Silent staleness.** A framework releases a major version, the
   adapter does not handle it, and the list still says "supported".
3. **Priority by enthusiasm.** The roadmap says what to build next
   because someone found the tool interesting, not because the field
   uses it.

Law 8 already forbids the shape: _a human-edited list of frameworks,
languages or providers is a documentation defect by construction, not a
convenience._

## Decision

**A versioned census registry is the single source of truth on "what
exists". The gap between the census and the engine is generated, not
remembered.**

### Census entries

Every entry is **versioned, owned and dated**, and carries a state:

| State            | Meaning                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `SUPPORTED`      | An adapter/proof exists at a stated maturity.                                                  |
| `TARGET`         | Declared, no proof yet, **with a `nextLevelGap`**.                                             |
| `DEPRECATED`     | Upstream sunset, with a successor and a date.                                                  |
| `NOT_APPLICABLE` | With a recorded reason.                                                                        |
| `UNRECOGNIZED`   | Detected in a real repository but absent from the census. **A first-class signal, not noise.** |

### Census categories

languages · test frameworks · test runners · BDD/spec DSLs · API &
contract-testing tools · component/E2E runners · mobile test frameworks ·
load & performance tools · test-management & requirements systems ·
accessibility scanners · security scanners · visual-regression
platforms · report & artifact formats · CI/CD providers ·
infrastructure-as-code & container tooling · browser/device matrices ·
mutation testing tools · observability/telemetry sources.

### The gap generator is mandatory

1. **A discovery probe** runs over real repositories (the same corpus the
   rule factory uses) and reports every tool it sees — including tools
   the census does not know (`UNRECOGNIZED`).
2. **A gap generator** diffs census against discovery and emits a ranked
   backlog: what was seen in the field, how often, with which prevalence,
   and which capability axis would be blocked without it.
   **Frequency, not enthusiasm, sets priority.**
3. **A staleness trigger** demotes a `SUPPORTED` entry whose upstream
   released a major version the adapter does not handle — the same
   auto-demotion rule as ADR 0001's maturity ladder.
4. **A deprecation flow** requires a successor link, a migration row in
   `docs/COMMAND-MIGRATION.md` where user-visible, and a removal date.
   Never a silent disappearance.

### Explicitly in the census from day one

Cucumber · SpecFlow · Karate · REST Assured · Pact · Postman/Newman ·
Bruno · Testcontainers · Playwright Components · Robot Framework ·
Cypress · k6 · Gatling · Locust · TestRail · Xray · Zephyr · Azure Test
Plans · Terraform · Kubernetes manifests.

## Consequences

**Forbids**

- A hand-maintained list of frameworks, languages, providers, runners or
  tools in any doc, README, locale, site page or rule page. The 24
  README locales are covered.
- A `SUPPORTED` entry with no stated maturity and no proof path.
- Silently ignoring an `UNRECOGNIZED` finding. **A new tool the engine
  sees in the wild and ignores is a release-blocking honesty failure**,
  not a backlog item.
- An unowned census entry.

**Costs**

- A discovery probe over the corpus, on a schedule. This is real compute
  and real maintenance.
- The census can itself rot. Mitigation is structural: it is generated,
  diffed, staleness-demoted and gated — the census is subject to the
  same anti-drift rules as everything else. A stale census _blocks_
  `ecosystem:census`.

## Rejected alternatives

| Alternative                                               | Why rejected                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the hand-written list, add a "last reviewed" date    | A date does not make a list true. The diff is still never computed.                                                                                                     |
| Derive the list from `package.json` of scanned repos only | Sees only dependencies, misses CLI tools, config-file presence, CI providers and anything used without a package entry — the majority of what matters for test tooling. |
| Generate the list from the adapters that exist            | That describes the engine, not the ecosystem. It cannot produce a backlog, because it can only ever name what was already built.                                        |
| Generate the list from the census and drop discovery      | Then a tool nobody declared is invisible forever. `UNRECOGNIZED` is the whole point.                                                                                    |

## Enforcement

| Mechanism                | Location                                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Census registry          | `src/v6/ecosystem-census.ts` + `docs/ECOSYSTEM-CENSUS.json` (generated)                               |
| Schema + versioning gate | `ecosystem:census` — schema, version, ownership, staleness triggers                                   |
| Discovery + gap gate     | `ecosystem:gaps` — no `UNRECOGNIZED` entry older than one corpus cycle without a recorded disposition |
| Generated gap report     | `docs/ECOSYSTEM-GAPS.md`                                                                              |
| Prose authority          | `claims:prose` (P4) — a support claim in prose must bind a census entry                               |
| Coverage invariant       | `domain-matrix:check` — a domain name with no pack is a documentation defect                          |
