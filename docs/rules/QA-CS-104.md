# QA-CS-104 — Browser state shared across tests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                            |
| ------------------------------------- | -------------------------------- |
| Severity                              | warning                          |
| Confidence                            | medium                           |
| Tier                                  | extended (PROVISIONAL)           |
| Measured FP rate                      | not yet measured                 |
| Evidence level                        | E1                               |
| QA impact                             | Flaky-test risk (FLAKY-RISK)     |
| False-positive risk (author estimate) | medium                           |
| Autofix available                     | no                               |
| Languages                             | csharp                           |
| Frameworks                            | nunit, xunit, mstest, playwright |
| Detection strategy                    | LEXICAL                          |
| Introduced in                         | v0.4.0                           |

## Why this fails in production

A shared Page/Browser leaks cookies, localStorage, and navigation state between tests — failures become order-dependent and impossible to reproduce in isolation.

## What gets flagged (real detector output)

```
`static IPage` — browser state shared across tests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-104/must-fire/SearchTests.cs`

## The fix

Create the page per test in setup, or use Playwright.NET's per-test fixtures.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-104/must-not-fire/SearchTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-104`
