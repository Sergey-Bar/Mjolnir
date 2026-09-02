# QA-CS-110 — No accessibility assertions in UI test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                            |
| ------------------------------------- | -------------------------------- |
| Severity                              | info                             |
| Confidence                            | low                              |
| Tier                                  | quarantine                       |
| Measured FP rate                      | 100% (n=20)                      |
| Evidence level                        | E1                               |
| QA impact                             | Test hygiene debt (HYGIENE)      |
| False-positive risk (author estimate) | high                             |
| Autofix available                     | no                               |
| Languages                             | csharp                           |
| Frameworks                            | nunit, xunit, mstest, playwright |
| Detection strategy                    | absence heuristic                |
| Introduced in                         | v0.4.0                           |

## Why this fails in production

Without axe or equivalent, accessibility regressions ship silently. One scan per page catches layout/contrast/ARIA issues that visual review misses.

## What gets flagged (real detector output)

```
UI-interacting test file contains no accessibility assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-110/must-fire/LoginPageTests.cs`

## The fix

Add `Deque.AxeCore.Playwright` NuGet and call `await page.RunAxe()` once per page-under-test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-110/must-not-fire/LoginPageTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 135         |
| negative-fixtures           | 4           |
| positive-fixtures           | 5           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-110`
