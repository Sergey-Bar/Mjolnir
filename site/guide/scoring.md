# How the score works

Mjölnir reports one number — **WORTHINESS**, 0–100 — and it is fully
transparent: a deduction table, a normalization step, and three ceilings.
No model, no weights you can't see.

## The formula

```
rate  = totalDeductions / (testDeclarations + 1)
score = 100 − min(100, rate × 5)
```

The denominator is the number of **test declarations** (`it(`, `test(`,
`def test_`, `@Test`, `[Test]`) — the count of behaviors that claim to be
verified. It is not the file count: adding empty spec files used to raise
the score without adding any verification. Inflating a declaration count
requires writing real tests.

The `+ 1` is a Laplace smoothing constant so a tiny suite with one finding
doesn't collapse to zero.

<ScoreExplainer />

## Per-finding deductions

| Severity | Base points |
| -------- | ----------- |
| error    | 8           |
| warning  | 3           |
| info     | 1           |

These three numbers are **public API** — changing them takes a changelog
entry and a version bump.

## Evidence weighting

Every finding carries an evidence level that scales its deduction, so a
heuristic match costs less than a structural proof:

| Level | Meaning              | Deduction         | Example                                            |
| ----- | -------------------- | ----------------- | -------------------------------------------------- |
| E2    | Deterministic defect | Full              | `.only` committed — structurally provable          |
| E1    | Heuristic pattern    | Half (round down) | regex-matched `sleep()` — strong signal, not proof |
| E0    | Observation          | Zero (info only)  | reported, never gates or deducts                   |

Most rules are **E1**. "We prove it" refers to this system: E2 findings
are structural proof; E1 findings are correctly-positioned warnings, not
formal proofs.

## Three ceilings, applied in order

1. **Honesty guard** — if any deduction was charged at all, the score is
   capped at 99. A perfect 100 is reserved for zero deductions, so a
   rounded-up finding can never read as "nothing found".
2. **Error-severity floor** — if any error-level finding with a non-zero
   deduction exists, the score is capped at 95. Ten errors in a
   10,000-declaration repo would otherwise round to 100. You cannot
   outgrow a categorical defect by adding tests.
3. **Suite-invalidating override** — a committed `.only` (or a `-k`
   filter) makes the runner skip everything else; the green result is not
   evidence about the rest of the suite. Rules that detect this cap the
   score at **49** — straight into UNWORTHY — regardless of suite size.

## Verdict bands

| Score   | Verdict          |
| ------- | ---------------- |
| 100     | ⚡ **FORGED**    |
| ≥ 80    | ✓ **WORTHY**     |
| 50 – 79 | ⚠ **NEEDS WORK** |
| < 50    | ✖ **UNWORTHY**   |

An empty repo scores `null`, never a fake 100. `FORGED` is the premium
100-state — zero deductions, zero findings, the suite is clean.

## Transparency

The terminal prints the numerator and denominator next to the gauge. JSON
output carries `rawDeductions`, `testDeclarationCount` and `testFileCount`
so any consumer can recompute the score independently.

::: info Calibration status
`NORMALIZATION_K = 5` produces the correct verdict on every known data
point but is **not yet fitted** against the OSS corpus — that needs the
corpus audit to persist per-repo declaration counts first. When the fit
lands, `K` changes and the CHANGELOG records it as a behavioral break.
The full calibration history and the reasoning behind every constant is
in [`docs/SCORING.md`](https://github.com/Sergey-Bar/Mjolnir/blob/main/docs/SCORING.md).
:::
