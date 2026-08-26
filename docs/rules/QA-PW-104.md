# QA-PW-104 — trial:true click without follow-up assertion

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                          |
| ------------------- | ------------------------------ |
| Severity            | warning                        |
| Confidence          | medium                         |
| Evidence level      | E1                             |
| QA impact           | False-green risk (FALSE-GREEN) |
| False-positive risk | medium                         |
| Autofix available   | no                             |
| Languages           | typescript, javascript         |
| Frameworks          | playwright                     |
| Detection strategy  | regex pattern                  |
| Introduced in       | v0.3.0                         |

## Why this fails in production

Trial clicks only check actionability; any test logic assuming the click happened is verifying nothing while staying green.

## What gets flagged (real detector output)

```
`click({ trial: true })` — a dry-run that clicks nothing.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-104/must-fire/trial-click.spec.ts`

## The fix

Use a real `click()` and assert the resulting state, or keep trial only as an explicit actionability probe with a comment.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-104/must-not-fire/real-click.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-104`
