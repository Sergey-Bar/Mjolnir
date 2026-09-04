# QA-PW-141 — Retries configured without a flake-triage loop

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                          |
| ------------------------------------- | ------------------------------ |
| Severity                              | warning                        |
| Confidence                            | high                           |
| Tier                                  | extended                       |
| Measured FP rate                      | 15% (n=20)                     |
| Evidence level                        | E1                             |
| QA impact                             | False-green risk (FALSE-GREEN) |
| False-positive risk (author estimate) | low                            |
| Autofix available                     | no                             |
| Languages                             | typescript, javascript         |
| Frameworks                            | playwright                     |
| Detection strategy                    | LEXICAL (regex heuristic)      |
| Introduced in                         | v0.3.8                         |

## Why this fails in production

Retries convert intermittent failures into silent passes. Without a forensics/triage step consuming retry data, flaky tests pass forever and real regressions hide behind lucky reruns.

## What gets flagged (real detector output)

```
retries: undefined with no visible flake-triage loop.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-141/must-fire/playwright.config.ts`

## The fix

Keep retries <= 2 and feed retry outcomes into `mjolnir forensics`/`triage`, or add a reporter so flaky passes are reviewed.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-141/must-not-fire/playwright.config.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                 | Occurrences |
| -------------------- | ----------- |
| calcom-cal           | 2           |
| dubinc-dub           | 1           |
| grafana-grafana      | 1           |
| hashicorp-vault      | 1           |
| negative-fixtures    | 24          |
| nextauthjs-next-auth | 1           |
| positive-fixtures    | 24          |
| vercel-next-js       | 1           |
| vitest-dev-vitest    | 1           |
| withastro-astro      | 2           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-141`
