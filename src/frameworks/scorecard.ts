/**
 * SCORECARD-001 — Framework Scorecards.
 *
 * Per-framework dimension ratings aligned to the roadmap plan §10.
 * Each entry captures the current rating, target rating, and the
 * GAP-* id that blocks the next improvement.
 */

import { FRAMEWORK_INVENTORY } from "./framework-inventory.js";

export type ScorecardRating =
  | "EXCELLENT"
  | "GOOD"
  | "PARTIAL"
  | "WEAK"
  | "MISSING"
  | "NOT_APPLICABLE"
  | "CURRENT";

export const SCORECARD_DIMENSIONS = [
  "discovery",
  "astUsage",
  "semanticUnderstanding",
  "assertionUnderstanding",
  "lifecycleModeling",
  "asyncSemantics",
  "fixtureModeling",
  "mockingSemantics",
  "sharedStateAnalysis",
  "errorClassification",
  "retrySemantics",
  "parameterization",
  "snapshotSemantics",
  "parallelismWorkerSafety",
  "runtimeEvidence",
  "adversarialCorpus",
  "knownLimitationCoverage",
  "ciIntegration",
  "reportingQuality",
  "configDiscovery",
  "dependencyGraph",
  "versionCompatibility",
  "documentationCoverage",
  "migrationGuidance",
  "performanceProfiling",
  "securityAuditing",
  "crossFrameworkInterop",
] as const;

export type ScorecardDimension = (typeof SCORECARD_DIMENSIONS)[number];

export interface ScorecardEntry {
  readonly dimension: ScorecardDimension;
  readonly current: ScorecardRating;
  readonly target: ScorecardRating;
  readonly gapId: string | null;
}

export interface FrameworkScorecard {
  readonly frameworkId: string;
  readonly entries: readonly ScorecardEntry[];
}

type EntryOverride = Partial<Omit<ScorecardEntry, "dimension">>;

function makeScorecard(
  frameworkId: string,
  overrides: Partial<Record<ScorecardDimension, EntryOverride>>,
): FrameworkScorecard {
  const entries: ScorecardEntry[] = SCORECARD_DIMENSIONS.map((dim) => {
    const base: ScorecardEntry = {
      dimension: dim,
      current: "NOT_APPLICABLE",
      target: "NOT_APPLICABLE",
      gapId: null,
    };
    const ov = overrides[dim];
    return ov ? { ...base, ...ov } : base;
  });
  return { frameworkId, entries };
}

const COMMON_MATURE_OVERRIDES: Partial<
  Record<ScorecardDimension, EntryOverride>
> = {
  reportingQuality: { current: "GOOD", target: "EXCELLENT" },
  configDiscovery: { current: "GOOD", target: "EXCELLENT" },
  dependencyGraph: { current: "PARTIAL", target: "GOOD" },
  versionCompatibility: { current: "GOOD", target: "EXCELLENT" },
  documentationCoverage: { current: "PARTIAL", target: "GOOD" },
  migrationGuidance: { current: "PARTIAL", target: "GOOD" },
  performanceProfiling: { current: "MISSING", target: "PARTIAL" },
  securityAuditing: { current: "MISSING", target: "PARTIAL" },
  crossFrameworkInterop: { current: "PARTIAL", target: "GOOD" },
};

const COMMON_CI_OVERRIDES: Partial<Record<ScorecardDimension, EntryOverride>> =
  {
    discovery: { current: "EXCELLENT", target: "EXCELLENT" },
    semanticUnderstanding: { current: "GOOD", target: "EXCELLENT" },
    errorClassification: { current: "GOOD", target: "EXCELLENT" },
    retrySemantics: { current: "GOOD", target: "EXCELLENT" },
    parameterization: { current: "GOOD", target: "EXCELLENT" },
    runtimeEvidence: { current: "PARTIAL", target: "GOOD" },
    adversarialCorpus: { current: "PARTIAL", target: "GOOD" },
    knownLimitationCoverage: { current: "PARTIAL", target: "GOOD" },
    ciIntegration: { current: "EXCELLENT", target: "EXCELLENT" },
    reportingQuality: { current: "GOOD", target: "EXCELLENT" },
    configDiscovery: { current: "EXCELLENT", target: "EXCELLENT" },
    versionCompatibility: { current: "GOOD", target: "EXCELLENT" },
    documentationCoverage: { current: "PARTIAL", target: "GOOD" },
    migrationGuidance: { current: "PARTIAL", target: "GOOD" },
    performanceProfiling: { current: "MISSING", target: "PARTIAL" },
    securityAuditing: { current: "MISSING", target: "PARTIAL" },
    crossFrameworkInterop: { current: "PARTIAL", target: "GOOD" },
  };

function withCommonMature(
  overrides: Partial<Record<ScorecardDimension, EntryOverride>>,
): Partial<Record<ScorecardDimension, EntryOverride>> {
  return { ...COMMON_MATURE_OVERRIDES, ...overrides };
}

type FrameworkId =
  | "playwright"
  | "jest"
  | "vitest"
  | "pytest"
  | "junit"
  | "nunit"
  | "xunit"
  | "cypress"
  | "selenium"
  | "testng"
  | "github-actions"
  | "azure-devops"
  | "jenkins"
  | "gitlab-ci";

type Overrides = Partial<Record<ScorecardDimension, EntryOverride>>;

const FRAMEWORK_OVERRIDES: Record<FrameworkId, Overrides> = {
  playwright: withCommonMature({
    discovery: { current: "EXCELLENT", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "EXCELLENT", gapId: "GAP-PW-001" },
    lifecycleModeling: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-002",
    },
    fixtureModeling: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-002",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-003",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-004",
    },
    retrySemantics: { current: "GOOD", target: "EXCELLENT" },
    parameterization: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-005",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-006",
    },
    runtimeEvidence: { current: "GOOD", target: "EXCELLENT" },
    adversarialCorpus: { current: "PARTIAL", target: "GOOD" },
    knownLimitationCoverage: { current: "PARTIAL", target: "GOOD" },
    ciIntegration: { current: "GOOD", target: "EXCELLENT" },
  }),

  jest: withCommonMature({
    discovery: { current: "EXCELLENT", target: "EXCELLENT" },
    astUsage: { current: "GOOD", target: "EXCELLENT" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "GOOD",
      gapId: "GAP-JEST-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "GOOD",
      gapId: "GAP-JEST-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-JEST-009",
    },
    parameterization: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-010",
    },
    snapshotSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-011",
    },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JEST-012",
    },
    runtimeEvidence: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-JEST-013",
    },
    adversarialCorpus: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-JEST-014",
    },
    knownLimitationCoverage: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-JEST-015",
    },
    ciIntegration: { current: "GOOD", target: "EXCELLENT" },
  }),

  vitest: withCommonMature({
    discovery: { current: "EXCELLENT", target: "EXCELLENT" },
    astUsage: { current: "GOOD", target: "EXCELLENT" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "GOOD",
      gapId: "GAP-VIT-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "GOOD",
      gapId: "GAP-VIT-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-VIT-009",
    },
    parameterization: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-010",
    },
    snapshotSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-011",
    },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-VIT-012",
    },
    runtimeEvidence: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-VIT-013",
    },
    adversarialCorpus: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-VIT-014",
    },
    knownLimitationCoverage: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-VIT-015",
    },
    ciIntegration: { current: "GOOD", target: "EXCELLENT" },
  }),

  pytest: withCommonMature({
    discovery: { current: "GOOD", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "GOOD", gapId: "GAP-PY-001" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-PY-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-PY-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-009",
    },
    parameterization: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PY-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-011",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-012",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-013",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PY-014",
    },
    ciIntegration: { current: "PARTIAL", target: "GOOD" },
  }),

  junit: withCommonMature({
    discovery: { current: "GOOD", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "GOOD", gapId: "GAP-JU-001" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-JU-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-JU-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-009",
    },
    parameterization: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-JU-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-011",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-012",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-013",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-JU-014",
    },
    ciIntegration: { current: "PARTIAL", target: "GOOD" },
  }),

  nunit: withCommonMature({
    discovery: { current: "GOOD", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "GOOD", gapId: "GAP-NU-001" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-NU-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-NU-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-009",
    },
    parameterization: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-NU-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-011",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-012",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-013",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-NU-014",
    },
    ciIntegration: { current: "PARTIAL", target: "GOOD" },
  }),

  xunit: withCommonMature({
    discovery: { current: "GOOD", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "GOOD", gapId: "GAP-XU-001" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-XU-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-XU-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-009",
    },
    parameterization: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-XU-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-011",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-012",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-013",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-XU-014",
    },
    ciIntegration: { current: "PARTIAL", target: "GOOD" },
  }),

  cypress: withCommonMature({
    discovery: { current: "GOOD", target: "EXCELLENT" },
    astUsage: { current: "PARTIAL", target: "GOOD", gapId: "GAP-CY-001" },
    semanticUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-CY-002",
    },
    assertionUnderstanding: {
      current: "WEAK",
      target: "PARTIAL",
      gapId: "GAP-CY-003",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-004",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-005",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-006",
    },
    mockingSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-007",
    },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-008",
    },
    errorClassification: { current: "PARTIAL", target: "GOOD" },
    retrySemantics: { current: "PARTIAL", target: "GOOD" },
    parameterization: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-009",
    },
    snapshotSemantics: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-010",
    },
    parallelismWorkerSafety: {
      current: "NOT_APPLICABLE",
      target: "NOT_APPLICABLE",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-011",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-012",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-CY-013",
    },
    ciIntegration: { current: "PARTIAL", target: "GOOD" },
  }),

  selenium: withCommonMature({
    discovery: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-SE-001",
    },
    astUsage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-SE-002",
    },
    semanticUnderstanding: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-003",
    },
    assertionUnderstanding: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-004",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-005",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-006",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-007",
    },
    mockingSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-008",
    },
    errorClassification: { current: "MISSING", target: "WEAK" },
    retrySemantics: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-009",
    },
    parameterization: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "NOT_APPLICABLE",
      target: "NOT_APPLICABLE",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-011",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-012",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-SE-013",
    },
    ciIntegration: { current: "MISSING", target: "PARTIAL" },
  }),

  testng: withCommonMature({
    discovery: {
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-TN-001",
    },
    astUsage: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-TN-002",
    },
    semanticUnderstanding: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-003",
    },
    assertionUnderstanding: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-004",
    },
    lifecycleModeling: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-005",
    },
    asyncSemantics: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-006",
    },
    fixtureModeling: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-007",
    },
    mockingSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    sharedStateAnalysis: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-008",
    },
    errorClassification: { current: "MISSING", target: "WEAK" },
    retrySemantics: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-009",
    },
    parameterization: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-010",
    },
    snapshotSemantics: { current: "NOT_APPLICABLE", target: "NOT_APPLICABLE" },
    parallelismWorkerSafety: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-011",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-012",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-013",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-TN-014",
    },
    ciIntegration: { current: "MISSING", target: "PARTIAL" },
  }),

  "github-actions": COMMON_CI_OVERRIDES,
  "azure-devops": COMMON_CI_OVERRIDES,
  jenkins: COMMON_CI_OVERRIDES,

  "gitlab-ci": {
    discovery: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-GL-001",
    },
    semanticUnderstanding: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-002",
    },
    errorClassification: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-003",
    },
    retrySemantics: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-004",
    },
    parameterization: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-005",
    },
    runtimeEvidence: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-006",
    },
    adversarialCorpus: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-007",
    },
    knownLimitationCoverage: {
      current: "MISSING",
      target: "WEAK",
      gapId: "GAP-GL-008",
    },
    ciIntegration: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-GL-009",
    },
    reportingQuality: { current: "MISSING", target: "PARTIAL" },
    configDiscovery: {
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-GL-010",
    },
    versionCompatibility: { current: "MISSING", target: "PARTIAL" },
    documentationCoverage: { current: "MISSING", target: "PARTIAL" },
    migrationGuidance: { current: "MISSING", target: "PARTIAL" },
    crossFrameworkInterop: { current: "MISSING", target: "PARTIAL" },
  },
};

export const FRAMEWORK_SCORECARDS = [
  makeScorecard("playwright", FRAMEWORK_OVERRIDES["playwright"]),
  makeScorecard("jest", FRAMEWORK_OVERRIDES["jest"]),
  makeScorecard("vitest", FRAMEWORK_OVERRIDES["vitest"]),
  makeScorecard("pytest", FRAMEWORK_OVERRIDES["pytest"]),
  makeScorecard("junit", FRAMEWORK_OVERRIDES["junit"]),
  makeScorecard("nunit", FRAMEWORK_OVERRIDES["nunit"]),
  makeScorecard("xunit", FRAMEWORK_OVERRIDES["xunit"]),
  makeScorecard("cypress", FRAMEWORK_OVERRIDES["cypress"]),
  makeScorecard("selenium", FRAMEWORK_OVERRIDES["selenium"]),
  makeScorecard("testng", FRAMEWORK_OVERRIDES["testng"]),
  makeScorecard("github-actions", FRAMEWORK_OVERRIDES["github-actions"]),
  makeScorecard("azure-devops", FRAMEWORK_OVERRIDES["azure-devops"]),
  makeScorecard("jenkins", FRAMEWORK_OVERRIDES["jenkins"]),
  makeScorecard("gitlab-ci", FRAMEWORK_OVERRIDES["gitlab-ci"]),
] as const satisfies readonly FrameworkScorecard[];

export function getAllGapIds(): readonly string[] {
  const ids = new Set<string>();
  for (const scorecard of FRAMEWORK_SCORECARDS) {
    for (const entry of scorecard.entries) {
      if (entry.gapId !== null) {
        ids.add(entry.gapId);
      }
    }
  }
  return [...ids].sort();
}

export function getMissingAndWeakEntries(): readonly (ScorecardEntry & {
  frameworkId: string;
})[] {
  const results: (ScorecardEntry & { frameworkId: string })[] = [];
  for (const scorecard of FRAMEWORK_SCORECARDS) {
    for (const entry of scorecard.entries) {
      if (entry.current === "MISSING" || entry.current === "WEAK") {
        results.push({ ...entry, frameworkId: scorecard.frameworkId });
      }
    }
  }
  return results;
}

export interface ScorecardValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateScorecard(): ScorecardValidationResult {
  const errors: string[] = [];
  const inventoryIds = new Set<string>(
    FRAMEWORK_INVENTORY.map((f) => f.frameworkId),
  );

  for (const scorecard of FRAMEWORK_SCORECARDS) {
    if (!inventoryIds.has(scorecard.frameworkId)) {
      errors.push(
        `Scorecard framework "${scorecard.frameworkId}" not found in FRAMEWORK_INVENTORY`,
      );
    }

    const dimensionSet = new Set<string>();
    for (const entry of scorecard.entries) {
      if (dimensionSet.has(entry.dimension)) {
        errors.push(
          `Duplicate dimension "${entry.dimension}" in scorecard "${scorecard.frameworkId}"`,
        );
      }
      dimensionSet.add(entry.dimension);
    }

    for (const dim of SCORECARD_DIMENSIONS) {
      if (!dimensionSet.has(dim)) {
        errors.push(
          `Missing dimension "${dim}" in scorecard "${scorecard.frameworkId}"`,
        );
      }
    }
  }

  const scorecardIds = new Set<string>(
    FRAMEWORK_SCORECARDS.map((s) => s.frameworkId),
  );
  for (const invId of inventoryIds) {
    if (!scorecardIds.has(invId)) {
      errors.push(`Framework "${invId}" in inventory missing scorecard`);
    }
  }

  return { valid: errors.length === 0, errors };
}
