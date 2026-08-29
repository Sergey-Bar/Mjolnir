# QA-JV-106 — Brittle selector instead of role-based locator

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | medium                      |
| Tier                | quarantine                  |
| Evidence level      | E1                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | medium                      |
| Autofix available   | no                          |
| Languages           | java                        |
| Frameworks          | junit, testng               |
| Detection strategy  | regex pattern               |
| Introduced in       | v0.4.0                      |

## Why this fails in production

XPath paths and structural CSS break on any markup refactor and silently select the wrong element after redesigns.

## What gets flagged (real detector output)

```
Brittle selector (xpath= selector).
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-JV-106/must-fire/SelectorTest.java`

## The fix

Prefer role-based locators (`page.getByRole(...)`) or data-testid attributes.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-JV-106/must-not-fire/SelectorTest.java` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 27          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-JV-106`
