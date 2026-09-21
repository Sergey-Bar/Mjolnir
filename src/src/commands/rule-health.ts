/**
 * Rule-health metrics (WAVE 2 — Empirical Measurement, product-completion
 * plan §WAVE 2). Renders `mjolnir rules stats` and `mjolnir rules health`
 * from the SHIPPED measurement registry: the RULES array + the
 * MEASURED_FP map. No re-derivation, no second source of truth — these
 * views project the same facts `getMeasurementStatus` already derives,
 * so a measurement can never disagree with what the catalog/doctor show.
 *
 * TRUST-CONSTITUTION LAW-T03 (No Silent Gaps): a rule without a valid
 * measurement is reported as UNMEASURED/PROVISIONAL, never hidden. The
 * stats view states coverage against the full registry; the health view
 * sorts the honest-work queue worst-first.
 */

import type { QADoctorRule } from "../rules/rule.js";
import { RULES, RETIRED_RULE_IDS } from "../rules/index.js";
import {
  getMeasurementStatus,
  type RuleMeasurementEntry,
} from "../rules/measurement-status.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { isRetiredRule } from "../rules/measurement.js";

/** Health row: the measurement entry plus the registry facts a caller needs. */
/**
 * Per-rule health summary for the stats and health views.
 * Status values come from the SHIPPED measurement registry —
 * not re-derived at runtime.
 */
export interface RuleHealthRow {
  ruleId: string;
  title: string;
  category: string;
  tier: RuleMeasurementEntry["tier"];
  status: RuleMeasurementEntry["status"];
  measuredFpRate?: number;
  measuredFpN?: number;
  detectorRevision: number;
  measuredDetectorRevision?: number;
  falsePositiveRisk?: string;
}

/**
 * Aggregate counts for the stats summary. Retired rule ids are EXCLUDED
 * from the active census (owner ruling 2026-09-08): a retired rule is
 * not a gap and must not inflate the unmeasured count.
 */
export interface RuleStats {
  total: number;
  retired: number;
  byTier: { core: number; extended: number; quarantine: number };
  byStatus: {
    MEASURED: number;
    PROVISIONAL: number;
    UNMEASURED: number;
    STALE: number;
  };
  /** Rules with a valid measurement (status MEASURED). */
  measured: number;
  /** Rules a caller must still measure (UNMEASURED + STALE + PROVISIONAL). */
  needingMeasurement: number;
  /** Measured / total, 0..1. Total excludes retired rules. */
  coverage: number;
}

/**
 * Build the per-rule health table from the shipped registry. Deterministic
 * order: the RULES registry order (stable across runs).
 */
export function buildRuleHealth(
  rules: readonly QADoctorRule[] = RULES,
): RuleHealthRow[] {
  const statusById = new Map(
    getMeasurementStatus(rules).map((e) => [e.ruleId, e] as const),
  );
  const rows: RuleHealthRow[] = [];
  for (const rule of rules) {
    if (isRetiredRule(rule.id)) continue;
    const entry = statusById.get(rule.id);
    if (entry === undefined) continue;
    rows.push({
      ruleId: rule.id,
      title: rule.title,
      category: rule.category,
      tier: entry.tier,
      status: entry.status,
      ...(entry.measuredFpRate !== undefined
        ? { measuredFpRate: entry.measuredFpRate }
        : {}),
      ...(entry.measuredFpN !== undefined
        ? { measuredFpN: entry.measuredFpN }
        : {}),
      detectorRevision: entry.detectorRevision,
      ...(entry.measuredDetectorRevision !== undefined
        ? { measuredDetectorRevision: entry.measuredDetectorRevision }
        : {}),
      ...(rule.falsePositiveRisk !== undefined
        ? { falsePositiveRisk: rule.falsePositiveRisk }
        : {}),
    });
  }
  return rows;
}

/** Aggregate the stats block. Counts are over ACTIVE (non-retired) rules. */
export function computeRuleStats(rows: readonly RuleHealthRow[]): RuleStats {
  const byTier = { core: 0, extended: 0, quarantine: 0 };
  const byStatus = {
    MEASURED: 0,
    PROVISIONAL: 0,
    UNMEASURED: 0,
    STALE: 0,
  };
  for (const r of rows) {
    byTier[r.tier] += 1;
    byStatus[r.status] += 1;
  }
  const total = rows.length;
  const measured = byStatus.MEASURED;
  return {
    total,
    retired: RETIRED_RULE_IDS.length,
    byTier,
    byStatus,
    measured,
    needingMeasurement:
      byStatus.UNMEASURED + byStatus.STALE + byStatus.PROVISIONAL,
    coverage: total === 0 ? 0 : measured / total,
  };
}

/**
 * Health-queue order: the honest-work queue, worst-first.
 *   1. UNMEASURED  (never measured — can never sit in effective core)
 *   2. STALE       (measured against an older detector revision)
 *   3. PROVISIONAL (display state for an extended rule without a valid measurement)
 *   4. MEASURED, by descending FP rate (a measured rule with a worse rate
 *      is more work than one near zero)
 * Ties break by ruleId for a stable, deterministic order.
 */
export function sortHealthQueue(
  rows: readonly RuleHealthRow[],
): RuleHealthRow[] {
  const rank: Record<RuleHealthRow["status"], number> = {
    UNMEASURED: 0,
    STALE: 1,
    PROVISIONAL: 2,
    MEASURED: 3,
  };
  return [...rows].sort((a, b) => {
    if (rank[a.status] !== rank[b.status])
      return rank[a.status] - rank[b.status];
    if (a.status === "MEASURED" && b.status === "MEASURED") {
      const fa = a.measuredFpRate ?? 0;
      const fb = b.measuredFpRate ?? 0;
      if (fa !== fb) return fb - fa;
    }
    return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0;
  });
}

const pct = (n: number): string => `${(n * 100).toFixed(0)}%`;

/** The `mjolnir rules stats` view — registry-level measurement coverage. */
export function renderRuleStats(rows: readonly RuleHealthRow[]): string {
  const s = computeRuleStats(rows);
  const lines: string[] = [
    "Rule measurement stats (WAVE 2 — empirical measurement)",
    "",
    `Active rules:      ${s.total}`,
    `Retired rules:     ${s.retired} (excluded from the census)`,
    "",
    `Tier:              core ${s.byTier.core} · extended ${s.byTier.extended} · quarantine ${s.byTier.quarantine}`,
    `Status:            measured ${s.byStatus.MEASURED} · provisional ${s.byStatus.PROVISIONAL} · unmeasured ${s.byStatus.UNMEASURED} · stale ${s.byStatus.STALE}`,
    "",
    `Measured coverage: ${pct(s.coverage)} (${s.measured}/${s.total})`,
    `Needing measurement: ${s.needingMeasurement}`,
  ];
  if (s.needingMeasurement > 0) {
    lines.push(
      "",
      "Unmeasured/stale/provisional rules ship on assumption (LAW-T03: no silent gaps).",
      "Run `mjolnir rules health` for the worst-first work queue.",
    );
  } else {
    lines.push("", "Every active rule carries a valid measurement.");
  }
  return lines.join("\n");
}

/** The `mjolnir rules health` view — worst-first honest-work queue. */
export function renderRuleHealth(
  rows: readonly RuleHealthRow[],
  limit?: number,
): string {
  const sorted = sortHealthQueue(rows);
  const shown = limit === undefined ? sorted : sorted.slice(0, limit);
  const lines: string[] = ["Rule health — worst-first work queue (WAVE 2)", ""];
  if (shown.length === 0) {
    lines.push("No active rules.");
    return lines.join("\n");
  }
  lines.push(
    "STATUS       RULE           TIER        FP RATE   n     REV  TITLE",
  );
  for (const r of shown) {
    const fp =
      r.measuredFpRate !== undefined
        ? `${(r.measuredFpRate * 100).toFixed(0)}%`
        : "—";
    const n = r.measuredFpN !== undefined ? String(r.measuredFpN) : "—";
    const rev =
      r.measuredDetectorRevision !== undefined &&
      r.measuredDetectorRevision !== r.detectorRevision
        ? `${r.detectorRevision}<-${r.measuredDetectorRevision}`
        : String(r.detectorRevision);
    lines.push(
      [
        r.status.padEnd(12),
        r.ruleId.padEnd(14),
        r.tier.padEnd(11),
        fp.padEnd(9),
        n.padEnd(5),
        rev.padEnd(4),
        r.title,
      ].join(" "),
    );
  }
  const hidden = sorted.length - shown.length;
  if (hidden > 0) {
    lines.push("", `… ${hidden} more (raise --limit to see them).`);
  }
  return lines.join("\n");
}

/** The measurement map size — surfaced so callers can sanity-check drift. */
export const MEASURED_RULE_COUNT: number = Object.keys(MEASURED_FP).length;
