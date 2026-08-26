# QA-PY-103 — wait_for_timeout() as sync

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                         |
| ------------------- | ----------------------------- |
| Severity            | warning                       |
| Confidence          | high                          |
| Evidence level      | E2                            |
| QA impact           | Flaky-test risk (FLAKY-RISK)  |
| False-positive risk | low                           |
| Autofix available   | no                            |
| Languages           | python                        |
| Frameworks          | pytest-playwright, playwright |
| Detection strategy  | regex pattern                 |
| Introduced in       | v0.3.8                        |

## Why this fails in production

It is a fixed sleep: it neither guarantees readiness nor fails when the app is broken — it just burns wall-time and flakes under load.

## What gets flagged (real detector output)

```
`wait_for_timeout()` used for synchronization.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-103/must-fire/test_modal.py`

## The fix

Wait for a condition: `expect(locator).to_be_visible()`, `page.wait_for_url(...)`, or `page.expect_response(...)`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-103/must-not-fire/test_modal.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PY-103`
