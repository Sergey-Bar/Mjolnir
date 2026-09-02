# QA-ENV-001 — Environment coupling in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | quarantine                   |
| Measured FP rate                      | 100% (n=20)                  |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | jest, vitest, playwright     |
| Detection strategy                    | LEXICAL (regex heuristic)    |
| Introduced in                         | v0.2.0                       |

## Why this fails in production

The test assumes a specific host:port is reachable — it breaks on parallel runs, containers, network isolation, or when that host moves.

## What gets flagged (real detector output)

```
Environment coupling (fixed port): `staging.example.com:8443`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-ENV-001/must-fire/coupled.spec.ts`

## The fix

Use the server's resolved base URL from config/test fixtures, or a local fixture container, instead of a hardcoded host:port.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-ENV-001/must-not-fire/code-as-test-data.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| apache-airflow              | 21          |
| appsmithorg-appsmith        | 10          |
| calcom-cal                  | 15          |
| cypress-realworld-app       | 9           |
| dubinc-dub                  | 5           |
| getsentry-sentry            | 48          |
| github-docs                 | 1           |
| grafana-grafana             | 96          |
| hashicorp-vault             | 1           |
| Humanizr-Humanizer          | 1           |
| keycloak-keycloak           | 9           |
| microsoft-playwright-dotnet | 5           |
| negative-fixtures           | 1           |
| nextauthjs-next-auth        | 29          |
| nocodb-nocodb               | 2           |
| puppeteer-puppeteer         | 97          |
| streamlit-streamlit         | 50          |
| sveltejs-kit                | 28          |
| vitejs-vite                 | 32          |
| vitest-dev-vitest           | 28          |
| withastro-astro             | 148         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-ENV-001`
