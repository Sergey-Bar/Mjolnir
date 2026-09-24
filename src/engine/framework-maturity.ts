/**
 * M5 — Framework Maturity Tracking for Playwright.
 *
 * Provides functions to track and report framework maturity levels,
 * with special focus on Playwright's progression from F4 toward F5.
 */

import {
  FRAMEWORK_INVENTORY,
  getFrameworkById,
  type MaturityLevel,
  type SupportStatus,
} from "../frameworks/framework-inventory.js";
import {
  FRAMEWORK_SCORECARDS,
  type ScorecardEntry,
} from "../frameworks/scorecard.js";

export interface MaturityProgress {
  frameworkId: string;
  currentMaturity: MaturityLevel;
  targetMaturity: MaturityLevel;
  currentSupportStatus: SupportStatus;
  targetSupportStatus: SupportStatus;
  maturityScore: number;
  dimensionsComplete: number;
  dimensionsTotal: number;
  gaps: string[];
  progressPercentage: number;
}

export interface PlaywrightMaturityReport {
  frameworkId: string;
  currentMaturity: MaturityLevel;
  targetMaturity: MaturityLevel;
  currentSupportStatus: SupportStatus;
  targetSupportStatus: SupportStatus;
  maturityScore: number;
  dimensionsComplete: number;
  dimensionsTotal: number;
  gaps: string[];
  progressPercentage: number;
  scorecardEntries: readonly ScorecardEntry[];
  recommendations: string[];
}

const MATURITY_SCORES: Record<MaturityLevel, number> = {
  F0: 0,
  F1: 20,
  F2: 40,
  F3: 60,
  F4: 80,
  F5: 95,
};

const SUPPORT_SCORES: Record<SupportStatus, number> = {
  OFFICIAL_FULL: 100,
  OFFICIAL_PARTIAL: 75,
  EXPERIMENTAL: 50,
  DISCOVERED: 25,
  UNSUPPORTED: 0,
  DEGRADED: 30,
  DEPRECATED: 10,
};

export function getPlaywrightMaturity(): MaturityProgress {
  const progress = getFrameworkMaturity("playwright");
  if (!progress) {
    throw new Error("Playwright is missing from the framework inventory");
  }
  return progress;
}

export function getPlaywrightMaturityReport(): PlaywrightMaturityReport {
  const progress = getPlaywrightMaturity();
  const scorecard = FRAMEWORK_SCORECARDS.find(
    (s) => s.frameworkId === "playwright",
  );
  const entries = scorecard?.entries ?? [];

  const recommendations: string[] = [];

  const missingDimensions = entries.filter(
    (e) => e.current === "MISSING" || e.current === "WEAK",
  );
  for (const dim of missingDimensions) {
    recommendations.push(
      `Improve ${dim.dimension} from ${dim.current} to ${dim.target} (gap: ${dim.gapId ?? "none"})`,
    );
  }

  if (progress.currentMaturity !== progress.targetMaturity) {
    recommendations.push(
      `Target ${progress.targetMaturity} maturity: complete remaining framework dimensions and achieve OFFICIAL_FULL support`,
    );
  }

  if (progress.currentSupportStatus !== "OFFICIAL_FULL") {
    recommendations.push(
      `Upgrade support status from ${progress.currentSupportStatus} to OFFICIAL_FULL`,
    );
  }

  return {
    ...progress,
    scorecardEntries: Object.freeze(entries),
    recommendations,
  };
}

export function getFrameworkMaturity(
  frameworkId: string,
): MaturityProgress | undefined {
  const fw = getFrameworkById(frameworkId);
  if (!fw) return undefined;

  const scorecard = FRAMEWORK_SCORECARDS.find(
    (s) => s.frameworkId === frameworkId,
  );
  const entries = scorecard?.entries ?? [];
  const totalDimensions = entries.length;
  const completeDimensions = entries.filter(
    (e) => e.current === "EXCELLENT" || e.current === "GOOD",
  ).length;

  const gaps = entries
    .filter((e) => e.gapId !== null)
    .map((e) => e.gapId ?? "");

  const currentScore = MATURITY_SCORES[fw.maturity] ?? 0;
  const supportScore = SUPPORT_SCORES[fw.supportStatus] ?? 0;
  const dimensionScore =
    totalDimensions > 0
      ? Math.round((completeDimensions / totalDimensions) * 100)
      : 0;
  const maturityScore = Math.round(
    currentScore * 0.4 + supportScore * 0.3 + dimensionScore * 0.3,
  );

  return {
    frameworkId,
    currentMaturity: fw.maturity,
    targetMaturity: fw.targetMaturity,
    currentSupportStatus: fw.supportStatus,
    targetSupportStatus: fw.targetSupportStatus,
    maturityScore,
    dimensionsComplete: completeDimensions,
    dimensionsTotal: totalDimensions,
    gaps,
    progressPercentage: Math.min(100, Math.round((maturityScore / 100) * 100)),
  };
}

export function getAllFrameworkMaturity(): MaturityProgress[] {
  return FRAMEWORK_INVENTORY.map((fw) =>
    getFrameworkMaturity(fw.frameworkId),
  ).filter((m): m is MaturityProgress => m !== undefined);
}

export function renderPlaywrightMaturityReport(
  report: PlaywrightMaturityReport,
): string {
  const lines: string[] = [];
  lines.push(`Playwright Framework Maturity Report`);
  lines.push(
    `Current: ${report.currentMaturity} → Target: ${report.targetMaturity}`,
  );
  lines.push(
    `Support: ${report.currentSupportStatus} → ${report.targetSupportStatus}`,
  );
  lines.push(
    `Maturity Score: ${report.maturityScore}/100 (${report.progressPercentage}%)`,
  );
  lines.push(
    `Dimensions: ${report.dimensionsComplete}/${report.dimensionsTotal} complete`,
  );
  lines.push("");

  if (report.gaps.length > 0) {
    lines.push("Open Gaps:");
    for (const gap of report.gaps) {
      lines.push(`  - ${gap}`);
    }
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push("Recommendations:");
    for (const rec of report.recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  return lines.join("\n").trimEnd();
}
