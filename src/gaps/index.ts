export {
  GAP_REGISTRY,
  getGapById,
  getGapsByFramework,
  getGapsByPriority,
  getGapsByType,
  getOpenGaps,
  validateGapRegistry,
  validateScorecardCoverage,
} from "./gap-registry.js";

export type {
  GapEntry,
  GapPriority,
  GapRegistryValidationResult,
  GapType,
} from "./gap-registry.js";
