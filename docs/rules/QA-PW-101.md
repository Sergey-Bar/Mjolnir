# QA-PW-101 — Hard sleep via waitForTimeout

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | error                        |
| Confidence                            | high                         |
| Tier                                  | core                         |
| Measured FP rate                      | 10% (n=20)                   |
| Evidence level                        | E2                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | low                          |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | regex pattern                |
| Introduced in                         | v0.3.0                       |

## Why this fails in production

`page.waitForTimeout(N)` waits a fixed wall-clock duration regardless of the actual state of the page — it has no idea whether the element it's really waiting for appeared in 50ms or will never appear at all. Too short for a slow CI runner (shared hardware, cold caches, resource contention under a parallel test matrix) and the test fails intermittently; too long and the whole suite's wall-clock time balloons for no correctness benefit. The fix (`await expect(locator).toBeVisible()`, or an equivalent condition-wait) is not slower in the success case and is actually faster on average, because it proceeds the instant the condition is true instead of always waiting the full fixed duration.

## What gets flagged (real detector output)

```
`waitForTimeout()` hard sleep.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-101/must-fire/sleepy.spec.ts`

## The fix

Replace with a web-first assertion (`await expect(locator).toBeVisible()`) or `locator.waitFor()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-101/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 40          |
| nextauthjs-next-auth      | 4           |
| sveltejs-kit              | 62          |
| withastro-astro           | 4           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-101`
