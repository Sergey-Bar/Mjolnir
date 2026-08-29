# QA-CS-104 — Browser state shared across tests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                            |
| ------------------------------------- | -------------------------------- |
| Severity                              | warning                          |
| Confidence                            | medium                           |
| Tier                                  | extended                         |
| Measured FP rate                      | not yet measured                 |
| Evidence level                        | E1                               |
| QA impact                             | Flaky-test risk (FLAKY-RISK)     |
| False-positive risk (author estimate) | medium                           |
| Autofix available                     | no                               |
| Languages                             | csharp                           |
| Frameworks                            | nunit, xunit, mstest, playwright |
| Detection strategy                    | regex pattern                    |
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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-104`
