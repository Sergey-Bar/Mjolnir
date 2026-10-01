/**
 * M12 — Historical Trust and Trend Analysis.
 *
 * Tracks verification trust metrics over time, compares scans,
 * detects regressions, and categorizes trust debt. Provides
 * deterministic trend analysis without external dependencies.
 *
 * All historical data is derived from scan results — no external
 * storage required. The module computes trends from the canonical
 * scan result data.
 */

import type { ScanResult, TrustSummary } from "../types.js";
import type { RunIdentity } from "./run-identity.js";

export interface TrustSnapshot {
  scanId: string;
  timestamp: string;
  score: number | null;
  findings: number;
  errors: number;
  warnings: number;
  infos: number;
  advisory: number;
  trustLevel: string;
  confidence: number;
  evidenceCoverage: number;
  inconclusiveRate: number;
  partial: boolean;
  frameworkCount: number;
  ruleCount: number;
}

export interface TrustTrend {
  snapshots: TrustSnapshot[];
  overallDirection: "improving" | "degrading" | "stable" | "insufficient-data";
  /**
   * `null` when either end had no score — which is the normal state for a
   * repository with no tests, since the scorer returns null rather than
   * inventing a number. A null→number transition is a named event (the repo
   * gained tests), not "+100 points", and `?? 0` used to report it as
   * exactly that: a fabricated 100-point improvement from a repo that had
   * nothing to improve.
   */
  scoreDelta: number | null;
  findingDelta: number;
  confidenceDelta: number;
  regressions: TrustRegression[];
  improvements: TrustImprovement[];
  categorizedDebt: TrustDebt[];
}

export interface TrustRegression {
  type: "score-drop" | "finding-increase" | "confidence-drop" | "new-error";
  description: string;
  magnitude: number;
  snapshot: TrustSnapshot;
}

export interface TrustImprovement {
  type:
    | "score-increase"
    | "finding-decrease"
    | "confidence-increase"
    | "error-resolved";
  description: string;
  magnitude: number;
  snapshot: TrustSnapshot;
}

export interface TrustDebt {
  category:
    | "suppression"
    | "flaky"
    | "framework"
    | "weak-assertion"
    | "ci-integrity"
    | "evidence";
  description: string;
  count: number;
  severity: "low" | "medium" | "high";
}

/**
 * Compute a trust snapshot from a scan result and run identity.
 * Pure function — deterministic output for the same input.
 */
export function computeTrustSnapshot(
  result: ScanResult,
  runIdentity: RunIdentity,
  trustSummary: TrustSummary,
  recordedAt: string,
): TrustSnapshot {
  return {
    scanId: runIdentity.scanId,
    timestamp: recordedAt,
    score: result.score,
    findings: result.findings.length,
    errors: result.findings.filter((f) => f.severity === "error").length,
    warnings: result.findings.filter((f) => f.severity === "warning").length,
    infos: result.findings.filter((f) => f.severity === "info").length,
    advisory: result.findings.filter((f) => f.evidenceLevel === "E0").length,
    trustLevel: trustSummary.level,
    confidence: trustSummary.confidence,
    evidenceCoverage: trustSummary.evidenceCoverage,
    inconclusiveRate: trustSummary.inconclusiveRate,
    partial: result.partial,
    // The COUNT of detected frameworks. This was 1 whenever detection was
    // known and 0 whenever it was not — so a monorepo with four frameworks
    // and a single-framework repo rendered identically, and "detection
    // unknown" became indistinguishable from "no frameworks". `frameworks`
    // is already the list; the ternary was throwing it away.
    frameworkCount: result.frameworkDetectionUnknown
      ? 0
      : result.frameworks.length,
    ruleCount:
      result.findings.length > 0
        ? new Set(result.findings.map((f) => f.ruleId)).size
        : 0,
  };
}

/**
 * Analyze trust trends across multiple snapshots.
 * Pure function — deterministic output for the same input.
 */
export function analyzeTrustTrends(
  snapshots: readonly TrustSnapshot[],
): TrustTrend {
  if (snapshots.length < 2) {
    return {
      snapshots: [...snapshots],
      overallDirection: "insufficient-data",
      scoreDelta: 0,
      findingDelta: 0,
      confidenceDelta: 0,
      regressions: [],
      improvements: [],
      categorizedDebt: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const first = snapshots[0]!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const last = snapshots[snapshots.length - 1]!;

  // `score` is null when the scorer had nothing to score (a repo with no
  // tests). Subtracting `?? 0` turned that into a fabricated number in both
  // directions: a null→100 move reported "+100 points" and 100→null reported
  // "-100 points", neither of which the scorer ever said. A named event is
  // what it is — the score came into being, or stopped existing — so the
  // delta is null and no score regression/improvement is recorded.
  const scoreDelta =
    first.score === null || last.score === null
      ? null
      : last.score - first.score;
  const findingDelta = last.findings - first.findings;
  const confidenceDelta = last.confidence - first.confidence;

  const regressions: TrustRegression[] = [];
  const improvements: TrustImprovement[] = [];

  // A null score delta is not "no change" and must not record a change.
  if (scoreDelta !== null && scoreDelta < 0) {
    regressions.push({
      type: "score-drop",
      description: `Score dropped by ${Math.abs(scoreDelta)} points`,
      magnitude: Math.abs(scoreDelta),
      snapshot: last,
    });
  } else if (scoreDelta !== null && scoreDelta > 0) {
    improvements.push({
      type: "score-increase",
      description: `Score increased by ${scoreDelta} points`,
      magnitude: scoreDelta,
      snapshot: last,
    });
  }

  if (findingDelta > 0) {
    regressions.push({
      type: "finding-increase",
      description: `${findingDelta} more findings detected`,
      magnitude: findingDelta,
      snapshot: last,
    });
  } else if (findingDelta < 0) {
    improvements.push({
      type: "finding-decrease",
      description: `${Math.abs(findingDelta)} fewer findings detected`,
      magnitude: Math.abs(findingDelta),
      snapshot: last,
    });
  }

  if (confidenceDelta < 0) {
    regressions.push({
      type: "confidence-drop",
      description: `Confidence dropped by ${Math.abs(confidenceDelta)}`,
      magnitude: Math.abs(confidenceDelta),
      snapshot: last,
    });
  } else if (confidenceDelta > 0) {
    improvements.push({
      type: "confidence-increase",
      description: `Confidence increased by ${confidenceDelta}`,
      magnitude: confidenceDelta,
      snapshot: last,
    });
  }

  if (last.errors > first.errors) {
    regressions.push({
      type: "new-error",
      description: `${last.errors - first.errors} new error(s) detected`,
      magnitude: last.errors - first.errors,
      snapshot: last,
    });
  }

  // Summed MAGNITUDE, not a count of entries. Counting made the direction a
  // measure of how many kinds of thing changed rather than how much: a
  // 50-point score drop plus three 1-point improvements reported
  // "improving", because three entries beat one. Each entry already carries
  // the magnitude it claims, so the comparison is the obvious one.
  const regressionWeight = regressions.reduce((sum, r) => sum + r.magnitude, 0);
  const improvementWeight = improvements.reduce(
    (sum, i) => sum + i.magnitude,
    0,
  );
  const overallDirection =
    regressionWeight > improvementWeight
      ? "degrading"
      : improvementWeight > regressionWeight
        ? "improving"
        : "stable";

  const categorizedDebt = categorizeTrustDebt(snapshots);

  return {
    snapshots: [...snapshots],
    overallDirection,
    scoreDelta,
    findingDelta,
    confidenceDelta,
    regressions,
    improvements,
    categorizedDebt,
  };
}

/**
 * Categorize trust debt from scan snapshots.
 */
function categorizeTrustDebt(snapshots: readonly TrustSnapshot[]): TrustDebt[] {
  const debt: TrustDebt[] = [];
  const latest = snapshots[snapshots.length - 1];

  if (latest) {
    if (latest.advisory > 0) {
      debt.push({
        category: "suppression",
        description: `${latest.advisory} advisory findings that may be masking issues`,
        count: latest.advisory,
        severity: latest.advisory > 10 ? "high" : "medium",
      });
    }

    if (latest.inconclusiveRate > 0.3) {
      debt.push({
        category: "evidence",
        description: `High inconclusive rate (${(latest.inconclusiveRate * 100).toFixed(1)}%) suggests incomplete analysis`,
        count: Math.round(latest.inconclusiveRate * latest.findings),
        severity: "high",
      });
    }

    if (latest.partial) {
      debt.push({
        category: "framework",
        description: "Partial scan — some files were not analyzed",
        count: 1,
        severity: "medium",
      });
    }

    // `errors >= 1` is required, not incidental. With zero errors the ratio
    // `warnings > errors * 2` becomes `warnings > 0`, so EVERY warning in a
    // repo with no errors was reported as "weak assertions" — a ratio
    // against zero has no denominator, and the check silently degenerated
    // into "any warnings exist".
    if (latest.errors >= 1 && latest.warnings > latest.errors * 2) {
      debt.push({
        category: "weak-assertion",
        description: "Warning-to-error ratio suggests weak assertions",
        count: latest.warnings,
        severity: "low",
      });
    }
  }

  return debt.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Render the score delta, or say plainly that there is not one.
 *
 * A null delta means an end of the window had no score at all — usually a
 * repository with no tests. Printing `0` there would claim the score held
 * steady across a change that is not a change in the score; printing a
 * fabricated `+100` is what `?? 0` used to do. Both make the same mistake in
 * opposite directions, so the renderer names the condition instead.
 */
function scoreDeltaLine(delta: number | null): string {
  if (delta === null)
    return "Score Delta: not comparable (a scan had no score)";
  return `Score Delta: ${delta > 0 ? "+" : ""}${delta}`;
}

export function renderTrustTrend(trend: TrustTrend): string {
  const lines: string[] = [];
  lines.push("Historical Trust Trend Analysis");
  lines.push(`Snapshots: ${trend.snapshots.length}`);
  lines.push(`Overall Direction: ${trend.overallDirection}`);
  lines.push(scoreDeltaLine(trend.scoreDelta));
  lines.push(
    `Finding Delta: ${trend.findingDelta > 0 ? "+" : ""}${trend.findingDelta}`,
  );
  lines.push(
    `Confidence Delta: ${trend.confidenceDelta > 0 ? "+" : ""}${trend.confidenceDelta}`,
  );
  lines.push("");

  if (trend.regressions.length > 0) {
    lines.push("Regressions:");
    for (const r of trend.regressions) {
      lines.push(`  ✗ ${r.description} (magnitude: ${r.magnitude})`);
    }
    lines.push("");
  }

  if (trend.improvements.length > 0) {
    lines.push("Improvements:");
    for (const i of trend.improvements) {
      lines.push(`  ✓ ${i.description} (magnitude: ${i.magnitude})`);
    }
    lines.push("");
  }

  if (trend.categorizedDebt.length > 0) {
    lines.push("Trust Debt:");
    for (const d of trend.categorizedDebt) {
      const icon =
        d.severity === "high" ? "🔴" : d.severity === "medium" ? "🟡" : "🟢";
      lines.push(`  ${icon} [${d.category}] ${d.description} (${d.count})`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
