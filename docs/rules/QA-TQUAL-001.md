# QA-TQUAL-001 — Mock-only verification

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                       |
| ------------------------------------- | --------------------------- |
| Severity                              | warning                     |
| Confidence                            | medium                      |
| Tier                                  | quarantine                  |
| Measured FP rate                      | 100% (n=20)                 |
| Evidence level                        | E1                          |
| QA impact                             | Test hygiene debt (HYGIENE) |
| False-positive risk (author estimate) | medium                      |
| Autofix available                     | no                          |
| Languages                             | typescript, javascript      |
| Frameworks                            | jest, vitest, playwright    |
| Detection strategy                    | regex heuristic             |
| Introduced in                         | v0.1.0                      |

## Why this fails in production

Asserting that a mock was called proves wiring, not behavior. The real logic behind the mock can be broken and this test stays green.

## What gets flagged (real detector output)

```
All assertions in this test verify mock calls only.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-TQUAL-001/must-fire/mock-only.spec.ts`

## The fix

Add at least one assertion on actual output or state, not just on how collaborators were invoked.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-TQUAL-001/must-not-fire/clean.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                                          | Occurrences |
| --------------------------------------------- | ----------- |
| nextauthjs-next-auth                          | 1           |
| playwright-community-eslint-plugin-playwright | 20          |
| sveltejs-kit                                  | 24          |
| tanstack-query                                | 98          |
| vitejs-vite                                   | 3           |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-TQUAL-001`
