# QA-CS-106 — Brittle selector instead of role-based locator

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Severity            | warning                          |
| Confidence          | medium                           |
| Tier                | quarantine                       |
| Evidence level      | E1                               |
| QA impact           | Test hygiene debt (HYGIENE)      |
| False-positive risk | medium                           |
| Autofix available   | no                               |
| Languages           | csharp                           |
| Frameworks          | nunit, xunit, mstest, playwright |
| Detection strategy  | regex pattern                    |
| Introduced in       | v0.4.0                           |

## Why this fails in production

XPath paths and structural CSS break on any markup refactor and silently select the wrong element after redesigns.

## What gets flagged (real detector output)

```
Brittle selector (xpath= selector).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-106/must-fire/SelectorTests.cs`

## The fix

Prefer role-based locators (`page.GetByRole(...)`) or data-testid attributes.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-106/must-not-fire/SelectorTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 31          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-106`
