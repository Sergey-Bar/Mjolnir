# QA-TEST-006 — Retry abuse hiding flakiness

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | warning                         |
| Confidence                            | high                            |
| Tier                                  | core                            |
| Measured FP rate                      | not yet measured                |
| Evidence level                        | E2                              |
| QA impact                             | Flaky-test risk (FLAKY-RISK)    |
| False-positive risk (author estimate) | low                             |
| Autofix available                     | no                              |
| Languages                             | typescript, javascript          |
| Frameworks                            | jest, vitest, playwright, mocha |
| Detection strategy                    | regex pattern                   |
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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-006`
