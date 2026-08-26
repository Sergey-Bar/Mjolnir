# QA-PW-101 — Hard sleep via waitForTimeout

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Severity            | error                        |
| Confidence          | high                         |
| Evidence level      | E2                           |
| QA impact           | Flaky-test risk (FLAKY-RISK) |
| False-positive risk | low                          |
| Autofix available   | no                           |
| Languages           | typescript, javascript       |
| Frameworks          | playwright                   |
| Detection strategy  | regex pattern                |
| Introduced in       | v0.3.0                       |

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

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-101`
