# QA-PY-007 — pytest.raises without match

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | medium                         |
| Tier                                  | quarantine                     |
| Measured FP rate                      | 79% (n=34)                     |
| Evidence level                        | E1                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | medium                         |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | LEXICAL                        |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

Without match=, any exception of that type anywhere in the block passes — including one raised by an unrelated bug before the code under test even runs.

## What gets flagged (real detector output)

```
`pytest.raises` without a `match=` pattern.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-007/must-fire/no-match.py`

## The fix

Add `match="expected message fragment"` to pin the failure to the intended cause.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-007/must-not-fire/excinfo-assertion.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 1332        |
| getsentry-sentry    | 1350        |
| pallets-click       | 14          |
| psf-requests        | 42          |
| pytest-dev-pytest   | 164         |
| reflex-dev-reflex   | 232         |
| streamlit-streamlit | 488         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-007`
