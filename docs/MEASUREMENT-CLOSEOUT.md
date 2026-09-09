# Measurement Closeout — run plan (WI-14, plan §11/§12)

> **Status: OPEN** — this is the 1.0.0 Core Certification gate
> (WS-B). The census is honest: **78 active canonical rules, 57
> measured, 21 PROVISIONAL**. No denominator games: the active set is
> the census (the 21 RETIRED rules were removed from the registry —
> owner ruling E-1, 2026-09-08 — and never count toward anything).

## The law (from docs/RULE-LIFECYCLE.md + CERTIFICATION-POLICY §6)

- A rule is MEASURED when it has **n ≥ 10** hand-classified corpus
  verdicts at the current `detectorRevision`.
- Verdicts come from `tests/corpus/verdicts/*.jsonl` — real findings on
  real repos, classified individually (TP/FP/UNSURE).
- Findings from PARTIAL scans are not evidence — the sampler refuses
  them outright.
- The registry ratchet blocks unmeasured rules from effective core
  (`tests/rules/registry-ratchet.spec.ts`); nothing here is a
  workaround — measurement is the only path to core.

## The loop (repeat per cycle)

1. `npx tsx scripts/corpus-sample.ts --unmeasured-only --repo <name>…`
   — repo-by-repo (resumability; full-corpus single-process OOMs on
   the large monorepos). Raise `--budget` only for chronic truncation.
2. Classify the new rows in `tests/corpus/review/<RULE-ID>.md` into the
   matching `tests/corpus/verdicts/<repo>.jsonl` (TP/FP/UNSURE + note).
   AI-assisted classification is authorized per-row with the standing
   owner authorization ("subject to human review"), following the
   documented per-row note convention.
3. `npm run fp-audit:generate` — regenerates `measured-fp.generated.ts`
   - `docs/FP-AUDIT.md` + `docs/COUNT-LOCK.md`.
4. Verify the ratchet: `npx vitest run tests/rules/registry-ratchet.spec.ts
tests/rules/fp-audit-table.spec.ts tests/contract/census-drift.spec.ts`.
5. Repeat until every active rule has n ≥ 10. Rules that cannot be
   legitimately measured (premise fails again, no corpus surface) are
   **retired into `RETIRED_RULE_IDS`** — never silently counted as
   measured (plan §12).

## The 21 open rules (current state, all at n < 10)

| Rule       | Tier       | Corpus surface                             |
| ---------- | ---------- | ------------------------------------------ |
| QA-PW-102  | quarantine | `waitForLoadState("load")` occurrences     |
| QA-PW-124  | extended   | `projects:` without smoke/regression split |
| QA-PW-116  | extended   | `storageState` without expiry strategy     |
| QA-PW-125  | extended   | global setup mutating shared state         |
| QA-PY-101  | extended   | sync/async Playwright API mix              |
| QA-PY-102  | quarantine | `time.sleep()` in Playwright test          |
| QA-CS-104  | extended   | browser state shared across tests (C#)     |
| QA-PY-106  | extended   | browser state shared across tests (Py)     |
| QA-JV-107  | extended   | `waitForLoadState(networkidle)` (Java)     |
| QA-CS-107  | extended   | `waitForLoadState(networkidle)` (C#)       |
| QA-PY-107  | extended   | `waitForLoadState(networkidle)` (Py)       |
| QA-PY-108  | quarantine | hardcoded URL in test (Py)                 |
| QA-JV-106  | quarantine | brittle selector (Java)                    |
| QA-CS-106  | quarantine | brittle selector (C#)                      |
| QA-PY-104  | quarantine | brittle selector (Py)                      |
| QA-CS-109  | extended   | retry masks test failures (C#)             |
| QA-CYP-002 | quarantine | focused test `.only` (Cypress)             |
| QA-CYP-003 | quarantine | `chromeWebSecurity: false` (Cypress)       |
| QA-SE-001  | quarantine | hard sleep before lookup (Selenium Java)   |
| QA-SE-002  | quarantine | hard sleep before lookup (Selenium C#)     |
| QA-SE-003  | quarantine | hard sleep before lookup (Selenium Py)     |

Progress log: n(QA-PW-124) = 1 (FP — microsoft/playwright-mcp
conditional docker-subset project, 2026-09-09).
