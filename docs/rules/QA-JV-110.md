# QA-JV-110 — No accessibility assertions in UI test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | low                         |
| Tier                                  | quarantine                  |
| Measured FP rate                      | 100% (n=20)                 |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | high                        |
| Autofix available                     | no                          |
| Languages                             | java                        |
| Frameworks                            | junit, testng               |
| Detection strategy                    | LEXICAL (absence heuristic) |
| Introduced in                         | v0.4.0                      |

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

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                          | Occurrences |
| ----------------------------- | ----------- |
| iluwatar-java-design-patterns | 2           |
| keycloak-keycloak             | 84          |
| microsoft-playwright-java     | 110         |
| negative-fixtures             | 2           |
| positive-fixtures             | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-110`
