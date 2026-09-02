# QA-JV-109 — Retry masks test failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | core                         |
| Measured FP rate                      | 0% (n=10)                    |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | java                         |
| Frameworks                            | junit, testng                |
| Detection strategy                    | LEXICAL                      |
| Introduced in                         | v0.4.0                       |

## Why this fails in production

Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.

## What gets flagged (real detector output)

```
TestNG `retryAnalyzer = FlakyRetry` automatically re-runs a failing test.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-109/must-fire/FlakyTest.java`

## The fix

Remove the retryAnalyzer; fix the flake root cause, or quarantine the test explicitly.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-109/must-not-fire/FlakyTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 10          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-109`
