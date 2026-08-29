# QA-PW-105 — expect.poll without timeout bound

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | medium                      |
| Tier                | core                        |
| Evidence level      | E1                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | medium                      |
| Autofix available   | no                          |
| Languages           | typescript, javascript      |
| Frameworks          | playwright                  |
| Detection strategy  | regex pattern               |
| Introduced in       | v0.3.0                      |

## Why this fails in production

The default poll timeout masks how long the condition actually takes to converge — a regression to minutes-long polling stays invisible.

## What gets flagged (real detector output)

```
`expect.poll` without an explicit `timeout`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-105/must-fire/no-timeout.spec.ts`

## The fix

Pass `{ timeout: 10_000 }` (or your budget) and `{ intervals: [...] }` if pacing matters.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-105/must-not-fire/with-timeout.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-105`
