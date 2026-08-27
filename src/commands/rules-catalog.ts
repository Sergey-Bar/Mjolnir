/**
 * `qa-doctor rules` — machine-readable rule catalog with Trust Metadata.
 *
 * Renders every registered rule as a docs table (markdown) or JSON.
 * This is the "Trust Metadata as product infrastructure" piece: the
 * catalog is generated from the registry, so it can never drift from
 * what actually ships.
 */

import { RULES } from "../rules/index.js";
import type { QADoctorRule } from "../rules/rule.js";
import { deriveEvidenceLevel, type EvidenceLevel } from "../types.js";

export interface RuleCatalogEntry {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  /** Honesty Core: effective evidence level (declared or derived). */
  evidenceLevel: EvidenceLevel;
  qaImpact: string;
  appliesTo: string;
  languages?: string[];
  frameworks?: string[];
  falsePositiveRisk?: string;
  autofix?: boolean;
  detectionStrategy?: string;
  introduced?: string;
}

export function buildCatalog(
  rules: readonly QADoctorRule[] = RULES,
): RuleCatalogEntry[] {
  return rules.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    severity: r.severity,
    confidence: r.confidence,
    // Declared override wins; otherwise the honest derivation.
    evidenceLevel:
      r.evidenceLevel ?? deriveEvidenceLevel(r.findingType, r.confidence),
    qaImpact: r.qaImpact,
    appliesTo: r.appliesTo,
    ...(r.languages ? { languages: [...r.languages] } : {}),
    ...(r.frameworks ? { frameworks: [...r.frameworks] } : {}),
    ...(r.falsePositiveRisk ? { falsePositiveRisk: r.falsePositiveRisk } : {}),
    ...(r.autofix !== undefined ? { autofix: r.autofix } : {}),
    ...(r.detectionStrategy ? { detectionStrategy: r.detectionStrategy } : {}),
    ...(r.introduced ? { introduced: r.introduced } : {}),
  }));
}

export function renderCatalogMd(entries: RuleCatalogEntry[]): string {
  const lines: string[] = [
    "# Mjölnir — Rule Catalog",
    "",
    "Generated from the rule registry by `mjolnir rules --md`. Do not edit by hand.",
    "",
    "| ID | Title | Severity | Confidence | Evidence | FP Risk | Autofix | Since |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const e of entries) {
    lines.push(
      `| ${e.id} | ${escapeMdCell(e.title)} | ${e.severity} | ${e.confidence} | ${e.evidenceLevel} | ${e.falsePositiveRisk ?? "—"} | ${e.autofix ? "yes" : "no"} | ${e.introduced ?? "—"} |`,
    );
  }
  return lines.join("\n");
}

/** Escapes characters that would break a Markdown table cell. */
function escapeMdCell(text: string): string {
  return text.replaceAll("|", "\\|");
}
