# QA-CI-009 — Test command does not propagate exit code

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                            |
| ------------------------------------- | ------------------------------------------------ |
| Severity                              | error                                            |
| Confidence                            | high                                             |
| Tier                                  | extended (PROVISIONAL)                           |
| Measured FP rate                      | not yet measured                                 |
| Evidence level                        | E2                                               |
| QA impact                             | False-green risk (FALSE-GREEN)                   |
| False-positive risk (author estimate) | low                                              |
| Autofix available                     | no                                               |
| Languages                             | yaml                                             |
| Frameworks                            | github-actions                                   |
| Detection strategy                    | FRAMEWORK (regex pattern on parsed workflow AST) |
| Introduced in                         | v0.4.0                                           |

## Why this fails in production

When a test runner's own exit code never reaches the shell that invoked it — because it's piped through a formatter, wrapped in a script that doesn't `exit $?`, or run inside a subshell whose exit status is discarded — the CI job has no way to know a test failed. This is mechanically identical to QA-CI-002's pipefail problem but shows up in test-runner wrapper scripts specifically, which is why it is tracked as its own rule: the fix (propagate `$?` explicitly, or avoid the wrapping) is different from "add pipefail."

## What gets flagged (real detector output)

```
Job `test` pipes the test command into another tool without `set -o pipefail`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-009/must-fire/masked-pipe.yml`

## The fix

Add `shell: bash` with `set -o pipefail`, or split into two steps so the test command's exit code is preserved.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-009/must-not-fire/pipefail-set.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 5           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-009`
