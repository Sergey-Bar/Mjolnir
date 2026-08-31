# QA-JV-104 — Browser state shared across tests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | extended                     |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | java                         |
| Frameworks                            | junit, testng                |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.4.0                       |

## Why this fails in production

A shared Page/Browser leaks cookies, localStorage, and navigation state between tests — failures become order-dependent and impossible to reproduce in isolation.

## What gets flagged (real detector output)

```
Static `
    private static Page` — browser state shared across tests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-104/must-fire/SearchTest.java`

## The fix

Create the Page per test (@BeforeEach) or use Playwright's JUnit extension `@InjectPage`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-104/must-not-fire/SearchTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-104`
