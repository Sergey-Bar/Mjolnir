# QA-PY-010 — Random/time dependence in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | core                         |
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

Tests depending on real time/randomness fail intermittently — the worst kind of CI noise.

## What gets flagged (real detector output)

```
Nondeterministic value from `random.*()` used without freezing.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-010/must-fire/random-time.py`

## The fix

Freeze time (freezegun) or seed randomness; assert on fixed values.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-010/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pallets-click     | 1           |
| pytest-dev-pytest | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-010`
