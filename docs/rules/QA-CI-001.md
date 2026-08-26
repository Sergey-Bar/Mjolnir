# QA-CI-001 — continue-on-error masks a failing required test

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | error                          |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | yaml                           |
| Frameworks          | github-actions                 |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.1.0                         |

## Why this fails in production

A GitHub Actions job with `continue-on-error: true` reports its conclusion as `success` in the Checks API regardless of what actually happened inside it — this is not a UI quirk, it is documented GitHub Actions behavior. A required-status-check branch protection rule that gates on this job's name will pass every time, because from GitHub's perspective the job DID succeed. The team merges on green, the actual test run underneath may have been failing for weeks, and nobody notices until the bug it should have caught reaches production — at which point the CI history shows an unbroken streak of green checkmarks and no one who reviews it will think to suspect this specific job.

## What gets flagged (real detector output)

```
Job `security-scan` has `continue-on-error: true`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-001/must-fire/masked.yml`

## The fix

Remove continue-on-error, or scope it to individual non-blocking steps only.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-001/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-CI-001`
