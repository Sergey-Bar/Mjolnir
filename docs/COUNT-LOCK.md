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

## apache-airflow

huge real pytest suite — QA-PY-011/012 at scale plus QA-TEST-006

Source: [`https://github.com/apache/airflow`](https://github.com/apache/airflow)

Total findings: **5743**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 4        |
| QA-PW-103    | 2        |
| QA-PW-105    | 3        |
| QA-PW-107    | 7        |
| QA-PW-108    | 3        |
| QA-PW-112    | 50       |
| QA-PW-119    | 8        |
| QA-PW-120    | 2        |
| QA-PW-145    | 9        |
| QA-PY-002    | 13       |
| QA-PY-003    | 45       |
| QA-PY-004    | 615      |
| QA-PY-005    | 49       |
| QA-PY-006    | 11       |
| QA-PY-007    | 1332     |
| QA-PY-008    | 3357     |
| QA-PY-010    | 139      |
| QA-PY-011    | 4        |
| QA-PY-012    | 6        |
| QA-TEST-002  | 1        |
| QA-TEST-003  | 52       |
| QA-TEST-006  | 3        |
| QA-TQUAL-001 | 28       |

## appsmithorg-appsmith

real Java+TS monorepo with JUnit tests and CI workflows — QA-JV-101/102 plus QA-CI-008 and QA-TQUAL-011

Source: [`https://github.com/appsmithorg/appsmith`](https://github.com/appsmithorg/appsmith)

Total findings: **571**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 1        |
| QA-CI-008    | 5        |
| QA-JV-101    | 11       |
| QA-JV-102    | 10       |
| QA-JV-103    | 75       |
| QA-PW-107    | 4        |
| QA-PW-112    | 248      |
| QA-PW-119    | 7        |
| QA-PW-120    | 5        |
| QA-PW-144    | 1        |
| QA-PW-145    | 8        |
| QA-TEST-003  | 36       |
| QA-TEST-004  | 7        |
| QA-TQUAL-001 | 147      |
| QA-TQUAL-011 | 6        |

## calcom-cal

large real next.js app with Playwright e2e — QA-PW-141..145 and a broad consumer surface

Source: [`https://github.com/calcom/cal.com`](https://github.com/calcom/cal.com)

Total findings: **634**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-002    | 1        |
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

## cypress-realworld-app

real TS consumer app with heavy e2e — QA-TQUAL-009 at scale on application code

Source: [`https://github.com/cypress-io/cypress-realworld-app`](https://github.com/cypress-io/cypress-realworld-app)

Total findings: **16**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-TEST-002  | 3        |
| QA-TEST-003  | 3        |
| QA-TQUAL-009 | 10       |

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

## getsentry-sentry

huge real Python monorepo — QA-PY-009/012 at scale plus QA-TQUAL-002

Source: [`https://github.com/getsentry/sentry`](https://github.com/getsentry/sentry)

Total findings: **5033**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 1        |
| QA-ENV-001   | 1        |
| QA-PW-107    | 2        |
| QA-PW-112    | 116      |
| QA-PW-119    | 6        |
| QA-PW-120    | 42       |
| QA-PW-145    | 7        |
| QA-PY-002    | 153      |
| QA-PY-003    | 1        |
| QA-PY-004    | 889      |
| QA-PY-005    | 39       |
| QA-PY-007    | 1350     |
| QA-PY-008    | 265      |
| QA-PY-009    | 4        |
| QA-PY-010    | 592      |
| QA-PY-012    | 1        |
| QA-TEST-002  | 9        |
| QA-TEST-003  | 199      |
| QA-TEST-004  | 11       |
| QA-TEST-010  | 1        |
| QA-TQUAL-001 | 1341     |
| QA-TQUAL-002 | 2        |
| QA-TQUAL-011 | 1        |

## github-docs

workflow-dense docs repo (small code footprint) — QA-CI-001 and QA-CI-007 surface on real Actions files

Source: [`https://github.com/github/docs`](https://github.com/github/docs)

Total findings: **137**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-007    | 1        |
| QA-PW-101    | 10       |
| QA-PW-103    | 90       |
| QA-PW-105    | 7        |
| QA-PW-108    | 3        |
| QA-PW-143    | 1        |
| QA-PW-145    | 3        |
| QA-TEST-002  | 11       |
| QA-TEST-004  | 4        |
| QA-TQUAL-001 | 5        |

## grafana-grafana

large real TS monorepo with Playwright e2e + many Actions workflows — QA-PW-141..145, QA-CI-001..010, broad QA-PW/QA-TEST/QA-TQUAL consumer surface

Source: [`https://github.com/grafana/grafana`](https://github.com/grafana/grafana)

Total findings: **3146**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-002    | 2        |
| QA-CI-005    | 1        |
| QA-CI-008    | 3        |
| QA-CI-010    | 2        |
| QA-ENV-001   | 7        |
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

## hashicorp-vault

real monorepo with UI tests and mature CI — QA-PW-004, QA-CI-001/008 and QA-PW-141 surface

Source: [`https://github.com/hashicorp/vault`](https://github.com/hashicorp/vault)

Total findings: **85**

| Rule ID    | Findings |
| ---------- | -------- |
| QA-CI-001  | 1        |
| QA-CI-008  | 3        |
| QA-ENV-001 | 1        |
| QA-PW-004  | 2        |
| QA-PW-103  | 32       |
| QA-PW-107  | 12       |
| QA-PW-108  | 3        |
| QA-PW-141  | 1        |
| QA-PW-143  | 1        |
| QA-PW-145  | 29       |

## Humanizr-Humanizer

real C# library repo with xUnit tests and a retry-wrapped CI step — QA-CS-103 and QA-CI-007 surface

Source: [`https://github.com/Humanizr/Humanizer`](https://github.com/Humanizr/Humanizer)

Total findings: **49**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-CI-007   | 1        |
| QA-CS-103   | 2        |
| QA-PW-005   | 1        |
| QA-PW-103   | 26       |
| QA-PW-105   | 9        |
| QA-PW-107   | 2        |
| QA-PW-108   | 3        |
| QA-PW-143   | 1        |
| QA-PW-145   | 3        |
| QA-TEST-003 | 1        |

## iluwatar-java-design-patterns

real Java application repo with extensive JUnit tests — QA-JV-102/101 on consumer code, plus QA-CI-005 (D5)

Source: [`https://github.com/iluwatar/java-design-patterns`](https://github.com/iluwatar/java-design-patterns)

Total findings: **67**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CI-005 | 4        |
| QA-JV-101 | 2        |
| QA-JV-102 | 18       |
| QA-JV-103 | 41       |
| QA-JV-110 | 2        |

## keycloak-keycloak

large real Java monorepo whose UI suite is Playwright TypeScript — QA-PW-117 at scale plus QA-JV-101/102 and QA-CI-007

Source: [`https://github.com/keycloak/keycloak`](https://github.com/keycloak/keycloak)

Total findings: **2243**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-CI-007   | 1        |
| QA-JV-101   | 67       |
| QA-JV-102   | 30       |
| QA-JV-103   | 1387     |
| QA-JV-110   | 84       |
| QA-PW-103   | 1        |
| QA-PW-105   | 1        |
| QA-PW-107   | 3        |
| QA-PW-108   | 20       |
| QA-PW-112   | 193      |
| QA-PW-117   | 98       |
| QA-PW-143   | 2        |
| QA-PW-145   | 25       |
| QA-TEST-002 | 22       |
| QA-TEST-003 | 309      |

## microsoft-playwright-dotnet

real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)

Source: [`https://github.com/microsoft/playwright-dotnet`](https://github.com/microsoft/playwright-dotnet)

Total findings: **419**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CS-101 | 139      |
| QA-CS-102 | 21       |
| QA-CS-103 | 1        |
| QA-CS-105 | 16       |
| QA-CS-106 | 4        |
| QA-CS-107 | 1        |
| QA-CS-108 | 26       |
| QA-CS-110 | 135      |
| QA-CS-111 | 74       |
| QA-PW-122 | 1        |
| QA-PW-143 | 1        |

## microsoft-playwright-java

real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)

Source: [`https://github.com/microsoft/playwright-java`](https://github.com/microsoft/playwright-java)

Total findings: **309**

| Rule ID   | Findings |
| --------- | -------- |
| QA-JV-101 | 8        |
| QA-JV-102 | 1        |
| QA-JV-103 | 43       |
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

Total findings: **0**

_No findings recorded for this repo._

## negative-fixtures

committed §08 class-C negative corpus — realistic legitimate code per rule that must NOT fire; any fire classifies FP

Source: [`local:tests/corpus/negative-fixtures`](local:tests/corpus/negative-fixtures)

Total findings: **200**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CS-108    | 2        |
| QA-CS-110    | 4        |
| QA-JV-108    | 2        |
| QA-JV-110    | 2        |
| QA-PW-103    | 16       |
| QA-PW-107    | 1        |
| QA-PW-115    | 1        |
| QA-PW-122    | 60       |
| QA-PW-141    | 24       |
| QA-PW-143    | 60       |
| QA-PW-145    | 7        |
| QA-PY-004    | 1        |
| QA-PY-005    | 1        |
| QA-PY-012    | 1        |
| QA-TEST-003  | 14       |
| QA-TEST-010  | 3        |
| QA-TQUAL-002 | 1        |

## nextauthjs-next-auth

real TS app with Playwright e2e + substantial GitHub Actions — first non-trivial QA-CI-001 surface

Source: [`https://github.com/nextauthjs/next-auth`](https://github.com/nextauthjs/next-auth)

Total findings: **39**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 2        |
| QA-CI-005    | 2        |
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

## nocodb-nocodb

real TS app with e2e and CI — QA-CI-010 and QA-PW-115 surface

Source: [`https://github.com/nocodb/nocodb`](https://github.com/nocodb/nocodb)

Total findings: **6**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-010    | 1        |
| QA-PW-115    | 2        |
| QA-PW-120    | 1        |
| QA-PW-145    | 1        |
| QA-TQUAL-011 | 1        |

## pallets-click

real pytest suite — Python adapter FP surface

Source: [`https://github.com/pallets/click`](https://github.com/pallets/click)

Total findings: **23**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PY-002 | 1        |
| QA-PY-003 | 3        |
| QA-PY-004 | 4        |
| QA-PY-007 | 14       |
| QA-PY-010 | 1        |

## playwright-community-eslint-plugin-playwright

small real Playwright-rules repo — compact QA-PW / QA-TQUAL surface, fast clone

Source: [`https://github.com/playwright-community/eslint-plugin-playwright`](https://github.com/playwright-community/eslint-plugin-playwright)

Total findings: **31**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-PW-102    | 1        |
| QA-PW-107    | 2        |
| QA-PW-112    | 1        |
| QA-PW-118    | 3        |
| QA-PW-120    | 1        |
| QA-TEST-003  | 1        |
| QA-TQUAL-001 | 20       |
| QA-TQUAL-011 | 2        |

## positive-fixtures

committed §08 class-B positive corpus — realistic anti-pattern variants per rule that MUST fire; every fire classifies TP

Source: [`local:tests/corpus/positive-fixtures`](local:tests/corpus/positive-fixtures)

Total findings: **623**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 10       |
| QA-CI-002    | 11       |
| QA-CI-005    | 2        |
| QA-CI-007    | 7        |
| QA-CI-009    | 5        |
| QA-CI-010    | 5        |
| QA-CS-102    | 3        |
| QA-CS-103    | 8        |
| QA-CS-104    | 3        |
| QA-CS-107    | 4        |
| QA-CS-108    | 3        |
| QA-CS-109    | 4        |
| QA-CS-110    | 6        |
| QA-JV-101    | 3        |
| QA-JV-102    | 3        |
| QA-JV-103    | 4        |
| QA-JV-104    | 8        |
| QA-JV-107    | 4        |
| QA-JV-108    | 3        |
| QA-JV-109    | 10       |
| QA-JV-110    | 4        |
| QA-PW-003    | 9        |
| QA-PW-004    | 8        |
| QA-PW-103    | 49       |
| QA-PW-104    | 10       |
| QA-PW-107    | 1        |
| QA-PW-113    | 11       |
| QA-PW-115    | 6        |
| QA-PW-117    | 4        |
| QA-PW-121    | 12       |
| QA-PW-122    | 60       |
| QA-PW-123    | 6        |
| QA-PW-140    | 10       |
| QA-PW-141    | 24       |
| QA-PW-142    | 8        |
| QA-PW-143    | 60       |
| QA-PW-144    | 12       |
| QA-PW-145    | 20       |
| QA-PY-001    | 12       |
| QA-PY-003    | 13       |
| QA-PY-004    | 9        |
| QA-PY-005    | 4        |
| QA-PY-009    | 10       |
| QA-PY-011    | 5        |
| QA-PY-012    | 15       |
| QA-PY-101    | 4        |
| QA-PY-103    | 5        |
| QA-PY-105    | 12       |
| QA-PY-106    | 4        |
| QA-PY-107    | 3        |
| QA-PY-108    | 4        |
| QA-TEST-001  | 8        |
| QA-TEST-002  | 1        |
| QA-TEST-003  | 58       |
| QA-TEST-006  | 5        |
| QA-TEST-010  | 11       |
| QA-TQUAL-002 | 12       |
| QA-TQUAL-009 | 2        |
| QA-TQUAL-011 | 6        |

## psf-requests

small real pytest suite — Python adapter FP surface

Source: [`https://github.com/psf/requests`](https://github.com/psf/requests)

Total findings: **63**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PY-002 | 2        |
| QA-PY-003 | 3        |
| QA-PY-004 | 11       |
| QA-PY-005 | 3        |
| QA-PY-007 | 42       |
| QA-PY-008 | 2        |

## puppeteer-puppeteer

real TS monorepo with mocha tests and multi-job Actions — QA-CI surface plus QA-PW/QA-TEST growth

Source: [`https://github.com/puppeteer/puppeteer`](https://github.com/puppeteer/puppeteer)

Total findings: **529**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 29       |
| QA-PW-005   | 10       |
| QA-PW-103   | 97       |
| QA-PW-114   | 210      |
| QA-PW-119   | 1        |
| QA-PW-120   | 29       |
| QA-PW-123   | 2        |
| QA-PW-145   | 58       |
| QA-TEST-003 | 90       |
| QA-TEST-004 | 3        |

## pytest-dev-pytest

large real pytest suite — Python adapter FP surface (QA-PY-001..012)

Source: [`https://github.com/pytest-dev/pytest`](https://github.com/pytest-dev/pytest)

Total findings: **361**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CI-005 | 2        |
| QA-PY-002 | 19       |
| QA-PY-003 | 30       |
| QA-PY-004 | 115      |
| QA-PY-006 | 19       |
| QA-PY-007 | 164      |
| QA-PY-009 | 3        |
| QA-PY-010 | 3        |
| QA-PY-011 | 1        |
| QA-PY-012 | 5        |

## reflex-dev-reflex

mid-size real Python framework with pytest-playwright e2e — QA-PY-101..108 consumer surface

Source: [`https://github.com/reflex-dev/reflex`](https://github.com/reflex-dev/reflex)

Total findings: **517**

| Rule ID   | Findings |
| --------- | -------- |
| QA-CI-002 | 1        |
| QA-CI-010 | 1        |
| QA-PY-002 | 3        |
| QA-PY-003 | 52       |
| QA-PY-004 | 157      |
| QA-PY-005 | 16       |
| QA-PY-006 | 2        |
| QA-PY-007 | 232      |
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

## spectreconsole-spectre-console

real C# application repo with a large NUnit suite — QA-CS-103 at consumer scale (D5)

Source: [`https://github.com/spectreconsole/spectre.console`](https://github.com/spectreconsole/spectre.console)

Total findings: **0**

_No findings recorded for this repo._

## streamlit-streamlit

real Python app with pytest-playwright e2e and many GitHub Actions — QA-PY-103/105 plus QA-CI-005 and QA-PY-012

Source: [`https://github.com/streamlit/streamlit`](https://github.com/streamlit/streamlit)

Total findings: **3535**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 1        |
| QA-CI-005    | 8        |
| QA-CI-007    | 1        |
| QA-CI-008    | 1        |
| QA-CI-010    | 1        |
| QA-PW-107    | 37       |
| QA-PW-112    | 1591     |
| QA-PW-119    | 7        |
| QA-PW-120    | 24       |
| QA-PW-145    | 4        |
| QA-PY-002    | 5        |
| QA-PY-003    | 29       |
| QA-PY-004    | 372      |
| QA-PY-005    | 29       |
| QA-PY-006    | 2        |
| QA-PY-007    | 488      |
| QA-PY-008    | 196      |
| QA-PY-010    | 33       |
| QA-PY-012    | 2        |
| QA-PY-103    | 114      |
| QA-TEST-003  | 8        |
| QA-TEST-004  | 13       |
| QA-TQUAL-001 | 568      |
| QA-TQUAL-002 | 1        |

## sveltejs-kit

large real Playwright suite — QA-PW isolation/timing rules at scale

Source: [`https://github.com/sveltejs/kit`](https://github.com/sveltejs/kit)

Total findings: **1219**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 8        |
| QA-PW-002    | 17       |
| QA-PW-005    | 4        |
| QA-PW-101    | 62       |
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

## vercel-next-js

large real TS monorepo with its own e2e suite — QA-TEST-010, QA-TQUAL-002 at scale, plus QA-PW-141/144 and QA-CI-008

Source: [`https://github.com/vercel/next.js`](https://github.com/vercel/next.js)

Total findings: **2075**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-008    | 3        |
| QA-ENV-001   | 6        |
| QA-PW-101    | 4        |
| QA-PW-103    | 4        |
| QA-PW-115    | 2        |
| QA-PW-119    | 8        |
| QA-PW-120    | 19       |
| QA-PW-122    | 2        |
| QA-PW-141    | 1        |
| QA-PW-142    | 3        |
| QA-PW-143    | 2        |
| QA-PW-144    | 1        |
| QA-PW-145    | 20       |
| QA-TEST-002  | 230      |
| QA-TEST-003  | 1390     |
| QA-TEST-004  | 140      |
| QA-TEST-006  | 1        |
| QA-TEST-010  | 201      |
| QA-TQUAL-001 | 32       |
| QA-TQUAL-002 | 5        |
| QA-TQUAL-011 | 1        |

## vitejs-vite

large real Playwright/Vitest suite — broad QA-PW + QA-TQUAL surface

Source: [`https://github.com/vitejs/vite`](https://github.com/vitejs/vite)

Total findings: **717**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-ENV-001   | 6        |
| QA-PW-004    | 1        |
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

## vitest-dev-vitest

real TS monorepo with a large vitest suite of its own — QA-TEST-001/010, QA-TQUAL-002 at scale, plus CI and QA-PW config surfaces

Source: [`https://github.com/vitest-dev/vitest`](https://github.com/vitest-dev/vitest)

Total findings: **891**

| Rule ID      | Findings |
| ------------ | -------- |
| QA-CI-001    | 1        |
| QA-CI-008    | 1        |
| QA-ENV-001   | 2        |
| QA-PW-003    | 1        |
| QA-PW-101    | 2        |
| QA-PW-103    | 1        |
| QA-PW-105    | 69       |
| QA-PW-108    | 19       |
| QA-PW-115    | 1        |
| QA-PW-119    | 24       |
| QA-PW-120    | 14       |
| QA-PW-122    | 1        |
| QA-PW-123    | 1        |
| QA-PW-141    | 1        |
| QA-PW-143    | 1        |
| QA-PW-144    | 1        |
| QA-PW-145    | 18       |
| QA-TEST-001  | 12       |
| QA-TEST-002  | 23       |
| QA-TEST-003  | 382      |
| QA-TEST-004  | 77       |
| QA-TEST-010  | 82       |
| QA-TQUAL-001 | 18       |
| QA-TQUAL-002 | 135      |
| QA-TQUAL-011 | 4        |

## withastro-astro

large real Playwright suite — QA-PW text-coupling / viewport / empty-body

Source: [`https://github.com/withastro/astro`](https://github.com/withastro/astro)

Total findings: **657**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 39       |
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
| QA-TEST-004 | 32       |
| QA-TEST-010 | 1        |
