# QA-PW-005 — Logic inside page.evaluate()

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                   |
| ------------------------------------- | --------------------------------------- |
| Severity                              | warning                                 |
| Confidence                            | medium                                  |
| Tier                                  | quarantine                              |
| Measured FP rate                      | 100% (n=17)                             |
| Evidence level                        | E1                                      |
| QA impact                             | Test hygiene debt (HYGIENE)             |
| False-positive risk (author estimate) | medium                                  |
| Autofix available                     | no                                      |
| Languages                             | typescript, javascript                  |
| Frameworks                            | playwright                              |
| Detection strategy                    | AST (ts-morph function-body inspection) |
| Introduced in                         | v0.1.0                                  |

## Why this fails in production

Code in the browser context is invisible to coverage and type-checking — logic here cannot be unit-tested or safely refactored.

## What gets flagged (real detector output)

```
Branching logic inside page.evaluate().
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-005/must-fire/evaluate-logic.spec.ts`

## The fix

Move the logic into application code or a shared utility; keep evaluate() for trivial reads only.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-005/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| Humanizr-Humanizer  | 1           |
| puppeteer-puppeteer | 10          |
| sveltejs-kit        | 4           |
| withastro-astro     | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-005`
