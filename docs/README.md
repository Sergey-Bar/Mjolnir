# QA Doctor — Documentation

## Status

Every file below and every file in `docs/tiers/` now carries inline
✅/🟡/⬜ markers showing what's actually shipped in `qa-doctor/src/` as of
2026-08-25, cross-checked against the code (not just claimed in prose).
Start with `.planning/STATE.md` for the current one-page summary, then
`docs/plans/Implementation-Master-Plan.txt` for the phase-by-phase detail.

## Plans (`docs/plans/`)

| File                             | Purpose                                                                                                                                                                                                  | Status                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Implementation-Master-Plan.txt` | Master implementation plan, phase-by-phase                                                                                                                                                               | **Primary — most accurate to reality**, fully annotated                                           |
| `Upgrade-Plan-v2.txt`            | R1 LanguageAdapter → R2 Python → R3 Playwright Deep Mode, with rule-ID tables                                                                                                                            | Fully annotated; scheduled to be merged into Implementation-Master-Plan.txt                       |
| `Upgrade-Plan-v3.txt`            | Priority-ordered plan: new Playwright layers → Playwright-Python → TS AST precision upgrade → Java/.NET Playwright adapters → Plugin API + cross-file analysis; tier-4 delight items explicitly deferred | **Primary for next work** — not yet started, phases 0-6                                           |
| `Product-MVP.txt`                | MVP §1–35 — rules, scoring, guardrails, risks                                                                                                                                                            | Frozen contract, largely implemented                                                              |
| `Product.txt`                    | Long-term vision — Evidence Graph, E0–E4, release confidence                                                                                                                                             | Vision only, ~0% implemented                                                                      |
| `Plan.md`                        | A second, independent long-term vision (Evidence Engine/False-Green Engine/etc)                                                                                                                          | **Duplicate of Product.txt's vision under different names — superseded, kept for reference only** |
| `Sprint-Plan.txt`                | 13-week sprint plan (Option A: solo dev + AI)                                                                                                                                                            | **Superseded** — predates multi-language/Playwright work already shipped                          |
| `Legendary-Roadmap.txt`          | Full legendary-OSS roadmap                                                                                                                                                                               | **Duplicate of `docs/tiers/*.md`** — the tier files carry the status markers, this doesn't        |

## Legendary Roadmap by Tier (`docs/tiers/`) — status-annotated

| Tier | File                                                                     | Theme                                                                                      | Shipped          |
| ---- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------- |
| 1    | [tier-1-game-changers.md](tiers/tier-1-game-changers.md)                 | Proof-of-Value engine, Flakiness Forensics, safe auto-fix, living docs, evidentiary badges | 3/5              |
| 2    | [tier-2-community-gravity.md](tiers/tier-2-community-gravity.md)         | Plugin API, radical transparency, QA Challenge, integrations                               | 1/5              |
| 3    | [tier-3-technical-depth.md](tiers/tier-3-technical-depth.md)             | Cross-file analysis, performance, SARIF, attestations, honest AI layer                     | 1/5              |
| 4    | [tier-4-delight.md](tiers/tier-4-delight.md)                             | Roast mode, milestones, stats, terminal UX, Mermaid output                                 | 0/5              |
| 5    | [tier-5-qa-war-room.md](tiers/tier-5-qa-war-room.md)                     | QA-speak, triage killer, release report, coverage honesty, debt register                   | 4/10 + 1 partial |
| 6    | [tier-6-github-stars-playbook.md](tiers/tier-6-github-stars-playbook.md) | README-as-product, launch choreography, trending mechanics, contribution surface           | non-code, N/A    |

## Other folders

- `demos/` — demo outputs and intentionally-broken sample suites
- `scratch/` — scan artifacts (gitignored)
- `qa-doctor/` — the product source code
