# QA-CYP-001 — Fixed cy.wait(n) hard-coded wait

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Severity                              | warning                                                                                                                                    |
| Confidence                            | high                                                                                                                                       |
| Tier                                  | extended                                                                                                                                   |
| Measured FP rate                      | 20% (n=15)                                                                                                                                 |
| Evidence level                        | E2                                                                                                                                         |
| QA impact                             | Flaky-test risk (FLAKY-RISK)                                                                                                               |
| False-positive risk (author estimate) | medium                                                                                                                                     |
| Autofix available                     | no                                                                                                                                         |
| Languages                             | typescript, javascript                                                                                                                     |
| Frameworks                            | cypress                                                                                                                                    |
| Detection strategy                    | LEXICAL (cy.wait with a numeric-literal argument only — alias waits (cy.wait('@…')) are the legitimate routed-request form and never fire) |
| Introduced in                         | v0.6.0                                                                                                                                     |

## Why this fails in production

A fixed cy.wait(n) pauses for the full duration no matter what — it is either too short (flaky) or too long (slow), and it cannot adapt to the app.

## What gets flagged (real detector output)

```
`cy.wait(3000)` — fixed hard-coded wait.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CYP-001/must-fire/checkout.cy.js`

## The fix

Wait on the real condition: `cy.wait('@alias')` for a routed request, `cy.intercept` + assertions on the response, or `cy.contains(...).should(...)` retry semantics.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CYP-001/must-not-fire/checkout.cy.js` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                   | Occurrences |
| ---------------------- | ----------- |
| cypress-io-kitchensink | 15          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CYP-001`
