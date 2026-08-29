# QA-PW-122 — No trace capture on retry

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Tier                | core                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | typescript, javascript         |
| Frameworks          | playwright                     |
| Detection strategy  | regex heuristic                |
| Introduced in       | v0.3.0                         |

## Why this fails in production

A test that fails once and passes on retry is exactly the case you'll need evidence for later — with no trace, the flake is uninvestigable.

## What gets flagged (real detector output)

```
playwright.config has no `trace` capture setting.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-122/must-fire/playwright.config.ts`

## The fix

Add `use: { trace: 'on-first-retry' }` to the config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-122/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-122`
