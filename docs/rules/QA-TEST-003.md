# QA-TEST-003 — Test with no assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | error                           |
| Confidence                            | high                            |
| Tier                                  | quarantine                      |
| Measured FP rate                      | 85% (n=20)                      |
| Evidence level                        | E2                              |
| QA impact                             | False-green risk (FALSE-GREEN)  |
| False-positive risk (author estimate) | medium                          |
| Autofix available                     | no                              |
| Languages                             | typescript, javascript          |
| Frameworks                            | jest, vitest, playwright, mocha |
| Detection strategy                    | LEXICAL                         |
| Introduced in                         | v0.1.0                          |

## Why this fails in production

A test with no assertion (`expect`/`assert` call, in any variant) can execute every line of application code, throw zero exceptions, and still verify nothing whatsoever. Test runners report it as "passed" because nothing failed — but nothing was ever checked either. This is qualitatively worse than a missing test, because a missing test is at least visible as a coverage gap; an assertion-less test occupies a green checkmark's worth of false confidence while providing none of the actual guarantee. The same mechanism applies identically across languages — QA-PY-105, QA-JV-103, and QA-CS-103 are this exact failure mode in pytest, JUnit, and NUnit/xUnit respectively.

## What gets flagged (real detector output)

```
Test contains no assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-003/must-fire/no-assert.spec.ts`

## The fix

Add an assertion on the expected outcome, or remove the test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-003/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| apache-airflow                                | 52          |
| appsmithorg-appsmith                          | 36          |
| calcom-cal                                    | 119         |
| cypress-realworld-app                         | 3           |
| dubinc-dub                                    | 17          |
| getsentry-sentry                              | 199         |
| grafana-grafana                               | 418         |
| Humanizr-Humanizer                            | 1           |
| keycloak-keycloak                             | 309         |
| negative-fixtures                             | 14          |
| nextauthjs-next-auth                          | 3           |
| playwright-community-eslint-plugin-playwright | 1           |
| positive-fixtures                             | 58          |
| puppeteer-puppeteer                           | 90          |
| streamlit-streamlit                           | 8           |
| sveltejs-kit                                  | 62          |
| tanstack-query                                | 19          |
| vercel-next-js                                | 1390        |
| vitejs-vite                                   | 39          |
| vitest-dev-vitest                             | 382         |
| withastro-astro                               | 101         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-003`
