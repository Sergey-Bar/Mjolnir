# QA-PY-009 — Commented-out test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | high                        |
| Tier                | core                        |
| Evidence level      | E2                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | medium                      |
| Autofix available   | no                          |
| Languages           | python                      |
| Frameworks          | pytest                      |
| Detection strategy  | regex heuristic             |
| Introduced in       | v0.3.0                      |

## Why this fails in production

Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.

## What gets flagged (real detector output)

```
Commented-out test detected.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-009/must-fire/commented.py`

## The fix

Re-enable the test, or delete it with a tracked issue referencing what it covered.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-009/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pytest-dev-pytest | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-009`
