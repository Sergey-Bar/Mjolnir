# QA-CI-001 — continue-on-error masks a failing verification gate

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | error                           |
| Confidence                            | high                            |
| Tier                                  | core                            |
| Measured FP rate                      | not yet measured                |
| Evidence level                        | E2                              |
| QA impact                             | False-green risk (FALSE-GREEN)  |
| False-positive risk (author estimate) | low                             |
| Autofix available                     | no                              |
| Languages                             | yaml                            |
| Frameworks                            | github-actions                  |
| Detection strategy                    | parsed YAML + test-command gate |
| Introduced in                         | v0.1.0                          |

## Why this fails in production

A GitHub Actions job with `continue-on-error: true` reports its conclusion as `success` in the Checks API regardless of what actually happened inside it — this is not a UI quirk, it is documented GitHub Actions behavior. A required-status-check branch protection rule that gates on this job's name will pass every time, because from GitHub's perspective the job DID succeed. The team merges on green, the actual test run underneath may have been failing for weeks, and nobody notices until the bug it should have caught reaches production — at which point the CI history shows an unbroken streak of green checkmarks and no one who reviews it will think to suspect this specific job.

## What gets flagged (real detector output)

```
Job `security-scan` runs a verification gate under `continue-on-error: true`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-001/must-fire/masked.yml`

## The fix

Remove continue-on-error, or scope it to individual non-blocking steps only.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-001/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| nextauthjs-next-auth | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-001`
