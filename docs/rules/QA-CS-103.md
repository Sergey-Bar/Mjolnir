# QA-CS-103 — Test without assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | error                          |
| Confidence          | high                           |
| Tier                | extended                       |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | medium                         |
| Autofix available   | no                             |
| Languages           | csharp                         |
| Frameworks          | nunit, xunit, mstest           |
| Detection strategy  | regex heuristic                |
| Introduced in       | v0.3.8                         |

## Why this fails in production

A C# test with no `Assert.*`/FluentAssertions-style assertion (NUnit and xUnit both follow the same throw-to-fail model as JUnit and pytest) passes for the same underlying reason as every other assertion-less rule in this catalog: nothing threw, so nothing failed, regardless of what the test actually exercised. Kept as a distinct rule from QA-TEST-003/QA-PY-003 because .NET Playwright is async-only (`GotoAsync`, `ClickAsync`) — the fixture shapes that trigger this rule look meaningfully different in C# even though the underlying defect is identical.

## What gets flagged (real detector output)

```
Test `ShouldCompleteCheckout` contains no assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-103/must-fire/CheckoutTests.cs`

## The fix

Add an assertion on the expected outcome, or remove the test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-103/must-not-fire/CheckoutTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-103`
