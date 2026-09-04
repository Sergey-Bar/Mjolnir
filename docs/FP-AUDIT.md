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
| QA-CI-001    | 32%     | [0.1536, 0.5399] | 19         | 13  | 6   | 0      | 1           | 🔴 quarantine |
| QA-CI-002    | 19%     | [0.0659, 0.4301] | 16         | 13  | 3   | 0      | 1           | ⚠️ extended   |
| QA-CI-005    | 82%     | [0.5897, 0.9381] | 17         | 3   | 14  | 0      | 1           | 🔴 quarantine |
| QA-CI-007    | 27%     | [0.0975, 0.5656] | 11         | 8   | 3   | 0      | 1           | ⚠️ extended   |
| QA-CI-008    | 75%     | [0.505, 0.8982]  | 16         | 4   | 12  | 0      | 1           | 🔴 quarantine |
| QA-CI-009    | 0%      | —                | 5          | 5   | 0   | 0      | —           | ❓ unmeasured |
| QA-CI-010    | 40%     | [0.1682, 0.6873] | 10         | 6   | 4   | 0      | 1           | 🔴 quarantine |
| QA-CS-101    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-CS-102    | 8%      | [0.0232, 0.2585] | 24         | 22  | 2   | 0      | 2           | ✅ core       |
| QA-CS-103    | 0%      | [0, 0.2588]      | 11         | 11  | 0   | 0      | 2           | ✅ core       |
| QA-CS-104    | 0%      | —                | 3          | 3   | 0   | 0      | —           | ❓ unmeasured |
| QA-CS-105    | 25%     | [0.1018, 0.495]  | 16         | 12  | 4   | 0      | 1           | ⚠️ extended   |
| QA-CS-106    | 100%    | —                | 4          | 0   | 4   | 0      | —           | ❓ unmeasured |
| QA-CS-107    | 20%     | —                | 5          | 4   | 1   | 0      | —           | ❓ unmeasured |
| QA-CS-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CS-109    | 0%      | —                | 4          | 4   | 0   | 0      | —           | ❓ unmeasured |
| QA-CS-110    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CS-111    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-CYP-001   | 20%     | [0.0705, 0.4519] | 15         | 12  | 3   | 0      | 1           | ⚠️ extended   |
| QA-ENV-001   | 100%    | —                | 6          | 0   | 6   | 0      | —           | ❓ unmeasured |
| QA-JV-101    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-JV-102    | 30%     | [0.1455, 0.519]  | 20         | 14  | 6   | 0      | 1           | ⚠️ extended   |
| QA-JV-103    | 26%     | [0.1635, 0.3838] | 58         | 43  | 15  | 0      | 2           | ⚠️ extended   |
| QA-JV-104    | 20%     | [0.0567, 0.5098] | 10         | 8   | 2   | 0      | 1           | ⚠️ extended   |
| QA-JV-105    | 10%     | [0.0279, 0.301]  | 20         | 18  | 2   | 0      | 1           | ✅ core       |
| QA-JV-106    | 100%    | —                | 4          | 0   | 4   | 0      | —           | ❓ unmeasured |
| QA-JV-107    | 0%      | —                | 4          | 4   | 0   | 0      | —           | ❓ unmeasured |
| QA-JV-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-109    | 0%      | [0, 0.2775]      | 10         | 10  | 0   | 0      | 1           | ✅ core       |
| QA-JV-110    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-JV-111    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-002    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-PW-003    | 10%     | [0.0179, 0.4042] | 10         | 9   | 1   | 0      | 1           | ✅ core       |
| QA-PW-004    | 38%     | [0.1848, 0.6136] | 16         | 10  | 6   | 0      | 1           | 🔴 quarantine |
| QA-PW-005    | 100%    | [0.8157, 1]      | 17         | 0   | 17  | 0      | 1           | 🔴 quarantine |
| QA-PW-101    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-PW-103    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-104    | 0%      | [0, 0.2775]      | 10         | 10  | 0   | 0      | 1           | ✅ core       |
| QA-PW-105    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-107    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-108    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-112    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-113    | 0%      | [0, 0.2588]      | 11         | 11  | 0   | 0      | 1           | ✅ core       |
| QA-PW-114    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-115    | 56%     | [0.3318, 0.769]  | 16         | 7   | 9   | 0      | 1           | 🔴 quarantine |
| QA-PW-117    | 0%      | [0, 0.1611]      | 20         | 20  | 0   | 0      | 1           | ✅ core       |
| QA-PW-118    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-119    | 100%    | [0.862, 1]       | 24         | 0   | 24  | 0      | 1           | 🔴 quarantine |
| QA-PW-120    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-121    | 0%      | [0, 0.2425]      | 12         | 12  | 0   | 0      | 1           | ✅ core       |
| QA-PW-122    | 25%     | [0.1119, 0.4687] | 20         | 15  | 5   | 0      | 1           | ⚠️ extended   |
| QA-PW-123    | 45%     | [0.2127, 0.7199] | 11         | 6   | 5   | 0      | 1           | 🔴 quarantine |
| QA-PW-140    | 0%      | [0, 0.2775]      | 10         | 10  | 0   | 0      | 1           | ✅ core       |
| QA-PW-141    | 15%     | [0.0524, 0.3604] | 20         | 17  | 3   | 0      | 1           | ⚠️ extended   |
| QA-PW-142    | 18%     | [0.0514, 0.477]  | 11         | 9   | 2   | 0      | 1           | ⚠️ extended   |
| QA-PW-143    | 25%     | [0.1119, 0.4687] | 20         | 15  | 5   | 0      | 1           | ⚠️ extended   |
| QA-PW-144    | 15%     | [0.0524, 0.3604] | 20         | 17  | 3   | 0      | 1           | ⚠️ extended   |
| QA-PW-145    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PW-146    | 12%     | [0.0329, 0.3434] | 17         | 15  | 2   | 0      | 1           | 🔴 quarantine |
| QA-PY-001    | 0%      | [0, 0.2425]      | 12         | 12  | 0   | 0      | 1           | ✅ core       |
| QA-PY-002    | 4%      | [0.0077, 0.2099] | 23         | 22  | 1   | 0      | 1           | ✅ core       |
| QA-PY-003    | 82%     | [0.5897, 0.9381] | 17         | 3   | 14  | 0      | 3           | 🔴 quarantine |
| QA-PY-004    | 76%     | [0.5491, 0.8937] | 21         | 5   | 16  | 0      | 3           | 🔴 quarantine |
| QA-PY-005    | 16%     | [0.0552, 0.3757] | 19         | 16  | 3   | 0      | 1           | ⚠️ extended   |
| QA-PY-006    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-007    | 79%     | [0.632, 0.8965]  | 34         | 7   | 27  | 0      | 3           | 🔴 quarantine |
| QA-PY-008    | 100%    | [0.8389, 1]      | 20         | 0   | 20  | 0      | 1           | 🔴 quarantine |
| QA-PY-009    | 6%      | [0.0099, 0.2576] | 18         | 17  | 1   | 0      | 1           | ✅ core       |
| QA-PY-010    | 100%    | [0.7225, 1]      | 10         | 0   | 10  | 0      | 1           | 🔴 quarantine |
| QA-PY-011    | 10%     | [0.0179, 0.4042] | 10         | 9   | 1   | 0      | 1           | ✅ core       |
| QA-PY-012    | 60%     | [0.3866, 0.7812] | 20         | 8   | 12  | 0      | 1           | 🔴 quarantine |
| QA-PY-101    | 0%      | —                | 4          | 4   | 0   | 0      | —           | ❓ unmeasured |
| QA-PY-103    | 10%     | [0.0279, 0.301]  | 20         | 18  | 2   | 0      | 1           | ✅ core       |
| QA-PY-106    | 0%      | —                | 4          | 4   | 0   | 0      | —           | ❓ unmeasured |
| QA-PY-107    | 0%      | —                | 3          | 3   | 0   | 0      | —           | ❓ unmeasured |
| QA-PY-108    | 0%      | —                | 4          | 4   | 0   | 0      | —           | ❓ unmeasured |
| QA-SE-002    | 25%     | —                | 4          | 3   | 1   | 0      | —           | ❓ unmeasured |
| QA-SE-003    | 0%      | —                | 1          | 1   | 0   | 0      | —           | ❓ unmeasured |
| QA-TEST-001  | 63%     | [0.4104, 0.8085] | 19         | 7   | 12  | 0      | 1           | 🔴 quarantine |
| QA-TEST-002  | 65%     | [0.4329, 0.8188] | 20         | 7   | 13  | 0      | 1           | 🔴 quarantine |
| QA-TEST-003  | 85%     | [0.6396, 0.9476] | 20         | 3   | 17  | 0      | 1           | 🔴 quarantine |
| QA-TEST-004  | 30%     | [0.1455, 0.519]  | 20         | 14  | 6   | 0      | 1           | ⚠️ extended   |
| QA-TEST-006  | 36%     | [0.1517, 0.6462] | 11         | 7   | 4   | 0      | 1           | 🔴 quarantine |
| QA-TEST-010  | 90%     | [0.699, 0.9721]  | 20         | 2   | 18  | 0      | 1           | 🔴 quarantine |
| QA-TQUAL-001 | 100%    | [0.8713, 1]      | 26         | 0   | 26  | 0      | 1           | 🔴 quarantine |
| QA-TQUAL-002 | 85%     | [0.6396, 0.9476] | 20         | 3   | 17  | 0      | 1           | 🔴 quarantine |
| QA-TQUAL-009 | 79%     | [0.5241, 0.9243] | 14         | 3   | 11  | 0      | 1           | 🔴 quarantine |
| QA-TQUAL-011 | 30%     | [0.1455, 0.519]  | 20         | 14  | 6   | 0      | 1           | ⚠️ extended   |

## Tier Assignment Criteria

| Tier          | FP Rate | Meaning                               |
| ------------- | ------- | ------------------------------------- |
| ✅ core       | ≤ 10%   | Ships in the default report           |
| ⚠️ extended   | ≤ 30%   | Included by default, lower confidence |
| 🔴 quarantine | > 30%   | Opt-in only (`--strict`)              |
| ❓ unmeasured | n < 10  | Cannot ship in core until measured    |

## Coverage: 74/99 rules measured (75%) at n ≥ 10

**25 rules carry no measured FP rate.** Any of them in the
core tier is shipping on an unverified assumption.
