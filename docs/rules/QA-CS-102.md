# QA-CS-102 — Hard sleep in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                                                          |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity                              | warning                                                                                                                                                        |
| Confidence                            | high                                                                                                                                                           |
| Tier                                  | core                                                                                                                                                           |
| Measured FP rate                      | 8% (n=24)                                                                                                                                                      |
| Evidence level                        | E2                                                                                                                                                             |
| QA impact                             | Flaky-test risk (FLAKY-RISK)                                                                                                                                   |
| False-positive risk (author estimate) | low                                                                                                                                                            |
| Autofix available                     | no                                                                                                                                                             |
| Languages                             | csharp                                                                                                                                                         |
| Frameworks                            | nunit, xunit, mstest, playwright                                                                                                                               |
| Detection strategy                    | AST (L2 tree-sitter invocation scoping (route/expose/server delegates, infinite blocks, WhenAny races, runner payload fixtures); regex fallback when no parse) |
| Introduced in                         | v0.3.8                                                                                                                                                         |

## Why this fails in production

Fixed sleeps are flaky under load and slow everywhere; Playwright locators auto-wait for actionability.

## What gets flagged (real detector output)

```
`Thread.Sleep(` used to wait for state.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-102/must-fire/DashboardTests.cs`

## The fix

Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or locator.WaitForAsync().

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-102/must-not-fire/DashboardTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 21          |
| positive-fixtures           | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-102`
