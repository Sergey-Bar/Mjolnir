# QA-TEST-002 — Skipped test

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | typescript, javascript         |
| Frameworks          | jest, vitest, mocha            |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.1.0                         |

## Why this fails in production

Skipped tests hide broken or unimplemented behavior behind a green checkmark.

## What gets flagged (real detector output)

```
Skipped test detected: `it.skip(`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-002/must-fire/justified-skip-warning.spec.ts`

## The fix

Track the skip until it is resolved; remove it once the blocker clears.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-002/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-TEST-002`
