# QA-CI-005 — Report consumed but never generated

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                      |
| ------------------------------------- | ------------------------------------------ |
| Severity                              | error                                      |
| Confidence                            | high                                       |
| Tier                                  | core                                       |
| Measured FP rate                      | not yet measured                           |
| Evidence level                        | E2                                         |
| QA impact                             | Blocks release confidence (BLOCKS-RELEASE) |
| False-positive risk (author estimate) | low                                        |
| Autofix available                     | no                                         |
| Languages                             | yaml                                       |
| Frameworks                            | github-actions                             |
| Detection strategy                    | regex pattern                              |
| Introduced in                         | v0.1.0                                     |

## Why this fails in production

Some report-processing steps (coverage upload, JUnit summary annotation, artifact publishing) read a file the test run was supposed to generate. If the test step crashed before ever writing that file — a config error, an OOM, a timeout that killed the process — the report step can still run and, depending on the tool, either silently no-op or report "0 tests found" without failing the job. The workflow ends green with a report that quietly represents nothing.

## What gets flagged (real detector output)

```
Job `test` consumes a coverage artifact that no step generates.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-005/must-fire/no-coverage.yml`

## The fix

Add a step that runs tests with --coverage (or generate the report) before this consumption step.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-005/must-not-fire/with-coverage.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pytest-dev-pytest | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-005`
