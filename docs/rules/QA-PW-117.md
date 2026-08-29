# QA-PW-117 — describe.serial without justification

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-117`
