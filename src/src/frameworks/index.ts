export {
  FRAMEWORK_INVENTORY,
  getFrameworkById,
  getFrameworksByMaturity,
  getFrameworksByStatus,
  getFrameworksByType,
} from "./framework-inventory.js";

export type {
  EntityType,
  FrameworkId,
  FrameworkMetadata,
  MaturityLevel,
  SupportStatus,
} from "./framework-inventory.js";

export {
  FRAMEWORK_SCORECARDS,
  getAllGapIds,
  getMissingAndWeakEntries,
  validateScorecard,
} from "./scorecard.js";

export type {
  FrameworkScorecard,
  ScorecardDimension,
  ScorecardEntry,
  ScorecardRating,
} from "./scorecard.js";

export {
  COMPAT_MATRIX,
  getCompatConfig,
  getAllCompatConfigs,
} from "./compat-ci.js";

export type {
  CompatLane,
  FrameworkCompatConfig,
  FrameworkCompatEntry,
} from "./compat-ci.js";
