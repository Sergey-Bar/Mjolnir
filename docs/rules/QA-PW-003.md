# QA-PW-003 — Debug artifact committed to e2e spec

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | error                          |
| Confidence                            | high                           |
| Tier                                  | core                           |
| Measured FP rate                      | not yet measured               |
| Evidence level                        | E2                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | yes                            |
| Languages                             | typescript, javascript         |
| Frameworks                            | playwright                     |
| Detection strategy                    | regex pattern                  |
| Introduced in                         | v0.1.0                         |

## Why this fails in production

Debug artifacts intentionally left in committed specs — a `page.pause()` that halts execution waiting for a human at the Playwright Inspector, a `console.log` dump of internal state, a hard-coded `--debug`-only code path — behave differently in a headless CI runner than they did on the developer's machine where they were added. `page.pause()` specifically will hang the run until a runner-level timeout kills it, which then reports as an unrelated-looking timeout failure far from the actual cause.

## What gets flagged (real detector output)

```
`page.pause()` committed in an e2e spec.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-003/must-fire/artifacts.spec.ts`

## The fix

Remove the pause; use --debug locally instead.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-003/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-003`
