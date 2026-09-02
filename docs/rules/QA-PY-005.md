# QA-PY-005 — time.sleep() in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | extended                     |
| Measured FP rate                      | 16% (n=19)                   |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | python                       |
| Frameworks                            | pytest                       |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Fixed sleeps make tests slow and flaky — they guess at timing instead of waiting for state.

## What gets flagged (real detector output)

```
Hard sleep: `time.sleep(5…`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-005/must-fire/sleepy.py`

## The fix

Wait for an explicit condition (polling helper, pytest-timeout wait_until, or event).

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-005/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 49          |
| getsentry-sentry    | 39          |
| negative-fixtures   | 1           |
| positive-fixtures   | 4           |
| psf-requests        | 3           |
| reflex-dev-reflex   | 16          |
| streamlit-streamlit | 29          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-005`
