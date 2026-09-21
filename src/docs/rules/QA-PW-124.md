# QA-PW-124 — No smoke/regression project split

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                              |
| ------------------------------------- | ------------------------------------------------------------------ |
| Severity                              | info                                                               |
| Confidence                            | high                                                               |
| Tier                                  | core                                                               |
| Measured FP rate                      | 7% (n=15)                                                          |
| Evidence level                        | E1                                                                 |
| QA impact                             | Test hygiene debt (HYGIENE)                                        |
| False-positive risk (author estimate) | low                                                                |
| Autofix available                     | no                                                                 |
| Languages                             | typescript, javascript                                             |
| Frameworks                            | playwright                                                         |
| Detection strategy                    | LEXICAL (regex heuristic over playwright.config.* (adapter-gated)) |
| Introduced in                         | v0.3.0                                                             |

## Why this fails in production

Without a fast smoke project, every commit runs the whole suite — PR feedback slows down and people start skipping CI.

## What gets flagged (real detector output)

```
Projects defined without a smoke/regression split.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-124/must-fire/playwright.config.ts`

## The fix

Add a `smoke` project (testIgnore filter on critical paths) alongside the full regression project.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-124/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                     | Occurrences |
| ------------------------ | ----------- |
| github-docs              | 1           |
| grafana-grafana          | 1           |
| hashicorp-vault          | 1           |
| microsoft-playwright-mcp | 1           |
| negative-fixtures        | 12          |
| nextauthjs-next-auth     | 1           |
| positive-fixtures        | 14          |
| vitest-dev-vitest        | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-124`
