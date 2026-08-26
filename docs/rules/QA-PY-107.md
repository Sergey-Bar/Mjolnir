# QA-PY-107 — networkidle wait (flaky by design)

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

Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.

## What gets flagged (real detector output)

```
`wait_for_load_state('networkidle')` used.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-107/must-fire/test_reports.py`

## The fix

Wait for the specific response: `with page.expect_response('**/api/data'):` or assert on the rendered element.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-107/must-not-fire/test_reports.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PY-107`
