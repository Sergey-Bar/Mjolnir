# QA-JV-102 — Hard sleep in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | extended                     |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | java                         |
| Frameworks                            | junit, testng                |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.8                       |

## Why this fails in production

Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.

## What gets flagged (real detector output)

```
`Thread.sleep()` used to wait for state.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-102/must-fire/DashboardTest.java`

## The fix

Wait on a condition: `page.locator(...).waitFor()`, `assertThat(locator).isVisible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-102/must-not-fire/DashboardTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-102`
