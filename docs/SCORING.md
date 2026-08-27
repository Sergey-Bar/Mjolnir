# Scoring — How WORTHINESS Is Computed

> **Status (post-Sprint 8):** `NORMALIZATION_K = 5` produces correct verdicts
> on all three known data points (see table below) and the self-scan scores 100
> with 5 suppressions (down from 19 after the `isInsideEmbeddedCode`
> architectural fix). The constant is **not fitted** against the 6-repo corpus
> because the corpus baselines record `totalFindings` but not
> `testDeclarationCount` — a full calibration requires the `corpus:audit`
> script to also persist declaration counts per repo (TODO added).
> `SMOOTHING_C` is the standard Laplace constant (1), not a tuned value.

## Formula

```
rate  = totalDeductions / (testDeclarations + SMOOTHING_C)
score = 100 − min(100, rate × NORMALIZATION_K)
```

Then two overrides, in order:

1. **Honesty guard** — if any deduction was charged, the score is capped at 99.
   100 is reserved for zero deductions.
2. **Categorical override** — if any finding is suite-invalidating, the score is
   capped at `SUITE_INVALIDATED_CEILING` (49), placing it in UNWORTHY.

| Constant                    | Value | Fitted?                     |
| --------------------------- | ----- | --------------------------- |
| `NORMALIZATION_K`           | 5     | No                          |
| `SMOOTHING_C`               | 1     | Laplace default, not fitted |
| `SUITE_INVALIDATED_CEILING` | 49    | Derived from the 50 floor   |

## Per-Finding Deductions

| Severity | Base Points |
| -------- | ----------- |
| error    | 8           |
| warning  | 3           |
| info     | 1           |

These three are public API. Changing them requires a changelog entry and a
version bump.

## Evidence-Level Discount (Honesty Core)

| Level | Meaning             | Deduction           |
| ----- | ------------------- | ------------------- |
| E2    | Deterministic proof | Full                |
| E1    | Pattern evidence    | Half (rounded down) |
| E0    | Observation only    | Zero                |

## Verdict Bands

| Score   | Verdict    |
| ------- | ---------- |
| ≥ 80    | WORTHY     |
| 50 – 79 | NEEDS WORK |
| < 50    | UNWORTHY   |

## Why the denominator counts declarations, not files

The first normalization attempt divided by test-file count. Two problems:

1. **Gameable.** Adding empty spec files raised the score without adding any
   verification. The denominator rewarded the wrong behavior.
2. **Bimodal.** A raw ratio made small suites explode: a 1-file repo with four
   findings and a 2-file repo with five findings both scored 0, while a
   99-file repo scored 98. Two of the three verdict bands were unreachable in
   practice even after the fix that was supposed to open them.

Counting declarations (`it(`, `test(`, `def test_`, `@Test`, `[Test]`) makes
the denominator the number of behaviors that claim to be verified. Inflating it
requires writing real tests.

## Why some findings bypass normalization entirely

Density answers "how much of this suite is questionable". It cannot answer "did
the suite run at all".

A committed `.only` makes the runner execute one test and skip every other one.
A green result is then not evidence about the rest of the suite — and no
denominator should be able to average that away. A two-test repo with `.only`
is as compromised as a two-thousand-test one.

Rules declaring `suiteInvalidating: true` cap the score into UNWORTHY:

| Rule        | Mechanism                                   |
| ----------- | ------------------------------------------- |
| QA-TEST-001 | `.only` / focus modifier committed          |
| QA-PY-001   | committed `-k` filter or `::node` selection |

`QA-PW-003` detects `test.only()` **and** `page.pause()`, so it is deliberately
not marked — the flag is per-rule, and marking it would let a `page.pause()`
finding void a suite it does not actually bypass. Per-finding granularity is
the fix if that rule needs to participate.

## Honesty guard

A score of exactly 100 is reserved for repos with **zero deductions**. If any
finding charged points, the score is capped at 99 — normalization could
otherwise round a real finding up to a perfect score, which reads as "nothing
found" when something was. E0/advisory findings cost nothing and correctly
leave a clean repo at 100.

## Current measured behavior

Measured after the FP fixes and the `isInsideEmbeddedCode` architectural fix,
with the constants above:

| Repo                 | Declarations | Raw pts | Score | Verdict    | Driver                  |
| -------------------- | ------------ | ------- | ----- | ---------- | ----------------------- |
| this repo            | 1126         | 0       | 100   | WORTHY     | zero deductions         |
| `tests/golden/repo`  | 4            | 40      | 49    | UNWORTHY   | `it.only` (categorical) |
| `examples/demo-repo` | 2            | 20      | 67    | NEEDS WORK | density                 |

All three verdict bands are reachable, and each is reached for a different and
stated reason rather than by an arithmetic accident.

Suppression count: **5** (down from 19). The 14 eliminated suppressions were
masking-gap false positives on test-data strings — now handled architecturally
by `isInsideEmbeddedCode` in QA-TEST-003 and QA-TEST-010. The 5 remaining
suppressions address real edge cases (assert-by-throwing-helper, intentional
skip, shared mutable state by design, CI best-effort fallback).

### Correction

An earlier revision of this page claimed `examples/demo-repo` contained a
committed `test.only()`. It does not — it holds two plain `test()` calls; the
`.only` is in `tests/golden/repo/src/auth.spec.ts`. The claim was written from
memory of a different fixture's scan output and never checked against the file.

It is recorded here rather than quietly removed, because publishing an
unverified observation as measured evidence is the specific failure this
document exists to avoid repeating.

## Transparency

Terminal output shows the numerator and denominator next to the gauge:

```
WORTHINESS  100/100  WORTHY
##############################
```

JSON output carries `rawDeductions`, `testDeclarationCount`, and
`testFileCount` so any consumer can recompute the score independently.

## Contract

- `score` remains `number | null` (unchanged).
- Verdict thresholds (80, 50) are not part of the frozen contract.
- The deduction table (8/3/1) **is** public API.
- `NORMALIZATION_K` will change when the corpus fit lands. That change will be
  recorded in the CHANGELOG as a behavioral break.
