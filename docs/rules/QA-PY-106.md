# QA-PY-106 — Browser state shared across tests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | extended (PROVISIONAL)       |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | python                       |
| Frameworks                            | pytest                       |
| Detection strategy                    | LEXICAL                      |
| Introduced in                         | v0.4.0                       |

## Why this fails in production

A shared Page/Browser leaks cookies, localStorage, and navigation state between tests — failures become order-dependent and impossible to reproduce in isolation.

## What gets flagged (real detector output)

```
Module-level `page = ` — browser state shared across tests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-106/must-fire/test_home.py`

## The fix

Take the injected `page` fixture parameter in each test instead of creating module-level state.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-106/must-not-fire/test_home.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-106`
