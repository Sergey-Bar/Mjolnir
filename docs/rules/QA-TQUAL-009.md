# QA-TQUAL-009 — Assertion in promise chain that is never awaited

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | not yet measured               |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | jest, vitest, playwright       |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.2.0                         |

## Why this fails in production

A promise-returning assertion (`expect(...).resolves...`, an async matcher, a `.then()` chain containing an assertion) that is never awaited or returned from the test function completes on its own schedule, AFTER the test function has already returned and the runner has already recorded a result. If the assertion inside that unawaited promise later rejects, most runners either report it as an unhandled rejection attributed to a DIFFERENT, already-finished test, or drop it entirely — the test that actually contained the failing check reports as passed no matter what that check found.

## What gets flagged (real detector output)

```
Assertion inside a `.then()` whose promise is never awaited or returned.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TQUAL-009/must-fire/unawaited-chain.spec.ts`

## The fix

Await the promise (`await ...`), return it from the test, or convert to async/await with a top-level expect.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TQUAL-009/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TQUAL-009`
