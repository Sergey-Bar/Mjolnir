# QA-PW-113 — frameLocator chain deeper than 2

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | 0% (n=11)                   |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | LEXICAL                     |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Each nested iframe multiplies timing and attachment flake; tests this coupled to embedding structure break on every layout change.

## What gets flagged (real detector output)

```
frameLocator chained 3 levels deep.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-113/must-fire/deep-frames.spec.ts`

## The fix

Expose a stable handle to the innermost content (postMessage bridge, test hook, or flatten the frames).

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-113/must-not-fire/shallow.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 11          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-113`
