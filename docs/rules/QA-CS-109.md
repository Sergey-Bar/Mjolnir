# QA-CS-109 — Retry masks test failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | extended (PROVISIONAL)       |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | csharp                       |
| Frameworks                            | nunit, xunit, mstest         |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.4.0                       |

## Why this fails in production

Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.

## What gets flagged (real detector output)

```
NUnit `[Retry(3)]` automatically re-runs a failing test.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-109/must-fire/FlakyTests.cs`

## The fix

Remove the [Retry] attribute; fix the flake root cause, or quarantine the test explicitly.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-109/must-not-fire/FlakyTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-109`
