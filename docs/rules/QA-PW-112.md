# QA-PW-112 — data-testid naming convention violation

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | 0% (n=16)                   |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Mixed naming conventions in test ids make selector review and grep-based audits unreliable.

## What gets flagged (real detector output)

```
test id `cartIcon` violates kebab-case convention.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-112/must-fire/bad-ids.spec.ts`

## The fix

Rename to kebab-case (e.g. `carticon`) and update the component.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-112/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 16          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-112`
