# QA-CS-107 — waitForLoadState(networkidle) used

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Severity            | warning                          |
| Confidence          | high                             |
| Tier                | extended                         |
| Evidence level      | E2                               |
| QA impact           | Flaky-test risk (FLAKY-RISK)     |
| False-positive risk | low                              |
| Autofix available   | no                               |
| Languages           | csharp                           |
| Frameworks          | nunit, xunit, mstest, playwright |
| Detection strategy  | regex pattern                    |
| Introduced in       | v0.4.0                           |

## Why this fails in production

Analytics, websockets, and polling make network idle never fire or fire randomly — a documented source of Playwright flakes.

## What gets flagged (real detector output)

```
`WaitForLoadStateAsync(LoadState.NetworkIdle)` used.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-107/must-fire/LoadTests.cs`

## The fix

Wait for a specific response: `await page.WaitForResponseAsync(...)`, or a locator condition.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-107/must-not-fire/LoadTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-107`
