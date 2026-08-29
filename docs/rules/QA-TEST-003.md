# QA-TEST-003 — Test with no assertions

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                           |
| ------------------- | ------------------------------- |
| Severity            | error                           |
| Confidence          | high                            |
| Tier                | core                            |
| Evidence level      | E2                              |
| QA impact           | False-green risk (FALSE-GREEN)  |
| False-positive risk | low                             |
| Autofix available   | no                              |
| Languages           | typescript, javascript          |
| Frameworks          | jest, vitest, playwright, mocha |
| Detection strategy  | regex pattern                   |
| Introduced in       | v0.1.0                          |

## Why this fails in production

A test with no assertion (`expect`/`assert` call, in any variant) can execute every line of application code, throw zero exceptions, and still verify nothing whatsoever. Test runners report it as "passed" because nothing failed — but nothing was ever checked either. This is qualitatively worse than a missing test, because a missing test is at least visible as a coverage gap; an assertion-less test occupies a green checkmark's worth of false confidence while providing none of the actual guarantee. The same mechanism applies identically across languages — QA-PY-105, QA-JV-103, and QA-CS-103 are this exact failure mode in pytest, JUnit, and NUnit/xUnit respectively.

## What gets flagged (real detector output)

```
Test contains no assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-003/must-fire/no-assert.spec.ts`

## The fix

Add an assertion on the expected outcome, or remove the test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-003/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-003`
