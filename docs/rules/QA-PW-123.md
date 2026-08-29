# QA-PW-123 — Hardcoded environment URL in spec

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                       |
| ------------------- | --------------------------- |
| Severity            | warning                     |
| Confidence          | high                        |
| Tier                | core                        |
| Evidence level      | E2                          |
| QA impact           | Test hygiene debt (HYGIENE) |
| False-positive risk | low                         |
| Autofix available   | no                          |
| Languages           | typescript, javascript      |
| Frameworks          | playwright                  |
| Detection strategy  | regex pattern               |
| Introduced in       | v0.3.0                      |

## Why this fails in production

Specs pointing at absolute URLs break when environments change and can hit production by accident.

## What gets flagged (real detector output)

```
Hardcoded URL: `goto("https://prod.example.com/dashboard"`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-123/must-fire/hardcoded.spec.ts`

## The fix

Use relative paths with baseURL from playwright.config, or an env variable.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-123/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-123`
