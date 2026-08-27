# Corpus Verdicts (Phase 3 — Tempering Plan)

> **Status: empty. Zero rules currently carry a measured FP rate.**
>
> This directory previously held 49 entries across `pallets-click.jsonl` and
> `pytest-dev-pytest.jsonl`. They were deleted deliberately: they had been
> produced by reasoning about what each rule's description implied, not by
> reading the source at the cited file and line. That is fabricated evidence
> with a real-looking provenance — precisely the failure this phase exists to
> eliminate, reproduced inside the mechanism built to eliminate it.
>
> `docs/FP-AUDIT.md` therefore reports 0 classified verdicts. An empty
> measurement is honest; a populated one built on inference is not.

## Why the confirmed false positives are not recorded here

Several false positives were confirmed during the 0.5.0 fix pass by opening the
cited file and reading the code — genuine provenance, unlike the deleted
entries. They are still not stored as verdicts, for a specific reason.

Those findings were observed **before** the rules were fixed, and they no longer
fire. Recording them here would make the generator compute a 100% FP rate for a
rule that has since been corrected — corrupting the metric in the opposite
direction from the original fabrication, but corrupting it just the same.

They live in two places instead:

- **`tests/fixtures/<RULE-ID>/must-not-fire/`** — an executable lock. If the
  class returns, a test fails.
- **`CHANGELOG.md`** under 0.5.0 — the audit trail, with the file and line that
  was read for each one.

FP-rate coverage requires classifying findings produced by the **current**
engine. That means a fresh `corpus:regression:update` followed by
`corpus:sample`, then classification against real source.

Human-classified verdicts for corpus findings. Each `.jsonl` file
corresponds to one corpus repo and contains one JSON object per line:

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
