# Corpus Verdicts (Phase 3 — Tempering Plan)

> **Status (2026-08-29): 305 classified · 15 of 91 rules measured at n ≥ 10.**
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
