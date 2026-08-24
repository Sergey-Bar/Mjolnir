/**
 * Transparent scorer (Product-MVP §8).
 * score = 100 − Σ(severity deductions), floor 0.
 * Constants are public API — changes require changelog + version bump.
 * Missing data never penalizes: unanalyzed dimensions are excluded (§18.2).
 */

import {
  DEDUCTIONS,
  SEVERITY_ORDER,
  type DimensionScore,
  type Finding,
  type RuleCategory,
} from "../types.js";

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
    dim.score = Math.max(
      0,
      100 -
        dim.errors * DEDUCTIONS.error -
        dim.warnings * DEDUCTIONS.warning -
        dim.infos * DEDUCTIONS.info,
    );
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
  // Total derives from raw deductions so overlapping categories can't
  // double-discount beyond the floor.
  const totalDeduction = findings.reduce((sum, f) => {
    const idx = SEVERITY_ORDER.indexOf(f.severity);
    return sum + DEDUCTIONS[SEVERITY_ORDER[idx] ?? "info"];
  }, 0);
  void dimensions; // kept for future per-dimension weighting
  return Math.max(0, 100 - totalDeduction);
}
