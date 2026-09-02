# QA-PY-008 — Mock-only verification

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | medium                      |
| Tier                                  | quarantine                  |
| Measured FP rate                      | 100% (n=20)                 |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | medium                      |
| Autofix available                     | no                          |
| Languages                             | python                      |
| Frameworks                            | pytest                      |
| Detection strategy                    | regex heuristic             |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Mock.assert_called_* proves collaborators were invoked, not that the system produced the right result — the real logic can be broken while the test stays green.

## What gets flagged (real detector output)

```
Test `test_saves_user` asserts only on mock call bookkeeping.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-008/must-fire/mock-only.py`

## The fix

Add at least one assertion on the actual return value or observable state.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-008/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 3357        |
| getsentry-sentry    | 265         |
| psf-requests        | 2           |
| reflex-dev-reflex   | 43          |
| streamlit-streamlit | 196         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-008`
