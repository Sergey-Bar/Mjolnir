# QA-PY-006 — Empty test body (pass)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | quarantine                     |
| Measured FP rate                      | 100% (n=20)                    |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | LEXICAL                        |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

A pytest test function whose entire body is `pass` (optionally preceded by a comment) is Python's most literal form of "empty test" — there is no simpler way to write a function that does nothing and returns normally. pytest reports it as passed for the same reason QA-TEST-010 does in JS/TS: nothing raised, so nothing failed. It shows up most often as a stub left behind after `# TODO: implement` scaffolding never got filled in, quietly inflating the pass count in the meantime.

## What gets flagged (real detector output)

```
Test `test_placeholder` has an empty body (pass only).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-006/must-fire/empty.py`

## The fix

Implement the test or remove it.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-006/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 11          |
| pytest-dev-pytest   | 19          |
| reflex-dev-reflex   | 2           |
| streamlit-streamlit | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-006`
