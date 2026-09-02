# QA-PW-122 — No trace capture on retry

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | extended                       |
| Measured FP rate                      | 25% (n=20)                     |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | playwright                     |
| Detection strategy                    | regex heuristic                |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

A test that fails once and passes on retry is exactly the case you'll need evidence for later — with no trace, the flake is uninvestigable.

## What gets flagged (real detector output)

```
playwright.config has no `trace` capture setting.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-122/must-fire/playwright.config.ts`

## The fix

Add `use: { trace: 'on-first-retry' }` to the config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-122/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 1           |
| microsoft-playwright-mcp    | 1           |
| negative-fixtures           | 60          |
| nextauthjs-next-auth        | 2           |
| positive-fixtures           | 60          |
| sveltejs-kit                | 25          |
| vitest-dev-vitest           | 1           |
| withastro-astro             | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-122`
