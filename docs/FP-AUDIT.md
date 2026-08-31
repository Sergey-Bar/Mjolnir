# False-Positive Audit — Measured Rates

**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**

Each finding below was hand-classified by reading its source context.
The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the
denominator (they add sample size but not confidence in either direction).

A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage
below is stated against the full rule registry, not against the rules that
happen to have been sampled.

Last generated: 2026-08-31.

## Summary

| Rule ID      | FP Rate | Sample (n) | TP  | FP  | UNSURE | Status        |
| ------------ | ------- | ---------- | --- | --- | ------ | ------------- |
| QA-CI-001    | 0%      | 3          | 3   | 0   | 0      | ❓ unmeasured |
| QA-CI-002    | 60%     | 5          | 2   | 3   | 0      | ❓ unmeasured |
| QA-CI-005    | 67%     | 3          | 1   | 2   | 0      | ❓ unmeasured |
| QA-CI-008    | 100%    | 3          | 0   | 3   | 0      | ❓ unmeasured |
| QA-CI-010    | 67%     | 3          | 1   | 2   | 0      | ❓ unmeasured |
| QA-CS-101    | 0%      | 20         | 20  | 0   | 0      | ✅ core       |
| QA-CS-102    | 65%     | 20         | 7   | 13  | 0      | 🔴 quarantine |
| QA-CS-103    | 50%     | 2          | 1   | 1   | 0      | ❓ unmeasured |
| QA-CS-105    | 25%     | 16         | 12  | 4   | 0      | ⚠️ extended   |
| QA-CS-106    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-CS-107    | 100%    | 1          | 0   | 1   | 0      | ❓ unmeasured |
| QA-CS-108    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-CS-110    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-CS-111    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-ENV-001   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-101    | 0%      | 8          | 8   | 0   | 0      | ❓ unmeasured |
| QA-JV-102    | 100%    | 1          | 0   | 1   | 0      | ❓ unmeasured |
| QA-JV-103    | 50%     | 20         | 10  | 10  | 0      | 🔴 quarantine |
| QA-JV-104    | 100%    | 2          | 0   | 2   | 0      | ❓ unmeasured |
| QA-JV-105    | 10%     | 20         | 18  | 2   | 0      | ✅ core       |
| QA-JV-106    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-108    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-110    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-111    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-002    | 0%      | 20         | 20  | 0   | 0      | ✅ core       |
| QA-PW-004    | 100%    | 6          | 0   | 6   | 0      | ❓ unmeasured |
| QA-PW-005    | 100%    | 17         | 0   | 17  | 0      | 🔴 quarantine |
| QA-PW-101    | —       | 0          | 0   | 0   | 20     | ❓ unmeasured |
| QA-PW-102    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-103    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-105    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-107    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-108    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-112    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-114    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-115    | 100%    | 4          | 0   | 4   | 0      | ❓ unmeasured |
| QA-PW-117    | 0%      | 1          | 1   | 0   | 0      | ❓ unmeasured |
| QA-PW-118    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-119    | 100%    | 24         | 0   | 24  | 0      | 🔴 quarantine |
| QA-PW-120    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-122    | 25%     | 20         | 15  | 5   | 0      | ⚠️ extended   |
| QA-PW-123    | 100%    | 4          | 0   | 4   | 0      | ❓ unmeasured |
| QA-PW-141    | 33%     | 6          | 4   | 2   | 0      | ❓ unmeasured |
| QA-PW-143    | 25%     | 20         | 15  | 5   | 0      | ⚠️ extended   |
| QA-PW-144    | 33%     | 6          | 4   | 2   | 0      | ❓ unmeasured |
| QA-PW-145    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PY-002    | 4%      | 23         | 22  | 1   | 0      | ✅ core       |
| QA-PY-003    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PY-004    | 45%     | 20         | 11  | 9   | 0      | 🔴 quarantine |
| QA-PY-005    | 16%     | 19         | 16  | 3   | 0      | ⚠️ extended   |
| QA-PY-006    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PY-007    | 65%     | 20         | 7   | 13  | 0      | 🔴 quarantine |
| QA-PY-008    | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PY-009    | 25%     | 4          | 3   | 1   | 0      | ❓ unmeasured |
| QA-PY-010    | 100%    | 10         | 0   | 10  | 0      | 🔴 quarantine |
| QA-PY-011    | 100%    | 1          | 0   | 1   | 0      | ❓ unmeasured |
| QA-PY-012    | 83%     | 6          | 1   | 5   | 0      | ❓ unmeasured |
| QA-PY-103    | 0%      | 2          | 2   | 0   | 0      | ❓ unmeasured |
| QA-PY-104    | 100%    | 12         | 0   | 12  | 0      | 🔴 quarantine |
| QA-TEST-002  | 65%     | 20         | 7   | 13  | 0      | 🔴 quarantine |
| QA-TEST-003  | 85%     | 20         | 3   | 17  | 0      | 🔴 quarantine |
| QA-TEST-004  | 30%     | 20         | 14  | 6   | 0      | ⚠️ extended   |
| QA-TEST-006  | 0%      | 2          | 2   | 0   | 0      | ❓ unmeasured |
| QA-TEST-010  | 33%     | 3          | 2   | 1   | 0      | ❓ unmeasured |
| QA-TQUAL-001 | 100%    | 26         | 0   | 26  | 0      | 🔴 quarantine |
| QA-TQUAL-002 | 50%     | 6          | 3   | 3   | 0      | ❓ unmeasured |
| QA-TQUAL-009 | 0%      | 1          | 1   | 0   | 1      | ❓ unmeasured |
| QA-TQUAL-011 | 33%     | 6          | 4   | 2   | 0      | ❓ unmeasured |

## Tier Assignment Criteria

| Tier          | FP Rate | Meaning                               |
| ------------- | ------- | ------------------------------------- |
| ✅ core       | ≤ 10%   | Ships in the default report           |
| ⚠️ extended   | ≤ 30%   | Included by default, lower confidence |
| 🔴 quarantine | > 30%   | Opt-in only (`--strict`)              |
| ❓ unmeasured | n < 10  | Cannot ship in core until measured    |

## Coverage: 42/91 rules measured (46%) at n ≥ 10

**49 rules carry no measured FP rate.** Any of them in the
core tier is shipping on an unverified assumption.
