/**
 * Version Consistency (SUPPLY-003).
 *
 * Validates semver strings and checks version consistency across
 * package.json, ENGINE_VERSION, and CLI output.
 */

const SEMVER_RE =
  // eslint-disable-next-line security/detect-unsafe-regex -- standard semver, bounded by test()
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[a-z-][0-9a-z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-z-][0-9a-z-]*))*)?)?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;

/**
 * Check whether a string is valid semver (loose: prerelease and build
 * metadata are optional).
 */
export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version);
}

export interface VersionConsistencyResult {
  consistent: boolean;
  versions: Record<string, string>;
  violations: string[];
}

/**
 * Check version consistency across multiple version sources.
 * Each source is a named version string; all must match.
 */
export function checkVersionConsistency(
  sources: Record<string, string>,
): VersionConsistencyResult {
  const violations: string[] = [];
  const entries = Object.entries(sources);

  for (const [name, version] of entries) {
    if (!isValidSemver(version)) {
      violations.push(`${name}: "${version}" is not valid semver`);
    }
  }

  const unique = new Set(Object.values(sources));
  if (unique.size > 1) {
    violations.push(
      `version mismatch across sources: ${entries.map(([n, v]) => `${n}=${v}`).join(", ")}`,
    );
  }

  return {
    consistent: violations.length === 0,
    versions: sources,
    violations,
  };
}
