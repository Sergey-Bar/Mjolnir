# QA-PW-107 — toBeVisible where toBeInViewport fits better

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | low                         |
| Tier                                  | quarantine                  |
| Measured FP rate                      | 100% (n=20)                 |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | high                        |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Toasts and banners can be 'visible' in the DOM while rendered off-screen; the user sees nothing but the test passes.

## What gets flagged (real detector output)

```
`toBeVisible()` on a transient overlay node — consider `toBeInViewport()`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-107/must-fire/toast-visible.spec.ts`

## The fix

Assert `toBeInViewport()` when what matters is that the user actually sees it.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-107/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| apache-airflow                                | 7           |
| appsmithorg-appsmith                          | 4           |
| dubinc-dub                                    | 2           |
| getsentry-sentry                              | 2           |
| grafana-grafana                               | 141         |
| hashicorp-vault                               | 12          |
| Humanizr-Humanizer                            | 2           |
| keycloak-keycloak                             | 3           |
| negative-fixtures                             | 1           |
| playwright-community-eslint-plugin-playwright | 2           |
| positive-fixtures                             | 1           |
| streamlit-streamlit                           | 37          |
| withastro-astro                               | 7           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-107`
