# Scoring — How WORTHINESS Is Computed

> **Status (post-P2, 2026-09-08):** `NORMALIZATION_K = 5` still produces the
> documented verdicts on the measured data points (see the re-measured table
> below); the self-scan carries 2 suppression-free warning points (QA-PW-125
> tree drift, see the table). The constant remains **not fitted** against the
> corpus, but the calibration debt is now actionable: `corpus:audit` persists
> `testDeclarationCount` per repo (P2.4), so the next baseline refresh makes a
> corpus fit a measurement rather than a guess. The deduction-mass ceilings
> (v2) are boundary-frozen — their calibration inputs are recorded, their
> values are not tuned to flatter any repo.
> `SMOOTHING_C` is the standard Laplace constant (1), not a tuned value.

## Formula (v2 — deduction-mass ceilings)

```
rate  = totalDeductions / (testDeclarations + SMOOTHING_C)   // density — unchanged
score = 100 − min(100, rate × NORMALIZATION_K)
score = min(score, MASS_CEILING(totalDeductions))            // NEW absolute term
```

Then the categorical overrides, in order:

1. **Honesty guard** — if any deduction was charged, the score is capped at 99.
   100 is reserved for zero deductions. (Also the trivial case of the mass
   ceiling: > 0 pts can never read 100.)
2. **Deduction-mass ceiling (new, non-dilutable)** — an absolute deduction mass
   caps the score regardless of the denominator:

   | Evidence-discounted mass (`effectiveDeductions`) | Ceiling                                                 |
   | ------------------------------------------------ | ------------------------------------------------------- |
   | 0                                                | 100 — no ceiling (zero deductions)                      |
   | > 0                                              | 99 (the honesty guard, subsumed)                        |
   | ≥ 8                                              | 95 (subsumes the error-severity floor: 1 error ≥ 8 pts) |
   | ≥ 40                                             | 85                                                      |
   | ≥ 80                                             | 75                                                      |
   | ≥ 160                                            | 65                                                      |

3. **Error-severity floor** — if any error-level finding with a non-zero
   deduction exists, the score is capped at 95. Errors are categorical defects;
   a 10,000-declaration repo cannot outgrow them through sheer size. Since v2
   this is the ≥ 8 mass band seen from the other side — kept as a named guard
   so the law stays visible and the two cannot drift apart.
4. **Categorical override** — if any finding is suite-invalidating, the score is
   capped at `SUITE_INVALIDATED_CEILING` (49), placing it in UNWORTHY. Applied
   last, unchanged.

| Constant                    | Value                      | Fitted?                                                                            |
| --------------------------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `NORMALIZATION_K`           | 5                          | No                                                                                 |
| `SMOOTHING_C`               | 1                          | Laplace default, not fitted                                                        |
| `DEDUCTION_MASS_CEILINGS`   | 8→95, 40→85, 80→75, 160→65 | Boundaries chosen to hold the three known data points, then frozen (see changelog) |
| `ERROR_SEVERITY_CEILING`    | 95                         | Subsumed by the ≥ 8 mass band; kept as a named guard                               |
| `SUITE_INVALIDATED_CEILING` | 49                         | Derived from the 50 floor                                                          |

The `effectiveDeductions` field on the JSON report is the exact mass the
ceiling caps against — a consumer can recompute `MASS_CEILING` from the
report without re-deriving evidence levels. When the ceiling is what
binds (not density), the terminal render says `capped: deduction mass`.

## Why padding stops working

Under formula v1 the attack was arithmetic and free: fix the deduction
mass, pad the denominator. 80 warning-points of real findings over
10,000 declarations scored `100 − (80/10001) × 5 ≈ 99.96` → 99 — "one
minor issue" while the suite carried 26+ warning-grade defects. Density
normalization measures _how much of the suite is questionable_, so
growing the suite _necessarily_ shrinks the rate; padding was not a bug
in the rate, it was the rate doing exactly what it measures — and the
result was still a lie about the suite.

The mass ceiling closes the vector structurally: the ceiling's input is
the deduction mass alone, so **padding cannot move it**. The same 80
warning-points read ≤ 75 in a 40-test repo and in a 10,000-test one.
What density still gets to decide is placement _within_ the band — a
lone warning (3 pts) in a 10,000-declaration suite scores
`100 − (3/10001) × 5 ≈ 99.9` → 99, untouched by any ceiling. Small
masses stay the density formula's legitimate domain (the design intent
of normalization is preserved); large masses stop being dilutable.

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
| 100     | FORGED     |
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

## Error-severity floor

If any error-level finding with a non-zero deduction exists, the score is
capped at 95 (`ERROR_SEVERITY_CEILING`). This prevents error-severity findings
from becoming invisible at scale.

The problem: 10 errors (80 deduction points) in a 10,000-declaration repo
scores `100 - (80 / 10001) * 5 ≈ 99.96`, which rounds to 100 and gets capped
at 99 by the honesty guard. A score of 99 reads as "one minor issue" when
there are actually 10 categorical defects.

The floor ensures errors always have visible impact on the score. You cannot
outgrow them by adding more declarations — the only way to get above 95 is to
fix the errors.

Since formula v2 this floor is the ≥ 8 deduction-mass band's named special
case (1 error ≥ 8 pts always crosses the band), and the mass ceiling extends
the same non-dilutable logic to warning/info masses — 80 warning-points of
real findings now read ≤ 75 at any suite size, where v1 read 99.

## Current measured behavior

Measured at the Phase-5 constants (still current): `NORMALIZATION_K = 5`,
`SMOOTHING_C = 1`, and — since v2 — the mass ceilings:

| Repo                 | Declarations | Raw pts | Score | Verdict    | Driver                  |
| -------------------- | ------------ | ------- | ----- | ---------- | ----------------------- |
| this repo            | 1126         | 0       | 100   | WORTHY     | zero deductions         |
| `tests/golden/repo`  | 4            | 40      | 49    | UNWORTHY   | `it.only` (categorical) |
| `examples/demo-repo` | 2            | 20      | 67    | NEEDS WORK | density                 |

All three verdict bands are reachable, and each is reached for a different and
stated reason rather than by an arithmetic accident. The v2 mass ceiling
re-verified all three: self 0 pts (no ceiling), golden 40 pts (below the ≥ 40
band; categorical driver unchanged), demo 20 pts (below the ≥ 40 band; density
driver unchanged). The known data points hold without tuning the boundaries.

**Re-measured 2026-09-08 at v0.5.33 (post-P2), same tree, ceilings active** —
the corpus and the registry grew since the Phase-5 table, and the numbers moved
with the tree, not with the formula:

| Repo                 | Declarations | Raw pts       | Score | Verdict    | Driver                                |
| -------------------- | ------------ | ------------- | ----- | ---------- | ------------------------------------- |
| this repo            | 3480         | 2             | 99    | WORTHY     | honesty guard (2 new QA-PW-125 fires) |
| `tests/golden/repo`  | 4            | 16 (--strict) | 49    | UNWORTHY   | `it.only` (categorical — unchanged)   |
| `examples/demo-repo` | 7            | 40            | 75    | NEEDS WORK | density (85 ceiling does not bind)    |

The drifted rows are re-measured evidence, not regressions: scores are
identical with and without the v2 ceiling at these masses (2 pts and 40 pts
cross no band; the golden repo's 49 is the categorical override, reproduced
exactly under `--strict`). The declaration-count persistence added to
`corpus:audit` (P2.4) is what makes the next calibration a measurement instead
of this kind of hand-check.

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
