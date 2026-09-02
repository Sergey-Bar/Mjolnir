# QA-TEST-010 — Empty test body

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | error                           |
| Confidence                            | high                            |
| Tier                                  | quarantine                      |
| Measured FP rate                      | 90% (n=20)                      |
| Evidence level                        | E2                              |
| QA impact                             | False-green risk (FALSE-GREEN)  |
| False-positive risk (author estimate) | low                             |
| Autofix available                     | no                              |
| Languages                             | typescript, javascript          |
| Frameworks                            | jest, vitest, playwright, mocha |
| Detection strategy                    | LEXICAL                         |
| Introduced in                         | v0.1.0                          |

## Why this fails in production

An empty test body (or a body that's effectively a no-op, like a single comment) reports "passed" for the same reason an assertion-less test does — nothing threw, so nothing failed. It commonly appears as scaffolding left behind after a refactor: the test's setup and teardown got deleted along with the code under test, but the `it(...)` block itself stayed, quietly padding the test count while verifying nothing.

## What gets flagged (real detector output)

```
Test has an empty body — it can never fail.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-010/must-fire/empty.spec.ts`

## The fix

Implement the test or remove it.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-010/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| getsentry-sentry  | 1           |
| grafana-grafana   | 2           |
| negative-fixtures | 3           |
| positive-fixtures | 11          |
| tanstack-query    | 2           |
| vercel-next-js    | 201         |
| vitest-dev-vitest | 82          |
| withastro-astro   | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-010`
