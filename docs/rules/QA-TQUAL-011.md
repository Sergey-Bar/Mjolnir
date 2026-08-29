# QA-TQUAL-011 — Commented-out test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E2                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | medium                      |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | jest, vitest, playwright    |
| Detection strategy                    | regex heuristic             |
| Introduced in                         | v0.2.0                      |

## Why this fails in production

Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.

## What gets flagged (real detector output)

```
Commented-out test detected.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TQUAL-011/must-fire/commented.spec.ts`

## The fix

Re-enable the test, or delete it with a tracked issue referencing what it covered.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TQUAL-011/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TQUAL-011`
