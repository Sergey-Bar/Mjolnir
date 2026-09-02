# QA-CS-101 — Skipped test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | 0% (n=20)                      |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | csharp                         |
| Frameworks                            | nunit, xunit, mstest           |
| Detection strategy                    | LEXICAL                        |
| Introduced in                         | v0.3.8                         |

## Why this fails in production

Skipped tests hide broken or unimplemented behavior behind a green build.

## What gets flagged (real detector output)

```
Skipped test detected: `[Ignore]`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-101/must-fire/LoginTests.cs`

## The fix

Fix and re-enable the test, or delete it with a tracked issue reference.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-101/must-not-fire/LoginTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 139         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-101`
