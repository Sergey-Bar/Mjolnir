# QA-PW-146 — CSS/XPath string selector instead of a normalized locator

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity                              | warning                                                                                                                                                                                                                                           |
| Confidence                            | medium                                                                                                                                                                                                                                            |
| Tier                                  | quarantine                                                                                                                                                                                                                                        |
| Measured FP rate                      | 12% (n=17)                                                                                                                                                                                                                                        |
| Evidence level                        | E1                                                                                                                                                                                                                                                |
| QA impact                             | Test hygiene debt (HYGIENE)                                                                                                                                                                                                                       |
| False-positive risk (author estimate) | medium                                                                                                                                                                                                                                            |
| Autofix available                     | no                                                                                                                                                                                                                                                |
| Languages                             | typescript, javascript                                                                                                                                                                                                                            |
| Frameworks                            | playwright                                                                                                                                                                                                                                        |
| Detection strategy                    | LEXICAL (string-selector shapes (css=/xpath= engines, bare id/class/attr CSS, nth-child) inside .locator()/waitForSelector()/page.$ APIs, on the RAW text view (the selector text lives inside string literals, which the code-only view blanks)) |
| Introduced in                         | v0.6.0                                                                                                                                                                                                                                            |

## Why this fails in production

String CSS/XPath selectors couple the test to markup the user never sees — they break on any refactor and can silently select the wrong element after a redesign.

## What gets flagged (real detector output)

```
CSS/XPath string selector where a normalized locator is expected.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-146/must-fire/selectors.spec.ts`

## The fix

Normalize to Playwright's user-facing getters: getByRole('button', { name: '…' }), getByLabel('…'), getByTestId('…'), or getByText('…') — they survive markup refactors and match what a user actually perceives.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-146/must-not-fire/selectors.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| negative-fixtures | 2           |
| positive-fixtures | 15          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-146`
