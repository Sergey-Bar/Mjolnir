# QA-PW-116 — storageState without expiry strategy

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | extended (PROVISIONAL)       |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | LEXICAL                      |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Auth cookies/tokens expire; when they do, every test using the stale state fails identically and the suite looks catastrophically broken.

## What gets flagged (real detector output)

```
`storageState` used without a visible expiry/refresh strategy.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-116/must-fire/no-refresh.config.ts`

## The fix

Regenerate the state in a setup project per run, or assert validity before reuse.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-116/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-116`
