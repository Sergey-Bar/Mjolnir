# QA-PY-006 — Empty test body (pass)

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | error                          |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | python                         |
| Frameworks          | pytest                         |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.3.0                         |

## Why this fails in production

A pytest test function whose entire body is `pass` (optionally preceded by a comment) is Python's most literal form of "empty test" — there is no simpler way to write a function that does nothing and returns normally. pytest reports it as passed for the same reason QA-TEST-010 does in JS/TS: nothing raised, so nothing failed. It shows up most often as a stub left behind after `# TODO: implement` scaffolding never got filled in, quietly inflating the pass count in the meantime.

## What gets flagged (real detector output)

```
Test `test_placeholder` has an empty body (pass only).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PY-006/must-fire/empty.py`

## The fix

Implement the test or remove it.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PY-006/must-not-fire/clean.py` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| pytest-dev-pytest | 315         |

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PY-006`
