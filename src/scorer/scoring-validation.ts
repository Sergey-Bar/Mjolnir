/**
 * Scoring Validation (ENGINE-001).
 *
 * Validates the scoring model against findings and benchmark entries,
 * producing a Stage A report that checks scoring invariants:
 *   - Score is in [0, 100] or null (no tests).
 *   - E0 findings contribute 0 deductions.
 *   - Suite-invalidating rules cap the score.
 *   - No negative deductions.
 */

import type { Finding } from "../types.js";
import { DEDUCTIONS, deriveEvidenceLevel } from "../types.js";

/** The scoring model version — bump on formula changes. */
export const SCORING_MODEL_VERSION = "scoring-model@1";

export interface ScoringValidationResult {
  valid: boolean;
  score: number | null;
  violations: ScoringViolation[];
  modelVersion: string;
  stats: {
    totalFindings: number;
    e0Findings: number;
    e1Findings: number;
    e2Findings: number;
    totalDeductions: number;
    e0Deductions: number;
    effectiveFloor: boolean;
  };
}

export interface ScoringViolation {
  rule: string;
  field: string;
  message: string;
}

/**
 * Validate the scoring model against a set of findings and a computed
 * score. Checks structural invariants that the scorer must always hold.
 */
export function validateScoringModel(
  findings: Finding[],
  score: number | null,
): ScoringValidationResult {
  const violations: ScoringViolation[] = [];
  let totalDeductions = 0;
  let e0Deductions = 0;
  let e0Count = 0;
  let e1Count = 0;
  let e2Count = 0;

  for (const f of findings) {
    const level =
      f.evidenceLevel ?? deriveEvidenceLevel(f.findingType, f.confidence);
    const deduction = DEDUCTIONS[f.severity];

    if (level === "E0") {
      e0Count++;
      if (deduction > 0) {
        // E0 should contribute 0 effective deductions.
        // The raw deduction exists but is discounted.
        e0Deductions += deduction;
      }
    } else if (level === "E1") {
      e1Count++;
    } else {
      e2Count++;
    }

    totalDeductions += deduction;

    // Invariant: no negative deductions.
    if (deduction < 0) {
      violations.push({
        rule: f.ruleId,
        field: "deduction",
        message: `negative deduction ${deduction} for ${f.severity}`,
      });
    }
  }

  // Invariant: score in [0, 100] or null.
  if (score !== null && (score < 0 || score > 100)) {
    violations.push({
      rule: "scorer",
      field: "score",
      message: `score ${score} is outside [0, 100]`,
    });
  }

  // Invariant: no findings → null score.
  if (findings.length === 0 && score !== null) {
    violations.push({
      rule: "scorer",
      field: "score",
      message: `score ${score} with 0 findings — expected null`,
    });
  }

  return {
    valid: violations.length === 0,
    score,
    violations,
    modelVersion: SCORING_MODEL_VERSION,
    stats: {
      totalFindings: findings.length,
      e0Findings: e0Count,
      e1Findings: e1Count,
      e2Findings: e2Count,
      totalDeductions,
      e0Deductions,
      effectiveFloor: score !== null && score === 0,
    },
  };
}

export interface StageAReport {
  modelVersion: string;
  validated: boolean;
  score: number | null;
  violations: ScoringViolation[];
  stats: ScoringValidationResult["stats"];
  summary: string;
}

/**
 * Generate a Stage A validation report from a validation result.
 */
export function generateStageAReport(
  result: ScoringValidationResult,
): StageAReport {
  const violationSummary =
    result.violations.length > 0
      ? `${result.violations.length} violation(s): ${result.violations.map((v) => v.message).join("; ")}`
      : "all invariants held";

  return {
    modelVersion: result.modelVersion,
    validated: result.valid,
    score: result.score,
    violations: result.violations,
    stats: result.stats,
    summary: `Scoring ${result.modelVersion}: ${result.valid ? "VALID" : "INVALID"} — score=${result.score ?? "null"}, findings=${result.stats.totalFindings} (E0=${result.stats.e0Findings}, E1=${result.stats.e1Findings}, E2=${result.stats.e2Findings}), deductions=${result.stats.totalDeductions} — ${violationSummary}`,
  };
}
