# QA-CS-104 — Static/shared Playwright page across tests

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Severity            | warning                          |
| Confidence          | medium                           |
| Evidence level      | E1                               |
| QA impact           | Flaky-test risk (FLAKY-RISK)     |
| False-positive risk | medium                           |
| Autofix available   | no                               |
| Languages           | csharp                           |
| Frameworks          | nunit, xunit, mstest, playwright |
| Detection strategy  | regex pattern                    |
| Introduced in       | v0.3.8                           |

## Why this fails in production

Parallel test execution shares statics: one test navigating or closing the page corrupts every other test's session.

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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-CS-104`
