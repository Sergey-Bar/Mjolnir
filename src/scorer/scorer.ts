/**
 * Transparent scorer (Product-MVP §8).
 * score = 100 − Σ(severity deductions), floor 0.
 * Constants are public API — changes require changelog + version bump.
 * Missing data never penalizes: unanalyzed dimensions are excluded (§18.2).
 */

import {
  DEDUCTIONS,
  deriveEvidenceLevel,
  isAdvisoryFinding,
  type DimensionScore,
  type Finding,
  type RuleCategory,
} from "../types.js";

/**
 * Stamp the honest evidence level on every finding (Honesty Core Phase 1).
 * Rules may override via RuleMeta.evidenceLevel (applied by the rule
 * runner); anything unstamped gets the conservative derivation from
 * findingType+confidence. Idempotent — safe to call twice.
 */
export function stampEvidenceLevels(
  findings: Finding[],
  overrides?: ReadonlyMap<string, unknown>,
): void {
  for (const f of findings) {
    const override = overrides?.get(f.ruleId);
    if (
      typeof override === "string" &&
      (override === "E0" || override === "E1" || override === "E2")
    ) {
      f.evidenceLevel = override;
    } else if (!f.evidenceLevel) {
      f.evidenceLevel = deriveEvidenceLevel(f.findingType, f.confidence);
    }
  }
}

/**
 * Honest deduction for one finding (Honesty Core Phase 2):
 *   E2 — full deduction for its severity.
 *   E1 — half deduction, rounded down (pattern evidence, not proof).
 *   E0 — zero. An observation is not a defect; charging points for it
 *        would be turning missing evidence into confidence.
 */
export function deductionFor(finding: Finding): number {
  const level =
    finding.evidenceLevel ??
    deriveEvidenceLevel(finding.findingType, finding.confidence);
  // Severity is the closed enum and DEDUCTIONS covers all of it, so the
  // base is always a number — no fallback arm to hide a typo behind.
  const base = DEDUCTIONS[finding.severity];
  if (level === "E0") return 0;
  if (level === "E1") return Math.floor(base / 2);
  return base;
}

export function computeDimensions(findings: Finding[]): DimensionScore[] {
  const byCategory = new Map<RuleCategory, DimensionScore>();
  // Audit M5: single pass. The deduction used to be recomputed in a
  // SECOND loop per category — O(categories × findings) — and every
  // pass re-derived the evidence level. One pass accumulates both.
  const deductions = new Map<RuleCategory, number>();
  for (const f of findings) {
    let dim = byCategory.get(f.category);
    if (!dim) {
      dim = {
        category: f.category,
        score: 100,
        errors: 0,
        warnings: 0,
        infos: 0,
      };
      byCategory.set(f.category, dim);
      deductions.set(f.category, 0);
    }
    if (f.severity === "error") dim.errors++;
    else if (f.severity === "warning") dim.warnings++;
    else dim.infos++;
    deductions.set(
      f.category,
      (deductions.get(f.category) as number) + deductionFor(f),
    );
  }
  for (const dim of byCategory.values()) {
    // Every dimension's category was seeded into deductions above, so
    // the lookup is always defined.
    dim.score = Math.max(0, 100 - (deductions.get(dim.category) as number));
  }
  return [...byCategory.values()].sort((a, b) =>
    a.category.localeCompare(b.category),
  );
}

/**
 * Normalization constants (Phase 5, revised).
 *
 *   rate  = totalDeductions / (testDeclarations + SMOOTHING_C)
 *   score = 100 − min(100, rate × NORMALIZATION_K)
 *
 * Two deliberate choices:
 *
 * 1. The denominator counts TEST DECLARATIONS, not files. File count is
 *    trivially gameable — adding empty spec files raises the score without
 *    adding verification. Inflating declaration count requires writing real
 *    tests, which is the behavior the score is supposed to reward.
 *
 * 2. **Additive (Laplace) smoothing** stops small suites from exploding. With a
 *    raw ratio, a 1-declaration repo with one error scored 0 and a
 *    2-declaration repo scored 0, making the whole scale bimodal: 98 or 0,
 *    nothing between. `SMOOTHING_C = 1` is the standard Laplace constant — a
 *    named default rather than a value tuned until this repo looked good.
 *
 * NORMALIZATION_K remains unfitted. A corpus fit against the six real repos
 * plus the golden repo is outstanding work. docs/SCORING.md says so plainly;
 * picking a value that flatters the self-scan and calling it calibrated is the
 * error the original FP-AUDIT made and must not be repeated.
 */
export const NORMALIZATION_K = 5;
export const SMOOTHING_C = 1;

/**
 * Ceiling applied when any finding is suite-invalidating.
 *
 * Density normalization answers "how much of this suite is questionable". It
 * cannot answer "did the suite run at all" — and when `.only` is committed, it
 * did not. One point below the NEEDS WORK floor, so such a repo lands in
 * UNWORTHY on the categorical fact rather than on an averaged rate.
 */
export const SUITE_INVALIDATED_CEILING = 49;

/**
 * Error-severity floor.
 *
 * If any error-level finding with a non-zero deduction exists, the score is
 * capped at this value regardless of how large the denominator grows. Errors
 * are categorical defects — a 10,000-test repo with a committed `.only` is
 * not 99% worthy; it is fundamentally compromised on that axis.
 */
export const ERROR_SEVERITY_CEILING = 95;

/**
 * Deduction-mass ceilings (product-gap-remediation master plan P2,
 * plan 1788853205786 — structural anti-dilution, decision 4).
 *
 * The Goodhart vector the density formula permits: fixed deduction mass
 * ÷ padded denominator → score → 99. A repo with 80 warning-points of
 * real findings and 10,000 test declarations reads 99+ ("one minor
 * issue") because the RATE is tiny — the padding is free. Density stays
 * as the legitimate differentiator for small masses (a lone warning in
 * a 10k suite must still read ≥ 95), but it can no longer dilute a
 * large mass: each absolute deduction-mass band caps the score. Padding
 * cannot move a ceiling — the vector is structurally closed. 80
 * warning-pts read ≤ 75 in ANY suite size.
 *
 * The error-severity floor (95) is the ≥ 8 band seen from the other
 * side: 1 error ≥ 8 pts, so it is subsumed and left standing as a named
 * special case for prose continuity. The > 0 band is the honesty guard
 * (clampWithFindings) — subsumed as well.
 *
 * Calibration (P2.4): these boundaries were chosen to hold the three
 * known data points (self 100, golden 49 via suiteVoided, demo 67) and
 * are then FROZEN with a changelog entry. Never tune them to flatter a
 * repo (docs/SCORING.md Correction section is the precedent).
 */
export const DEDUCTION_MASS_CEILINGS: ReadonlyArray<{
  minMass: number;
  ceiling: number;
}> = [
  { minMass: 160, ceiling: 65 },
  { minMass: 80, ceiling: 75 },
  { minMass: 40, ceiling: 85 },
  { minMass: 8, ceiling: 95 },
];

/**
 * The score ceiling for a given evidence-discounted deduction mass.
 * 0 → no ceiling (the 100 honesty guard lives in clampWithFindings);
 * below the smallest band → no ceiling beyond the named guards.
 * Exported for the JSON contract (effectiveDeductions) and the tests.
 */
export function massCeiling(totalDeduction: number): number | null {
  for (const band of DEDUCTION_MASS_CEILINGS) {
    if (totalDeduction >= band.minMass) return band.ceiling;
  }
  return null;
}

export interface ExposureMetrics {
  /** Test declarations found across scanned files (it/test/def test_/@Test). */
  testDeclarations: number;
  /** Test files scanned. Retained for reporting, no longer the denominator. */
  testFileCount: number;
  /** Rule IDs whose findings void the suite's pass claim (RuleMeta flag). */
  suiteInvalidatingRuleIds?: ReadonlySet<string>;
}

export function computeTotal(
  dimensions: DimensionScore[],
  findings: Finding[],
  exposure?: ExposureMetrics | number,
): number {
  if (findings.length === 0) return 100;
  // Deductions are enum-total (see deductionFor): every finding charges
  // its severity's constant, adjusted by evidence level — the sum is
  // finite by construction, so no NaN-guard arm is needed here.
  let totalDeduction = 0;
  for (const f of findings) {
    totalDeduction += deductionFor(f);
  }

  // A number is accepted for backward compatibility with callers that only
  // have a file count; it is treated as a declaration estimate.
  const declarations =
    typeof exposure === "number" ? exposure : (exposure?.testDeclarations ?? 0);

  const invalidating =
    typeof exposure === "object"
      ? (exposure?.suiteInvalidatingRuleIds ?? EMPTY_RULE_IDS)
      : EMPTY_RULE_IDS;
  const suiteVoided = findings.some((f) => invalidating.has(f.ruleId));

  let score: number;
  if (declarations > 0 || typeof exposure === "object") {
    const rate = totalDeduction / (declarations + SMOOTHING_C);
    score = clampWithFindings(
      100 - Math.min(100, rate * NORMALIZATION_K),
      totalDeduction,
    );
  } else {
    score = clampWithFindings(100 - totalDeduction, totalDeduction);
  }

  // Deduction-mass ceiling (P2.1, structural anti-dilution): an absolute
  // floor on the score that the denominator cannot move. Applied before
  // the categorical overrides — density still decides within a band;
  // the band decides the ceiling. The error-severity floor below is the
  // ≥ 8 band's named special case and cannot raise the score past it.
  const ceiling = massCeiling(totalDeduction);
  if (ceiling !== null && score > ceiling) score = ceiling;

  // Error-severity floor: if any error-level finding exists, cap at 95.
  // Errors are categorical defects — a 10,000-test repo with a committed
  // .only is not 99% worthy, it's fundamentally compromised on that axis.
  // (P2: subsumed by the ≥ 8 mass band — 1 error ≥ 8 pts — kept as the
  // named guard so the law stays visible and the two cannot drift.)
  const hasErrors = findings.some(
    (f) => f.severity === "error" && deductionFor(f) > 0,
  );
  if (hasErrors && score > ERROR_SEVERITY_CEILING)
    score = ERROR_SEVERITY_CEILING;

  // Categorical override: a suite that did not fully run cannot be WORTHY, and
  // a large denominator must not be able to average that fact away.
  return suiteVoided ? Math.min(score, SUITE_INVALIDATED_CEILING) : score;
}

const EMPTY_RULE_IDS: ReadonlySet<string> = new Set();

/**
 * Honesty guard: a repo with a real deduction must never render 100.
 *
 * Normalization can round a single low-evidence finding in a large suite up
 * to a perfect score, which reads as "nothing found" when something was. Cap
 * at 99 whenever any deduction was charged; E0/advisory findings cost nothing
 * and correctly leave the score at 100.
 */
function clampWithFindings(raw: number, totalDeduction: number): number {
  const rounded = Math.max(0, Math.round(raw));
  if (totalDeduction > 0 && rounded >= 100) return 99;
  return rounded;
}

/**
 * Count test declarations across the languages the scanner supports.
 *
 * Deliberately counts DECLARATIONS, not assertions: the unit of exposure is
 * "how many behaviors claim to be verified here". Runs against the code-only
 * view when available so declarations quoted inside strings are not counted.
 */
export function countTestDeclarations(text: string, codeText?: string): number {
  const source = codeText ?? text;
  const patterns = [
    // JS/TS: it(, test(, it.each(, test.skip( — describe( is a grouping
    // construct, not a behavior claim, so it is excluded.
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    /\b(?:it|test)(?:\.\w+)*\s*(?:\(|`)/g,
    // Python: def test_…
    // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
    /^\s*(?:async\s+)?def\s+test_\w*/gm,
    // Java / C# attributes and annotations
    /^\s*@Test\b/gm,
    /^\s*\[(?:Test|Fact|Theory|TestMethod)\b/gm,
  ];
  let count = 0;
  for (const re of patterns) {
    re.lastIndex = 0;
    while (re.exec(source) !== null) count++;
  }
  return count;
}

/** Findings that must never gate CI or cost score (Honesty Core). */
export function advisoryFindings(findings: readonly Finding[]): Finding[] {
  return findings.filter(isAdvisoryFinding);
}
