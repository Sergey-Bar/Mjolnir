# QA-PW-120 — Engine-specific test without environment guard

_Generated from the live rule registry and this rule's own committed fixtures by `qa-doctor`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Severity            | info                         |
| Confidence          | low                          |
| Evidence level      | E1                           |
| QA impact           | Flaky-test risk (FLAKY-RISK) |
| False-positive risk | high                         |
| Autofix available   | no                           |
| Languages           | typescript, javascript       |
| Frameworks          | playwright                   |
| Detection strategy  | regex heuristic              |
| Introduced in       | v0.3.0                       |

## Why this fails in production

Behavior tied to one browser engine or OS fails on every other runner in the matrix — chronic red builds teach the team to ignore failures.

## What gets flagged (real detector output)

```
Engine/platform-specific test with no test.skip / browser guard.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-120/must-fire/webgl-no-guard.spec.ts`

## The fix

Guard with `test.skip(browserName !== 'chromium', '...')` or scope via project config.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-120/must-not-fire/guarded.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:audit` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                     | Occurrences |
| ------------------------ | ----------- |
| microsoft-playwright-mcp | 1           |

---

Full catalog: `qa-doctor rules --md` · Live explanation: `qa-doctor explain QA-PW-120`
