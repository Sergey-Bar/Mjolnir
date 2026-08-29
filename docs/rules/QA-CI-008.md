# QA-CI-008 — Always-success step masks failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | error                          |
| Confidence          | high                           |
| Tier                | core                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | yaml                           |
| Frameworks          | github-actions                 |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.1.0                         |

## Why this fails in production

A final step that unconditionally echoes success (or any step that always exits 0 as the LAST step in a job) determines the job's overall conclusion in GitHub Actions — the job's status is the status of its steps taken together, and a trailing always-succeed step can overwrite what an earlier failing step already signaled, depending on how the workflow is structured. Combined with any earlier step's failure being non-fatal to the job (e.g. a missing `if: failure()` gate), this produces the exact same effect as QA-CI-001 by a different mechanical path: a real failure, a green checkmark.

## What gets flagged (real detector output)

```
Final step in `test` always succeeds while earlier steps tolerate failure.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-008/must-fire/masked-green.yml`

## The fix

Remove the always-success final step and let the real test step determine the job result.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-008/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-008`
