# QA-PW-144 — Single-browser project matrix

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | info                        |
| Confidence          | high                        |
| Evidence level      | E2                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | low                         |
| Autofix available   | no                          |
| Languages           | typescript, javascript      |
| Frameworks          | playwright                  |
| Detection strategy  | regex heuristic             |
| Introduced in       | v0.3.8                      |

## Why this fails in production

Engine-specific breakage (CSS features, date inputs, download behavior) only shows up outside chromium; a single-engine matrix ships it to users undetected.

## What gets flagged (real detector output)

```
Projects cover only chromium engine — no cross-browser matrix.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-144/must-fire/playwright.config.ts`

## The fix

Add at least one webkit/firefox project (or `...devices['Desktop Safari']`) to the projects array.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-144/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-144`
