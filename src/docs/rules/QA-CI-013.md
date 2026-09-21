# QA-CI-013 — Verification gate conditioned so it can never fail the pipeline

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Severity                              | error                                                                    |
| Confidence                            | high                                                                     |
| Tier                                  | quarantine                                                               |
| Measured FP rate                      | not yet measured                                                         |
| Evidence level                        | E2                                                                       |
| QA impact                             | False-green risk (FALSE-GREEN)                                           |
| False-positive risk (author estimate) | low                                                                      |
| Autofix available                     | no                                                                       |
| Languages                             | yaml                                                                     |
| Frameworks                            | azure-pipelines                                                          |
| Detection strategy                    | FRAMEWORK (Azure condition/enabled semantics on the parsed pipeline AST) |
| Introduced in                         | v1.1.0                                                                   |

## Why this fails in production

A verification gate (Azure DevOps stage, job, or step) whose own condition or enablement guarantees it never executes on the pipeline path it is supposed to guard: `condition: failed()` turns the gate into a rescue step that only runs after something already failed, `condition: false` and `enabled: false` switch it off outright. On the green path the gate is skipped, so the pipeline passes with zero verification executed — the checkmark is green precisely because the check did not happen. (The sibling shape — a gate marked `succeededOrFailed()`/`always()`, which runs on failed pipelines too — is QA-CI-008's Azure arm.)

## What gets flagged (real detector output)

```
Verification job `Tests` is guarded by `condition: failed()` — it never runs on a green pipeline.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-013/must-fire/azure-pipelines.yml`

## The fix

Remove the failed()/false condition or the enabled:false switch so the gate runs on the pipeline path it guards.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-013/must-not-fire/azure-pipelines.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-013`
