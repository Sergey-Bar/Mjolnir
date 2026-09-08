/**
 * Trust summary metrics (Mega MVP Master Plan v3.1 §26 WI-3, formulas §6).
 *
 * Scan-level `trustSummary` — a MEASUREMENT, not a contract: additive
 * JSON, published formulas (docs/SCORING.md §Trust summary formulas v1),
 * hard incompleteness ceilings. A summary may never claim more certainty
 * than the scan that produced it (the acceptance law: no confidence
 * above its ceiling on partial scans).
 *
 * Pure functions only; deterministic; no clock, no randomness. This is
 * the SINGLE definition site — surfaces render it, they never re-derive
 * it (plan §18: one semantic truth).
 *
 * The four metrics (§6):
 *   confidence             — deterministic composite in [0,1]: the
 *                            evidence mass behind the scan's own claims,
 *                            capped by the incompleteness ceiling.
 *   evidenceCoverage       — evidenceBackedDeclarations / analyzedDeclarations.
 *   inconclusiveRate       — INCONCLUSIVE classifications + scan-level
 *                            unknowns, over (findings + unknowns).
 *   measuredFpOfFiredRules — evidence-weighted measured FP rate over
 *                            fired rules; unmeasured fired rules are
 *                            disclosed PROVISIONAL.
 */

import type {
  Finding,
  ScanResult,
  TrustLevel,
  TrustSummary,
} from "../types.js";
import { isAdvisoryFinding } from "../types.js";
import { deriveTrustLevel } from "./runtime-corroboration.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";

/**
 * Trust level of the summary — the BEST trust level any finding in the
 * scan reached. Static-only findings settle at L2 (deriveTrustLevel's
 * no-corroboration ceiling); a findings-free scan stays at L0 (an
 * empty scan is an observation, not a proof).
 */
export function summaryTrustLevel(findings: readonly Finding[]): TrustLevel {
  const order: readonly TrustLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];
  let best = 0;
  for (const f of findings) {
    const t = f.trustLevel ?? "L2";
    const idx = order.indexOf(t);
    if (idx > best) best = idx;
  }
  return order[best] as TrustLevel;
}

/**
 * A finding's trust rung (0–5) on the canonical ladder. Corroborated
 * findings are already stamped (`trustLevel`); static-only findings
 * derive their rung from the same derivation the ladder uses
 * (deriveTrustLevel without corroboration caps at L2 — a static-only
 * finding can never claim L3+).
 */
function trustRung(f: Finding): number {
  const t = f.trustLevel ?? deriveTrustLevel(f);
  return ["L0", "L1", "L2", "L3", "L4", "L5"].indexOf(t);
}

/**
 * Hard incompleteness ceilings (plan §6: partial/crash/truncation;
 * UNKNOWN propagates). Each factor caps confidence at a fraction of 1;
 * the binding ceiling is the MINIMUM of the applicable factors. A whole
 * scan has ceiling 1 (no cap). These are product constants — changing
 * them changes published formulas and requires a docs + changelog bump.
 */
export const INCOMPLETENESS_CEILINGS = {
  /** Partial scan — the surface judged is not the whole surface. */
  partial: 0.5,
  /** Truncated analysis — files the scan never opened or judged at all. */
  truncation: 0.6,
  /** Any rule crashed — some files were judged by fewer rules than exist. */
  rulesCrashed: 0.8,
  /** Framework detection could not decide — rule applicability is unsure. */
  frameworkUnknown: 0.9,
} as const;

export interface IncompletenessCeiling {
  ceiling: number;
  reasons: string[];
}

export function incompletenessCeilingFor(
  result: Pick<
    ScanResult,
    "partial" | "frameworkDetectionUnknown" | "analysisStatus"
  >,
): IncompletenessCeiling {
  const reasons: string[] = [];
  let ceiling = 1;
  const apply = (factor: number, reason: string): void => {
    if (factor < ceiling) ceiling = factor;
    reasons.push(reason);
  };
  if (result.partial) apply(INCOMPLETENESS_CEILINGS.partial, "partial-scan");
  if (
    result.analysisStatus.discovery === "partial" ||
    (result.analysisStatus.truncationReasons?.length ?? 0) > 0
  ) {
    apply(INCOMPLETENESS_CEILINGS.truncation, "truncated-analysis");
  }
  if ((result.analysisStatus.rulesCrashed ?? 0) > 0) {
    apply(
      INCOMPLETENESS_CEILINGS.rulesCrashed,
      `rules-crashed:${result.analysisStatus.rulesCrashed}`,
    );
  }
  if (result.frameworkDetectionUnknown) {
    apply(
      INCOMPLETENESS_CEILINGS.frameworkUnknown,
      "framework-detection-unknown",
    );
  }
  return { ceiling, reasons };
}

/**
 * Build the scan-level trust summary.
 *
 * @param result the canonical scan result (findings already stamped with
 *   evidence levels, trust levels, and runtime corroboration).
 * @param declarationsByFile the pipeline's per-file declaration census —
 *   the only place that map exists. A declaration is EVIDENCE-BACKED
 *   when its file produced at least one non-advisory (E1+) finding;
 *   advisory/E0-only files back nothing (E0 is an observation, not
 *   evidence of coverage).
 */
export function buildTrustSummary(
  result: ScanResult,
  declarationsByFile: ReadonlyMap<string, number>,
): TrustSummary {
  const findings = result.findings;

  // --- evidenceCoverage (plan §6 exact wording).
  const analyzedDeclarations = result.testDeclarationCount ?? 0;
  const backedFiles = new Set(
    findings.filter((f) => !isAdvisoryFinding(f)).map((f) => f.file),
  );
  let backed = 0;
  for (const file of backedFiles) {
    backed += declarationsByFile.get(file) ?? 0;
  }
  const evidenceCoverage =
    analyzedDeclarations > 0
      ? Math.min(1, Math.max(0, backed) / analyzedDeclarations)
      : 0;

  // --- inconclusiveRate: scan-level unknowns over the judged population.
  // 0.6.x has no forensic INCONCLUSIVE classifications yet (WI-18, 1.1.x);
  // the scan-level unknowns are the honest inconclusive signals today.
  const unknowns =
    (result.analysisStatus.rulesCrashed ?? 0) +
    (result.analysisStatus.truncationReasons?.length ?? 0) +
    result.analysisStatus.skippedFiles +
    (result.frameworkDetectionUnknown ? 1 : 0);
  const inconclusiveRate = unknowns / (unknowns + findings.length || 1);

  // --- measuredFpOfFiredRules: evidence-weighted measured FP of fired rules.
  // Evidence weight per fired rule = its mean evidence level (E0 0, E1 0.5,
  // E2 1) across its findings — one evidence philosophy, two projections.
  function evidenceMass(f: Finding): number {
    const level =
      f.evidenceLevel ??
      (f.findingType === "observation"
        ? "E0"
        : f.findingType === "heuristic-risk"
          ? "E1"
          : f.confidence === "low"
            ? "E1"
            : "E2");
    if (level === "E0") return 0;
    if (level === "E1") return 0.5;
    return 1;
  }
  const firedWeights = new Map<string, number>();
  for (const f of findings) {
    firedWeights.set(
      f.ruleId,
      (firedWeights.get(f.ruleId) ?? 0) + evidenceMass(f),
    );
  }
  const provisionalRuleIds: string[] = [];
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [ruleId, w] of firedWeights) {
    const m = MEASURED_FP[ruleId];
    if (m) {
      weightedSum += m.fpRate * w;
      weightTotal += w;
    } else {
      provisionalRuleIds.push(ruleId);
    }
  }
  provisionalRuleIds.sort();
  const measuredFpOfFiredRules =
    weightTotal > 0 && provisionalRuleIds.length === 0
      ? weightedSum / weightTotal
      : undefined;

  // --- confidence: deterministic composite with the hard ceiling applied.
  // The composite measures how evidence-backed the scan's own claims are:
  //   0.5 × (mean evidence mass) + 0.5 × (mean trust rung / 5)
  // over the findings present. A findings-free whole scan reads 1
  // (nothing found, nothing hidden); a findings-free PARTIAL scan reads
  // only its ceiling (unknowns may be hiding under the truncation —
  // never manufacture certainty, plan §14).
  const { ceiling, reasons } = incompletenessCeilingFor(result);
  let composite: number;
  if (findings.length === 0) {
    composite = 1;
  } else {
    let mass = 0;
    let rungs = 0;
    for (const f of findings) {
      mass += evidenceMass(f);
      rungs += trustRung(f) / 5;
    }
    composite = (mass / findings.length + rungs / findings.length) / 2;
  }
  const capped = Math.max(0, Math.min(1, composite)) * ceiling;

  return {
    level: summaryTrustLevel(findings),
    confidence: Math.round(capped * 100) / 100,
    evidenceCoverage: Math.round(evidenceCoverage * 100) / 100,
    inconclusiveRate: Math.round(inconclusiveRate * 100) / 100,
    ...(measuredFpOfFiredRules !== undefined
      ? {
          measuredFpOfFiredRules:
            Math.round(measuredFpOfFiredRules * 1000) / 1000,
        }
      : {}),
    provisionalRuleIds,
    ...(ceiling < 1 ? { confidenceCeiling: ceiling } : {}),
    ceilingReasons: reasons,
  };
}
