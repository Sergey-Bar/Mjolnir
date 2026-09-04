# QA-TQUAL-011 — Commented-out test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | extended                    |
| Measured FP rate                      | 30% (n=20)                  |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | medium                      |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | jest, vitest, playwright    |
| Detection strategy                    | LEXICAL (regex heuristic)   |
| Introduced in                         | v0.2.0                      |

## Why this fails in production

Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.

## What gets flagged (real detector output)

```
Commented-out test detected.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TQUAL-011/must-fire/commented.spec.ts`

## The fix

Re-enable the test, or delete it with a tracked issue referencing what it covered.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TQUAL-011/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| appsmithorg-appsmith                          | 6           |
| calcom-cal                                    | 2           |
| getsentry-sentry                              | 1           |
| grafana-grafana                               | 2           |
| nocodb-nocodb                                 | 1           |
| playwright-community-eslint-plugin-playwright | 2           |
| positive-fixtures                             | 6           |
| vercel-next-js                                | 1           |
| vitest-dev-vitest                             | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TQUAL-011`
