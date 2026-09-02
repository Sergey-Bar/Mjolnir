# QA-PW-119 — Test depends on execution order

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | medium                         |
| Tier                                  | quarantine                     |
| Measured FP rate                      | 100% (n=24)                    |
| Evidence level                        | E1                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | medium                         |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | playwright                     |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

A test that writes to module-level mutable state which a LATER test reads creates a hidden dependency on execution order that nothing in either test's own code makes visible. It passes reliably as long as the test runner happens to execute them in the order the author had in mind. The moment anything reorders execution — test sharding across CI workers, a runner's parallelization strategy, someone reordering `describe` blocks, or simply upgrading the test runner to a version with a different default ordering — the dependent test starts failing with no code change to itself, and the actual cause is in a completely different file.

## What gets flagged (real detector output)

```
`sharedCart` is module-level mutable state assigned in a test.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-119/must-fire/shared-state.spec.ts`

## The fix

Create the state inside each test that needs it, or use beforeAll explicitly with cleanup in afterAll.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-119/must-not-fire/destructured-and-hooked.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| apache-airflow       | 8           |
| appsmithorg-appsmith | 7           |
| calcom-cal           | 3           |
| getsentry-sentry     | 6           |
| grafana-grafana      | 105         |
| nextauthjs-next-auth | 9           |
| puppeteer-puppeteer  | 1           |
| streamlit-streamlit  | 7           |
| sveltejs-kit         | 8           |
| tanstack-query       | 5           |
| vitejs-vite          | 6           |
| vitest-dev-vitest    | 24          |
| withastro-astro      | 11          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-119`
