# QA-PW-145 — UI suite without accessibility assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                  |
| ------------------------------------- | -------------------------------------- |
| Severity                              | info                                   |
| Confidence                            | low                                    |
| Tier                                  | quarantine                             |
| Measured FP rate                      | 100% (n=20)                            |
| Evidence level                        | E1                                     |
| QA impact                             | Test hygiene debt (HYGIENE)            |
| False-positive risk (author estimate) | high                                   |
| Autofix available                     | no                                     |
| Languages                             | typescript, javascript                 |
| Frameworks                            | playwright                             |
| Detection strategy                    | absence heuristic over suite directory |
| Introduced in                         | v0.3.8                                 |

## Why this fails in production

Suites that drive the UI but never assert accessibility let WCAG regressions through every PR; catching them at the point of interaction is far cheaper than a retrofit audit.

## What gets flagged (real detector output)

```
UI-interacting spec file contains no accessibility assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-145/must-fire/login.spec.ts`

## The fix

Add `@axe-core/playwright` with `expect(await new AxeBuilder({ page }).analyze()).toHaveNoViolations()` on key pages, or snapshot aria snapshots.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-145/must-not-fire/login.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| apache-airflow       | 9           |
| appsmithorg-appsmith | 8           |
| calcom-cal           | 5           |
| dubinc-dub           | 5           |
| getsentry-sentry     | 7           |
| github-docs          | 3           |
| grafana-grafana      | 107         |
| hashicorp-vault      | 29          |
| Humanizr-Humanizer   | 3           |
| keycloak-keycloak    | 25          |
| negative-fixtures    | 7           |
| nextauthjs-next-auth | 3           |
| nocodb-nocodb        | 1           |
| positive-fixtures    | 20          |
| puppeteer-puppeteer  | 58          |
| streamlit-streamlit  | 4           |
| sveltejs-kit         | 11          |
| tanstack-query       | 3           |
| vitejs-vite          | 38          |
| vitest-dev-vitest    | 18          |
| withastro-astro      | 48          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-145`
