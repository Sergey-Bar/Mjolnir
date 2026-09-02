# QA-PW-142 — Blanket route mock

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | extended                     |
| Measured FP rate                      | 18% (n=11)                   |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | playwright                   |
| Detection strategy                    | LEXICAL (regex heuristic)    |
| Introduced in                         | v0.3.8                       |

## Why this fails in production

Catch-all route mocks swallow third-party calls inconsistently across tests: some get mocks, some hit the network. The result depends on test order and which routes were registered first.

## What gets flagged (real detector output)

```
`page.route('**/*')` — blanket interception of all requests.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-PW-142/must-fire/orders.spec.ts`

## The fix

Intercept specific endpoints (`page.route('**/api/orders')`) and pass unmatched requests through with `route.fallback()` or `route.continue()`.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-PW-142/must-not-fire/orders.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo              | Occurrences |
| ----------------- | ----------- |
| positive-fixtures | 8           |
| vercel-next-js    | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-PW-142`
