# What Mjölnir checks

Every rule ships with must-fire **and** must-not-fire fixtures. A rule that
fires on its own negative fixture cannot ship — that's the false-positive
firewall.

The full live catalog — every rule with tier, confidence, false-positive
risk, and autofix availability — is generated from the registry:

```bash
mjolnir rules --md
```

## Test Hygiene

| ID          | Rule                                                | Severity |
| ----------- | --------------------------------------------------- | -------- |
| QA-TEST-001 | Focused test committed (`.only`, `fit`)             | error    |
| QA-TEST-002 | Skipped test without justification                  | error    |
| QA-TEST-003 | Test with no assertions                             | error    |
| QA-TEST-004 | Hard sleep (`waitForTimeout`, `sleep()`, `delay()`) | warning  |
| QA-TEST-006 | Retry abuse hiding flakiness                        | warning  |
| QA-TEST-010 | Empty test body                                     | error    |

## Test Quality

| ID           | Rule                        | Severity |
| ------------ | --------------------------- | -------- |
| QA-TQUAL-001 | Mock-only verification      | warning  |
| QA-TQUAL-002 | Tautological assertion      | error    |
| QA-TQUAL-009 | Unawaited promise assertion | error    |
| QA-TQUAL-011 | Commented-out tests         | warning  |

## Playwright 🎭

| ID        | Rule                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-PW-002 | Unawaited locator assertion              | error    |
| QA-PW-003 | `page.pause()` / `test.only()` committed | error    |
| QA-PW-004 | Brittle CSS/XPath selectors              | warning  |
| QA-PW-005 | Business logic inside `page.evaluate()`  | warning  |
| QA-PW-114 | Legacy element handles (`page.$`)        | warning  |
| QA-PW-118 | `networkidle` waits (flaky by design)    | warning  |
| QA-PW-123 | Hardcoded environment URLs               | warning  |

## CI Integrity

| ID        | Rule                                | Severity |
| --------- | ----------------------------------- | -------- |
| QA-CI-001 | `continue-on-error` masks failures  | error    |
| QA-CI-002 | `\|\| true` swallows exit codes     | error    |
| QA-CI-005 | Report consumed but never generated | error    |
| QA-CI-007 | Retry wrappers around tests         | warning  |
| QA-CI-008 | Always-success step masks failures  | error    |
| QA-CI-009 | Test exit code not propagated       | error    |
| QA-CI-010 | Tests skipped where they must block | error    |

## Python / pytest 🐍

| ID        | Rule                                      | Severity |
| --------- | ----------------------------------------- | -------- |
| QA-PY-002 | Skipped test (`skip`, non-strict `xfail`) | warning  |
| QA-PY-003 | Test function with no assertions          | error    |
| QA-PY-005 | `time.sleep()` in tests                   | warning  |
| QA-PY-006 | Empty test body (`pass`)                  | error    |
| QA-PY-010 | Random/time dependence without freeze     | warning  |
| QA-PY-012 | Tautological assertion                    | error    |

20 Python rules total (QA-PY-001…012 pytest hygiene + QA-PY-101…108 Playwright-Python).

## Java / JUnit · TestNG ☕

| ID        | Rule                                     | Severity |
| --------- | ---------------------------------------- | -------- |
| QA-JV-101 | Disabled test (`@Disabled`)              | warning  |
| QA-JV-102 | Hard sleep (`Thread.sleep()`)            | warning  |
| QA-JV-103 | Test method with no assertions           | error    |
| QA-JV-105 | Playwright `waitForTimeout()` hard sleep | warning  |
| QA-JV-106 | Brittle selector instead of role locator | warning  |
| QA-JV-108 | Hardcoded environment URL in test        | warning  |
| QA-JV-111 | Blanket `page.route("**")` mock          | warning  |

## C# / .NET — NUnit · xUnit · MSTest 🟣

| ID        | Rule                                       | Severity |
| --------- | ------------------------------------------ | -------- |
| QA-CS-101 | Skipped test (`[Ignore]`, `[Fact(Skip=)]`) | warning  |
| QA-CS-102 | Hard sleep (`Thread.Sleep` / `Task.Delay`) | warning  |
| QA-CS-103 | Test method with no assertions             | error    |
| QA-CS-105 | `WaitForTimeoutAsync()` hard sleep         | warning  |
| QA-CS-106 | Brittle selector instead of role locator   | warning  |
| QA-CS-108 | Hardcoded environment URL in test          | warning  |
| QA-CS-111 | Blanket `page.RouteAsync("**")` mock       | warning  |

## How much of this is measured

15 of 91 rules carry a false-positive rate measured against real OSS code
(≥ 10 hand-classified findings each; see the
[False-positive audit](/reference/fp-audit)). The other 76 ship on the
author's estimate. Every scan footer tells you how many of the rules that
_fired_ are measured; `mjolnir rules --unmeasured` lists the ones that aren't.

### Rule tiers

| Tier         | Meaning                                  | Default scan | `--strict` |
| ------------ | ---------------------------------------- | :----------: | :--------: |
| `core`       | ≤ 10 % measured FP                       |      ✅      |     ✅     |
| `extended`   | ≤ 30 % measured FP                       |      ✅      |     ✅     |
| `quarantine` | above 30 %, or not yet measured (n < 10) |      ❌      |     ✅     |
