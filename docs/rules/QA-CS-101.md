# QA-CS-101 — Skipped test

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | csharp                         |
| Frameworks          | nunit, xunit, mstest           |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.3.8                         |

## Why this fails in production

Skipped tests hide broken or unimplemented behavior behind a green build.

## What gets flagged (real detector output)

```
Skipped test detected: `[Ignore]`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-101/must-fire/LoginTests.cs`

## The fix

Fix and re-enable the test, or delete it with a tracked issue reference.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-101/must-not-fire/LoginTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-CS-101`
