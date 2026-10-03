import { RULES, RETIRED_RULE_IDS } from "./index.js";
import {
  effectiveTier,
  hasStaleMeasurement,
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

/**
 * One row per rule, read through the SAME helpers every other surface reads.
 *
 * This file used to answer `stale` and `tier` with local predicates, and both
 * were wrong. `stale` asked `MEASURED_FP[rule.id] !== undefined` about a map the
 * generator pre-filters to revision-matching rows, so it was false for every
 * stale rule and `staleCount` was structurally 0. `tier` re-derived the ladder
 * as `declared ?? (measured ? core : extended)`, which is a THIRD copy of the
 * tier resolution and the only one not reading `effectiveTier` — so the five
 * rules with no declared tier printed `core` here and `extended` everywhere else.
 *
 * Both now delegate. A census that disagrees with doctor is not a census.
 */
function censusRecord(rule: QADoctorRule): RuleCensusRecord {
  return {
    id: rule.id,
    status: ruleStatus(rule),
    detectorRevision: rule.detectorRevision ?? 1,
    measured: hasValidMeasurement(rule),
    stale: hasStaleMeasurement(rule),
    tier: effectiveTier(rule),
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
