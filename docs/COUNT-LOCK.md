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

## calcom-cal

large real next.js app with Playwright e2e — QA-PW-141..145 and a broad consumer surface

Source: [`https://github.com/calcom/cal.com`](https://github.com/calcom/cal.com)

Total findings: **649**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-002    | 1        |
| QA-ENV-001   | 15       |
| QA-PW-103    | 1        |
| QA-PW-119    | 3        |
| QA-PW-120    | 53       |
| QA-PW-141    | 2        |
| QA-PW-143    | 2        |
| QA-PW-144    | 1        |
| QA-PW-145    | 5        |
| QA-TEST-002  | 18       |
| QA-TEST-003  | 119      |
| QA-TQUAL-001 | 426      |
| QA-TQUAL-002 | 1        |
| QA-TQUAL-011 | 2        |

## dubinc-dub

mid-size real next.js app with a plain Playwright e2e config — QA-PW-141..144 consumer surface

Source: [`https://github.com/dubinc/dub`](https://github.com/dubinc/dub)

Total findings: **88**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 5        |
| QA-PW-002    | 12       |
| QA-PW-004    | 2        |
| QA-PW-103    | 17       |
| QA-PW-105    | 1        |
| QA-PW-107    | 2        |
| QA-PW-118    | 2        |
| QA-PW-141    | 1        |
| QA-PW-144    | 1        |
| QA-PW-145    | 5        |
| QA-TEST-002  | 2        |
| QA-TEST-003  | 17       |
| QA-TEST-004  | 7        |
| QA-TQUAL-001 | 14       |

## grafana-grafana

large real TS monorepo with Playwright e2e + many Actions workflows — QA-PW-141..145, QA-CI-001..010, broad QA-PW/QA-TEST/QA-TQUAL consumer surface

Source: [`https://github.com/grafana/grafana`](https://github.com/grafana/grafana)

Total findings: **3235**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-002    | 2        |
| QA-CI-005    | 1        |
| QA-CI-008    | 3        |
| QA-CI-010    | 2        |
| QA-ENV-001   | 96       |
| QA-PW-002    | 6        |
| QA-PW-004    | 5        |
| QA-PW-101    | 17       |
| QA-PW-103    | 82       |
| QA-PW-105    | 25       |
| QA-PW-107    | 141      |
| QA-PW-108    | 78       |
| QA-PW-112    | 230      |
| QA-PW-115    | 1        |
| QA-PW-118    | 28       |
| QA-PW-119    | 105      |
| QA-PW-120    | 12       |
| QA-PW-141    | 1        |
| QA-PW-144    | 1        |
| QA-PW-145    | 107      |
| QA-TEST-002  | 45       |
| QA-TEST-003  | 418      |
| QA-TEST-004  | 164      |
| QA-TEST-006  | 2        |
| QA-TEST-010  | 2        |
| QA-TQUAL-001 | 1653     |
| QA-TQUAL-002 | 3        |
| QA-TQUAL-009 | 1        |
| QA-TQUAL-011 | 2        |

## microsoft-playwright-dotnet

real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)

Source: [`https://github.com/microsoft/playwright-dotnet`](https://github.com/microsoft/playwright-dotnet)

Total findings: **456**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-CS-101  | 139      |
| QA-CS-102  | 52       |
| QA-CS-103  | 2        |
| QA-CS-105  | 16       |
| QA-CS-106  | 4        |
| QA-CS-107  | 1        |
| QA-CS-108  | 26       |
| QA-CS-110  | 135      |
| QA-CS-111  | 74       |
| QA-ENV-001 | 5        |
| QA-PW-122  | 1        |
| QA-PW-143  | 1        |

## microsoft-playwright-java

real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)

Source: [`https://github.com/microsoft/playwright-java`](https://github.com/microsoft/playwright-java)

Total findings: **363**

| Rule ID   | Findings |
| --------- | -------- |
| QA-JV-101 | 8        |
| QA-JV-102 | 1        |
| QA-JV-103 | 97       |
| QA-JV-104 | 2        |
| QA-JV-105 | 40       |
| QA-JV-106 | 4        |
| QA-JV-108 | 31       |
| QA-JV-110 | 110      |
| QA-JV-111 | 70       |

## microsoft-playwright-mcp

real Playwright + GitHub Actions — TS/PW/CI adapter FP surface

Source: [`https://github.com/microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp)

Total findings: **4**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PW-120 | 1        |
| QA-PW-122 | 1        |
| QA-PW-143 | 1        |
| QA-PW-144 | 1        |

## microsoft-playwright-pytest

tiny real pytest-playwright repo — QA-PY-104 and QA-PW-103 on the Python adapter

Source: [`https://github.com/microsoft/playwright-pytest`](https://github.com/microsoft/playwright-pytest)

Total findings: **9**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PY-004 | 9        |

## nextauthjs-next-auth

real TS app with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface

Source: [`https://github.com/nextauthjs/next-auth`](https://github.com/nextauthjs/next-auth)

Total findings: **68**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-005    | 2        |
| QA-ENV-001   | 29       |
| QA-PW-101    | 4        |
| QA-PW-103    | 4        |
| QA-PW-119    | 9        |
| QA-PW-122    | 2        |
| QA-PW-123    | 2        |
| QA-PW-141    | 1        |
| QA-PW-143    | 2        |
| QA-PW-144    | 1        |
| QA-PW-145    | 3        |
| QA-TEST-002  | 1        |
| QA-TEST-003  | 3        |
| QA-TQUAL-001 | 1        |
| QA-TQUAL-002 | 2        |

## pallets-click

real pytest suite — Python adapter FP surface

Source: [`https://github.com/pallets/click`](https://github.com/pallets/click)

Total findings: **81**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PY-002 | 1        |
| QA-PY-003 | 14       |
| QA-PY-004 | 45       |
| QA-PY-007 | 20       |
| QA-PY-010 | 1        |

## playwright-community-eslint-plugin-playwright

small real Playwright-rules repo — compact QA-PW / QA-TQUAL surface, fast clone

Source: [`https://github.com/playwright-community/eslint-plugin-playwright`](https://github.com/playwright-community/eslint-plugin-playwright)

Total findings: **32**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-PW-102    | 2        |
| QA-PW-107    | 2        |
| QA-PW-112    | 1        |
| QA-PW-118    | 3        |
| QA-PW-120    | 1        |
| QA-TEST-003  | 1        |
| QA-TQUAL-001 | 20       |
| QA-TQUAL-011 | 2        |

## psf-requests

small real pytest suite — Python adapter FP surface

Source: [`https://github.com/psf/requests`](https://github.com/psf/requests)

Total findings: **112**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PY-002 | 2        |
| QA-PY-003 | 14       |
| QA-PY-004 | 35       |
| QA-PY-005 | 3        |
| QA-PY-007 | 56       |
| QA-PY-008 | 2        |

## puppeteer-puppeteer

real TS monorepo with mocha tests and multi-job Actions — QA-CI surface plus QA-PW/QA-TEST growth

Source: [`https://github.com/puppeteer/puppeteer`](https://github.com/puppeteer/puppeteer)

Total findings: **593**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 94       |
| QA-PW-005   | 10       |
| QA-PW-103   | 97       |
| QA-PW-114   | 210      |
| QA-PW-119   | 1        |
| QA-PW-120   | 29       |
| QA-PW-123   | 2        |
| QA-PW-145   | 58       |
| QA-TEST-003 | 89       |
| QA-TEST-004 | 3        |

## pytest-dev-pytest

large real pytest suite — Python adapter FP surface (QA-PY-001..012)

Source: [`https://github.com/pytest-dev/pytest`](https://github.com/pytest-dev/pytest)

Total findings: **812**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CI-005 | 2        |
| QA-PY-002 | 19       |
| QA-PY-003 | 100      |
| QA-PY-004 | 393      |
| QA-PY-006 | 19       |
| QA-PY-007 | 267      |
| QA-PY-009 | 3        |
| QA-PY-010 | 3        |
| QA-PY-011 | 1        |
| QA-PY-012 | 5        |

## reflex-dev-reflex

mid-size real Python framework with pytest-playwright e2e — QA-PY-101..108 consumer surface

Source: [`https://github.com/reflex-dev/reflex`](https://github.com/reflex-dev/reflex)

Total findings: **1326**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CI-002 | 1        |
| QA-CI-010 | 1        |
| QA-PY-002 | 3        |
| QA-PY-003 | 101      |
| QA-PY-004 | 884      |
| QA-PY-005 | 16       |
| QA-PY-006 | 2        |
| QA-PY-007 | 265      |
| QA-PY-008 | 43       |
| QA-PY-009 | 1        |
| QA-PY-010 | 6        |
| QA-PY-012 | 1        |
| QA-PY-103 | 2        |

## shadcn-ui-taxonomy

tiny real next.js app with a minimal Playwright config — the sharpest QA-PW-143/144 surface

Source: [`https://github.com/shadcn-ui/taxonomy`](https://github.com/shadcn-ui/taxonomy)

Total findings: **0**

_No findings recorded for this repo._

## sveltejs-kit

large real Playwright suite — QA-PW isolation/timing rules at scale

Source: [`https://github.com/sveltejs/kit`](https://github.com/sveltejs/kit)

Total findings: **1240**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 28       |
| QA-PW-002    | 17       |
| QA-PW-005    | 4        |
| QA-PW-101    | 62       |
| QA-PW-102    | 1        |
| QA-PW-103    | 438      |
| QA-PW-105    | 33       |
| QA-PW-108    | 428      |
| QA-PW-114    | 5        |
| QA-PW-117    | 1        |
| QA-PW-118    | 20       |
| QA-PW-119    | 8        |
| QA-PW-122    | 25       |
| QA-PW-143    | 25       |
| QA-PW-145    | 11       |
| QA-TEST-002  | 38       |
| QA-TEST-003  | 62       |
| QA-TEST-004  | 10       |
| QA-TQUAL-001 | 24       |

## tanstack-query

real TS monorepo — QA-PW-112 sample growth; QA-TEST-004 fires >1600× here (classify carefully)

Source: [`https://github.com/TanStack/query`](https://github.com/TanStack/query)

Total findings: **410**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-PW-112    | 125      |
| QA-PW-119    | 5        |
| QA-PW-145    | 3        |
| QA-TEST-003  | 19       |
| QA-TEST-004  | 157      |
| QA-TEST-010  | 2        |
| QA-TQUAL-001 | 98       |
| QA-TQUAL-009 | 1        |

## vitejs-vite

large real Playwright/Vitest suite — broad QA-PW + QA-TQUAL surface

Source: [`https://github.com/vitejs/vite`](https://github.com/vitejs/vite)

Total findings: **767**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 32       |
| QA-PW-004    | 1        |
| QA-PW-102    | 24       |
| QA-PW-103    | 39       |
| QA-PW-105    | 504      |
| QA-PW-114    | 62       |
| QA-PW-119    | 6        |
| QA-PW-120    | 7        |
| QA-PW-145    | 38       |
| QA-TEST-002  | 5        |
| QA-TEST-003  | 39       |
| QA-TEST-004  | 7        |
| QA-TQUAL-001 | 3        |

## withastro-astro

large real Playwright suite — QA-PW text-coupling / viewport / empty-body

Source: [`https://github.com/withastro/astro`](https://github.com/withastro/astro)

Total findings: **765**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 148      |
| QA-PW-005   | 3        |
| QA-PW-101   | 4        |
| QA-PW-103   | 6        |
| QA-PW-105   | 1        |
| QA-PW-107   | 7        |
| QA-PW-108   | 350      |
| QA-PW-114   | 2        |
| QA-PW-115   | 3        |
| QA-PW-118   | 6        |
| QA-PW-119   | 11       |
| QA-PW-120   | 3        |
| QA-PW-122   | 2        |
| QA-PW-141   | 2        |
| QA-PW-143   | 2        |
| QA-PW-144   | 2        |
| QA-PW-145   | 48       |
| QA-TEST-002 | 32       |
| QA-TEST-003 | 101      |
| QA-TEST-004 | 31       |
| QA-TEST-010 | 1        |
