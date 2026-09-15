/**
 * Evidence Level Enforcement (ENGINE-003).
 *
 * Derives evidence levels from finding types and confidence, provides
 * predicates for advisory/point-deduction behavior, and detects
 * evidence-level gaming patterns where rules might claim stronger
 * evidence than their finding type supports.
 */

import type {
  FindingType,
  Confidence,
  EvidenceLevel,
  Finding,
} from "../types.js";
import { deriveEvidenceLevel } from "../types.js";

/**
 * Derive the evidence level for a finding given its type and confidence.
 * This is the canonical derivation from types.ts — re-exported here
 * with additional enforcement semantics.
 */
export { deriveEvidenceLevel };

/**
 * Whether a finding at this evidence level is purely advisory (E0).
 * Advisory findings are reported but never gate CI or deduct points.
 */
export function isE0Advisory(
  findingType: FindingType,
  confidence: Confidence,
  evidenceLevel?: EvidenceLevel,
): boolean {
  const level = evidenceLevel ?? deriveEvidenceLevel(findingType, confidence);
  return level === "E0";
}

/**
 * Whether a finding at this evidence level can deduct points from the
 * score. E0 findings are observations and charge 0; E1+ can deduct.
 */
export function canDeductPoints(
  findingType: FindingType,
  confidence: Confidence,
  evidenceLevel?: EvidenceLevel,
): boolean {
  const level = evidenceLevel ?? deriveEvidenceLevel(findingType, confidence);
  return level !== "E0";
}

export interface GamingReport {
  /** Whether gaming was detected. */
  gamingDetected: boolean;
  /** Findings that appear to game the evidence level. */
  suspiciousFindings: GamingSuspicion[];
  /** Summary stats. */
  stats: {
    totalFindings: number;
    overriddenFindings: number;
    suspiciousCount: number;
  };
}

export interface GamingSuspicion {
  ruleId: string;
  file: string;
  line: number;
  declaredLevel: EvidenceLevel;
  derivedLevel: EvidenceLevel;
  reason: string;
}

/**
 * Detect evidence-level gaming: findings whose declared evidence level
 * is stronger than their findingType+confidence supports, or rules that
 * systematically claim E2 while using heuristic-risk finding types.
 */
export function detectEvidenceLevelGaming(findings: Finding[]): GamingReport {
  const suspicious: GamingSuspicion[] = [];
  let overridden = 0;

  for (const f of findings) {
    const derived = deriveEvidenceLevel(f.findingType, f.confidence);
    const declared = f.evidenceLevel ?? derived;

    if (declared !== derived) overridden++;

    // Gaming pattern 1: declared level is stronger than derived.
    const levelOrder = { E0: 0, E1: 1, E2: 2 };
    if (levelOrder[declared] > levelOrder[derived]) {
      suspicious.push({
        ruleId: f.ruleId,
        file: f.file,
        line: f.line,
        declaredLevel: declared,
        derivedLevel: derived,
        reason: `declared ${declared} exceeds derived ${derived} for findingType=${f.findingType}/confidence=${f.confidence}`,
      });
    }

    // Gaming pattern 2: observation type claiming non-E0.
    if (f.findingType === "observation" && declared !== "E0") {
      suspicious.push({
        ruleId: f.ruleId,
        file: f.file,
        line: f.line,
        declaredLevel: declared,
        derivedLevel: "E0",
        reason: `observation findingType must be E0, got ${declared}`,
      });
    }

    // Gaming pattern 3: low-confidence deterministic-defect claiming E2.
    if (
      f.findingType === "deterministic-defect" &&
      f.confidence === "low" &&
      declared === "E2"
    ) {
      suspicious.push({
        ruleId: f.ruleId,
        file: f.file,
        line: f.line,
        declaredLevel: "E2",
        derivedLevel: "E1",
        reason: `low-confidence deterministic-defect should be E1, not E2`,
      });
    }
  }

  return {
    gamingDetected: suspicious.length > 0,
    suspiciousFindings: suspicious,
    stats: {
      totalFindings: findings.length,
      overriddenFindings: overridden,
      suspiciousCount: suspicious.length,
    },
  };
}
