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

function na(dimensions: readonly ScorecardDimension[]): ScorecardEntry[] {
  return dimensions.map((d) => ({
    dimension: d,
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  }));
}

const COMMON_MATURE: ScorecardEntry[] = [
  {
    dimension: "reportingQuality",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "configDiscovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "dependencyGraph",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "versionCompatibility",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "documentationCoverage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "migrationGuidance",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "performanceProfiling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "securityAuditing",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "crossFrameworkInterop",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
];

const COMMON_CI: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "EXCELLENT",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "semanticUnderstanding",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "assertionUnderstanding",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "lifecycleModeling",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "asyncSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "fixtureModeling",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "mockingSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "sharedStateAnalysis",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "errorClassification",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "parameterization",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "runtimeEvidence",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "adversarialCorpus",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "knownLimitationCoverage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "ciIntegration",
    current: "EXCELLENT",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "reportingQuality",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "configDiscovery",
    current: "EXCELLENT",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "dependencyGraph",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "versionCompatibility",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "documentationCoverage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "migrationGuidance",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "performanceProfiling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "securityAuditing",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "crossFrameworkInterop",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
];

function merge(
  base: ScorecardEntry[],
  overrides: Partial<Record<ScorecardDimension, Partial<ScorecardEntry>>>,
): ScorecardEntry[] {
  return base.map((entry) => {
    const ov = overrides[entry.dimension];
    if (!ov) return entry;
    return { ...entry, ...ov };
  });
}

const playwrightEntries: ScorecardEntry[] = merge(
  [
    {
      dimension: "discovery",
      current: "EXCELLENT",
      target: "EXCELLENT",
      gapId: null,
    },
    {
      dimension: "astUsage",
      current: "PARTIAL",
      target: "EXCELLENT",
      gapId: "GAP-PW-001",
    },
    ...na([
      "semanticUnderstanding",
      "assertionUnderstanding",
      "asyncSemantics",
      "errorClassification",
    ]),
    {
      dimension: "lifecycleModeling",
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-002",
    },
    {
      dimension: "fixtureModeling",
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-002",
    },
    {
      dimension: "mockingSemantics",
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-003",
    },
    {
      dimension: "sharedStateAnalysis",
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-004",
    },
    {
      dimension: "retrySemantics",
      current: "GOOD",
      target: "EXCELLENT",
      gapId: null,
    },
    {
      dimension: "parameterization",
      current: "PARTIAL",
      target: "GOOD",
      gapId: "GAP-PW-005",
    },
    {
      dimension: "snapshotSemantics",
      current: "NOT_APPLICABLE",
      target: "NOT_APPLICABLE",
      gapId: null,
    },
    {
      dimension: "parallelismWorkerSafety",
      current: "MISSING",
      target: "PARTIAL",
      gapId: "GAP-PW-006",
    },
    {
      dimension: "runtimeEvidence",
      current: "GOOD",
      target: "EXCELLENT",
      gapId: null,
    },
    {
      dimension: "adversarialCorpus",
      current: "PARTIAL",
      target: "GOOD",
      gapId: null,
    },
    {
      dimension: "knownLimitationCoverage",
      current: "PARTIAL",
      target: "GOOD",
      gapId: null,
    },
    {
      dimension: "ciIntegration",
      current: "GOOD",
      target: "EXCELLENT",
      gapId: null,
    },
    ...COMMON_MATURE,
  ],
  {},
);

const jestEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "EXCELLENT",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "GOOD",
    gapId: "GAP-JEST-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "GOOD",
    gapId: "GAP-JEST-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JEST-009",
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-011",
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JEST-012",
  },
  {
    dimension: "runtimeEvidence",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JEST-013",
  },
  {
    dimension: "adversarialCorpus",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JEST-014",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JEST-015",
  },
  {
    dimension: "ciIntegration",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const vitestEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "EXCELLENT",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "GOOD",
    gapId: "GAP-VIT-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "GOOD",
    gapId: "GAP-VIT-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-VIT-009",
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-011",
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-VIT-012",
  },
  {
    dimension: "runtimeEvidence",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-VIT-013",
  },
  {
    dimension: "adversarialCorpus",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-VIT-014",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-VIT-015",
  },
  {
    dimension: "ciIntegration",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const pytestEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-PY-001",
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-PY-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-PY-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-009",
  },
  {
    dimension: "parameterization",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-PY-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-011",
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-012",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-013",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-PY-014",
  },
  {
    dimension: "ciIntegration",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const junitEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JU-001",
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-JU-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-JU-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-009",
  },
  {
    dimension: "parameterization",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-JU-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-011",
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-012",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-013",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-JU-014",
  },
  {
    dimension: "ciIntegration",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const nunitEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-NU-001",
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-NU-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-NU-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-009",
  },
  {
    dimension: "parameterization",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-NU-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-011",
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-012",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-013",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-NU-014",
  },
  {
    dimension: "ciIntegration",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const xunitEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-XU-001",
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-XU-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-XU-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-009",
  },
  {
    dimension: "parameterization",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-XU-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-011",
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-012",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-013",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-XU-014",
  },
  {
    dimension: "ciIntegration",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const cypressEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "GOOD",
    target: "EXCELLENT",
    gapId: null,
  },
  {
    dimension: "astUsage",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-CY-001",
  },
  {
    dimension: "semanticUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-CY-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "WEAK",
    target: "PARTIAL",
    gapId: "GAP-CY-003",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-004",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-005",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-006",
  },
  {
    dimension: "mockingSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-007",
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-008",
  },
  {
    dimension: "errorClassification",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-009",
  },
  {
    dimension: "snapshotSemantics",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-010",
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-011",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-012",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-CY-013",
  },
  {
    dimension: "ciIntegration",
    current: "PARTIAL",
    target: "GOOD",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const seleniumEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-SE-001",
  },
  {
    dimension: "astUsage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-SE-002",
  },
  {
    dimension: "semanticUnderstanding",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-003",
  },
  {
    dimension: "assertionUnderstanding",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-004",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-005",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-006",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-007",
  },
  {
    dimension: "mockingSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-008",
  },
  {
    dimension: "errorClassification",
    current: "MISSING",
    target: "WEAK",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-009",
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-011",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-012",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-SE-013",
  },
  {
    dimension: "ciIntegration",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const testngEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "PARTIAL",
    target: "GOOD",
    gapId: "GAP-TN-001",
  },
  {
    dimension: "astUsage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-TN-002",
  },
  {
    dimension: "semanticUnderstanding",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-003",
  },
  {
    dimension: "assertionUnderstanding",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-004",
  },
  {
    dimension: "lifecycleModeling",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-005",
  },
  {
    dimension: "asyncSemantics",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-006",
  },
  {
    dimension: "fixtureModeling",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-007",
  },
  {
    dimension: "mockingSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "sharedStateAnalysis",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-008",
  },
  {
    dimension: "errorClassification",
    current: "MISSING",
    target: "WEAK",
    gapId: null,
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-009",
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-010",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-011",
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-012",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-013",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-TN-014",
  },
  {
    dimension: "ciIntegration",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  ...COMMON_MATURE,
];

const githubActionsEntries: ScorecardEntry[] = [...COMMON_CI];

const azureDevopsEntries: ScorecardEntry[] = [...COMMON_CI];

const jenkinsEntries: ScorecardEntry[] = [...COMMON_CI];

const gitlabCiEntries: ScorecardEntry[] = [
  {
    dimension: "discovery",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-GL-001",
  },
  {
    dimension: "astUsage",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "semanticUnderstanding",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-002",
  },
  {
    dimension: "assertionUnderstanding",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "lifecycleModeling",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "asyncSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "fixtureModeling",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "mockingSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "sharedStateAnalysis",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "errorClassification",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-003",
  },
  {
    dimension: "retrySemantics",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-004",
  },
  {
    dimension: "parameterization",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-005",
  },
  {
    dimension: "snapshotSemantics",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "parallelismWorkerSafety",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "runtimeEvidence",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-006",
  },
  {
    dimension: "adversarialCorpus",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-007",
  },
  {
    dimension: "knownLimitationCoverage",
    current: "MISSING",
    target: "WEAK",
    gapId: "GAP-GL-008",
  },
  {
    dimension: "ciIntegration",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-GL-009",
  },
  {
    dimension: "reportingQuality",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "configDiscovery",
    current: "MISSING",
    target: "PARTIAL",
    gapId: "GAP-GL-010",
  },
  {
    dimension: "dependencyGraph",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "versionCompatibility",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "documentationCoverage",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "migrationGuidance",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
  {
    dimension: "performanceProfiling",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "securityAuditing",
    current: "NOT_APPLICABLE",
    target: "NOT_APPLICABLE",
    gapId: null,
  },
  {
    dimension: "crossFrameworkInterop",
    current: "MISSING",
    target: "PARTIAL",
    gapId: null,
  },
];

export const FRAMEWORK_SCORECARDS = [
  { frameworkId: "playwright", entries: playwrightEntries },
  { frameworkId: "jest", entries: jestEntries },
  { frameworkId: "vitest", entries: vitestEntries },
  { frameworkId: "pytest", entries: pytestEntries },
  { frameworkId: "junit", entries: junitEntries },
  { frameworkId: "nunit", entries: nunitEntries },
  { frameworkId: "xunit", entries: xunitEntries },
  { frameworkId: "cypress", entries: cypressEntries },
  { frameworkId: "selenium", entries: seleniumEntries },
  { frameworkId: "testng", entries: testngEntries },
  { frameworkId: "github-actions", entries: githubActionsEntries },
  { frameworkId: "azure-devops", entries: azureDevopsEntries },
  { frameworkId: "jenkins", entries: jenkinsEntries },
  { frameworkId: "gitlab-ci", entries: gitlabCiEntries },
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
  const inventoryIds = new Set(FRAMEWORK_INVENTORY.map((f) => f.frameworkId));

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

  const scorecardIds = new Set(FRAMEWORK_SCORECARDS.map((s) => s.frameworkId));
  for (const invId of inventoryIds) {
    if (!scorecardIds.has(invId)) {
      errors.push(`Framework "${invId}" in inventory missing scorecard`);
    }
  }

  return { valid: errors.length === 0, errors };
}
