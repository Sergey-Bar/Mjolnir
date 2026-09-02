/**
 * `mjolnir rules` — machine-readable rule catalog with Trust Metadata.
 *
 * Renders every registered rule as a docs table (markdown) or JSON.
 * This is the "Trust Metadata as product infrastructure" piece: the
 * catalog is generated from the registry, so it can never drift from
 * what actually ships.
 */

import { RULES } from "../rules/index.js";
import type { DetectionStrategy, QADoctorRule } from "../rules/rule.js";
import { MEASURED_FP } from "../rules/measured-fp.generated.js";
import { effectiveTier, isProvisional } from "../rules/measurement.js";
import { deriveEvidenceLevel, type EvidenceLevel } from "../types.js";

export interface RuleCatalogEntry {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  /**
   * Which report the rule ships in: core + extended by default,
   * quarantine only with --strict. Resolved measurement-dependently
   * (plan §11.2 Step 2): an omitted tier resolves to core only with a
   * valid measurement, otherwise extended.
   */
  tier: "core" | "extended" | "quarantine";
  /** Display status: unmeasured extended rules render as PROVISIONAL. */
  status?: "PROVISIONAL";
  /** Measured false-positive rate (0..1) from corpus verdicts, when n >= 10. */
  measuredFpRate?: number;
  /** Classified (TP+FP) verdicts behind measuredFpRate. */
  measuredFpN?: number;
  /** Honesty Core: effective evidence level (declared or derived). */
  evidenceLevel: EvidenceLevel;
  qaImpact: string;
  appliesTo: string;
  languages?: string[];
  frameworks?: string[];
  falsePositiveRisk?: string;
  autofix?: boolean;
  detectionStrategy?: DetectionStrategy;
  detectionNotes?: string;
  introduced?: string;
  /**
   * Rule provenance (plan §18): "core" for the built-in registry,
   * "external" for workspace-local `mjolnir-rules/` rules. External
   * rules carry the same trust metadata; they can never ship in core
   * (no corpus measurement) and are drift-checked by catalog
   * regeneration.
   */
  provenance: "core" | "external";
}

export function buildCatalog(
  rules: readonly QADoctorRule[] = RULES,
  options: { provenance?: "core" | "external" } = {},
): RuleCatalogEntry[] {
  const provenance = options.provenance ?? "core";
  return rules.map((r) => {
    const measured = MEASURED_FP[r.id];
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      severity: r.severity,
      confidence: r.confidence,
      tier: effectiveTier(r),
      ...(isProvisional(r) ? { status: "PROVISIONAL" as const } : {}),
      ...(measured
        ? { measuredFpRate: measured.fpRate, measuredFpN: measured.n }
        : {}),
      // Declared override wins; otherwise the honest derivation.
      evidenceLevel:
        r.evidenceLevel ?? deriveEvidenceLevel(r.findingType, r.confidence),
      qaImpact: r.qaImpact,
      appliesTo: r.appliesTo,
      ...(r.languages ? { languages: [...r.languages] } : {}),
      ...(r.frameworks ? { frameworks: [...r.frameworks] } : {}),
      ...(r.falsePositiveRisk
        ? { falsePositiveRisk: r.falsePositiveRisk }
        : {}),
      ...(r.autofix !== undefined ? { autofix: r.autofix } : {}),
      ...(r.detectionStrategy
        ? { detectionStrategy: r.detectionStrategy }
        : {}),
      ...(r.detectionNotes ? { detectionNotes: r.detectionNotes } : {}),
      ...(r.introduced ? { introduced: r.introduced } : {}),
      provenance,
    };
  });
}

export function renderCatalogMd(entries: RuleCatalogEntry[]): string {
  const hasExternal = entries.some((e) => e.provenance === "external");
  const provenanceCol = hasExternal ? " | Provenance" : "";
  const provenanceSep = hasExternal ? "|---" : "";
  const lines: string[] = [
    "# Mjölnir — Rule Catalog",
    "",
    "Generated from the rule registry by `mjolnir rules --md`. Do not edit by hand.",
    "",
    `| ID | Title | Severity | Tier | FP (measured) | Confidence | Evidence | FP Risk | Autofix | Since${provenanceCol} |`,
    `|---|---|---|---|---|---|---|---|---|---${provenanceSep}|`,
  ];
  for (const e of entries) {
    const measured =
      e.measuredFpRate !== undefined
        ? `${Math.round(e.measuredFpRate * 100)}% (n=${e.measuredFpN})`
        : "—";
    const tierCell =
      e.status === "PROVISIONAL" ? `${e.tier} (PROVISIONAL)` : e.tier;
    const provenanceCell = hasExternal ? ` | ${e.provenance}` : "";
    lines.push(
      `| ${e.id} | ${escapeMdCell(e.title)} | ${e.severity} | ${tierCell} | ${measured} | ${e.confidence} | ${e.evidenceLevel} | ${e.falsePositiveRisk ?? "—"} | ${e.autofix ? "yes" : "no"} | ${e.introduced ?? "—"}${provenanceCell} |`,
    );
  }
  return lines.join("\n");
}

/** Escapes characters that would break a Markdown table cell. */
function escapeMdCell(text: string): string {
  return text.replaceAll("|", "\\|");
}
