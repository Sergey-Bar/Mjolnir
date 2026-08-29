# QA-PW-103 — Navigation wait without explicit timeout budget

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
| Languages           | typescript, javascript      |
| Frameworks          | playwright                  |
| Detection strategy  | regex pattern               |
| Introduced in       | v0.3.0                      |

## Why this fails in production

Magic-default timeouts make failures opaque (was it slow, or broken?) and never encode the product's actual performance budget.

## What gets flagged (real detector output)

```
`goto("/pricing")` without an explicit timeout.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-103/must-fire/no-budget.spec.ts`

## The fix

Pass `{ timeout: <budget-ms> }` matching your performance SLO, or set actionTimeout/navigationTimeout deliberately in config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-103/must-not-fire/with-budget.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-103`
