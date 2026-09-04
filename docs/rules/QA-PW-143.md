# QA-PW-143 — No screenshot/video capture on failure

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | high                        |
| Tier                                  | extended                    |
| Measured FP rate                      | 25% (n=20)                  |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | LEXICAL (regex heuristic)   |
| Introduced in                         | v0.3.8                      |

## Why this fails in production

Once the CI runner is gone, a failed UI test is just a stack trace. Screenshots/video on failure turn 'cannot reproduce' into a five-second diagnosis.

## What gets flagged (real detector output)

```
playwright.config captures neither screenshots nor video on failure.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-143/must-fire/playwright.config.ts`

## The fix

Add `use: { screenshot: 'only-on-failure', video: 'retain-on-failure' }` to the config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-143/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| calcom-cal                  | 2           |
| github-docs                 | 1           |
| hashicorp-vault             | 1           |
| Humanizr-Humanizer          | 1           |
| keycloak-keycloak           | 2           |
| microsoft-playwright-dotnet | 1           |
| microsoft-playwright-mcp    | 1           |
| negative-fixtures           | 60          |
| nextauthjs-next-auth        | 2           |
| positive-fixtures           | 60          |
| sveltejs-kit                | 25          |
| vercel-next-js              | 2           |
| vitest-dev-vitest           | 1           |
| withastro-astro             | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-143`
