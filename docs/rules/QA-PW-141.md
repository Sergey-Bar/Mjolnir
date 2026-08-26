# QA-PW-141 — Retries configured without a flake-triage loop

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Evidence level      | E1                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | typescript, javascript         |
| Frameworks          | playwright                     |
| Detection strategy  | regex heuristic                |
| Introduced in       | v0.3.8                         |

## Why this fails in production

Retries convert intermittent failures into silent passes. Without a forensics/triage step consuming retry data, flaky tests pass forever and real regressions hide behind lucky reruns.

## What gets flagged (real detector output)

```
retries: 2 with no visible flake-triage loop.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-141/must-fire/playwright.config.ts`

## The fix

Keep retries <= 2 and feed retry outcomes into `qa-doctor forensics`/`triage`, or add a reporter so flaky passes are reviewed.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-141/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-141`
