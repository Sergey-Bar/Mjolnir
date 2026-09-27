# ADR 0004 — The aggregate worthiness score is a secondary panel

**Status:** accepted · **Amends:** A4 · **Affects:** `src/scorer/`,
every rendering surface, README, site, badge

## Context

Two rules in the blueprint pull in opposite directions:

- **§44** allows one aggregate score, but only as a _secondary_ output.
- **§94** bans vanity metrics and names the primitives that count:
  proof depth, semantic coverage, precision, recall, determinism,
  failure sensitivity, false-green detection, maturity distribution.

The shipped product, meanwhile, leads with an aggregate 0–100
**Worthiness Score** (`src/scorer/`, `README`, badges). It is the first
number a user sees.

That is a direct conflict, and it is a _false-completion_ conflict, not
a taste conflict: a single 0–100 number over a repository whose analysis
is `PARTIAL` in 44 of 136 support-matrix cells reads as a quality claim
the engine cannot demonstrate. Law 1 says prefer `PARTIAL` over false
completeness.

The blueprint left this to the owner (open question 1) with a
recommendation of demotion. This record takes the recommendation.

## Decision

**The aggregate score is demoted to a secondary panel. It is never the
headline, and it is never renderable without its proof context.**

Concretely:

1. **A proof-context header is mandatory.** The aggregate may only be
   rendered as a panel whose header states, in the same viewport:
   the maturity of each contributing capability axis, the number of
   blocked/unknown axes, the corpus `n`, and the scan's completeness
   state. A score with a non-trivial unknown share **must** render
   `PARTIAL` or `UNPROVEN` in its determination, never `PASS`.
2. **The determination is the headline, the score is the detail.** Every
   surface leads with the determination
   (`PASS · FAILED · BLOCKED · INCONCLUSIVE · UNPROVEN · PARTIAL`) and
   the per-dimension breakdown. The aggregate appears after it.
3. **No marketing use.** The number must not appear in the README hero,
   the site hero, the GitHub Action badge title, the PR comment subject,
   or the dashboard header without the proof context. The `docs:hero` and
   `docs:gauge` generators are the enforcement point.
4. **The 13 dimension scorecards are the substance** (§44): Test
   Integrity, Assertion Strength, Failure Sensitivity, CI Integrity,
   Evidence Integrity, Flake Resistance, Isolation, Contract Quality,
   Risk Coverage, Policy Compliance, Configuration Integrity, Artifact
   Integrity, Maintainability. The aggregate is a _summary of those_,
   and is never computed from anything else.
5. **The aggregate is never a gate.** Policy evaluates dimensions and
   the determination. A policy cannot require "score ≥ 80" as a release
   condition; it must require the dimension and the maturity behind it.

## Consequences

**Forbids**

- A score rendered without a maturity/completeness header.
- A `PASS` determination over an aggregate whose inputs include a
  `BLOCKED` or `UNKNOWN` axis.
- Any release gate, policy clause or marketing surface keyed on the
  aggregate.
- A second, competing scoring system. One scoring system, demoted.

**Costs**

- The README hero and the badge lose their headline number. This is a
  visible product change and the single most likely source of
  "why did you make the product worse" feedback. The counter-argument
  is that the number is currently a liability: it is the exact failure
  the constitution was written to prevent.
- Migration of every consumer reading the number. Wave 13.

## Rejected alternatives

| Alternative                                                                 | Why rejected                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the aggregate as the headline                                          | Directly violates §94 and manufactures false completeness from `PARTIAL` analysis. Rejected by Law 1.                                                                           |
| Keep the headline but bind it to a `PARTIAL/UNPROVEN`-capable determination | Strictly better than the status quo, but the header still makes a single unprovable number the first thing a user reads. The blueprint's own default recommendation is (a).     |
| Remove the aggregate entirely                                               | Rejected by §44, which explicitly allows a secondary aggregate and forbids only _vanity_ use. The summary of 13 measured dimensions is informative when its context is present. |
| Keep a second "coverage %" style aggregate                                  | §42 already decides this: _coverage is evidence, not truth_. A coverage-derived headline is a second scoring system.                                                            |

## Enforcement

| Mechanism               | Location                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Dimension decomposition | `src/scorer/` — the aggregate is derived from the 13 dimension scorecards and from nothing else                                  |
| Header presence         | `src/reporter/presentation-model.ts` (Wave 10, U1) — a score render without a proof-context header is a presentation-model error |
| Hero/gauge gating       | `docs:hero`, `docs:gauge` generators + `tests/readme-samples.spec.ts`                                                            |
| No-gate rule            | `src/commands/policy.ts` — a policy referencing the aggregate is rejected with a stated reason                                   |
| Anti-false-completion   | §5.5 addition A4, mechanically enforced by `claims:prose` (P4)                                                                   |
