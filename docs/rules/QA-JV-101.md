# QA-JV-101 — Disabled test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | extended                       |
| Measured FP rate                      | not yet measured               |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | java                           |
| Frameworks                            | junit, testng                  |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.3.8                         |

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

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 8           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-101`
