# QA-CS-105 — WaitForTimeoutAsync hard sleep

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

Fixed waits encode hope, not synchronization — too short flakes under load, too long slows every run.

## What gets flagged (real detector output)

```
`WaitForTimeoutAsync()` hard sleep.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-105/must-fire/ModalTests.cs`

## The fix

Use `await Assertions.Expect(locator).ToBeVisibleAsync()` or `locator.WaitForAsync()` with auto-waiting.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-105/must-not-fire/ModalTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 16          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-105`
