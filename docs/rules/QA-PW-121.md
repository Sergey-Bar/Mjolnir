# QA-PW-121 — Config retry/worker abuse

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run generate-rule-docs`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | extended                       |
| Measured FP rate                      | 0% (n=12)                      |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | playwright                     |
| Detection strategy                    | LEXICAL (regex heuristic)      |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

High retry counts convert real bugs into intermittent passes and inflate CI minutes; the suite reports green while hiding instability.

## What gets flagged (real detector output)

```
retries: 4 — a flaky test gets 4 chances to pass by luck.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-121/must-fire/playwright.config.ts`

## The fix

Keep retries <= 2 and route repeat offenders into the evidence path (`explain --evidence`).

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-121/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 12          |

---

Full catalog: `mjolnir explain --list --md` · Live explanation: `mjolnir explain QA-PW-121`
