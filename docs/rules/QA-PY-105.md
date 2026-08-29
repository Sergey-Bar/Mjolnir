# QA-PY-105 — Playwright test without assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | error                          |
| Confidence          | high                           |
| Tier                | core                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | python                         |
| Frameworks          | pytest-playwright, playwright  |
| Detection strategy  | regex heuristic                |
| Introduced in       | v0.3.8                         |

## Why this fails in production

A Playwright-Python test with no assertion behaves identically to QA-TEST-003/QA-PY-003 in the underlying failure mode — the test can drive a real browser through every step of a user flow and still verify nothing, because nothing in the test ever calls `expect()`. It is tracked as its own rule because Playwright-Python specs commonly LOOK thorough (multiple page interactions, network waits, screenshots) while containing zero verification — the activity is real, the checking is not.

## What gets flagged (real detector output)

```
Playwright test `test_checkout_flow` drives the UI but asserts nothing.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-105/must-fire/test_checkout.py`

## The fix

Add outcome assertions: `expect(page).to_have_url(...)`, `expect(page.get_by_role('heading')).to_be_visible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-105/must-not-fire/test_checkout.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-105`
