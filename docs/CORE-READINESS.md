# Core readiness

**Generated — do not edit by hand.** Regenerate: `npm run docs:core-readiness`.

The core tier holds 0 rule(s) that cleared
the 10% Wilson ceiling by measurement. A rule
observing ZERO false positives needs **n ≥ 35** to clear
it, which is why a thin sample is not a verdict — see
[`docs/ANTI-CREEP.md`](ANTI-CREEP.md).

| Verdict            | Rules | What it means                                                                              |
| ------------------ | ----: | ------------------------------------------------------------------------------------------ |
| EARNED             |     0 | A valid measurement whose 95% interval clears the ceiling                                  |
| NEEDS-SAMPLES      |    54 | Sample too small at the observed rate; more data settles it as-is                          |
| NEEDS-FP-REDUCTION |    19 | Sample large enough, false-positive rate too high; the rule is wrong, not the corpus       |
| NOT-MEASURED       |     6 | No measurement at the current detector revision                                            |
| DECLARED           |     0 | In core on an unexpired `corePromotion` — a maintainer judgement the corpus cannot support |
| EXPIRED            |     0 | The promotion lapsed; the rule resolves to `extended`                                      |

## NEEDS-SAMPLES (54)

| Rule       | Tier         |   n | n required | ciHigh | Observed FP | FPs to remove | Note                         |
| ---------- | ------------ | --: | ---------: | -----: | ----------: | ------------: | ---------------------------- |
| QA-CI-001  | quarantine   |  19 |         35 |  31.4% |       10.5% |             — | at this rate n=19, needs ≥35 |
| QA-CI-002  | extended     |  18 |         35 |  32.8% |       11.1% |             — | at this rate n=18, needs ≥35 |
| QA-CI-005  | quarantine   |  13 |         35 |  33.3% |        7.7% |             — | at this rate n=13, needs ≥35 |
| QA-CI-007  | extended     |  11 |         35 |  25.9% |        0.0% |             — | at this rate n=11, needs ≥35 |
| QA-CI-008  | quarantine   |  10 |         35 |  40.4% |       10.0% |             — | at this rate n=10, needs ≥35 |
| QA-CI-009  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-CI-010  | quarantine   |  10 |         35 |  40.4% |       10.0% |             — | at this rate n=10, needs ≥35 |
| QA-CS-101  | extended     |  20 |         35 |  16.1% |        0.0% |             — | at this rate n=20, needs ≥35 |
| QA-CS-102  | extended     |  24 |         35 |  25.9% |        8.3% |             — | at this rate n=24, needs ≥35 |
| QA-CS-103  | extended     |  11 |         35 |  25.9% |        0.0% |             — | at this rate n=11, needs ≥35 |
| QA-CS-104  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-CS-107  | extended     |  12 |         35 |  35.4% |        8.3% |             — | at this rate n=12, needs ≥35 |
| QA-CS-109  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-CYP-001 | extended     |  15 |         35 |  45.2% |       20.0% |             — | at this rate n=15, needs ≥35 |
| QA-CYP-002 | quarantine   |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-CYP-003 | quarantine   |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-JV-101  | extended     |  23 |         35 |  14.3% |        0.0% |             — | at this rate n=23, needs ≥35 |
| QA-JV-104  | extended     |  10 |         35 |  51.0% |       20.0% |             — | at this rate n=10, needs ≥35 |
| QA-JV-105  | extended     |  20 |         35 |  30.1% |       10.0% |             — | at this rate n=20, needs ≥35 |
| QA-JV-107  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-JV-109  | extended     |  18 |         35 |  17.6% |        0.0% |             — | at this rate n=18, needs ≥35 |
| QA-PW-002  | extended     |  20 |         35 |  16.1% |        0.0% |             — | at this rate n=20, needs ≥35 |
| QA-PW-003  | extended     |  10 |         35 |  40.4% |       10.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-101  | extended     |  20 |         35 |  16.1% |        0.0% |             — | at this rate n=20, needs ≥35 |
| QA-PW-102  | quarantine   |  10 |         35 |  40.4% |       10.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-104  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-113  | extended     |  11 |         35 |  25.9% |        0.0% |             — | at this rate n=11, needs ≥35 |
| QA-PW-116  | (undeclared) |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-117  | extended     |  24 |         35 |  13.8% |        0.0% |             — | at this rate n=24, needs ≥35 |
| QA-PW-121  | extended     |  12 |         35 |  24.3% |        0.0% |             — | at this rate n=12, needs ≥35 |
| QA-PW-122  | extended     |  80 |         35 |  13.8% |        6.3% |            -3 | at this rate n=80, needs ≥35 |
| QA-PW-124  | (undeclared) |  15 |         35 |  29.8% |        6.7% |             — | at this rate n=15, needs ≥35 |
| QA-PW-125  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-140  | extended     |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PW-141  | extended     |  33 |         35 |  23.6% |        9.1% |             — | at this rate n=33, needs ≥35 |
| QA-PW-142  | extended     |  11 |         35 |  47.7% |       18.2% |             — | at this rate n=11, needs ≥35 |
| QA-PW-143  | extended     |  80 |         35 |  13.8% |        6.3% |            -3 | at this rate n=80, needs ≥35 |
| QA-PW-144  | extended     |  21 |         35 |  34.6% |       14.3% |             — | at this rate n=21, needs ≥35 |
| QA-PW-146  | quarantine   |  17 |         35 |  34.3% |       11.8% |             — | at this rate n=17, needs ≥35 |
| QA-PY-001  | extended     |  12 |         35 |  24.3% |        0.0% |             — | at this rate n=12, needs ≥35 |
| QA-PY-002  | extended     |  25 |         35 |  30.0% |       12.0% |             — | at this rate n=25, needs ≥35 |
| QA-PY-005  | extended     |  23 |         35 |  32.1% |       13.0% |             — | at this rate n=23, needs ≥35 |
| QA-PY-009  | extended     |  18 |         35 |  25.8% |        5.6% |             — | at this rate n=18, needs ≥35 |
| QA-PY-011  | extended     |  10 |         35 |  40.4% |       10.0% |             — | at this rate n=10, needs ≥35 |
| QA-PY-101  | (undeclared) |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PY-103  | extended     |  25 |         35 |  25.0% |        8.0% |             — | at this rate n=25, needs ≥35 |
| QA-PY-104  | quarantine   |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PY-105  | quarantine   |  12 |         35 |  24.3% |        0.0% |             — | at this rate n=12, needs ≥35 |
| QA-PY-106  | (undeclared) |  14 |         35 |  21.5% |        0.0% |             — | at this rate n=14, needs ≥35 |
| QA-PY-107  | (undeclared) |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-PY-108  | quarantine   |  16 |         35 |  19.4% |        0.0% |             — | at this rate n=16, needs ≥35 |
| QA-SE-001  | quarantine   |  10 |         35 |  27.8% |        0.0% |             — | at this rate n=10, needs ≥35 |
| QA-SE-002  | quarantine   |  13 |         35 |  33.3% |        7.7% |             — | at this rate n=13, needs ≥35 |
| QA-SE-003  | quarantine   |  11 |         35 |  25.9% |        0.0% |             — | at this rate n=11, needs ≥35 |

## NEEDS-FP-REDUCTION (19)

| Rule         | Tier       |   n | n required | ciHigh | Observed FP | FPs to remove | Note                                                                                                                                         |
| ------------ | ---------- | --: | ---------: | -----: | ----------: | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-CS-105    | extended   |  16 |         35 |  49.5% |       25.0% |             — | observed 25.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-CS-106    | quarantine |  12 |         35 |  60.9% |       33.3% |             — | observed 33.3% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-ENV-001   | quarantine |  20 |         35 | 100.0% |      100.0% |             — | observed 100.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling |
| QA-JV-102    | extended   |  23 |         35 |  46.5% |       26.1% |             — | observed 26.1% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-JV-103    | extended   |  58 |         35 |  38.4% |       25.9% |           -14 | observed 25.9% and the interval excludes 10% — the rule is wrong, not the corpus; removing 14 false positives reaches the ceiling            |
| QA-JV-106    | quarantine |  12 |         35 |  60.9% |       33.3% |             — | observed 33.3% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-PW-004    | quarantine |  14 |         35 |  67.4% |       42.9% |             — | observed 42.9% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-PW-115    | quarantine |  16 |         35 |  76.9% |       56.3% |             — | observed 56.3% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-PW-123    | quarantine |  11 |         35 |  72.0% |       45.5% |             — | observed 45.5% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-PY-003    | quarantine |  33 |         35 |  67.5% |       51.5% |             — | observed 51.5% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-PY-012    | quarantine |  30 |         35 |  57.7% |       40.0% |             — | observed 40.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TEST-001  | quarantine |  20 |         35 |  78.1% |       60.0% |             — | observed 60.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TEST-002  | quarantine |  21 |         35 |  79.3% |       61.9% |             — | observed 61.9% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TEST-003  | quarantine |  78 |         35 |  32.2% |       21.8% |           -15 | observed 21.8% and the interval excludes 10% — the rule is wrong, not the corpus; removing 15 false positives reaches the ceiling            |
| QA-TEST-004  | extended   |  20 |         35 |  51.9% |       30.0% |             — | observed 30.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TEST-006  | quarantine |  11 |         35 |  64.6% |       36.4% |             — | observed 36.4% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TEST-010  | quarantine |  31 |         35 |  73.6% |       58.1% |             — | observed 58.1% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TQUAL-002 | quarantine |  32 |         35 |  69.1% |       53.1% |             — | observed 53.1% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |
| QA-TQUAL-011 | extended   |  25 |         35 |  43.4% |       24.0% |             — | observed 24.0% and the interval excludes 10% — the rule is wrong, not the corpus, and no amount of retraction at this n reaches the ceiling  |

## NOT-MEASURED (6)

| Rule         | Tier       |   n | n required | ciHigh | Observed FP | FPs to remove | Note                                                                                                                                                                                   |
| ------------ | ---------- | --: | ---------: | -----: | ----------: | ------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA-CI-013    | quarantine |   0 |         35 |      — |           — |             — | no measurement at the current detector revision                                                                                                                                        |
| QA-CI-014    | quarantine |   0 |         35 |      — |           — |             — | no measurement at the current detector revision                                                                                                                                        |
| QA-PW-147    | quarantine |   0 |         35 |      — |           — |             — | no measurement at the current detector revision                                                                                                                                        |
| QA-PY-004    | quarantine |   0 |         35 |      — |           — |             — | a measurement exists but predates the current detector revision — it must be RE-SAMPLED, not started; n and ciHigh are withheld because they describe a detector that no longer exists |
| QA-PY-007    | quarantine |   0 |         35 |      — |           — |             — | a measurement exists but predates the current detector revision — it must be RE-SAMPLED, not started; n and ciHigh are withheld because they describe a detector that no longer exists |
| QA-TQUAL-009 | quarantine |   0 |         35 |      — |           — |             — | no measurement at the current detector revision                                                                                                                                        |

## The queue to work from

`NEEDS-SAMPLES` is a corpus problem and belongs in Wave 5's language and
repository selection. `NEEDS-FP-REDUCTION` is a detector problem and belongs
in the next rule revision. Sorting the two into one list is how a maintainer
ends up adding ten repositories for a rule that should have been narrowed.
