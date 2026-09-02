# QA-PW-004 — Brittle selector instead of role-based locator

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                          |
| ------------------------------------- | ---------------------------------------------- |
| Severity                              | warning                                        |
| Confidence                            | medium                                         |
| Tier                                  | quarantine                                     |
| Measured FP rate                      | 38% (n=16)                                     |
| Evidence level                        | E1                                             |
| QA impact                             | Test hygiene debt (HYGIENE)                    |
| False-positive risk (author estimate) | medium                                         |
| Autofix available                     | no                                             |
| Languages                             | typescript, javascript                         |
| Frameworks                            | playwright                                     |
| Detection strategy                    | LEXICAL (regex pattern + inside-string oracle) |
| Introduced in                         | v0.1.0                                         |

## Why this fails in production

Structural selectors break on any DOM refactor and fail without telling you which behavior regressed.

## What gets flagged (real detector output)

```
Brittle multi-class CSS selector: `locator(".btn.btn-primary.btn-lg")`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-004/must-fire/brittle.spec.ts`

## The fix

Prefer role-based locators: getByRole(), getByText(), getByLabel().

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-004/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| dubinc-dub        | 2           |
| grafana-grafana   | 5           |
| hashicorp-vault   | 2           |
| positive-fixtures | 8           |
| vitejs-vite       | 1           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-004`
