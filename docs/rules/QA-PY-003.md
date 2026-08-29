# QA-PY-003 — Test function with no assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | quarantine                     |
| Measured FP rate                      | not yet measured               |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | python                         |
| Frameworks                            | pytest                         |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.3.0                         |

## Why this fails in production

A pytest test function with no `assert` statement (and no call into a helper that itself asserts) can execute every line of the code under test and still verify nothing — pytest reports it as passed because nothing raised `AssertionError` or any other exception. This is the same failure mode as QA-TEST-003, in pytest's idiom: no `expect()` API to omit, just a missing `assert` keyword, which makes it easy to write a test that only calls the function under test for its side effects and never checks the result.

## What gets flagged (real detector output)

```
Test `test_login_no_assertion` contains no assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-003/must-fire/no-assert.py`

## The fix

Add an `assert` on the expected outcome, or remove the test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-003/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pallets-click     | 14          |
| psf-requests      | 14          |
| pytest-dev-pytest | 100         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PY-003`
