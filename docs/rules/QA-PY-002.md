# QA-PY-002 — Skipped test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | 5% (n=20)                      |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

Skipped tests hide broken or unimplemented behavior behind a green checkmark.

## What gets flagged (real detector output)

```
Skipped test detected: `@pytest.mark.skip`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-002/must-fire/skipped.py`

## The fix

Fix and re-enable the test, or delete it with a tracked issue reference.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-002/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pallets-click     | 1           |
| psf-requests      | 2           |
| pytest-dev-pytest | 19          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-002`
