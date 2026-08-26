# QA-PW-125 — Global setup mutating shared state

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | medium                      |
| Evidence level      | E1                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | medium                      |
| Autofix available   | no                          |
| Languages           | typescript, javascript      |
| Frameworks          | playwright                  |
| Detection strategy  | regex heuristic             |
| Introduced in       | v0.3.0                      |

## Why this fails in production

Migrations/seeds/deletes against a shared environment break every other pipeline and developer pointing at it — and the damage happens before any test runs.

## What gets flagged (real detector output)

```
Global setup mutates shared state: `execSync("npx prisma migrate deploy --schema ./prisma"…`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-125/must-fire/global-setup.ts`

## The fix

Target an ephemeral per-run environment (testcontainers, branch DB) instead of shared infrastructure.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-125/must-not-fire/ephemeral-setup.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-125`
