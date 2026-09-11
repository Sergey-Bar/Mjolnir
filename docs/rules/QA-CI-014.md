# QA-CI-014 — try/catch swallows a verification-stage failure

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Severity                              | error                                                                                           |
| Confidence                            | high                                                                                            |
| Tier                                  | quarantine                                                                                      |
| Measured FP rate                      | not yet measured                                                                                |
| Evidence level                        | E2                                                                                              |
| QA impact                             | False-green risk (FALSE-GREEN)                                                                  |
| False-positive risk (author estimate) | low                                                                                             |
| Autofix available                     | no                                                                                              |
| Languages                             | groovy                                                                                          |
| Frameworks                            | jenkins                                                                                         |
| Detection strategy                    | FRAMEWORK (Groovy try/catch block scan (string-aware brace matching) over the Jenkinsfile text) |
| Introduced in                         | v1.1.1                                                                                          |

## Why this fails in production

A Jenkinsfile `try` block that runs a verification gate and a `catch` that absorbs the failure without any failure marking — no rethrow, no `error(...)`, no `unstable(...)`, no `currentBuild.result` assignment. The stage completes, the build stays green, and the only trace of the failed tests is a log line. This is the Groovy spelling of the same defect QA-CI-002 catches in shell (`|| true`): the runner never sees the exit status it needs to fail the build. (A catch that downgrades to `unstable()` IS a failure marking — that rescue shape is QA-CI-008's Jenkins arm, and the two rules split the family without overlap.)

## What gets flagged (real detector output)

```
A verification stage runs in a `try` whose `catch` swallows the failure — no rethrow, `error(...)`, `unstable(...)`, or result marking.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-014/must-fire/Jenkinsfile`

## The fix

Rethrow in the catch, or call `error(...)`/`unstable(...)` so the failure reaches the build result.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-014/must-not-fire/Jenkinsfile` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-014`
