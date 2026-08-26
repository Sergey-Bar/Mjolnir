# QA Doctor — Rule Reference

_Generated from the live rule registry — do not edit by hand. Regenerate with `npm run docs:rules`._

One page per rule, each showing a real detected example, the fix, confirmation of what it correctly leaves alone, and (when measured) real corpus occurrence counts.

| ID                                | Title                                            | Severity |
| --------------------------------- | ------------------------------------------------ | -------- |
| [QA-CI-001](./QA-CI-001.md)       | continue-on-error masks a failing required test  | error    |
| [QA-CI-002](./QA-CI-002.md)       | Ignored exit code (\|\| true)                    | error    |
| [QA-CI-005](./QA-CI-005.md)       | Report consumed but never generated              | error    |
| [QA-CI-007](./QA-CI-007.md)       | Retry masks test failures                        | warning  |
| [QA-CI-008](./QA-CI-008.md)       | Always-success step masks failures               | error    |
| [QA-CI-009](./QA-CI-009.md)       | Test command does not propagate exit code        | error    |
| [QA-CI-010](./QA-CI-010.md)       | Tests skipped where they must block              | error    |
| [QA-CS-101](./QA-CS-101.md)       | Skipped test                                     | warning  |
| [QA-CS-102](./QA-CS-102.md)       | Hard sleep in test                               | warning  |
| [QA-CS-103](./QA-CS-103.md)       | Test without assertions                          | error    |
| [QA-CS-104](./QA-CS-104.md)       | Static/shared Playwright page across tests       | warning  |
| [QA-ENV-001](./QA-ENV-001.md)     | Environment coupling in test                     | warning  |
| [QA-JV-101](./QA-JV-101.md)       | Disabled test                                    | warning  |
| [QA-JV-102](./QA-JV-102.md)       | Thread.sleep() in test                           | warning  |
| [QA-JV-103](./QA-JV-103.md)       | Test without assertions                          | error    |
| [QA-JV-104](./QA-JV-104.md)       | Static/shared Playwright page across tests       | warning  |
| [QA-JV-105](./QA-JV-105.md)       | waitForTimeout hard sleep                        | warning  |
| [QA-PW-002](./QA-PW-002.md)       | Unawaited Playwright assertion                   | error    |
| [QA-PW-003](./QA-PW-003.md)       | Debug artifact committed to e2e spec             | error    |
| [QA-PW-004](./QA-PW-004.md)       | Brittle selector instead of role-based locator   | warning  |
| [QA-PW-005](./QA-PW-005.md)       | Logic inside page.evaluate()                     | warning  |
| [QA-PW-101](./QA-PW-101.md)       | Hard sleep via waitForTimeout                    | error    |
| [QA-PW-102](./QA-PW-102.md)       | Load-event wait instead of web-first assertion   | warning  |
| [QA-PW-103](./QA-PW-103.md)       | Navigation wait without explicit timeout budget  | info     |
| [QA-PW-104](./QA-PW-104.md)       | trial:true click without follow-up assertion     | warning  |
| [QA-PW-105](./QA-PW-105.md)       | expect.poll without timeout bound                | warning  |
| [QA-PW-107](./QA-PW-107.md)       | toBeVisible where toBeInViewport fits better     | info     |
| [QA-PW-108](./QA-PW-108.md)       | textContent assertion instead of accessible name | info     |
| [QA-PW-112](./QA-PW-112.md)       | data-testid naming convention violation          | info     |
| [QA-PW-113](./QA-PW-113.md)       | frameLocator chain deeper than 2                 | warning  |
| [QA-PW-114](./QA-PW-114.md)       | Legacy element handle API (page.$)               | warning  |
| [QA-PW-115](./QA-PW-115.md)       | Shared page object across tests                  | warning  |
| [QA-PW-116](./QA-PW-116.md)       | storageState without expiry strategy             | warning  |
| [QA-PW-117](./QA-PW-117.md)       | describe.serial without justification            | warning  |
| [QA-PW-118](./QA-PW-118.md)       | Network idle wait (flaky by design)              | warning  |
| [QA-PW-119](./QA-PW-119.md)       | Test depends on execution order                  | error    |
| [QA-PW-120](./QA-PW-120.md)       | Engine-specific test without environment guard   | info     |
| [QA-PW-121](./QA-PW-121.md)       | Config retry/worker abuse                        | warning  |
| [QA-PW-122](./QA-PW-122.md)       | No trace capture on retry                        | warning  |
| [QA-PW-123](./QA-PW-123.md)       | Hardcoded environment URL in spec                | warning  |
| [QA-PW-124](./QA-PW-124.md)       | No smoke/regression project split                | info     |
| [QA-PW-125](./QA-PW-125.md)       | Global setup mutating shared state               | warning  |
| [QA-PW-140](./QA-PW-140.md)       | Screenshot without maxDiffPixelRatio             | warning  |
| [QA-PW-141](./QA-PW-141.md)       | Retries configured without a flake-triage loop   | warning  |
| [QA-PW-142](./QA-PW-142.md)       | Blanket route mock                               | warning  |
| [QA-PW-143](./QA-PW-143.md)       | No screenshot/video capture on failure           | info     |
| [QA-PW-144](./QA-PW-144.md)       | Single-browser project matrix                    | info     |
| [QA-PW-145](./QA-PW-145.md)       | UI suite without accessibility assertions        | info     |
| [QA-PY-001](./QA-PY-001.md)       | Focused test committed                           | error    |
| [QA-PY-002](./QA-PY-002.md)       | Skipped test                                     | warning  |
| [QA-PY-003](./QA-PY-003.md)       | Test function with no assertions                 | error    |
| [QA-PY-004](./QA-PY-004.md)       | Bare truthiness assert on complex object         | warning  |
| [QA-PY-005](./QA-PY-005.md)       | time.sleep() in test                             | warning  |
| [QA-PY-006](./QA-PY-006.md)       | Empty test body (pass)                           | error    |
| [QA-PY-007](./QA-PY-007.md)       | pytest.raises without match                      | warning  |
| [QA-PY-008](./QA-PY-008.md)       | Mock-only verification                           | warning  |
| [QA-PY-009](./QA-PY-009.md)       | Commented-out test                               | warning  |
| [QA-PY-010](./QA-PY-010.md)       | Random/time dependence in test                   | warning  |
| [QA-PY-011](./QA-PY-011.md)       | Mutable fixture shared across tests              | warning  |
| [QA-PY-012](./QA-PY-012.md)       | Tautological assertion                           | error    |
| [QA-PY-101](./QA-PY-101.md)       | Sync/async Playwright API mix                    | warning  |
| [QA-PY-102](./QA-PY-102.md)       | time.sleep() in Playwright test                  | warning  |
| [QA-PY-103](./QA-PY-103.md)       | wait_for_timeout() as sync                       | warning  |
| [QA-PY-104](./QA-PY-104.md)       | Brittle selector in Playwright test              | warning  |
| [QA-PY-105](./QA-PY-105.md)       | Playwright test without assertions               | error    |
| [QA-PY-106](./QA-PY-106.md)       | Shared page/context across tests                 | warning  |
| [QA-PY-107](./QA-PY-107.md)       | networkidle wait (flaky by design)               | warning  |
| [QA-PY-108](./QA-PY-108.md)       | Hardcoded environment URL in spec                | warning  |
| [QA-TEST-001](./QA-TEST-001.md)   | Focused test committed                           | error    |
| [QA-TEST-002](./QA-TEST-002.md)   | Skipped test                                     | warning  |
| [QA-TEST-003](./QA-TEST-003.md)   | Test with no assertions                          | error    |
| [QA-TEST-004](./QA-TEST-004.md)   | Hard sleep in test                               | warning  |
| [QA-TEST-006](./QA-TEST-006.md)   | Retry abuse hiding flakiness                     | warning  |
| [QA-TEST-010](./QA-TEST-010.md)   | Empty test body                                  | error    |
| [QA-TQUAL-001](./QA-TQUAL-001.md) | Mock-only verification                           | warning  |
| [QA-TQUAL-002](./QA-TQUAL-002.md) | Tautological assertion                           | error    |
| [QA-TQUAL-009](./QA-TQUAL-009.md) | Assertion in promise chain that is never awaited | error    |
| [QA-TQUAL-011](./QA-TQUAL-011.md) | Commented-out test                               | warning  |
