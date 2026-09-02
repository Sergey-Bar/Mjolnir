# QA-PW-103 — Navigation wait without explicit timeout budget

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

Magic-default timeouts make failures opaque (was it slow, or broken?) and never encode the product's actual performance budget.

## What gets flagged (real detector output)

```
`goto("/pricing")` without an explicit timeout.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-103/must-fire/no-budget.spec.ts`

## The fix

Pass `{ timeout: <budget-ms> }` matching your performance SLO, or set actionTimeout/navigationTimeout deliberately in config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-103/must-not-fire/with-budget.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| apache-airflow       | 2           |
| calcom-cal           | 1           |
| dubinc-dub           | 17          |
| github-docs          | 90          |
| grafana-grafana      | 82          |
| hashicorp-vault      | 32          |
| Humanizr-Humanizer   | 26          |
| keycloak-keycloak    | 1           |
| negative-fixtures    | 16          |
| nextauthjs-next-auth | 4           |
| positive-fixtures    | 49          |
| puppeteer-puppeteer  | 97          |
| sveltejs-kit         | 438         |
| vitejs-vite          | 39          |
| vitest-dev-vitest    | 1           |
| withastro-astro      | 6           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-103`
