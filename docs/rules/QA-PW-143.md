# QA-PW-143 — No screenshot/video capture on failure

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex heuristic             |
| Introduced in                         | v0.3.8                      |

## Why this fails in production

Once the CI runner is gone, a failed UI test is just a stack trace. Screenshots/video on failure turn 'cannot reproduce' into a five-second diagnosis.

## What gets flagged (real detector output)

```
playwright.config captures neither screenshots nor video on failure.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-143/must-fire/playwright.config.ts`

## The fix

Add `use: { screenshot: 'only-on-failure', video: 'retain-on-failure' }` to the config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-143/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-143`
