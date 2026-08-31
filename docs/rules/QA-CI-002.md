# QA-CI-002 — Ignored exit code (|| true)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | not yet measured               |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | yaml                           |
| Frameworks                            | github-actions                 |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.1.0                         |

## Why this fails in production

`command | tee file.log` inherits `tee`'s exit code, not the command's — this is how POSIX pipelines work: the pipeline's exit status is the last command in it, unless the shell explicitly opts into `pipefail`. A failing test suite piped into `tee` for log capture reports exit 0 because `tee` itself succeeded at writing the file. Same failure mode for `command; next-command` sequencing without a `&&`/`||` guard, or an explicit `|| true`: the shell moves on regardless of what the command before it returned. A workflow step written this way to "just capture the logs" silently converts every test failure into a green step.

## What gets flagged (real detector output)

```
Command exit code is swallowed with `|| true`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-002/must-fire/swallowed.yml`

## The fix

Remove `|| true`. If the step is genuinely optional, mark it clearly and use `continue-on-error` on that step only.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-002/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| calcom-cal        | 1           |
| grafana-grafana   | 2           |
| reflex-dev-reflex | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-002`
