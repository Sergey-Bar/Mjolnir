# QA-PY-011 — Mutable fixture shared across tests

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
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Tests that mutate a shared module/session fixture create hidden execution-order dependency — the suite passes in one order and fails in another.

## What gets flagged (real detector output)

```
Fixture `shared_cart` is session-scoped and returns a mutable collection.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-011/must-fire/mutable-fixture.py`

## The fix

Use function scope (default), or return an immutable copy / factory so each test gets fresh state.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-011/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pytest-dev-pytest | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-011`
