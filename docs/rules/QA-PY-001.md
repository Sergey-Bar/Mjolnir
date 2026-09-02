# QA-PY-001 — Focused test committed

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | 0% (n=12)                      |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

A hardcoded `pytest.main([..., "-k", ...])` call or `::`-scoped node selection committed into source, or an `@pytest.mark.only` marker from a focus-test plugin, restricts which tests actually run the same way JavaScript's `.only` does — the rest of the suite is deselected, not merely deprioritized. If that code path runs in CI unmodified, the job reports green having executed a fraction of the suite. This is the same mechanism as QA-TEST-001, expressed through pytest's own selection APIs rather than a test-runner `.only` method.

## What gets flagged (real detector output)

```
Focused-test selection committed: `pytest.main(["tests/", "-k"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-001/must-fire/focused.py`

## The fix

Remove the -k/:: selection from committed code; pass it on the command line locally instead.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-001/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 12          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-001`
