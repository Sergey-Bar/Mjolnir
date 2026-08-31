# QA-PW-114 — Legacy element handle API (page.$)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | quarantine                   |
| Measured FP rate                      | 100% (n=20)                  |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Element handles don't auto-wait — the element may not exist yet, causing intermittent failures.

## What gets flagged (real detector output)

```
`page.$(` returns a stale-prone element handle.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-114/must-fire/legacy.spec.ts`

## The fix

Use locators: `page.locator('...')` — they wait for the element automatically.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-114/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo            | Occurrences |
| --------------- | ----------- |
| sveltejs-kit    | 5           |
| vitejs-vite     | 62          |
| withastro-astro | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-114`
