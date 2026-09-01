# QA-CI-007 — Retry masks test failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | extended (PROVISIONAL)       |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | yaml                         |
| Frameworks                            | github-actions               |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.1.0                       |

## Why this fails in production

Retrying tests until they pass hides flaky and intermittent failures — the green check no longer means the suite passed.

## What gets flagged (real detector output)

```
Job `test` wraps a test command in an automatic retry action.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-007/must-fire/retry-wrapper.yml`

## The fix

Remove the retry wrapper; investigate the underlying flakiness instead.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-007/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-007`
