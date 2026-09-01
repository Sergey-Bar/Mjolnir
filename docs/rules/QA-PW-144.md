# QA-PW-144 — Single-browser project matrix

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | high                        |
| Tier                                  | extended (PROVISIONAL)      |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex heuristic             |
| Introduced in                         | v0.3.8                      |

## Why this fails in production

Engine-specific breakage (CSS features, date inputs, download behavior) only shows up outside chromium; a single-engine matrix ships it to users undetected.

## What gets flagged (real detector output)

```
Projects cover only chromium engine — no cross-browser matrix.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-144/must-fire/playwright.config.ts`

## The fix

Add at least one webkit/firefox project (or `...devices['Desktop Safari']`) to the projects array.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-144/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                     | Occurrences |
| ------------------------ | ----------- |
| calcom-cal               | 1           |
| dubinc-dub               | 1           |
| grafana-grafana          | 1           |
| microsoft-playwright-mcp | 1           |
| nextauthjs-next-auth     | 1           |
| withastro-astro          | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-144`
