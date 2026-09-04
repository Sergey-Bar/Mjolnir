# QA-CYP-003 — Cypress config disables chromeWebSecurity

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Severity                              | error                                                                                                                   |
| Confidence                            | high                                                                                                                    |
| Tier                                  | quarantine                                                                                                              |
| Measured FP rate                      | not yet measured                                                                                                        |
| Evidence level                        | E2                                                                                                                      |
| QA impact                             | False-green risk (FALSE-GREEN)                                                                                          |
| False-positive risk (author estimate) | low                                                                                                                     |
| Autofix available                     | no                                                                                                                      |
| Languages                             | typescript, javascript                                                                                                  |
| Frameworks                            | cypress                                                                                                                 |
| Detection strategy                    | LEXICAL (positive match on chromeWebSecurity:false inside cypress.config.* (the config is the artifact — no heuristic)) |
| Introduced in                         | v0.6.0                                                                                                                  |

## Why this fails in production

`chromeWebSecurity: false` in cypress.config.* runs the entire Cypress suite against a browser with its same-origin policy turned off. The tests stop exercising the security boundary the browser enforces in production: cross-origin frames, cookies, and requests that the app's users could never make from that origin succeed inside the test run, so a real cross-origin breakage ships unnoticed while the suite stays green. It also widens the attack surface of every site the tests visit — a malicious ad/CDN script loaded during testing can read cookies from other origins.

## What gets flagged (real detector output)

```
`chromeWebSecurity: false` disables the browser's same-origin policy for every test.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-CYP-003/must-fire/cypress.config.js`

## The fix

Keep chromeWebSecurity enabled (the default); scope the cross-origin work to cy.origin()/cy.session() instead.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-CYP-003/must-not-fire/cypress.config.js` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-CYP-003`
