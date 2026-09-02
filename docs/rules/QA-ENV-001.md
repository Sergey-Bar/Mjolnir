# QA-ENV-001 — Environment coupling in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | quarantine                   |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | jest, vitest, playwright     |
| Detection strategy                    | LEXICAL (regex heuristic)    |
| Introduced in                         | v0.2.0                       |

## Why this fails in production

Absolute OS paths make the test machine-dependent — it fails on any developer or CI runner with a different filesystem.

## What gets flagged (real detector output)

```
Environment coupling (OS path): `"/tmp/cache/session.json"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-ENV-001/must-fire/coupled.spec.ts`

## The fix

Use os.tmpdir() / path.join with relative paths inside the test workspace.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-ENV-001/must-not-fire/code-as-test-data.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| apache-airflow      | 4           |
| dubinc-dub          | 5           |
| getsentry-sentry    | 1           |
| grafana-grafana     | 7           |
| hashicorp-vault     | 1           |
| puppeteer-puppeteer | 29          |
| sveltejs-kit        | 8           |
| vercel-next-js      | 6           |
| vitejs-vite         | 6           |
| vitest-dev-vitest   | 2           |
| withastro-astro     | 39          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-ENV-001`
