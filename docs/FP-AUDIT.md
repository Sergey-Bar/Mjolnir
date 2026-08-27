# False-Positive Corpus Audit

**Generated from `tests/corpus/baseline/*.json` — do not edit by hand.**
Regenerate with `node scripts/generate-fp-audit-table.mjs` after a reviewed
`npm run corpus:audit:update` run.

Don't trust these numbers — reproduce them yourself:

```bash
npm run corpus:audit
```

This clones the real repos below over the network, runs the same
`runScan` the CLI uses, and fails if any rule fires _more_ on real
code than the committed baseline recorded (a false-positive
regression signal). Fixtures prove a rule fires on one hand-written
example; this proves it behaves on code nobody wrote for Mjölnir.

Last generated: 2026-08-27.

## microsoft-playwright-dotnet

real Playwright .NET test suite — C# adapter FP surface (same library-suite caveat)

Source: [`https://github.com/microsoft/playwright-dotnet`](https://github.com/microsoft/playwright-dotnet)

Total findings: **550**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-CI-002   | 1        |
| QA-CS-101   | 139      |
| QA-CS-102   | 52       |
| QA-CS-103   | 2        |
| QA-CS-105   | 16       |
| QA-CS-106   | 31       |
| QA-CS-107   | 1        |
| QA-CS-108   | 26       |
| QA-CS-110   | 135      |
| QA-CS-111   | 74       |
| QA-ENV-001  | 55       |
| QA-PW-145   | 5        |
| QA-TEST-004 | 13       |

## microsoft-playwright-java

real Playwright Java test suite — Java adapter FP surface (library-suite caveat: tests the bindings themselves, not a consumer app)

Source: [`https://github.com/microsoft/playwright-java`](https://github.com/microsoft/playwright-java)

Total findings: **537**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-ENV-001  | 27       |
| QA-JV-101   | 8        |
| QA-JV-102   | 1        |
| QA-JV-103   | 101      |
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
| QA-TEST-004 | 44       |

## microsoft-playwright-mcp

real Playwright + GitHub Actions — TS/PW/CI adapter FP surface

Source: [`https://github.com/microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp)

Total findings: **5**

| Rule ID   | Findings |
| --------- | -------- |
| QA-PW-103 | 2        |
| QA-PW-120 | 1        |
| QA-PW-145 | 2        |

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

Total findings: **2069**

| Rule ID     | Findings |
| ----------- | -------- |
| QA-CI-005   | 2        |
| QA-ENV-001  | 4        |
| QA-PY-002   | 103      |
| QA-PY-003   | 781      |
| QA-PY-004   | 539      |
| QA-PY-005   | 6        |
| QA-PY-006   | 315      |
| QA-PY-007   | 279      |
| QA-PY-009   | 3        |
| QA-PY-010   | 3        |
| QA-PY-011   | 1        |
| QA-PY-012   | 19       |
| QA-TEST-004 | 14       |
