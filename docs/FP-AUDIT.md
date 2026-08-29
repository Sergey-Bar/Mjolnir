# False-Positive Audit — Measured Rates

**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**

Each finding below was hand-classified by reading its source context.
The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the
denominator (they add sample size but not confidence in either direction).

A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage
below is stated against the full rule registry, not against the rules that
happen to have been sampled.

Last generated: 2026-08-29.

## Summary

| Rule ID     | FP Rate | Sample (n) | TP  | FP  | UNSURE | Status        |
| ----------- | ------- | ---------- | --- | --- | ------ | ------------- |
| QA-CS-101   | 0%      | 20         | 20  | 0   | 0      | ✅ core       |
| QA-CS-102   | 65%     | 20         | 7   | 13  | 0      | 🔴 quarantine |
| QA-CS-103   | 50%     | 2          | 1   | 1   | 0      | ❓ unmeasured |
| QA-CS-105   | 25%     | 16         | 12  | 4   | 0      | ⚠️ extended   |
| QA-CS-106   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-CS-108   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-CS-111   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-ENV-001  | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-101   | 0%      | 8          | 8   | 0   | 0      | ❓ unmeasured |
| QA-JV-103   | 50%     | 20         | 10  | 10  | 0      | 🔴 quarantine |
| QA-JV-105   | 10%     | 20         | 18  | 2   | 0      | ✅ core       |
| QA-JV-106   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-108   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-JV-111   | 100%    | 20         | 0   | 20  | 0      | 🔴 quarantine |
| QA-PW-101   | 10%     | 20         | 18  | 2   | 0      | ✅ core       |
| QA-PW-112   | 0%      | 16         | 16  | 0   | 0      | ✅ core       |
| QA-PY-002   | 5%      | 20         | 19  | 1   | 0      | ✅ core       |
| QA-PY-004   | 45%     | 20         | 11  | 9   | 0      | 🔴 quarantine |
| QA-PY-006   | 100%    | 19         | 0   | 19  | 0      | 🔴 quarantine |
| QA-PY-007   | 65%     | 20         | 7   | 13  | 0      | 🔴 quarantine |
| QA-TEST-004 | 20%     | 20         | 16  | 4   | 0      | ⚠️ extended   |

## Tier Assignment Criteria

| Tier          | FP Rate | Meaning                               |
| ------------- | ------- | ------------------------------------- |
| ✅ core       | ≤ 10%   | Ships in the default report           |
| ⚠️ extended   | ≤ 30%   | Included by default, lower confidence |
| 🔴 quarantine | > 30%   | Opt-in only (`--strict`)              |
| ❓ unmeasured | n < 10  | Cannot ship in core until measured    |

## Coverage: 19/91 rules measured (21%) at n ≥ 10

**72 rules carry no measured FP rate.** Any of them in the
core tier is shipping on an unverified assumption.
