# QA-ENV-001 — Environment coupling in test

_Generated from the live rule registry and this rule's own committed fixtures by `mjolnir`'s doc generator — do not edit by hand. Regenerate with `npm run docs:rules`._

| Field                                 | Value                        |
| ------------------------------------- | ---------------------------- |
| Severity                              | warning                      |
| Confidence                            | medium                       |
| Tier                                  | quarantine                   |
| Measured FP rate                      | not yet measured             |
| Evidence level                        | E1                           |
| QA impact                             | Flaky-test risk (FLAKY-RISK) |
| False-positive risk (author estimate) | medium                       |
| Autofix available                     | no                           |
| Languages                             | typescript, javascript       |
| Frameworks                            | jest, vitest, playwright     |
| Detection strategy                    | regex heuristic              |
| Introduced in                         | v0.2.0                       |

## Why this fails in production

The test assumes a specific local port is serving the app — it breaks on parallel runs, containers, or port conflicts.

## What gets flagged (real detector output)

```
Environment coupling (fixed port): `localhost:3000`.
```

Example from this rule's own must-fire fixture: `tests/fixtures/QA-ENV-001/must-fire/coupled.spec.ts`

## The fix

Use the server's resolved base URL from config/test fixtures instead of a hardcoded host:port.

## Confirmed NOT to fire on the corresponding clean pattern

Verified against `tests/fixtures/QA-ENV-001/must-not-fire/code-as-test-data.spec.ts` — a legitimate, similar-looking pattern this rule correctly leaves alone.

## Corpus-measured false-positive risk

Real occurrence counts from `npm run corpus:regression` against actively-maintained OSS repos — reproduce yourself, don't just trust this table (see `docs/FP-AUDIT.md`):

| Repo                        | Occurrences |
| --------------------------- | ----------- |
| microsoft-playwright-dotnet | 10          |
| nextauthjs-next-auth        | 29          |
| sveltejs-kit                | 28          |
| vitejs-vite                 | 32          |
| withastro-astro             | 151         |

---

Full catalog: `mjolnir rules --md` · Live explanation: `mjolnir explain QA-ENV-001`
