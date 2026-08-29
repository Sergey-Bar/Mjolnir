# QA-PW-118 — Network idle wait (flaky by design)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | core                         |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Network idle is unreliable — background requests, analytics, and websockets make it never fire or fire randomly.

## What gets flagged (real detector output)

```
`waitForLoadState('networkidle')` used.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-118/must-fire/network-idle.spec.ts`

## The fix

Wait for a specific element or response: `page.waitForResponse()` or `expect(locator).toBeVisible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-118/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| playwright-community-eslint-plugin-playwright | 3           |
| sveltejs-kit                                  | 20          |
| withastro-astro                               | 6           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-118`
