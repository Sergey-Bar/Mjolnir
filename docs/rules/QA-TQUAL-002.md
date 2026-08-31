# QA-TQUAL-002 — Tautological assertion

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
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | jest, vitest, playwright       |
| Detection strategy                    | AST-stripped text pattern      |
| Introduced in                         | v0.1.0                         |

## Why this fails in production

`expect(true).toBe(true)`, `assert 1 == 1`, and equivalent tautologies compare a literal to itself — they can never fail, by construction, regardless of what the code under test actually did. This is a stronger version of the no-assertion problem: it doesn't just fail to verify anything, it actively masquerades as verification while providing a mathematical guarantee of always passing. It most often survives code review specifically because it looks like a real assertion at a glance.

## What gets flagged (real detector output)

```
Tautological assertion: `expect(true).toBe(true)`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TQUAL-002/must-fire/tautological.spec.ts`

## The fix

Assert on actual output of the code under test.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TQUAL-002/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| calcom-cal           | 1           |
| grafana-grafana      | 3           |
| nextauthjs-next-auth | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TQUAL-002`
