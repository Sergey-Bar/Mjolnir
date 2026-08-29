# QA-PY-102 — time.sleep() in Playwright test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                         |
| ------------------------------------- | ----------------------------- |
| Severity                              | warning                       |
| Confidence                            | high                          |
| Tier                                  | core                          |
| Measured FP rate                      | not yet measured              |
| Evidence level                        | E2                            |
| QA impact                             | Flaky-test risk (FLAKY-RISK)  |
| False-positive risk (author estimate) | low                           |
| Autofix available                     | no                            |
| Languages                             | python                        |
| Frameworks                            | pytest-playwright, playwright |
| Detection strategy                    | regex pattern                 |
| Introduced in                         | v0.3.8                        |

## Why this fails in production

Fixed sleeps guess at timing: too short → flaky failures under load, too long → slow suite. Playwright locators already auto-wait for the element to be actionable.

## What gets flagged (real detector output)

```
`time.sleep()` used to wait for UI state.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-102/must-fire/test_dash.py`

## The fix

Replace with `expect(page.get_by_text(...)).to_be_visible()` or `page.wait_for_selector`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-102/must-not-fire/test_dash.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-102`
