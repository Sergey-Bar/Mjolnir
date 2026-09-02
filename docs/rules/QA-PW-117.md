# QA-PW-117 — describe.serial without justification

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | 0% (n=20)                   |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | LEXICAL                     |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Serial mode turns any single failure into a cascade for everything after it — it should be an explicit, documented trade-off.

## What gets flagged (real detector output)

```
`test.describe.serial` without a justification comment.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-117/must-fire/serial.spec.ts`

## The fix

Add a comment explaining why order matters, or refactor tests to be independent.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-117/must-not-fire/justified.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| keycloak-keycloak | 98          |
| positive-fixtures | 4           |
| sveltejs-kit      | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-117`
