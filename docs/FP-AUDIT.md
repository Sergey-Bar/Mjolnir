# False-Positive Audit — Measured Rates

**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**

Each finding below was hand-classified by reading its source context.
The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the
denominator (they add sample size but not confidence in either direction).

`detectorRev` is the detector implementation revision the measurement was
taken against (sidecar: `tests/corpus/detector-revisions.json`). A rule
whose detection logic changes without a revision bump has its measurement
treated as stale → provisional (Verification Trust Evolution Plan §07).

The 95% Wilson CI column is the interval regression governance compares
(plan §20.2): an FP-rate regression is flagged only when the intervals
are disjoint in the bad direction with a worse point estimate, at
n ≥ 10 on both sides. Noise within the interval overlap is never a
CI failure — comparisons below n = 10 are informational only.

A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage
below is stated against the full rule registry, not against the rules that
happen to have been sampled.

## Summary

| Rule ID      | FP Rate | 95% Wilson CI    | Sample (n) | TP  | FP  | UNSURE | detectorRev | Status        |
| ------------ | ------- | ---------------- | ---------- | --- | --- | ------ | ----------- | ------------- |
| QA-CI-001    | 0%      | —                | 3          | 3   | 0   | 0      | —           | ❓ unmeasured |
| QA-CI-002    | 60%     | —                | 5          | 2   | 3   | 0      | —           | ❓ unmeasured |
| QA-CI-005    | 67%     | —                | 3          | 1   | 2   | 0      | —           | ❓ unmeasured |
| QA-CI-008    | 100%    | —                | 3          | 0   | 3   | 0      | —           | ❓ unmeasured |
| QA-CI-010    | 67%     | —                | 3          | 1   | 2   | 0      | —           | ❓ unmeasured |
| QA-CS-101    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-CS-102    | 65%     | [0.4329, 0.8188] | 20         | 7   | 13  | 0      | 1           | 🔴 quarantine |
| QA-CS-103    | 50%     | —                | 2          | 1   | 1   | 0      | —           | ❓ unmeasured |
| QA-CS-105    | 25%     | [0.1018, 0.495]  | 16         | 12  | 4   | 0      | 1           | ⚠️ extended   |
| QA-CS-106    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CS-107    | 100%    | —                | 1          | 0   | 1   | 0      | —           | ❓ unmeasured |
| QA-CS-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CS-110    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CS-111    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-ENV-001   | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-101    | 0%      | —                | 8          | 8   | 0   | 0      | —           | ❓ unmeasured |
| QA-JV-102    | 100%    | —                | 1          | 0   | 1   | 0      | —           | ❓ unmeasured |
| QA-JV-103    | 50%     | [0.2993, 0.7007] | 20         | 10  | 10  | 0      | 1           | 🔴 quarantine |
| QA-JV-104    | 100%    | —                | 2          | 0   | 2   | 0      | —           | ❓ unmeasured |
| QA-JV-105    | 10%     | [0.0279, 0.301]  | 20         | 18  | 2   | 0      | 1           | ✅ core       |
| QA-JV-106    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-110    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-111    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-002    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-PW-004    | 100%    | —                | 6          | 0   | 6   | 0      | —           | ❓ unmeasured |
| QA-PW-005    | 100%    | [0.8157, 1]      | 17         | 0   | 17  | 0      | 1           | 🔴 quarantine |
| QA-PW-101    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-PW-102    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-103    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-105    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-107    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-112    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-114    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-115    | 100%    | —                | 4          | 0   | 4   | 0      | —           | ❓ unmeasured |
| QA-PW-117    | 0%      | —                | 1          | 1   | 0   | 0      | —           | ❓ unmeasured |
| QA-PW-118    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-119    | 100%    | [0.862, 1]       | 24         | 0   | 24  | 0      | 1           | 🔴 quarantine |
| QA-PW-120    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-122    | 25%     | [0.1119, 0.4687] | 20         | 15  | 5   | 0      | 1           | ⚠️ extended   |
| QA-PW-123    | 100%    | —                | 4          | 0   | 4   | 0      | —           | ❓ unmeasured |
| QA-PW-141    | 33%     | —                | 6          | 4   | 2   | 0      | —           | ❓ unmeasured |
| QA-PW-143    | 25%     | [0.1119, 0.4687] | 20         | 15  | 5   | 0      | 1           | ⚠️ extended   |
| QA-PW-144    | 33%     | —                | 6          | 4   | 2   | 0      | —           | ❓ unmeasured |
| QA-PW-145    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-002    | 4%      | [0.0077, 0.2099] | 23         | 22  | 1   | 0      | 1           | ✅ core       |
| QA-PY-003    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-004    | 45%     | [0.2582, 0.6579] | 20         | 11  | 9   | 0      | 1           | 🔴 quarantine |
| QA-PY-005    | 16%     | [0.0552, 0.3757] | 19         | 16  | 3   | 0      | 1           | ⚠️ extended   |
| QA-PY-006    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-007    | 65%     | [0.4329, 0.8188] | 20         | 7   | 13  | 0      | 1           | 🔴 quarantine |
| QA-PY-008    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-009    | 25%     | —                | 4          | 3   | 1   | 0      | —           | ❓ unmeasured |
| QA-PY-010    | 100%    | [0.7225, 1]      | 10         | 0   | 10  | 0      | 1           | 🔴 quarantine |
| QA-PY-011    | 100%    | —                | 1          | 0   | 1   | 0      | —           | ❓ unmeasured |
| QA-PY-012    | 83%     | —                | 6          | 1   | 5   | 0      | —           | ❓ unmeasured |
| QA-PY-103    | 0%      | —                | 2          | 2   | 0   | 0      | —           | ❓ unmeasured |
| QA-PY-104    | 100%    | [0.7575, 1]      | 12         | 0   | 12  | 0      | 1           | 🔴 quarantine |
| QA-TEST-002  | 65%     | [0.4329, 0.8188] | 20         | 7   | 13  | 0      | 1           | 🔴 quarantine |
| QA-TEST-003  | 85%     | [0.6396, 0.9476] | 20         | 3   | 17  | 0      | 1           | 🔴 quarantine |
| QA-TEST-004  | 30%     | [0.1455, 0.519]  | 20         | 14  | 6   | 0      | 1           | ⚠️ extended   |
| QA-TEST-006  | 0%      | —                | 2          | 2   | 0   | 0      | —           | ❓ unmeasured |
| QA-TEST-010  | 33%     | —                | 3          | 2   | 1   | 0      | —           | ❓ unmeasured |
| QA-TQUAL-001 | 100%    | [0.8713, 1]      | 26         | 0   | 26  | 0      | 1           | 🔴 quarantine |
| QA-TQUAL-002 | 50%     | —                | 6          | 3   | 3   | 0      | —           | ❓ unmeasured |
| QA-TQUAL-009 | 50%     | —                | 2          | 1   | 1   | 0      | —           | ❓ unmeasured |
| QA-TQUAL-011 | 33%     | —                | 6          | 4   | 2   | 0      | —           | ❓ unmeasured |

## Tier Assignment Criteria

| Tier          | FP Rate | Meaning                               |
| ------------- | ------- | ------------------------------------- |
| ✅ core       | ≤ 10%   | Ships in the default report           |
| ⚠️ extended   | ≤ 30%   | Included by default, lower confidence |
| 🔴 quarantine | > 30%   | Opt-in only (`--strict`)              |
| ❓ unmeasured | n < 10  | Cannot ship in core until measured    |

## Coverage: 43/91 rules measured (47%) at n ≥ 10

**48 rules carry no measured FP rate.** Any of them in the
core tier is shipping on an unverified assumption.
