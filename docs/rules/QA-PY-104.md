# QA-PY-104 — Brittle selector in Playwright test

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                         |
| ------------------- | ----------------------------- |
| Severity            | warning                       |
| Confidence          | medium                        |
| Evidence level      | E1                            |
| QA impact           | Test hygiene debt (HYGIENE)   |
| False-positive risk | medium                        |
| Autofix available   | no                            |
| Languages           | python                        |
| Frameworks          | pytest-playwright, playwright |
| Detection strategy  | regex pattern                 |
| Introduced in       | v0.3.8                        |

## Why this fails in production

XPath paths and structural CSS break on any markup refactor and silently select the wrong element after redesigns.

## What gets flagged (real detector output)

```
Brittle selector (xpath= selector).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-104/must-fire/test_rows.py`

## The fix

Prefer role-based locators (`get_by_role`) or data-testid attributes.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-104/must-not-fire/test_rows.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PY-104`
