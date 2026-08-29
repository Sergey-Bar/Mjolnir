# QA-TEST-004 — Hard sleep in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                                          |
| ------------------- | ---------------------------------------------- |
| Severity            | warning                                        |
| Confidence          | high                                           |
| Tier                | extended                                       |
| Evidence level      | E2                                             |
| QA impact           | Flaky-test risk (FLAKY-RISK)                   |
| False-positive risk | low                                            |
| Autofix available   | no                                             |
| Languages           | typescript, javascript                         |
| Frameworks          | jest, vitest, playwright, mocha                |
| Detection strategy  | regex pattern + behavioral wait-shape matching |
| Introduced in       | v0.1.0                                         |

## Why this fails in production

Fixed sleeps make tests both slow and flaky — they guess at timing instead of waiting for state.

## What gets flagged (real detector output)

```
Hard sleep: `page.waitForTimeout(`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TEST-004/must-fire/sleepy.spec.ts`

## The fix

Replace with a condition wait: `await expect(locator).toBeVisible()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TEST-004/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                      | Occurrences |
| ------------------------- | ----------- |
| microsoft-playwright-java | 40          |
| pytest-dev-pytest         | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TEST-004`
