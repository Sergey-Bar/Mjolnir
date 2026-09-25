import { MEASURED_FP } from "./measured-fp.generated.js";
import { RULES, RETIRED_RULE_IDS } from "./index.js";
import {
  hasValidMeasurement,
  ruleStatus,
  type RuleStatus,
} from "./measurement.js";
import type { QADoctorRule } from "./rule.js";

export interface RuleCensusRecord {
  id: string;
  status: RuleStatus;
  detectorRevision: number;
  measured: boolean;
  stale: boolean;
  tier: "core" | "extended" | "quarantine";
}

export interface RuleCensus {
  active: RuleCensusRecord[];
  retired: string[];
  measuredCount: number;
  unmeasuredCount: number;
  staleCount: number;
  duplicateActiveIds: string[];
  retiredActiveIntersections: string[];
}

function censusRecord(rule: QADoctorRule): RuleCensusRecord {
  return {
    id: rule.id,
    status: ruleStatus(rule),
    detectorRevision: rule.detectorRevision ?? 1,
    measured: hasValidMeasurement(rule),
    stale: MEASURED_FP[rule.id] !== undefined && !hasValidMeasurement(rule),
    tier: rule.tier ?? (hasValidMeasurement(rule) ? "core" : "extended"),
  };
}

export function buildRuleCensus(
  rules: readonly QADoctorRule[] = RULES,
  retired: readonly string[] = RETIRED_RULE_IDS,
): RuleCensus {
  const active = rules.map(censusRecord);
  const activeIds = new Set<string>();
  const duplicateActiveIds: string[] = [];
  for (const rule of rules) {
    if (activeIds.has(rule.id)) duplicateActiveIds.push(rule.id);
    activeIds.add(rule.id);
  }
  const retiredSet = new Set(retired);
  return {
    active,
    retired: [...retired].sort(),
    measuredCount: active.filter((rule) => rule.measured).length,
    unmeasuredCount: active.filter((rule) => !rule.measured).length,
    staleCount: active.filter((rule) => rule.stale).length,
    duplicateActiveIds: [...new Set(duplicateActiveIds)].sort(),
    retiredActiveIntersections: active
      .filter((rule) => retiredSet.has(rule.id))
      .map((rule) => rule.id)
      .sort(),
  };
}
