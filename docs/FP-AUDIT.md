# False-Positive Audit — Measured Rates

**Generated from `tests/corpus/verdicts/*.jsonl` — do not edit by hand.**

Each finding below was hand-classified by reading its source context.
The FP rate is `FP / (TP + FP)` — UNSURE verdicts are excluded from the
denominator (they add sample size but not confidence in either direction).

A rule with fewer than 10 classified verdicts is **unmeasured**. Coverage
below is stated against the full rule registry, not against the rules that
happen to have been sampled.

Last generated: 2026-08-27.

## Summary

_No verdicts recorded. Every rule in the registry is unmeasured._

Run `npm run corpus:sample` to generate review sheets, classify them by
reading the cited source, then record verdicts in
`tests/corpus/verdicts/<repo>.jsonl`.

## Tier Assignment Criteria

| Tier          | FP Rate | Meaning                               |
| ------------- | ------- | ------------------------------------- |
| ✅ core       | ≤ 10%   | Ships in the default report           |
| ⚠️ extended   | ≤ 30%   | Included by default, lower confidence |
| 🔴 quarantine | > 30%   | Opt-in only (`--strict`)              |
| ❓ unmeasured | n < 10  | Cannot ship in core until measured    |

## Coverage: 0/84 rules measured (0%) at n ≥ 10

**84 rules carry no measured FP rate.** Any of them in the
core tier is shipping on an unverified assumption.
