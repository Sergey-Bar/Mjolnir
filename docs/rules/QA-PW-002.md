# QA-PW-002 — Unawaited Playwright assertion

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                           |
| ------------------------------------- | ------------------------------- |
| Severity                              | error                           |
| Confidence                            | high                            |
| Tier                                  | core                            |
| Measured FP rate                      | not yet measured                |
| Evidence level                        | E2                              |
| QA impact                             | False-green risk (FALSE-GREEN)  |
| False-positive risk (author estimate) | low                             |
| Autofix available                     | no                              |
| Languages                             | typescript, javascript          |
| Frameworks                            | playwright                      |
| Detection strategy                    | AST (ts-morph) call-graph check |
| Introduced in                         | v0.1.0                          |

## Why this fails in production

Playwright's assertions (`expect(locator)...`) and most locator actions return Promises. A call like `expect(locator).toBeVisible()` without `await` in front of it starts the assertion, does not wait for its result, and the test function moves on immediately — exactly the same unawaited-promise mechanism as QA-TQUAL-009, but specific enough to Playwright's API shape (and common enough in Playwright suites) to warrant its own detector and fixture pair.

## What gets flagged (real detector output)

```
Playwright locator assertion is not awaited.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-002/must-fire/unawaited.spec.ts`

## The fix

Add `await`: `await expect(locator).toBeVisible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-002/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo         | Occurrences |
| ------------ | ----------- |
| sveltejs-kit | 28          |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-002`
