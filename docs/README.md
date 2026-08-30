# Mjölnir — Documentation

## What the product is

One command in CI: `mjolnir --scope changed` — it scans the test files,
Playwright configs and CI workflows a branch touched and exits non-zero on
new findings. Everything else (`forensics`, `debt`, `handover`, `impact`,
`baseline`/`diff`, `stats`, `badge`, `--tone blunt`, …) is optional and
should be read as such.

Honesty surface: 15 of 91 rules carry a false-positive rate measured against
real OSS code (`docs/FP-AUDIT.md`). The scan footer, `mjolnir rules
--unmeasured`, and every `mjolnir explain` page report which rules are which.

## Status

Current state: `.planning/STATE.md` — the single living document,
updated after every completed sprint. It is the one-page summary of
what's actually shipped versus what's still open, and it outranks every
plan file listed below.

**Every plan in the table below is complete or superseded.** They live
in `docs/archive/plans/` and are kept for their per-task audit trail,
not as instructions. `Master-Stabilization-Plan.md`'s sprints 0–9 are
all done; the "Tempering Mjölnir" plan that followed it (phases 1–8:
string masking, fixture exclusion, the measured FP audit, the tier
system, score normalization, rule families, executable laws, docs truth
pass) is also complete — see `.planning/STATE.md` for both records.

## Plans (`docs/archive/plans/`) — historical

| File                             | Purpose                                                                                                                                 | Status                                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Master-Stabilization-Plan.md`   | Stabilization & trust plan gating the open beta — sprints 0-9                                                                           | **Complete** — all 9 sprints shipped; superseded by the Tempering plan, then by `.planning/STATE.md`                            |
| `Implementation-Master-Plan.txt` | Master implementation plan, phase-by-phase                                                                                              | **Superseded** by Master-Stabilization-Plan.md; kept for its per-task audit trail                                               |
| `Upgrade-Plan-v2.txt`            | R1 LanguageAdapter → R2 Python → R3 Playwright Deep Mode, with rule-ID tables                                                           | Fully annotated, historical — shipped                                                                                           |
| `Upgrade-Plan-v3.txt`            | New Playwright layers → Playwright-Python → TS AST precision upgrade → Java/.NET Playwright adapters → Plugin API + cross-file analysis | Shipped (see `.planning/STATE.md`); Sprint 8 of Master-Stabilization-Plan continues the Java/.NET parity work this plan started |
| `Product-MVP.txt`                | MVP §1–35 — rules, scoring, guardrails, risks                                                                                           | Frozen contract, largely implemented                                                                                            |
| `Product.txt`                    | Long-term vision — Evidence Graph, E0–E4, release confidence                                                                            | Vision only, ~0% implemented                                                                                                    |
| `Plan.md`                        | A second, independent long-term vision (Evidence Engine/False-Green Engine/etc)                                                         | **Duplicate of Product.txt's vision under different names — superseded, kept for reference only**                               |
| `Sprint-Plan.txt`                | 13-week sprint plan (Option A: solo dev + AI)                                                                                           | **Superseded** — predates multi-language/Playwright work already shipped                                                        |
| `Legendary-Roadmap.txt`          | Full legendary-OSS roadmap                                                                                                              | **Duplicate of `docs/tiers/*.md`** — the tier files carry the status markers, this doesn't                                      |

## Legendary Roadmap by Tier (`docs/tiers/`) — status-annotated

| Tier | File                                                                     | Theme                                                                                      | Shipped          |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------- |
| 1    | [tier-1-game-changers.md](tiers/tier-1-game-changers.md)                 | Proof-of-Value engine, Flakiness Forensics, safe auto-fix, living docs, evidentiary badges | 3/5              |
| 2    | [tier-2-community-gravity.md](tiers/tier-2-community-gravity.md)         | Plugin API, radical transparency, QA Challenge, integrations                               | 1/5              |
| 3    | [tier-3-technical-depth.md](tiers/tier-3-technical-depth.md)             | Cross-file analysis, performance, SARIF, attestations, honest AI layer                     | 1/5              |
| 4    | [tier-4-delight.md](tiers/tier-4-delight.md)                             | Roast mode, milestones, stats, terminal UX, Mermaid output                                 | 0/5              |
| 5    | [tier-5-qa-war-room.md](tiers/tier-5-qa-war-room.md)                     | QA-speak, triage killer, release report, coverage honesty, debt register                   | 4/10 + 1 partial |
| 6    | [tier-6-github-stars-playbook.md](tiers/tier-6-github-stars-playbook.md) | README-as-product, launch choreography, trending mechanics, contribution surface           | non-code, N/A    |

Tier statuses above predate Sprint 6/7/9 of Master-Stabilization-Plan
(impact/stats commands, living docs, delight features) — treat them as
historical snapshots, not live counts; `.planning/STATE.md` is current.

## Other folders (repo-relative, from this repo's own root)

- `.planning/` — current sprint state (`STATE.md`)
- `packages/` — workspace member packages (`mjolnir-qa-playwright-reporter`,
  source-only: not published to npm, see its README)
- `examples/` — the deliberately-imperfect demo repo used in the README hero
- `scratch/` — scan artifacts (gitignored)
- `src/`, `tests/` — the product source code and its test suite
