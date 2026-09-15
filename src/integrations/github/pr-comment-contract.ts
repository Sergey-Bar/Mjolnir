/**
 * PR Comment Data Contract (PRUX-001, plan §50).
 *
 * The canonical shape that every PR comment renderer consumes.
 * Validation enforces the verdict-completeness state matrix (§51.2):
 *   COMPLETE → WORTHY | NEEDS_WORK | UNWORTHY
 *   PARTIAL  → INCOMPLETE only
 *   ERROR    → ANALYSIS_ERROR only
 *
 * Pure module — no I/O, no clock, no randomness.
 */

export type PrCommentVerdict =
  "WORTHY" | "NEEDS_WORK" | "UNWORTHY" | "INCOMPLETE" | "ANALYSIS_ERROR";

export type AnalysisCompleteness = "COMPLETE" | "PARTIAL" | "ERROR";

export type ScoreAvailability = "available" | "unavailable";

export interface PrCommentScope {
  type: string;
  description: string;
}

export interface PrCommentPullRequest {
  number: number;
  headSha: string;
  baseRef: string;
}

export interface CiIntegritySummary {
  passed: boolean;
  details: string;
}

export interface RuntimeCorroborationSummary {
  testsExecuted: number;
  corroboratedFindings: number;
  details: string;
}

export interface FrameworkSupportSummary {
  detected: string[];
  unknown: boolean;
  details: string;
}

export interface BlockingFinding {
  ruleId: string;
  severity: string;
  message: string;
  file: string;
  line: number;
}

export interface ImportantFinding {
  ruleId: string;
  severity: string;
  message: string;
  file: string;
  line: number;
}

export interface CorroboratedConclusion {
  conclusion: string;
  strength: string;
  sourceCount: number;
}

export interface SuppressionSummary {
  suppressedCount: number;
  details: string;
}

export interface EvidenceSummary {
  evidenceLevel: string;
  trustLevel: string;
  details: string;
}

export interface ReportArtifactReference {
  url: string;
  format: string;
}

export interface GeneratedBy {
  tool: string;
  version: string;
}

/**
 * The PR comment data model v1 (plan §50).
 * Additive-only within schemaVersion 1.
 */
export interface PrCommentModelV1 {
  schemaVersion: 1;
  scanId: string;
  repository: string;
  pullRequest: PrCommentPullRequest;
  scope: PrCommentScope;
  verdict: PrCommentVerdict;
  score: number | null;
  scoreAvailability: ScoreAvailability;
  analysisCompleteness: AnalysisCompleteness;
  trustModelVersion: string;
  scoringModelVersion: string;
  testsAnalyzed: number;
  ciIntegritySummary: CiIntegritySummary;
  runtimeCorroborationSummary: RuntimeCorroborationSummary;
  changedFileCount: number;
  analyzedFileCount: number;
  partialFileCount: number;
  analysisErrors: number;
  frameworkSupportSummary: FrameworkSupportSummary;
  blockingFindings: BlockingFinding[];
  importantFindings: ImportantFinding[];
  corroboratedConclusions: CorroboratedConclusion[];
  suppressionSummary: SuppressionSummary;
  evidenceSummary: EvidenceSummary;
  reportArtifactReference: ReportArtifactReference;
  generatedBy: GeneratedBy;
}

/** Validation error for the verdict-completeness state matrix. */
export interface PrCommentValidationError {
  field: string;
  message: string;
}

/**
 * The verdict-completeness state matrix (§51.2):
 *   COMPLETE → WORTHY | NEEDS_WORK | UNWORTHY
 *   PARTIAL  → INCOMPLETE only
 *   ERROR    → ANALYSIS_ERROR only
 */
const VALID_COMBINATIONS: ReadonlyMap<
  AnalysisCompleteness,
  ReadonlySet<PrCommentVerdict>
> = new Map<AnalysisCompleteness, ReadonlySet<PrCommentVerdict>>([
  ["COMPLETE", new Set<PrCommentVerdict>(["WORTHY", "NEEDS_WORK", "UNWORTHY"])],
  ["PARTIAL", new Set<PrCommentVerdict>(["INCOMPLETE"])],
  ["ERROR", new Set<PrCommentVerdict>(["ANALYSIS_ERROR"])],
]);

/**
 * Validate a PrCommentModelV1 against the verdict-completeness state
 * matrix. Returns an empty array when valid; one or more errors otherwise.
 */
export function validatePrCommentModel(
  model: PrCommentModelV1,
): PrCommentValidationError[] {
  const errors: PrCommentValidationError[] = [];

  if (model.schemaVersion !== 1) {
    errors.push({
      field: "schemaVersion",
      message: `Expected schemaVersion 1, got ${String(model.schemaVersion)}`,
    });
  }

  const allowedVerdicts = VALID_COMBINATIONS.get(model.analysisCompleteness);
  if (allowedVerdicts === undefined) {
    errors.push({
      field: "analysisCompleteness",
      message: `Unknown analysisCompleteness: ${model.analysisCompleteness}`,
    });
  } else if (!allowedVerdicts.has(model.verdict)) {
    errors.push({
      field: "verdict",
      message: `Verdict "${model.verdict}" is not valid for completeness "${model.analysisCompleteness}". Allowed: ${[...allowedVerdicts].join(", ")}`,
    });
  }

  if (model.score !== null && (model.score < 0 || model.score > 100)) {
    errors.push({
      field: "score",
      message: `Score must be null or in [0, 100], got ${model.score}`,
    });
  }

  return errors;
}
