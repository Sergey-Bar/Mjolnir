/**
 * R6 overlap-dedup (Bug Map M-02).
 *
 * Cross-language rule families mean two rules can fire on the SAME root
 * cause at the SAME line (e.g. QA-PW-101 `waitForTimeout(` and the
 * generic QA-TEST-004 hard-sleep). The report then double-counts one
 * defect and the score deducts twice for a single mistake.
 *
 * This pass removes a finding ONLY when another same-group finding's
 * rule explicitly declares it in `RuleMeta.overlapWith` — there is no
 * heuristic, textual, severity, or name-similarity removal. Same-rule
 * duplicates are untouched (each rule owns its internal dedup, e.g.
 * QA-TEST-004's match-index set). Plugin findings are immune: a ruleId
 * absent from the meta map is never a dedup target, and plugins cannot
 * declare overlaps (UniversalRule has no such field).
 *
 * Same-root-cause scope (review fix): a declarer only reaches same-line
 * targets within MAX_SAME_ROOT_COLUMN_DELTA characters of its own
 * column. Evidence from the wired pairs: QA-PW-101 vs QA-TEST-004
 * differ by exactly 5 (the `page.` prefix), every other pair by 0.
 * Without the cap, a declarer would also swallow an INDEPENDENT
 * same-rule defect further along the same line (e.g.
 * `waitForTimeout(100); await sleep(200);` would lose the sleep
 * finding, which the declarer's patterns never match).
 *
 * Survivor resolution (deterministic, never object iteration order):
 * while some present finding is declared by another PRESENT finding,
 * drop the WORST-ranked such target — tier (core > extended >
 * quarantine), then severity (error > warning > info), then RULES
 * registry order, then the field-derived column as the final tie-break.
 * This always terminates, keeps the best-ranked member of any
 * declaration cycle, and collapses chains transitively for as long as
 * the declaring finding itself survives. The survivor SET is
 * independent of input order; the returned array preserves input order
 * (runScan re-sorts by compareFindings immediately after this pass
 * anyway).
 *
 * Verified negatives from the empirical co-fire dump (2026-09-01, over
 * tests/fixtures/, examples/demo-repo/, tests/golden/repo/ — rules that
 * co-fire on one line but are NOT the same root cause, deliberately NOT
 * wired): QA-PW-102 vs QA-PW-118 (disjoint 'load'/'networkidle' args),
 * QA-PW-002 vs QA-PW-107 (missing await vs matcher choice),
 * QA-PW-003 vs QA-TEST-001 (`test.only` framed as debug artifact vs
 * focused test — framings differ, both core/error), QA-PW-103 vs
 * QA-PW-123 (missing timeout budget vs hardcoded URL), QA-PW-121 vs
 * QA-PW-141 vs QA-PW-122 vs QA-PW-143 (distinct config observability
 * gaps), QA-JV-103 vs QA-JV-109 (no assertions AND retry masking are
 * two defects), QA-PW-120 vs QA-PW-145 (file-level heuristics).
 */

import type { Finding, Severity } from "../types.js";
import type { Tier } from "./tier-policy.js";

/** Per-rule metadata the dedup pass needs, built from RULES. */
export interface OverlapMeta {
  /** Rule IDs this rule can double-report on the same root cause. */
  overlapWith?: string[];
  /** Tier rank for survivor resolution (missing = core). */
  tier?: Tier;
  /** RULES registry order for final tie-breaking. */
  order?: number;
}

const TIER_RANK: Record<Tier, number> = { core: 0, extended: 1, quarantine: 2 };
const SEVERITY_RANK: Record<Severity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Same-root-cause proximity cap (review fix): a declarer only reaches a
 * same-line twin whose column starts within this many characters of its
 * own. See the module doc for the evidence and the over-drop scenario.
 */
const MAX_SAME_ROOT_COLUMN_DELTA = 10;

/**
 * Drop findings that a same-line finding's rule explicitly declares in
 * its `overlapWith`, restricted to column-proximate same-root-cause
 * pairs (see MAX_SAME_ROOT_COLUMN_DELTA). Pure: returns a new array
 * (input untouched), input order preserved, monotone non-increasing.
 */
export function applyOverlapDedup(
  findings: readonly Finding[],
  metaByRuleId: ReadonlyMap<string, OverlapMeta>,
): Finding[] {
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const key = `${f.file}:${f.line}`;
    const group = groups.get(key);
    if (group) group.push(f);
    else groups.set(key, [f]);
  }
  const dropped = new Set<Finding>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const present = new Set(group);
    for (;;) {
      let worstTarget: Finding | null = null;
      for (const candidate of present) {
        // Plugin immunity: a rule absent from the meta map is never a
        // target, even if some rule lists its id in overlapWith.
        if (!metaByRuleId.has(candidate.ruleId)) continue;
        if (!isDeclaredByPresent(candidate, present, metaByRuleId)) continue;
        if (
          !worstTarget ||
          dropOrderBefore(candidate, worstTarget, metaByRuleId)
        ) {
          worstTarget = candidate;
        }
      }
      if (!worstTarget) break;
      present.delete(worstTarget);
      dropped.add(worstTarget);
    }
  }
  return findings.filter((f) => !dropped.has(f));
}

/**
 * True when another PRESENT, different-rule finding declares `f` — with
 * the same-root-cause column cap: the declarer's column must sit within
 * MAX_SAME_ROOT_COLUMN_DELTA of `f`'s column, so an independent defect
 * further along the same line is never swallowed.
 */
function isDeclaredByPresent(
  f: Finding,
  present: ReadonlySet<Finding>,
  metaByRuleId: ReadonlyMap<string, OverlapMeta>,
): boolean {
  for (const g of present) {
    if (g === f || g.ruleId === f.ruleId) continue;
    const meta = metaByRuleId.get(g.ruleId);
    if (!meta?.overlapWith?.includes(f.ruleId)) continue;
    if (Math.abs(g.column - f.column) > MAX_SAME_ROOT_COLUMN_DELTA) continue;
    return true;
  }
  return false;
}

/**
 * Survivor-quality order over targets: tier, then severity, then RULES
 * registry order (ranksBefore(a, b) = "a is better; a survives over b").
 * Same-rule duplicates tie on all three — but both always end up dropped
 * while their declarer stays present, so the tie never changes the
 * survivor SET. Fully field-derived: no dependence on input order.
 */
function ranksBefore(
  a: Finding,
  b: Finding,
  metaByRuleId: ReadonlyMap<string, OverlapMeta>,
): boolean {
  const ma = metaByRuleId.get(a.ruleId);
  const mb = metaByRuleId.get(b.ruleId);
  const tierA = TIER_RANK[ma?.tier ?? "core"];
  const tierB = TIER_RANK[mb?.tier ?? "core"];
  if (tierA !== tierB) return tierA < tierB;
  const sevA = SEVERITY_RANK[a.severity];
  const sevB = SEVERITY_RANK[b.severity];
  if (sevA !== sevB) return sevA < sevB;
  return (
    (ma?.order ?? Number.MAX_SAFE_INTEGER) <
    (mb?.order ?? Number.MAX_SAFE_INTEGER)
  );
}

/**
 * Drop order for equal-quality targets: ranksBefore first, then the
 * field-derived column as the final tie-break. Every component is a
 * function of the finding set — never of iteration/insertion order —
 * so which equal-rank target drops first (and which cascade follows)
 * is identical for any permutation of the same findings.
 */
function dropOrderBefore(
  a: Finding,
  b: Finding,
  metaByRuleId: ReadonlyMap<string, OverlapMeta>,
): boolean {
  if (ranksBefore(a, b, metaByRuleId)) return false;
  if (ranksBefore(b, a, metaByRuleId)) return true;
  return a.column < b.column;
}
