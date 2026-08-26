# QA-PW-005 — Logic inside page.evaluate()

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                                   |
| ------------------- | --------------------------------------- |
| Severity            | warning                                 |
| Confidence          | medium                                  |
| Evidence level      | E1                                      |
| QA impact           | Test hygiene debt (HYGIENE)             |
| False-positive risk | medium                                  |
| Autofix available   | no                                      |
| Languages           | typescript, javascript                  |
| Frameworks          | playwright                              |
| Detection strategy  | AST (ts-morph) function-body inspection |
| Introduced in       | v0.1.0                                  |

## Why this fails in production

Code in the browser context is invisible to coverage and type-checking — logic here cannot be unit-tested or safely refactored.

## What gets flagged (real detector output)

```
Branching logic inside page.evaluate().
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-005/must-fire/evaluate-logic.spec.ts`

## The fix

Move the logic into application code or a shared utility; keep evaluate() for trivial reads only.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-005/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-005`
