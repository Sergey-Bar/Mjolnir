# QA-CS-110 — No accessibility assertions in UI test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                            |
| ------------------- | -------------------------------- |
| Severity            | info                             |
| Confidence          | low                              |
| Tier                | quarantine                       |
| Evidence level      | E1                               |
| QA impact           | Test hygiene debt (HYGIENE)      |
| False-positive risk | high                             |
| Autofix available   | no                               |
| Languages           | csharp                           |
| Frameworks          | nunit, xunit, mstest, playwright |
| Detection strategy  | absence heuristic                |
| Introduced in       | v0.4.0                           |

## Why this fails in production

Without axe or equivalent, accessibility regressions ship silently. One scan per page catches layout/contrast/ARIA issues that visual review misses.

## What gets flagged (real detector output)

```
UI-interacting test file contains no accessibility assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CS-110/must-fire/LoginPageTests.cs`

## The fix

Add `Deque.AxeCore.Playwright` NuGet and call `await page.RunAxe()` once per page-under-test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CS-110/must-not-fire/LoginPageTests.cs` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CS-110`
