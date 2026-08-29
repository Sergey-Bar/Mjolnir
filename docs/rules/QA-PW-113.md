# QA-PW-113 — frameLocator chain deeper than 2

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | high                        |
| Tier                                  | core                        |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | low                         |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-113`
