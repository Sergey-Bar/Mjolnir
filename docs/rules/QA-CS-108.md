# QA-CS-108 — Hardcoded URL in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                            |
| ------------------------------------- | -------------------------------- |
| Severity                              | warning                          |
| Confidence                            | high                             |
| Tier                                  | quarantine                       |
| Measured FP rate                      | 100% (n=20)                      |
| Evidence level                        | E2                               |
| QA impact                             | Test hygiene debt (HYGIENE)      |
| False-positive risk (author estimate) | low                              |
| Autofix available                     | no                               |
| Languages                             | csharp                           |
| Frameworks                            | nunit, xunit, mstest, playwright |
| Detection strategy                    | regex pattern                    |
| Introduced in                         | v0.4.0                           |

## Why this fails in production

Absolute URLs break when environments change and can hit production by accident from a CI runner.

## What gets flagged (real detector output)

```
Hardcoded URL: `.GotoAsync("https://staging.example.com/checkout"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-108/must-fire/NavigationTests.cs`

## The fix

Use a configured BaseURL from the test context, or an environment variable.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-108/must-not-fire/NavigationTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 26          |
| negative-fixtures           | 2           |
| positive-fixtures           | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-108`
