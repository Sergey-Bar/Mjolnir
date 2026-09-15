/**
 * Pipeline Stages (ENGINE-010).
 *
 * Defines the typed result objects for each stage of the scan pipeline,
 * enabling decomposed testing and stage-level diagnostics. The scan
 * pipeline currently produces all stages inline; these types formalize
 * the boundaries for future decomposition.
 */

import type { Finding, AnalysisStatus, ScanResult } from "../types.js";

export interface DiscoveryResult {
  testFiles: string[];
  stagedSurface: boolean;
  truncated: boolean;
  truncationReasons: string[];
}

export interface ParseResult {
  parsedFiles: number;
  parseFailed: number;
  skippedFiles: number;
}

export interface RuleResult {
  findings: Finding[];
  rulesEvaluated: number;
  rulesCrashed: number;
  partial: boolean;
}

export interface CorrelationResult {
  runtimeCorroborated: number;
  overlapDeduped: number;
  evidenceStamped: number;
}

export interface PostProcessResult {
  suppressionCount: number;
  scopeFiltered: boolean;
  scopeDegraded?: string;
}

export interface ScoreResult {
  score: number | null;
  rawDeductions: number;
  effectiveDeductions: number;
  dimensions: ScanResult["dimensions"];
}

export interface PipelineDiagnostics {
  stages: {
    discovery: {
      status: AnalysisStatus;
      fileCount: number;
      durationMs: number;
    };
    parse: {
      status: AnalysisStatus;
      parsed: number;
      failed: number;
      durationMs: number;
    };
    rules: {
      status: AnalysisStatus;
      findings: number;
      crashed: number;
      durationMs: number;
    };
    correlation: { status: AnalysisStatus; durationMs: number };
    postProcess: { status: AnalysisStatus; durationMs: number };
    score: { status: AnalysisStatus; score: number | null; durationMs: number };
  };
  totalDurationMs: number;
}

/**
 * Create an empty diagnostics record with all stages initialized
 * to their default state.
 */
export function createDiagnostics(): PipelineDiagnostics {
  const emptyStage = { status: "complete" as AnalysisStatus, durationMs: 0 };
  return {
    stages: {
      discovery: { ...emptyStage, fileCount: 0 },
      parse: { ...emptyStage, parsed: 0, failed: 0 },
      rules: { ...emptyStage, findings: 0, crashed: 0 },
      correlation: { ...emptyStage },
      postProcess: { ...emptyStage },
      score: { ...emptyStage, score: null },
    },
    totalDurationMs: 0,
  };
}

export type StageName = keyof PipelineDiagnostics["stages"];

/**
 * Merge a partial diagnostics update into an existing diagnostics
 * record. Only updates the fields present in the patch.
 */
export function mergeDiagnostics(
  base: PipelineDiagnostics,
  patch: Partial<PipelineDiagnostics["stages"][StageName]> & {
    stage: StageName;
  },
): PipelineDiagnostics {
  const updated = { ...base };
  const stageKey = patch.stage;
  const existing = updated.stages[stageKey];
  if (existing) {
    const merged = { ...existing };
    for (const [k, v] of Object.entries(patch)) {
      if (k !== "stage" && v !== undefined) {
        (merged as Record<string, unknown>)[k] = v;
      }
    }
    (updated.stages as Record<string, unknown>)[stageKey] = merged;
  }
  return updated;
}
