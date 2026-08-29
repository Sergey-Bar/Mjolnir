# QA-TEST-001 — Focused test committed

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                           |
| ------------------- | ------------------------------- |
| Severity            | error                           |
| Confidence          | high                            |
| Tier                | core                            |
| Evidence level      | E2                              |
| QA impact           | False-green risk (FALSE-GREEN)  |
| False-positive risk | low                             |
| Autofix available   | yes                             |
| Languages           | typescript, javascript          |
| Frameworks          | jest, vitest, playwright, mocha |
| Detection strategy  | regex pattern                   |
| Introduced in       | v0.1.0                          |

## Why this fails in production

`.only`/`test.only`/`it.only` restricts a test run to just the marked test(s) — that's the entire point of the API, for local debugging. Committed and pushed, it does the same thing in CI: the rest of the suite silently does not run at all. The build goes green because the one test that ran passed, while every other test in that file (or, in some runners, the whole project) contributed nothing to that result. This is the single easiest way to make a CI pipeline lie, because it requires no malice — just forgetting to remove a debugging aid before committing.

## What gets flagged (real detector output)

```
`.only` focus modifier committed.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-001/must-fire/focused.spec.ts`

## The fix

Remove `.only` before committing.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-001/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-001`
