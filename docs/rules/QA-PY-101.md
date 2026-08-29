# QA-PY-101 — Sync/async Playwright API mix

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                         |
| ------------------- | ----------------------------- |
| Severity            | warning                       |
| Confidence          | high                          |
| Tier                | core                          |
| Evidence level      | E2                            |
| QA impact           | Flaky-test risk (FLAKY-RISK)  |
| False-positive risk | low                           |
| Autofix available   | no                            |
| Languages           | python                        |
| Frameworks          | pytest-playwright, playwright |
| Detection strategy  | regex heuristic               |
| Introduced in       | v0.3.8                        |

## Why this fails in production

Calling the synchronous Playwright API from an async function blocks the event loop and hangs the run; the two APIs cannot be mixed.

## What gets flagged (real detector output)

```
Async test `test_login` in a file importing playwright.sync_api.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-101/must-fire/test_auth.py`

## The fix

Use pytest-playwright's injected page fixture with plain (non-async) tests, or import from playwright.async_api consistently.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-101/must-not-fire/test_auth.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-101`
