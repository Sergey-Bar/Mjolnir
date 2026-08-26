# QA-PW-121 — Config retry/worker abuse

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | high                           |
| Evidence level      | E2                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | low                            |
| Autofix available   | no                             |
| Languages           | typescript, javascript         |
| Frameworks          | playwright                     |
| Detection strategy  | regex heuristic                |
| Introduced in       | v0.3.0                         |

## Why this fails in production

High retry counts convert real bugs into intermittent passes and inflate CI minutes; the suite reports green while hiding instability.

## What gets flagged (real detector output)

```
retries: 4 — a flaky test gets 4 chances to pass by luck.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-121/must-fire/playwright.config.ts`

## The fix

Keep retries <= 2 and route repeat offenders into forensics (`qa-doctor triage`).

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-121/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-121`
