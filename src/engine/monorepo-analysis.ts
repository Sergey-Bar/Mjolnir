/**
 * Monorepo Analysis (ECO-003).
 *
 * Per-package trust analysis with configurable aggregation strategies.
 * Worst-package propagation: a blocker in any package affects the overall
 * verdict. Average and configurable weighting strategies are also supported.
 */

import type { Finding } from "../types.js";

export type WeightingStrategy = "worst-package" | "average" | "configurable";

export interface MonorepoConfig {
  weightingStrategy: WeightingStrategy;
  /** Per-package weights for "configurable" strategy. packageName → weight (0..1). */
  packageWeights?: Record<string, number>;
}

export interface PackageResult {
  packageName: string;
  path: string;
  findings: Finding[];
  score: number | null;
  verdict: "pass" | "warn" | "fail";
}

export interface MonorepoAnalysisResult {
  packages: PackageResult[];
  overallScore: number | null;
  overallVerdict: "pass" | "warn" | "fail";
  strategy: WeightingStrategy;
  blockerPackage?: string;
}

const WORTHY_THRESHOLD = 80;
const NEEDS_WORK_THRESHOLD = 50;

function verdictOf(score: number | null): "pass" | "warn" | "fail" {
  if (score === null) return "fail";
  if (score >= WORTHY_THRESHOLD) return "pass";
  if (score >= NEEDS_WORK_THRESHOLD) return "warn";
  return "fail";
}

function hasBlocker(findings: readonly Finding[]): boolean {
  return findings.some((f) => f.severity === "error");
}

/**
 * Aggregate per-package results into an overall verdict.
 *
 * Worst-package propagation: if ANY package has a blocker (error-severity
 * finding) or a failing score, the overall result fails regardless of
 * strategy. This is the safety net — a single poisoned package must not
 * hide behind averaging.
 */
export function analyzeMonorepo(
  packages: ReadonlyArray<{
    packageName: string;
    path: string;
    findings: Finding[];
    score: number | null;
  }>,
  config: MonorepoConfig,
): MonorepoAnalysisResult {
  const results: PackageResult[] = packages.map((p) => ({
    ...p,
    verdict: hasBlocker(p.findings) ? "fail" : verdictOf(p.score),
  }));

  if (results.length === 0) {
    return {
      packages: results,
      overallScore: null,
      overallVerdict: "fail",
      strategy: config.weightingStrategy,
    };
  }

  const blockerPkg = results.find(
    (r) => r.verdict === "fail" || hasBlocker(r.findings),
  );

  // Worst-package propagation always applies: a blocker in any package
  // means the overall is a fail, regardless of strategy.
  if (blockerPkg) {
    return {
      packages: results,
      overallScore: blockerPkg.score,
      overallVerdict: "fail",
      strategy: config.weightingStrategy,
      blockerPackage: blockerPkg.packageName,
    };
  }

  switch (config.weightingStrategy) {
    case "worst-package":
      return worstPackageAggregation(results, config);
    case "average":
      return averageAggregation(results, config);
    case "configurable":
      return configurableAggregation(results, config);
  }
}

function worstPackageAggregation(
  results: PackageResult[],
  config: MonorepoConfig,
): MonorepoAnalysisResult {
  const firstResult = results[0];
  if (firstResult === undefined) {
    return {
      packages: results,
      overallScore: null,
      overallVerdict: "fail",
      strategy: config.weightingStrategy,
    };
  }
  let worst: PackageResult = firstResult;
  for (const r of results) {
    if ((r.score ?? 0) < (worst.score ?? 0)) worst = r;
  }
  return {
    packages: results,
    overallScore: worst.score,
    overallVerdict: worst.verdict,
    strategy: config.weightingStrategy,
    ...(worst.verdict === "fail" ? { blockerPackage: worst.packageName } : {}),
  };
}

function averageAggregation(
  results: PackageResult[],
  config: MonorepoConfig,
): MonorepoAnalysisResult {
  const scored = results.filter((r) => r.score !== null);
  if (scored.length === 0) {
    return {
      packages: results,
      overallScore: null,
      overallVerdict: "fail",
      strategy: config.weightingStrategy,
    };
  }
  const avg =
    scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length;
  return {
    packages: results,
    overallScore: Math.round(avg),
    overallVerdict: verdictOf(Math.round(avg)),
    strategy: config.weightingStrategy,
  };
}

function configurableAggregation(
  results: PackageResult[],
  config: MonorepoConfig,
): MonorepoAnalysisResult {
  const weights = config.packageWeights ?? {};
  let totalWeight = 0;
  let weightedSum = 0;
  for (const r of results) {
    const w = weights[r.packageName] ?? 1;
    totalWeight += w;
    weightedSum += (r.score ?? 0) * w;
  }
  if (totalWeight === 0) {
    return {
      packages: results,
      overallScore: null,
      overallVerdict: "fail",
      strategy: config.weightingStrategy,
    };
  }
  const score = Math.round(weightedSum / totalWeight);
  return {
    packages: results,
    overallScore: score,
    overallVerdict: verdictOf(score),
    strategy: config.weightingStrategy,
  };
}
