# QA-PW-102 — Load-event wait instead of web-first assertion

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | quarantine                  |
| Measured FP rate                      | 100% (n=20)                 |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | medium                      |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | LEXICAL                     |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

'load' fires when the page loads, not when YOUR element is ready — the test can still race the app and fail intermittently.

## What gets flagged (real detector output)

```
`waitForLoadState("load"` instead of a web-first assertion.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-102/must-fire/load-waits.spec.ts`

## The fix

Assert on the element you actually care about: `await expect(page.getByRole('heading')).toBeVisible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-102/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| playwright-community-eslint-plugin-playwright | 2           |
| sveltejs-kit                                  | 1           |
| vitejs-vite                                   | 24          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-102`
