export {
  validatePrCommentModel,
  type PrCommentModelV1,
  type PrCommentVerdict,
  type AnalysisCompleteness,
  type ScoreAvailability,
  type PrCommentScope,
  type PrCommentPullRequest,
  type PrCommentValidationError,
} from "./pr-comment-contract.js";

export { renderPrComment } from "./pr-comment-renderer.js";

export {
  prioritizeFindings,
  type FindingDisplayGroup,
  type PrioritizedFinding,
} from "./finding-prioritization.js";

export {
  renderCompletenessWarning,
  renderFrameworkLimitations,
} from "./completeness-ux.js";

export {
  sanitizeForMarkdown,
  sanitizeTestName,
  sanitizeFilePath,
  sanitizeErrorMessage,
  capFindingsCount,
} from "./evidence-sanitization.js";
