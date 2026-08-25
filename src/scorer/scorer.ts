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
  const base = DEDUCTIONS[finding.severity];
  if (level === "E0") return 0;
  if (level === "E1") return Math.floor(base / 2);
  return base;
}

export function computeDimensions(findings: Finding[]): DimensionScore[] {
  const byCategory = new Map<RuleCategory, DimensionScore>();
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
    }
    if (f.severity === "error") dim.errors++;
    else if (f.severity === "warning") dim.warnings++;
    else dim.infos++;
  }
  for (const dim of byCategory.values()) {
    let deduction = 0;
    for (const f of findings) {
      if (f.category !== dim.category) continue;
      deduction += deductionFor(f);
    }
    dim.score = Math.max(0, 100 - deduction);
  }
  return [...byCategory.values()].sort((a, b) =>
    a.category.localeCompare(b.category),
  );
}

export function computeTotal(
  dimensions: DimensionScore[],
  findings: Finding[],
): number {
  if (findings.length === 0) return 100;
  // Total derives from per-finding honest deductions so overlapping
  // categories can't double-discount beyond the floor. Advisory (E0)
  // findings contribute nothing.
  const totalDeduction = findings.reduce((sum, f) => sum + deductionFor(f), 0);
  // `dimensions` is part of the public signature; per-dimension weighting
  // may use it in the future. Today the total is finding-driven only.
  return Math.max(0, 100 - totalDeduction);
}

/** Findings that must never gate CI or cost score (Honesty Core). */
export function advisoryFindings(findings: readonly Finding[]): Finding[] {
  return findings.filter(isAdvisoryFinding);
}
