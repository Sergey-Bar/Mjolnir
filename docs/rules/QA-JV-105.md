# QA-JV-105 — waitForTimeout hard sleep

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Severity            | warning                      |
| Confidence          | high                         |
| Evidence level      | E2                           |
| QA impact           | Flaky-test risk (FLAKY-RISK) |
| False-positive risk | low                          |
| Autofix available   | no                           |
| Languages           | java                         |
| Frameworks          | junit, testng, playwright    |
| Detection strategy  | regex pattern                |
| Introduced in       | v0.3.8                       |

## Why this fails in production

Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.

## What gets flagged (real detector output)

```
`waitForTimeout()` hard sleep.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-105/must-fire/ModalTest.java`

## The fix

Use `page.locator(...).waitFor()` or `assertThat(locator).isVisible()` with auto-waiting.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-105/must-not-fire/ModalTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-JV-105`
