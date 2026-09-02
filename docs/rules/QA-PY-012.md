# QA-PY-012 — Tautological assertion

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | quarantine                     |
| Measured FP rate                      | 60% (n=20)                     |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | LEXICAL                        |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

`assert True` and `assert x == x` are literal tautologies in Python exactly as `expect(true).toBe(true)` is in JS — they cannot raise `AssertionError` by construction, so pytest reports success regardless of what the code under test actually did. It is worth calling out as its own rule (rather than folding into QA-PY-003) because unlike a missing assertion, this pattern is easy to mistake for a real check on a quick read of the diff — the word `assert` is right there.

## What gets flagged (real detector output)

```
Tautological assertion: `assert True`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-012/must-fire/tautological.py`

## The fix

Assert on actual output of the code under test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-012/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 6           |
| getsentry-sentry    | 1           |
| negative-fixtures   | 2           |
| positive-fixtures   | 15          |
| pytest-dev-pytest   | 5           |
| reflex-dev-reflex   | 1           |
| streamlit-streamlit | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-012`
