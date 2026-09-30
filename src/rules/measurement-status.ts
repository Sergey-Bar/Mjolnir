/**
 * Measurement Status (RULE-MEASURE-001).
 *
 * Derives per-rule measurement status from the RULES registry and the
 * MEASURED_FP map. Provides helpers to list provisional and quarantined
 * rules for reporting and doctor checks.
 */

import type { QADoctorRule } from "./rule.js";
import { RULES } from "./index.js";
import { MEASURED_FP, MEASURED_FP_RAW } from "./measured-fp.generated.js";
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
 *
 * `STALE` is derived from `MEASURED_FP_RAW`, not from `MEASURED_FP`.
 *
 * `MEASURED_FP` only carries measurements whose recorded revision still
 * matches the rule's, so a stale row is absent from it and the rule reads
 * `UNMEASURED` — the same verdict as a rule nobody has ever sampled. That is
 * the distinction the generator's revision filter destroys: `QA-PY-004` has 42
 * hand-classified verdicts and a sidecar one revision behind its rule, and
 * reporting it as "no measurement" sends a maintainer to do work that is
 * already done while hiding the fact that the work needs REDOING.
 *
 * The RAW map is that information kept, and it makes `STALE` — a member of the
 * union since before this — reachable for the first time. A status nothing
 * can produce is a comment; `tests/rules/measurement-status.spec.ts` asserts
 * the two rules above are reported `STALE`, so a future generator that drops
 * the raw map fails rather than quietly reverting to `UNMEASURED`.
 */
function getMeasurementStatusForRule(rule: QADoctorRule): MeasurementStatus {
  const current = MEASURED_FP[rule.id];
  if (current !== undefined) return "MEASURED";
  const raw = MEASURED_FP_RAW[rule.id];
  if (raw === undefined) return "UNMEASURED";
  return raw.detectorRevision === declaredDetectorRevision(rule)
    ? "MEASURED"
    : "STALE";
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
