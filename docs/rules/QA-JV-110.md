# QA-JV-110 — No accessibility assertions in UI test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | info                        |
| Confidence          | low                         |
| Tier                | quarantine                  |
| Evidence level      | E1                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | high                        |
| Autofix available   | no                          |
| Languages           | java                        |
| Frameworks          | junit, testng               |
| Detection strategy  | absence heuristic           |
| Introduced in       | v0.4.0                      |

## Why this fails in production

Without axe or equivalent, accessibility regressions ship silently. One scan per page catches layout/contrast/ARIA issues that visual review misses.

## What gets flagged (real detector output)

```
UI-interacting test file contains no accessibility assertions.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-110/must-fire/LoginPageTest.java`

## The fix

Add `com.deque.html.axe-core:playwright` and run `new AxeBuilder(page).analyze()` once per page-under-test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-110/must-not-fire/LoginPageTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-110`
