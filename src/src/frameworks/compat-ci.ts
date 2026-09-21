/**
 * COMPAT-001 — Framework Compatibility CI Configuration.
 *
 * Defines the compatibility lanes for CI validation of each supported
 * framework. Three lanes ensure coverage across minimum supported,
 * representative stable, and latest validated versions.
 */

export type CompatLane =
  "MINIMUM_SUPPORTED" | "REPRESENTATIVE_STABLE" | "LATEST_VALIDATED";

export interface FrameworkCompatEntry {
  readonly version: string;
  readonly compatLane: CompatLane;
}

export interface FrameworkCompatConfig {
  readonly frameworkId: string;
  readonly lanes: readonly FrameworkCompatEntry[];
}

export const COMPAT_MATRIX: readonly FrameworkCompatConfig[] = [
  {
    frameworkId: "playwright",
    lanes: [
      { version: "1.44", compatLane: "MINIMUM_SUPPORTED" },
      { version: "1.47", compatLane: "REPRESENTATIVE_STABLE" },
      { version: "1.48", compatLane: "LATEST_VALIDATED" },
    ],
  },
  {
    frameworkId: "jest",
    lanes: [
      { version: "29", compatLane: "MINIMUM_SUPPORTED" },
      { version: "29.7", compatLane: "REPRESENTATIVE_STABLE" },
      { version: "30", compatLane: "LATEST_VALIDATED" },
    ],
  },
  {
    frameworkId: "pytest",
    lanes: [
      { version: "7.4", compatLane: "MINIMUM_SUPPORTED" },
      { version: "8.1", compatLane: "REPRESENTATIVE_STABLE" },
      { version: "8.3", compatLane: "LATEST_VALIDATED" },
    ],
  },
] as const;

export function getCompatConfig(
  frameworkId: string,
): FrameworkCompatConfig | undefined {
  return COMPAT_MATRIX.find((c) => c.frameworkId === frameworkId);
}

export function getAllCompatConfigs(): readonly FrameworkCompatConfig[] {
  return COMPAT_MATRIX;
}
