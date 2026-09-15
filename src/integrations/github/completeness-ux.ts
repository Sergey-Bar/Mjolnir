/**
 * Completeness & Framework-Limitation UX (PRUX-006).
 *
 * Renders prominent warnings for partial/error analysis states
 * and framework limitation disclosures when relevant to the scan.
 */

import type {
  AnalysisCompleteness,
  FrameworkSupportSummary,
} from "./pr-comment-contract.js";

/**
 * Render a prominent completeness warning when analysis was not complete.
 * Returns empty string when analysis is COMPLETE (no warning needed).
 */
export function renderCompletenessWarning(
  analysisCompleteness: AnalysisCompleteness,
  partialFileCount: number,
): string {
  if (analysisCompleteness === "COMPLETE") return "";

  if (analysisCompleteness === "ERROR") {
    return "⚠️ **Analysis Error** — The scan encountered errors during analysis. Results may be incomplete or unreliable. Review the findings with caution.";
  }

  if (analysisCompleteness === "PARTIAL") {
    const fileNote =
      partialFileCount > 0
        ? ` **${partialFileCount} file(s) were only partially analyzed.**`
        : "";
    return `⚠️ **Partial Analysis** — not all files were fully analyzed.${fileNote} Findings may not represent the complete picture. A partial scan cannot block CI.`;
  }

  return "";
}

/**
 * Render framework limitation disclosures.
 * Returns empty string when no relevant limitations exist
 * (framework detection succeeded and is not unknown).
 */
export function renderFrameworkLimitations(
  frameworkSummary: FrameworkSupportSummary,
): string {
  if (frameworkSummary.detected.length === 0 && !frameworkSummary.unknown) {
    return "";
  }

  const lines: string[] = [];

  if (frameworkSummary.unknown) {
    lines.push(
      "⚠️ **Framework detection uncertain** — Could not confidently identify test frameworks. Some rules may not have been applied.",
    );
  }

  if (frameworkSummary.details) {
    lines.push(frameworkSummary.details);
  }

  return lines.join("\n\n");
}
