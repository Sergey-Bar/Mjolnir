/**
 * GAP-001 — Framework Support Inventory.
 *
 * Single source of truth for every test framework, E2E framework,
 * automation library, and CI provider QA Doctor tracks.
 */

export type EntityType =
  "TEST_FRAMEWORK" | "E2E_FRAMEWORK" | "AUTOMATION_LIBRARY" | "CI_PROVIDER";

export type MaturityLevel = "F0" | "F1" | "F2" | "F3" | "F4" | "F5";

export type SupportStatus =
  | "OFFICIAL_FULL"
  | "OFFICIAL_PARTIAL"
  | "EXPERIMENTAL"
  | "DISCOVERED"
  | "UNSUPPORTED"
  | "DEGRADED"
  | "DEPRECATED";

export interface FrameworkMetadata {
  readonly frameworkId: string;
  readonly entityType: EntityType;
  readonly language: string;
  readonly maturity: MaturityLevel;
  readonly supportStatus: SupportStatus;
  readonly targetMaturity: MaturityLevel;
  readonly targetSupportStatus: SupportStatus;
  readonly validatedVersions: readonly string[];
  readonly keyGapForNextLevel: string;
}

export const FRAMEWORK_INVENTORY = [
  {
    frameworkId: "playwright",
    entityType: "E2E_FRAMEWORK",
    language: "TypeScript/JavaScript",
    maturity: "F4",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F5",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["1.44", "1.45", "1.46", "1.47", "1.48"],
    keyGapForNextLevel: "GAP-PW-006 parallelism/worker safety analysis",
  },
  {
    frameworkId: "jest",
    entityType: "TEST_FRAMEWORK",
    language: "TypeScript/JavaScript",
    maturity: "F3",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F4",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["29", "30"],
    keyGapForNextLevel: "GAP-JEST-004 lifecycle modeling",
  },
  {
    frameworkId: "vitest",
    entityType: "TEST_FRAMEWORK",
    language: "TypeScript/JavaScript",
    maturity: "F3",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F4",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["1.6", "2.0", "2.1"],
    keyGapForNextLevel: "GAP-VIT-004 lifecycle modeling",
  },
  {
    frameworkId: "pytest",
    entityType: "TEST_FRAMEWORK",
    language: "Python",
    maturity: "F2",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F3",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["7.4", "8.0", "8.1", "8.2", "8.3"],
    keyGapForNextLevel: "GAP-PY-004 lifecycle modeling",
  },
  {
    frameworkId: "junit",
    entityType: "TEST_FRAMEWORK",
    language: "Java",
    maturity: "F2",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F3",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["5.10", "5.11"],
    keyGapForNextLevel: "GAP-JU-004 lifecycle modeling",
  },
  {
    frameworkId: "nunit",
    entityType: "TEST_FRAMEWORK",
    language: "C#",
    maturity: "F2",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F3",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["3.14", "4.2"],
    keyGapForNextLevel: "GAP-NU-004 lifecycle modeling",
  },
  {
    frameworkId: "xunit",
    entityType: "TEST_FRAMEWORK",
    language: "C#",
    maturity: "F2",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F3",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["2.9"],
    keyGapForNextLevel: "GAP-XU-004 lifecycle modeling",
  },
  {
    frameworkId: "cypress",
    entityType: "E2E_FRAMEWORK",
    language: "TypeScript/JavaScript",
    maturity: "F2",
    supportStatus: "EXPERIMENTAL",
    targetMaturity: "F3",
    targetSupportStatus: "OFFICIAL_PARTIAL",
    validatedVersions: ["13"],
    keyGapForNextLevel: "GAP-CY-004 lifecycle modeling",
  },
  {
    frameworkId: "selenium",
    entityType: "AUTOMATION_LIBRARY",
    language: "Java/TypeScript/Python",
    maturity: "F1",
    supportStatus: "EXPERIMENTAL",
    targetMaturity: "F2",
    targetSupportStatus: "OFFICIAL_PARTIAL",
    validatedVersions: ["4.20", "4.21", "4.22", "4.23", "4.24", "4.25"],
    keyGapForNextLevel: "GAP-SE-002 AST-based usage analysis",
  },
  {
    frameworkId: "testng",
    entityType: "TEST_FRAMEWORK",
    language: "Java",
    maturity: "F1",
    supportStatus: "EXPERIMENTAL",
    targetMaturity: "F2",
    targetSupportStatus: "OFFICIAL_PARTIAL",
    validatedVersions: ["7.10", "7.11"],
    keyGapForNextLevel: "GAP-TN-002 AST-based usage analysis",
  },
  {
    frameworkId: "github-actions",
    entityType: "CI_PROVIDER",
    language: "YAML",
    maturity: "F3",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F4",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["v4"],
    keyGapForNextLevel: "GAP-GHA-004 advanced matrix strategy modeling",
  },
  {
    frameworkId: "azure-devops",
    entityType: "CI_PROVIDER",
    language: "YAML",
    maturity: "F3",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F4",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["2024"],
    keyGapForNextLevel: "GAP-AZ-004 stage dependency graph modeling",
  },
  {
    frameworkId: "jenkins",
    entityType: "CI_PROVIDER",
    language: "Groovy/YAML",
    maturity: "F3",
    supportStatus: "OFFICIAL_PARTIAL",
    targetMaturity: "F4",
    targetSupportStatus: "OFFICIAL_FULL",
    validatedVersions: ["2.440", "2.450"],
    keyGapForNextLevel: "GAP-JK-004 declarative pipeline advanced features",
  },
  {
    frameworkId: "gitlab-ci",
    entityType: "CI_PROVIDER",
    language: "YAML",
    maturity: "F0",
    supportStatus: "UNSUPPORTED",
    targetMaturity: "F1",
    targetSupportStatus: "DISCOVERED",
    validatedVersions: [],
    keyGapForNextLevel: "GAP-GL-001 basic pipeline discovery",
  },
] as const satisfies readonly FrameworkMetadata[];

export type FrameworkId = (typeof FRAMEWORK_INVENTORY)[number]["frameworkId"];

export function getFrameworkById(
  frameworkId: string,
): FrameworkMetadata | undefined {
  return FRAMEWORK_INVENTORY.find((f) => f.frameworkId === frameworkId);
}

export function getFrameworksByStatus(
  status: SupportStatus,
): readonly FrameworkMetadata[] {
  return FRAMEWORK_INVENTORY.filter((f) => f.supportStatus === status);
}

export function getFrameworksByMaturity(
  maturity: MaturityLevel,
): readonly FrameworkMetadata[] {
  return FRAMEWORK_INVENTORY.filter((f) => f.maturity === maturity);
}

export function getFrameworksByType(
  entityType: EntityType,
): readonly FrameworkMetadata[] {
  return FRAMEWORK_INVENTORY.filter((f) => f.entityType === entityType);
}
