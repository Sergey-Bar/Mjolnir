# QA-PW-120 — Engine-specific test without environment guard

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | info                         |
| Confidence                            | low                          |
| Tier                                  | quarantine                   |
| Measured FP rate                      | 100% (n=20)                  |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | high                         |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | regex heuristic              |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Behavior tied to one browser engine or OS fails on every other runner in the matrix — chronic red builds teach the team to ignore failures.

## What gets flagged (real detector output)

```
Engine/platform-specific test with no test.skip / browser guard.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-120/must-fire/webgl-no-guard.spec.ts`

## The fix

Guard with `test.skip(browserName !== 'chromium', '...')` or scope via project config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-120/must-not-fire/guarded.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| calcom-cal                                    | 53          |
| grafana-grafana                               | 12          |
| microsoft-playwright-mcp                      | 1           |
| playwright-community-eslint-plugin-playwright | 1           |
| puppeteer-puppeteer                           | 29          |
| vitejs-vite                                   | 7           |
| withastro-astro                               | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-120`
