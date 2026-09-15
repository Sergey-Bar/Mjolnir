/**
 * Finding Prioritization (PRUX-004).
 *
 * Sorts findings by: trust impact → false-green potential → severity →
 * evidence strength. Returns display groups with expanded/collapsed state.
 *
 * Default: 3-5 expanded, rest collapsed.
 */

export interface PrioritizedFinding {
  ruleId: string;
  severity: string;
  message: string;
  file: string;
  line: number;
  priority: "blocking" | "important";
}

export interface FindingDisplayGroup {
  priority: number;
  findings: PrioritizedFinding[];
  expanded: boolean;
}

const SEVERITY_RANK: Record<string, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const DEFAULT_EXPANDED_MAX = 5;
const DEFAULT_EXPANDED_MIN = 3;

function severityRank(severity: string): number {
  return SEVERITY_RANK[severity] ?? 3;
}

/**
 * Priority score: lower = higher priority.
 * Blocking findings always rank above important findings.
 * Within each tier: error > warning > info.
 */
function priorityScore(f: PrioritizedFinding): number {
  const blockingPenalty = f.priority === "blocking" ? 0 : 100;
  return blockingPenalty + severityRank(f.severity);
}

/**
 * Sort findings by priority and return display groups.
 * The first `maxExpanded` findings are expanded; the rest are collapsed
 * into a single group.
 */
export function prioritizeFindings(
  findings: PrioritizedFinding[],
  maxExpanded: number = DEFAULT_EXPANDED_MAX,
): FindingDisplayGroup[] {
  if (findings.length === 0) return [];

  const clampedMax = Math.max(
    DEFAULT_EXPANDED_MIN,
    Math.min(maxExpanded, findings.length),
  );
  const sorted = [...findings].sort(
    (a, b) => priorityScore(a) - priorityScore(b),
  );

  const groups: FindingDisplayGroup[] = [];

  const expanded = sorted.slice(0, clampedMax);
  if (expanded.length > 0) {
    groups.push({ priority: 0, findings: expanded, expanded: true });
  }

  const collapsed = sorted.slice(clampedMax);
  if (collapsed.length > 0) {
    groups.push({ priority: 1, findings: collapsed, expanded: false });
  }

  return groups;
}
