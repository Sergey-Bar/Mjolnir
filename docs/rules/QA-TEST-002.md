# QA-TEST-002 — Skipped test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | quarantine                     |
| Measured FP rate                      | 65% (n=20)                     |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | medium                         |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | jest, vitest, mocha            |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.1.0                         |

## Why this fails in production

Skipped tests hide broken or unimplemented behavior behind a green checkmark.

## What gets flagged (real detector output)

```
Skipped test without justification: `it.skip(`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-002/must-fire/justified-skip-warning.spec.ts`

## The fix

Fix and re-enable the test, or delete it with a tracked issue reference.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-002/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                  | Occurrences |
| --------------------- | ----------- |
| apache-airflow        | 1           |
| calcom-cal            | 18          |
| cypress-realworld-app | 3           |
| dubinc-dub            | 2           |
| getsentry-sentry      | 9           |
| github-docs           | 11          |
| grafana-grafana       | 45          |
| keycloak-keycloak     | 22          |
| nextauthjs-next-auth  | 1           |
| positive-fixtures     | 1           |
| sveltejs-kit          | 38          |
| vitejs-vite           | 5           |
| vitest-dev-vitest     | 23          |
| withastro-astro       | 32          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-002`
