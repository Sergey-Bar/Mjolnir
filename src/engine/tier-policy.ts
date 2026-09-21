/**
 * Tier policy (audit H-1): the declared tier is authoritative over a
 * rule's severity and evidence claims.
 *
 * Quarantine-tier rules exist because their real-world false-positive
 * rate is unproven or proven bad (docs/FP-AUDIT.md records several at
 * 100% measured FP). A rule known to be wrong every single time it
 * fires must never gate CI or deduct score — regardless of the
 * severity/evidenceLevel its metadata declares. The pipeline therefore
 * caps every quarantine finding to severity=info, evidence=E0, which
 * makes it advisory by construction (isAdvisoryFinding excludes E0).
 */

import type { EvidenceLevel, Finding, Severity } from "../types.js";

export type Tier = "core" | "extended" | "quarantine";

export interface TierCap {
  severity: Severity;
  evidenceLevel: EvidenceLevel;
}

/** Cap applied to every finding of a quarantine-tier rule (H-1). */
export const QUARANTINE_CAP: TierCap = {
  severity: "info",
  evidenceLevel: "E0",
};

/** The cap that applies to a finding from the given tier (undefined tier = core). */
export function capForTier(tier: Tier | undefined): TierCap | null {
  return tier === "quarantine" ? QUARANTINE_CAP : null;
}

/**
 * In-place enforcement over a scan's findings. Idempotent; runs AFTER
 * evidence stamping so it wins over rule-declared evidenceLevel.
 */
export function enforceTierPolicy(
  findings: Finding[],
  tierByRuleId: ReadonlyMap<string, Tier>,
): void {
  for (const f of findings) {
    const cap = capForTier(tierByRuleId.get(f.ruleId));
    if (cap) {
      f.severity = cap.severity;
      f.evidenceLevel = cap.evidenceLevel;
    }
  }
}
