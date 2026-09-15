/**
 * Measurement Status (RULE-MEASURE-001).
 *
 * Derives per-rule measurement status from the RULES registry and the
 * MEASURED_FP map. Provides helpers to list provisional and quarantined
 * rules for reporting and doctor checks.
 */

import type { QADoctorRule } from "./rule.js";
import { RULES } from "./index.js";
import { MEASURED_FP } from "./measured-fp.generated.js";
import {
  declaredDetectorRevision,
  effectiveTier,
  type Tier,
} from "./measurement.js";

export type MeasurementStatus =
  "MEASURED" | "PROVISIONAL" | "UNMEASURED" | "STALE";

export interface RuleMeasurementEntry {
  ruleId: string;
  tier: Tier;
  status: MeasurementStatus;
  measuredFpRate?: number;
  measuredFpN?: number;
  detectorRevision: number;
  measuredDetectorRevision?: number;
}

/**
 * Derive the measurement status for a single rule.
 */
function getMeasurementStatusForRule(rule: QADoctorRule): MeasurementStatus {
  const m = MEASURED_FP[rule.id];
  if (m === undefined) return "UNMEASURED";
  const declared = declaredDetectorRevision(rule);
  if (m.detectorRevision !== declared) return "STALE";
  return "MEASURED";
}

/**
 * Build the full measurement status list from the registry.
 */
export function getMeasurementStatus(
  rules: readonly QADoctorRule[] = RULES,
): RuleMeasurementEntry[] {
  return rules.map((rule) => {
    const m = MEASURED_FP[rule.id];
    const tier = effectiveTier(rule);
    const status = getMeasurementStatusForRule(rule);
    return {
      ruleId: rule.id,
      tier,
      status,
      ...(m !== undefined
        ? { measuredFpRate: m.fpRate, measuredFpN: m.n }
        : {}),
      detectorRevision: declaredDetectorRevision(rule),
      ...(m !== undefined
        ? { measuredDetectorRevision: m.detectorRevision }
        : {}),
    };
  });
}

/**
 * Rules that are PROVISIONAL: either unmeasured or measured against a
 * stale detector revision. These rules need re-measurement before they
 * can advance to core.
 */
export function getProvisionalRules(
  rules: readonly QADoctorRule[] = RULES,
): RuleMeasurementEntry[] {
  return getMeasurementStatus(rules).filter(
    (e) => e.status === "UNMEASURED" || e.status === "STALE",
  );
}

/**
 * Rules in the quarantine tier. These rules are opt-in only via --strict
 * and their findings are capped to severity=info, evidence=E0.
 */
export function getQuarantinedRules(
  rules: readonly QADoctorRule[] = RULES,
): RuleMeasurementEntry[] {
  return getMeasurementStatus(rules).filter((e) => e.tier === "quarantine");
}
