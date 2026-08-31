# QA-PW-108 — textContent assertion instead of accessible name

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | info                        |
| Confidence                            | low                         |
| Tier                                  | quarantine                  |
| Measured FP rate                      | not yet measured            |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | high                        |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | playwright                  |
| Detection strategy                    | regex pattern               |
| Introduced in                         | v0.3.0                      |

## Why this fails in production

Whitespace, nested spans, or i18n variants break exact-text matches even when the UI is correct for the user.

## What gets flagged (real detector output)

```
`toHaveText` couples the test to exact markup text.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-108/must-fire/exact-text.spec.ts`

## The fix

Prefer `getByRole(..., { name })` + `toBeVisible`, or assert a normalized substring with `toContainText`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-108/must-not-fire/role-name.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo            | Occurrences |
| --------------- | ----------- |
| sveltejs-kit    | 428         |
| withastro-astro | 350         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-108`
