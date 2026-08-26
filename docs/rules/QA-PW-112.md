# QA-PW-112 — data-testid naming convention violation

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
| Detection strategy  | regex pattern               |
| Introduced in       | v0.3.0                      |

## Why this fails in production

Mixed naming conventions in test ids make selector review and grep-based audits unreliable.

## What gets flagged (real detector output)

```
test id `cartIcon` violates kebab-case convention.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-112/must-fire/bad-ids.spec.ts`

## The fix

Rename to kebab-case (e.g. `carticon`) and update the component.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-112/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-112`
