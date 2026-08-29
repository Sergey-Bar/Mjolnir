# QA-CS-111 — Blanket route mock intercepts all requests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Severity            | warning                          |
| Confidence          | medium                           |
| Tier                | quarantine                       |
| Evidence level      | E1                               |
| QA impact           | Flaky-test risk (FLAKY-RISK)     |
| False-positive risk | medium                           |
| Autofix available   | no                               |
| Languages           | csharp                           |
| Frameworks          | nunit, xunit, mstest, playwright |
| Detection strategy  | regex pattern                    |
| Introduced in       | v0.4.0                           |

## Why this fails in production

Blanket route mocks hide real network errors and drift from the actual API contract — tests pass while the integration is broken.

## What gets flagged (real detector output)

```
`page.RouteAsync("**/*")` — blanket interception of all requests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-111/must-fire/RouteTests.cs`

## The fix

Scope to the endpoint under test: `page.RouteAsync("**/api/orders")` + `route.FallbackAsync()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-111/must-not-fire/RouteTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 74          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-111`
