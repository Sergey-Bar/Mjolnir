# QA-PW-115 — Shared page object across tests

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Severity            | warning                      |
| Confidence          | medium                       |
| Evidence level      | E1                           |
| QA impact           | Flaky-test risk (FLAKY-RISK) |
| False-positive risk | medium                       |
| Autofix available   | no                           |
| Languages           | typescript, javascript       |
| Frameworks          | playwright                   |
| Detection strategy  | regex pattern                |
| Introduced in       | v0.3.0                       |

## Why this fails in production

Parallel workers share module scope: one test navigating or closing the page corrupts every other test's session, producing order-dependent flakes.

## What gets flagged (real detector output)

```
Module-level `let page` — browser state shared across tests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-115/must-fire/shared-page.spec.ts`

## The fix

Take `page` as a test function parameter (Playwright creates an isolated one per test), or use fixtures.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-115/must-not-fire/isolated-page.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

UNKNOWN — this rule has not (yet) fired in any of the real OSS repos tracked by `npm run corpus:audit` (see `docs/FP-AUDIT.md`). That is not the same as "never fires incorrectly" — it just means no occurrence, correct or not, has been observed there yet.

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-115`
