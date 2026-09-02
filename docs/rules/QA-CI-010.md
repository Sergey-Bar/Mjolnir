# QA-CI-010 — Tests skipped where they must block

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                              |
| ------------------------------------- | -------------------------------------------------- |
| Severity                              | error                                              |
| Confidence                            | medium                                             |
| Tier                                  | quarantine                                         |
| Measured FP rate                      | 40% (n=10)                                         |
| Evidence level                        | E2                                                 |
| QA impact                             | False-green risk (FALSE-GREEN)                     |
| False-positive risk (author estimate) | medium                                             |
| Autofix available                     | no                                                 |
| Languages                             | yaml                                               |
| Frameworks                            | github-actions                                     |
| Detection strategy                    | FRAMEWORK (regex heuristic on parsed workflow AST) |
| Introduced in                         | v0.4.0                                             |

## Why this fails in production

A job or step gated behind a condition that can evaluate to "skip" on the exact runs that matter (e.g. `if: github.event_name == 'push'` on a workflow that's supposed to gate pull requests, or a path filter that excludes the files that actually changed) means the test suite that's supposed to block a bad merge never actually runs on that merge. GitHub reports a skipped required check as "neutral," which several branch-protection configurations treat as passing — the PR merges having never been tested at all.

## What gets flagged (real detector output)

```
Job `test` runs tests but its `if:` condition skips it on pull requests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CI-010/must-fire/skip-on-pr.yml`

## The fix

Remove the skip-on-PR condition, or split into a dedicated PR test job and require THAT one in branch protection.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CI-010/must-not-fire/clean.yml` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| grafana-grafana     | 2           |
| nocodb-nocodb       | 1           |
| positive-fixtures   | 5           |
| reflex-dev-reflex   | 1           |
| streamlit-streamlit | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-010`
