# Corpus Verdicts (Phase 3 — Tempering Plan)

> **Status (2026-09-02, wave 5 — dedicated corpora): 1423 classified · 0 UNSURE · 0 unclassified · 78 of 91 rules measured at n ≥ 10.**
>
> Wave 5 (2026-09-02, Verification Trust Evolution Plan §11.5/§08): CORPUS
> 19 → 34 repos — 14 new real-world repos chosen by evaluating each
> candidate's unmeasured-rule fire count at HEAD (vitest, streamlit,
> airflow, java-design-patterns, spectre.console, Humanizer,
> cypress-realworld-app, keycloak, appsmith, sentry, github/docs, next.js,
> vault, nocodb) PLUS two committed fixture corpora (§08 classes B/C):
> `tests/corpus/positive-fixtures/` (authored anti-pattern exhibits that
> MUST fire → every fire is TP by construction) and
> `tests/corpus/negative-fixtures/` (realistic legitimate code that must
> NOT fire → any fire is recorded as real precision evidence). The
> negative corpus caught 3 real FP behaviors on day one (PW-141 fires on
> retries+json-reporter configs where the reporter string is masked;
> PW-141's triage regex checks codeText but reads comment evidence from
> raw text; CI-008's tolerant-final-step shape misfires on reporting
> steps). Measurement outcome: 43 → 78 measured; 28 newly-measured rules
> got explicit tier declarations from their measured bands (7 core,
> 7 extended, 14 quarantine); unmeasured 48 → 13 (Phase 1 exit gate
> ≤ 20 MET). Sample-per-rule caps, blank-verdict rows: 0.
>
> 2026-08-31 status: 937 classified · 21 UNSURE · 42/91 measured. The 2026-09-01
> adjudication pass (plan §11.5) resolved all 21 UNSURE rows — they were
> previously parked UNCLASSIFIED-in-spirit (excluded from every rate) — by
> reading the cited sources at repo HEAD: QA-PW-101's 20 parked rows (the D5
> defect) became 20 TP (next-auth's session-sync sleeps and sveltejs/kit's
> 100 ms request-observation windows are load-bearing, false-pass-prone hard
> sleeps) — the rule is now measured (100% TP, n=20) — and QA-TQUAL-009's row
> became 1 FP (a deliberate `void` fire-and-forget whose assertions still fail
> the run via vitest's unhandled-rejection handling).
>
> Waves 1–3 (6→13→17 repos): every backlog row classified; QA-PW-102/105/114,
> QA-TEST-003, QA-PW-118/119, QA-TEST-002, QA-TQUAL-001, QA-PY-104 demoted to
> quarantine; QA-PW-002 0% stays core; the QA-TEST-010 comment-terminator bug
> was found and fixed with a fixture.
>
> Wave 4 (this one — 17→19 repos + systematic fixes):
>
> - CORPUS +6: grafana, cal.com, puppeteer, dub, taxonomy, reflex
>   (n8n and streamlit consistently fail to clone in this environment —
>   removed rather than shipping a permanently-failing entry).
> - **QA-PW-141..144 never fired anywhere: playwright.config.ts was never
>   scanned.** The TypeScript adapter now discovers it, and config-gated
>   rules (QA-PW-121/122/141/143/144, marked `configRule`) run ONLY on
>   configs while generic test rules never see them.
> - **QA-TQUAL-011 flagged live tests:** the flat token scanner treated a
>   `/*` inside a template literal as an unterminated comment running to
>   EOF; comment ranges are now overlap-checked against real template/
>   string AST nodes.
> - **QA-PW-141's triage signal was a loophole** (any `reporter:` key
>   counted) and it missed the canonical `retries: process.env.CI ? 2 : 0`
>   idiom — both fixed; the rule now fires 7 times across the corpus.
> - **Sampler now appends** new findings to existing repo jsonl files
>   (deduped) instead of refusing every re-run — rules whose samples were
>   not drawn in the first pass can finally accumulate verdicts.
> - MAX_SAMPLES_PER_RULE findings re-drawn for the expanded corpus;
>   newly measured: QA-ENV-001 100%, QA-PW-103 100%, QA-PW-143 25%,
>   QA-PW-122 25%, QA-PW-144 33%, QA-PY-005 16%, QA-PY-010 100%,
>   QA-PW-107 100%, QA-PW-108 100%, QA-PW-112 100%, QA-PW-120 100%,
>   QA-PW-145 100%, QA-PY-008 100%, QA-TEST-004 30% (14 rate moves total;
>   demotions: PW-005/107/108/112/120/145, PY-008/010 → quarantine;
>   extensions: PW-122/143, TEST-004, PY-005 → extended).
> - MAX_UNMEASURED_CORE ratchet 47 → 40.
>
> An earlier revision of this directory held 49 entries produced by _reasoning
> about what a rule's description implied_ rather than by reading the source at
> the cited file:line — fabricated evidence with a real-looking provenance. All
> 49 were deleted. The 305 entries here now were each classified by opening the
> file and reading the code. (A further 90 were removed on 2026-08-29 when a
> cross-language dispatch fix meant the rules they described no longer fire on
> those repos — see rule 7 below.)
>
> The corpus was expanded from 6 to 13 repos on 2026-08-29 to make the
> previously-silent rule families (QA-TEST, QA-TQUAL, most QA-PW, QA-CI-001)
> fire on real consumer code. That added review sheets for ~60 rules and ~250
> new findings across 7 repos, **all currently unclassified** — see the
> per-file counts below. `docs/FP-AUDIT.md` will not move until they are read
> and judged.

## The unclassified backlog

`tests/corpus/verdicts/*.jsonl` files for the 2026-08-29 repos
(`nextauthjs-next-auth`, `vitejs-vite`, `sveltejs-kit`, `withastro-astro`,
`tanstack-query`, `playwright-community-eslint-plugin-playwright`,
`microsoft-playwright-pytest`) contain entries with `verdict: ""`. Each is one
real finding waiting for a human to read
`tests/corpus/review/<RULE-ID>.md` and call it TP / FP / UNSURE. Classifying
this backlog is the single highest-leverage task on the project: it takes the
measured-rule count from 15 toward ~50.

**One deliberate landmine to check first:** `QA-TEST-004` fires ~157 times on
`tanstack-query` (was >1600 before the 2026-08-29 mock-latency fix). Read those
samples carefully — it is either a real hard-sleep habit in that codebase or a
remaining masking gap in the rule.

## Why the 0.5.0-era confirmed false positives are not recorded here

Several FPs were confirmed during the 0.5.0 fix pass by reading the cited code —
genuine provenance. They are still not stored as verdicts: those findings were
observed **before** the rules were fixed and no longer fire, so recording them
would make the generator compute a 100% FP rate for a rule that has since been
corrected. They live in `tests/fixtures/<RULE-ID>/must-not-fire/` (an
executable lock) and in `CHANGELOG.md` under 0.5.0 (the audit trail).

## Format

Each `.jsonl` file corresponds to one corpus repo, one JSON object per line:

```json
{"ruleId":"QA-PY-003","file":"tests/test_basic.py","line":42,"verdict":"TP","note":"genuinely assertion-less test"}
{"ruleId":"QA-PY-003","file":"tests/conftest.py","line":8,"verdict":"FP","note":"fixture setup, not a test"}
{"ruleId":"QA-PY-010","file":"tests/test_utils.py","line":15,"verdict":"UNSURE","note":"time.time() used for logging, not assertions"}
```

## Verdict Values

| Value    | Meaning                                |
| -------- | -------------------------------------- |
| `TP`     | True Positive — the finding is correct |
| `FP`     | False Positive — the finding is wrong  |
| `UNSURE` | Cannot determine without more context  |
| `""`     | Not yet classified                     |

## UNSURE adjudication (Verification Trust Evolution Plan §11.5)

UNSURE never counts into `n` (it is excluded from every measured rate), but it
**always triggers review** — an UNSURE row that is never revisited is an
unmeasured rule wearing a measurement's name. The adjudication loop:

1. The committed `unsure-ceiling.json` ratchet fails `npm run fp-audit:generate`
   whenever the UNSURE backlog grows; it only moves DOWN via adjudication
   (upward movement needs an explicit `--update` whose diff names every rule
   that grew — nothing is silent).
2. Adjudicate one row at a time: clone/checkout the cited repo, open the cited
   `file:line` **at a HEAD whose baseline still produces the finding**, and read
   enough surrounding code to answer the rule's actual question (for QA-PW-101:
   is this sleep load-bearing synchronization, or decoration?).
3. Resolve the row to `TP` / `FP` and replace the note with the evidence: what
   the code does, why the rule's diagnosis does or does not hold, and the
   deterministic alternative where relevant. Prefix the note with
   `adjudicated <date> from source …` so provenance stays auditable.
4. Re-run `npm run fp-audit:generate` and commit the verdicts — they are the
   evidence.

**Adjudication criteria (documented so two classifiers agree):**

- **A rule's diagnosis is the thing being judged, not the code's quality.**
  QA-PW-101 says "fixed waits encode hope": a sleep that genuinely substitutes
  for synchronization (flaky-fast on a slow machine, or a false-pass
  observation window) is TP even when the surrounding test is otherwise sane;
  a sleep that cannot affect the test's correctness (e.g. pacing two
  independent actions) is FP.
- **"The check still fails the run" refutes FALSE-GREEN.** QA-TQUAL-009
  claims checks silently vanish; if the async context (awaited timer flush,
  unhandled-rejection handler, framework fail-on-async) makes assertion
  failures fatal, the diagnosis does not hold — FP.
- **Fire-and-forget intent does not refute FALSE-GREEN by itself.** `void p`
  is not an excuse: judge whether a rejection/assertion failure inside `p`
  actually surfaces. Deliberate ≠ harmless.
- **Load-bearing-ness is judged at the cited line's role, not its comment.**
  A comment saying "allow requests to finish" describes intent; adjudicate
  whether the wait actually carries synchronization weight (an absence
  assertion downstream = load-bearing; a screenshot delay = decoration).
- When the cited line no longer exists at HEAD, or the finding's premise
  (the call pattern) has changed shape, the row is **orphaned** — remove it
  per the orphan rule below rather than guessing.

## Workflow

1. Run `npm run corpus:sample` to generate review sheets and empty verdict files
2. Read `tests/corpus/review/<RULE-ID>.md` for each rule with context
3. Fill in `verdict` and `note` fields in the corresponding `.jsonl` file
4. Run `npm run fp-audit:generate` to compute measured FP rates
5. Commit the verdicts — they are the evidence

## Rules

- **Never record a verdict for a finding whose source you have not read.** The
  review sheet exists so the context is in front of you; a verdict written
  without it is a guess wearing a measurement's clothes.
- When in doubt, use `UNSURE` — an honest "don't know" is better than a wrong call
- The `note` field is freeform — explain WHY it's TP/FP/UNSURE
- Verdicts are immutable once committed — if a rule changes, re-sample and re-classify
- Re-sample after any rule fix. Verdicts recorded against pre-fix behavior
  describe a rule that no longer exists.
- **A verdict for a rule not in that repo's current
  `tests/corpus/baseline/<repo>.json` is orphaned and must be removed** — the
  rule fires zero times there, so the verdict measures nothing. This is how the
  2026-08-29 dispatch fix retired 90 lines (QA-PW-101/112, QA-TEST-004,
  QA-ENV-001, QA-PW-003/004 on Java/Python repos).
