# QA-PW-147 — Playwright codegen default test title (recording artifact)

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Severity                              | info                                                                                                                                                         |
| Confidence                            | medium                                                                                                                                                       |
| Tier                                  | quarantine                                                                                                                                                   |
| Measured FP rate                      | not yet measured                                                                                                                                             |
| Evidence level                        | E0                                                                                                                                                           |
| QA impact                             | Test hygiene debt (HYGIENE)                                                                                                                                  |
| False-positive risk (author estimate) | medium                                                                                                                                                       |
| Autofix available                     | no                                                                                                                                                           |
| Languages                             | typescript, javascript                                                                                                                                       |
| Frameworks                            | playwright                                                                                                                                                   |
| Detection strategy                    | LEXICAL (the codegen recorder's default test title ('test', 'test 1', 'test 2', …) committed verbatim, on the RAW text view (the title is a string literal)) |
| Introduced in                         | v0.6.0                                                                                                                                                       |

## Why this fails in production

The default codegen title ("test") says this spec is an unreviewed recording — recorded browser actions frequently include navigation noise and never carry the assertions a real regression test needs.

## What gets flagged (real detector output)

```
Codegen default test title (test("test",) — an unreviewed recording artifact.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-147/must-fire/codegen.spec.ts`

## The fix

Rename the test to describe the behavior under test, prune the recorded noise, and add assertions on the expected outcome — or delete the recording.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-147/must-not-fire/cart.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:regression` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-147`
