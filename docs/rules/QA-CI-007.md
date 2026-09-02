# QA-CI-007 — Retry masks test failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | high                         |
| Tier                                  | extended                     |
| Measured FP rate                      | 27% (n=11)                   |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | yaml                         |
| Frameworks                            | github-actions               |
| Detection strategy                    | LEXICAL                      |
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

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                | Occurrences |
| ------------------- | ----------- |
| github-docs         | 1           |
| Humanizr-Humanizer  | 1           |
| keycloak-keycloak   | 1           |
| positive-fixtures   | 7           |
| streamlit-streamlit | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CI-007`
