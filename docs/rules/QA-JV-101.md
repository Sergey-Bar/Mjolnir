# QA-JV-101 — Disabled test

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | java                           |
| Frameworks          | junit, testng                  |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.3.8                         |

## Why this fails in production

Disabled tests hide broken or unimplemented behavior behind a green build.

## What gets flagged (real detector output)

```
Disabled test detected: `@Disabled`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-101/must-fire/LoginTest.java`

## The fix

Fix and re-enable the test, or delete it with a tracked issue reference.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-101/must-not-fire/LoginTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-JV-101`
