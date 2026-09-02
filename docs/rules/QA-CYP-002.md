# QA-CYP-002 — Focused test (.only)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Severity                              | error                                                                            |
| Confidence                            | high                                                                             |
| Tier                                  | quarantine                                                                       |
| Measured FP rate                      | not yet measured                                                                 |
| Evidence level                        | E2                                                                               |
| QA impact                             | False-green risk (FALSE-GREEN)                                                   |
| False-positive risk (author estimate) | low                                                                              |
| Autofix available                     | no                                                                               |
| Languages                             | typescript, javascript                                                           |
| Frameworks                            | cypress                                                                          |
| Detection strategy                    | LEXICAL (it/describe/context .only member-call shape on the code-only text view) |
| Introduced in                         | v0.6.0                                                                           |

## Why this fails in production

A Cypress `it.only`/`describe.only` committed to the shared suite silently de-schedules every other test: `npx cypress run` executes the focused subset and reports a green run over it, so CI coverage collapses to whatever the last debugging session left focused. Unlike a skipped test (which announces itself as skipped in the report), the de-scheduled tests simply never appear — the run looks complete while covering a fraction of the suite.

## What gets flagged (real detector output)

```
`it.only` focuses a single test — everything else is de-scheduled.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CYP-002/must-fire/dashboard.cy.js`

## The fix

Remove `.only` before committing; focus locally, never in the shared suite.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CYP-002/must-not-fire/dashboard.cy.js` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CYP-002`
