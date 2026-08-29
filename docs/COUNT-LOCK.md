# Corpus Count Lock (Regression Guard)

**Generated from `tests/corpus/baseline/*.json` — do not edit by hand.**
Regenerate with `npm run fp-audit:generate` after a reviewed
`npm run corpus:regression:update` run.

This is a **count lock**, not a false-positive audit. It records how many
times each rule fires on real-world repos and fails CI if that number
increases. Classification of findings as TP/FP lives in `docs/FP-AUDIT.md`.

Reproduce:

```bash
npm run corpus:regression
```

This clones the real repos below over the network, runs the same
`runScan` the CLI uses, and fails if any rule fires _more_ on real
code than the committed baseline recorded (a false-positive
regression signal).

Last generated: 2026-08-29.

## microsoft-playwright-dotnet

real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)

Source: [`https://github.com/microsoft/playwright-dotnet`](https://github.com/microsoft/playwright-dotnet)

Total findings: **532**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-CI-002  | 1        |
| QA-CS-101  | 139      |
| QA-CS-102  | 52       |
| QA-CS-103  | 2        |
| QA-CS-105  | 16       |
| QA-CS-106  | 31       |
| QA-CS-107  | 1        |
| QA-CS-108  | 26       |
| QA-CS-110  | 135      |
| QA-CS-111  | 74       |
| QA-ENV-001 | 55       |

## microsoft-playwright-java

real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)

Source: [`https://github.com/microsoft/playwright-java`](https://github.com/microsoft/playwright-java)

Total findings: **529**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 27       |
| QA-JV-101   | 8        |
| QA-JV-102   | 1        |
| QA-JV-103   | 97       |
| QA-JV-104   | 2        |
| QA-JV-105   | 40       |
| QA-JV-106   | 27       |
| QA-JV-108   | 31       |
| QA-JV-110   | 110      |
| QA-JV-111   | 70       |
| QA-PW-003   | 2        |
| QA-PW-004   | 8        |
| QA-PW-101   | 40       |
| QA-PW-103   | 10       |
| QA-PW-112   | 16       |
| QA-TEST-004 | 40       |

## microsoft-playwright-mcp

real Playwright + GitHub Actions — TS/PW/CI adapter FP surface

Source: [`https://github.com/microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp)

Total findings: **3**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PW-103 | 2        |
| QA-PW-120 | 1        |

## microsoft-playwright-pytest

tiny real pytest-playwright repo — QA-PY-104 and QA-PW-103 on the Python adapter

Source: [`https://github.com/microsoft/playwright-pytest`](https://github.com/microsoft/playwright-pytest)

Total findings: **49**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-ENV-001 | 2        |
| QA-PW-103  | 26       |
| QA-PY-004  | 9        |
| QA-PY-104  | 12       |

## nextauthjs-next-auth

real TS app with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface

Source: [`https://github.com/nextauthjs/next-auth`](https://github.com/nextauthjs/next-auth)

Total findings: **63**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-005    | 2        |
| QA-ENV-001   | 29       |
| QA-PW-101    | 4        |
| QA-PW-103    | 4        |
| QA-PW-119    | 6        |
| QA-PW-123    | 2        |
| QA-PW-145    | 3        |
| QA-TEST-002  | 1        |
| QA-TEST-003  | 3        |
| QA-TEST-004  | 4        |
| QA-TQUAL-001 | 1        |
| QA-TQUAL-002 | 2        |

## pallets-click

real pytest suite — Python adapter FP surface

Source: [`https://github.com/pallets/click`](https://github.com/pallets/click)

Total findings: **94**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-ENV-001 | 13       |
| QA-PY-002  | 1        |
| QA-PY-003  | 14       |
| QA-PY-004  | 45       |
| QA-PY-007  | 20       |
| QA-PY-010  | 1        |

## playwright-community-eslint-plugin-playwright

small real Playwright-rules repo — compact QA-PW / QA-TQUAL surface, fast clone

Source: [`https://github.com/playwright-community/eslint-plugin-playwright`](https://github.com/playwright-community/eslint-plugin-playwright)

Total findings: **69**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-PW-102    | 2        |
| QA-PW-103    | 36       |
| QA-PW-107    | 2        |
| QA-PW-112    | 1        |
| QA-PW-118    | 3        |
| QA-PW-120    | 1        |
| QA-TEST-003  | 1        |
| QA-TEST-010  | 1        |
| QA-TQUAL-001 | 20       |
| QA-TQUAL-011 | 2        |

## psf-requests

small real pytest suite — Python adapter FP surface

Source: [`https://github.com/psf/requests`](https://github.com/psf/requests)

Total findings: **116**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-ENV-001 | 4        |
| QA-PY-002  | 2        |
| QA-PY-003  | 14       |
| QA-PY-004  | 35       |
| QA-PY-005  | 3        |
| QA-PY-007  | 56       |
| QA-PY-008  | 2        |

## pytest-dev-pytest

large real pytest suite — Python adapter FP surface (QA-PY-001..012)

Source: [`https://github.com/pytest-dev/pytest`](https://github.com/pytest-dev/pytest)

Total findings: **818**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-CI-005   | 2        |
| QA-ENV-001  | 4        |
| QA-PY-002   | 19       |
| QA-PY-003   | 100      |
| QA-PY-004   | 393      |
| QA-PY-006   | 19       |
| QA-PY-007   | 268      |
| QA-PY-009   | 3        |
| QA-PY-010   | 3        |
| QA-PY-011   | 1        |
| QA-PY-012   | 4        |
| QA-TEST-004 | 2        |

## sveltejs-kit

large real Playwright suite — QA-PW isolation/timing rules at scale

Source: [`https://github.com/sveltejs/kit`](https://github.com/sveltejs/kit)

Total findings: **1265**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 28       |
| QA-PW-002    | 28       |
| QA-PW-005    | 4        |
| QA-PW-101    | 62       |
| QA-PW-102    | 1        |
| QA-PW-103    | 438      |
| QA-PW-105    | 33       |
| QA-PW-108    | 428      |
| QA-PW-114    | 5        |
| QA-PW-117    | 1        |
| QA-PW-118    | 20       |
| QA-PW-119    | 4        |
| QA-PW-145    | 11       |
| QA-TEST-002  | 38       |
| QA-TEST-003  | 61       |
| QA-TEST-004  | 75       |
| QA-TQUAL-001 | 24       |
| QA-TQUAL-011 | 4        |

## tanstack-query

real TS monorepo — QA-PW-112 sample growth; QA-TEST-004 fires >1600× here (classify carefully)

Source: [`https://github.com/TanStack/query`](https://github.com/TanStack/query)

Total findings: **1916**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-PW-112    | 125      |
| QA-PW-145    | 3        |
| QA-TEST-003  | 11       |
| QA-TEST-004  | 1648     |
| QA-TEST-010  | 2        |
| QA-TQUAL-001 | 98       |
| QA-TQUAL-009 | 29       |

## vitejs-vite

large real Playwright/Vitest suite — broad QA-PW + QA-TQUAL surface

Source: [`https://github.com/vitejs/vite`](https://github.com/vitejs/vite)

Total findings: **738**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 32       |
| QA-PW-004    | 1        |
| QA-PW-102    | 24       |
| QA-PW-103    | 39       |
| QA-PW-105    | 477      |
| QA-PW-114    | 62       |
| QA-PW-119    | 3        |
| QA-PW-120    | 7        |
| QA-PW-145    | 38       |
| QA-TEST-002  | 5        |
| QA-TEST-003  | 38       |
| QA-TEST-004  | 7        |
| QA-TQUAL-001 | 3        |
| QA-TQUAL-009 | 2        |

## withastro-astro

large real Playwright suite — QA-PW text-coupling / viewport / empty-body

Source: [`https://github.com/withastro/astro`](https://github.com/withastro/astro)

Total findings: **780**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 151      |
| QA-PW-005   | 3        |
| QA-PW-101   | 4        |
| QA-PW-103   | 6        |
| QA-PW-107   | 7        |
| QA-PW-108   | 328      |
| QA-PW-114   | 2        |
| QA-PW-115   | 3        |
| QA-PW-118   | 6        |
| QA-PW-119   | 45       |
| QA-PW-120   | 4        |
| QA-PW-145   | 48       |
| QA-TEST-002 | 32       |
| QA-TEST-003 | 100      |
| QA-TEST-004 | 38       |
| QA-TEST-010 | 3        |
