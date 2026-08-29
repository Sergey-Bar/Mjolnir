# QA-JV-111 — Blanket route mock intercepts all requests

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | quarantine                   |
| Measured FP rate                      | 100% (n=20)                  |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | java                         |
| Frameworks                            | junit, testng                |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.4.0                       |

## Why this fails in production

Blanket route mocks hide real network errors and drift from the actual API contract — tests pass while the integration is broken.

## What gets flagged (real detector output)

```
`page.route("**/*")` — blanket interception of all requests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-111/must-fire/RouteTest.java`

## The fix

Scope to the endpoint under test: `page.route("**/api/orders")` + `route.fallback()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-111/must-not-fire/RouteTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 70          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-111`
