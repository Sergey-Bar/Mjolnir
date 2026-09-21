# QA-TEST-006 — Retry abuse hiding flakiness

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | warning                         |
| Confidence                            | high                            |
| Tier                                  | quarantine                      |
| Measured FP rate                      | 36% (n=11)                      |
| Evidence level                        | E2                              |
| QA impact                             | Flaky-test risk (FLAKY-RISK)    |
| False-positive risk (author estimate) | low                             |
| Autofix available                     | no                              |
| Languages                             | typescript, javascript          |
| Frameworks                            | jest, vitest, playwright, mocha |
| Detection strategy                    | LEXICAL                         |
| Introduced in                         | v0.1.0                          |

## Why this fails in production

Global retries re-run every failing test until it passes — intermittent failures become invisible.

## What gets flagged (real detector output)

```
`jest.retryTimes(3)` enabled.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-006/must-fire/retries.spec.ts`

## The fix

Remove the global retry; fix the underlying nondeterminism instead.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-006/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| apache-airflow    | 3           |
| grafana-grafana   | 2           |
| positive-fixtures | 5           |
| vercel-next-js    | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-006`
