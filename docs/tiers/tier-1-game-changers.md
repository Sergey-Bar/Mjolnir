# LEGENDARY ROADMAP — TIER 1 GAME CHANGERS

> Extracted from Legendary-Roadmap.txt (source of truth). See docs/plans/ for full context.

# TIER 1 — GAME-CHANGERS (the stuff nobody else has)

## 1. The Hall of Shame / Proof-of-Value Engine 🔥🔥🔥 ⬜ NOT BUILT — no `impact` command in `src/commands/`

The #1 reason people install linters once and never again: they don't SEE
the value. Fix:

```text
qa-doctor impact
```

Parses the repo's git history + CI logs (local) and answers:

```text
IMPACT REPORT — last 90 days

Tests that failed in CI but were skipped in code:     14
continue-on-error jobs that actually failed:           3  ← would have been caught
Hard sleeps removed after QA Doctor flagged them:      9
Estimated CI minutes saved by flagged waits:        2,340 min
Flaky tests that blocked merges this quarter:          7
```

**"Here's what QA Doctor caught that would have burned you."**
No competitor has this. It converts skepticism into loyalty.

## 2. Flakiness Forensics from Real Execution Data 🔥🔥🔥 🟡 PARTIAL — `forensics`/`triage`/FLAKY.md shipped (`src/forensics/`), but parses JUnit/Playwright-JSON, not `trace.zip`; no network-event correlation

Static flakiness detection is guessing. Playwright already produces
`trace.zip` + `test-results/`. Also: JUnit XML from any runner.

```text
qa-doctor forensics ./test-results/
```

- Parses retry data: which tests pass only on attempt ≥2
- Correlates failures with network events in traces
- **Flakiness Leaderboard**: ranked by "merge-blocking cost"
- Output: `FLAKY.md` committed to repo, updated per run
  This alone makes QA Doctor mandatory for every serious Playwright shop.
  (Already planned as Layer 3 — PROMOTE IT. It's the killer feature.)

## 3. `qa-doctor fix` — Safe Auto-Fix with Proof 🔥🔥 ✅ DONE — `src/commands/fix.ts`, `--dry-run` + fixture-locked verification

Not just suggestions. Apply fixes AND prove they're safe:

```text
qa-doctor fix --dry-run       # show diffs
qa-doctor fix                 # apply safe subset
```

Safe set: remove `.only`/`.skip`, add missing `await`, replace
`waitForTimeout` with condition wait, pin actions to SHA.
**Each fix runs the fixture harness against the result** — autofix backed
by evidence, matching the brand promise.

## 4. The Anti-Pattern Catalog as Living Docs 🔥🔥 ⬜ NOT BUILT — no doc-generation script found

zizmor won hearts with per-audit docs. Go further: every rule page =
real executed example (already planned) PLUS:

- "Why this fails in production" war-story section
- Severity debate: link to GitHub discussions where users argue severity
- Video/GIF for top 20 rules
  Docs as content marketing engine → each rule page ranks on Google →
  organic adoption loop.

## 5. Badges That Actually Mean Something 🔥🔥 ✅ DONE — `src/commands/badge.ts`

Current badges are vanity. Make ours evidentiary:

```markdown
[![QA Doctor](https://img.shields.io/endpoint?url=...)](...)
```

- Badge shows score AND date AND commit — click through to full report
- `qa-doctor badge` generates static JSON for shields.io (no server!)
- Optional: "0 errors · verified at commit 8f4c91a" — falsifiable claims

---
