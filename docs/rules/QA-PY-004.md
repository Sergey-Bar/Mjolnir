# QA-PY-004 — Bare truthiness assert on complex object

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | medium                         |
| Tier                | quarantine                     |
| Evidence level      | E1                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | medium                         |
| Autofix available   | no                             |
| Languages           | python                         |
| Frameworks          | pytest                         |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.3.0                         |

## Why this fails in production

This passes for any truthy value — a wrong object, wrong count, or partially-built result all slip through. It verifies existence, not correctness.

## What gets flagged (real detector output)

```
Bare truthiness assert: `assert order`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-004/must-fire/bare-assert.py`

## The fix

Assert the specific expected value or property: `assert result.id == expected`, `assert len(items) == 3`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-004/must-not-fire/specific-asserts.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pallets-click     | 45          |
| psf-requests      | 35          |
| pytest-dev-pytest | 393         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-004`
