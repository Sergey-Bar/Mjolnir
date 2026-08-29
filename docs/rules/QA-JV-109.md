# QA-JV-109 — Retry masks test failures

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Severity            | warning                      |
| Confidence          | medium                       |
| Tier                | extended                     |
| Evidence level      | E1                           |
| QA impact           | Flaky-test risk (FLAKY-RISK) |
| False-positive risk | medium                       |
| Autofix available   | no                           |
| Languages           | java                         |
| Frameworks          | junit, testng                |
| Detection strategy  | regex pattern                |
| Introduced in       | v0.4.0                       |

## Why this fails in production

Retrying until a test passes hides intermittent failures — the reported result no longer reflects whether the suite is actually reliable.

## What gets flagged (real detector output)

```
TestNG `retryAnalyzer = FlakyRetry` automatically re-runs a failing test.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-109/must-fire/FlakyTest.java`

## The fix

Remove the retryAnalyzer; fix the flake root cause, or quarantine the test explicitly.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-109/must-not-fire/FlakyTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-109`
