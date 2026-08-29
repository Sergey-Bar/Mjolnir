# QA-PW-120 — Engine-specific test without environment guard

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | info                         |
| Confidence                            | low                          |
| Tier                                  | quarantine                   |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | high                         |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | regex heuristic              |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

Behavior tied to one browser engine or OS fails on every other runner in the matrix — chronic red builds teach the team to ignore failures.

## What gets flagged (real detector output)

```
Engine/platform-specific test with no test.skip / browser guard.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-120/must-fire/webgl-no-guard.spec.ts`

## The fix

Guard with `test.skip(browserName !== 'chromium', '...')` or scope via project config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-120/must-not-fire/guarded.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-120`
