/**
 * Workflow Bypass Detection (CI-006).
 *
 * Detects patterns in CI workflow configurations that allow
 * branches or paths to skip tests. These bypasses can produce
 * green checkmarks on code that was never tested.
 */

export interface BypassPattern {
  type:
    | "path-filter-exclusion"
    | "conditional-test-execution"
    | "missing-status-check";
  description: string;
  risk: "high" | "medium" | "low";
  affectedJobs: string[];
}

interface PathFilterConfig {
  paths?: string[];
  "paths-ignore"?: string[];
  branches?: string[];
  "branches-ignore"?: string[];
}

interface WorkflowTrigger {
  push?: PathFilterConfig;
  pull_request?: PathFilterConfig;
  [key: string]: unknown;
}

interface WorkflowJob {
  if?: string;
  needs?: string | string[];
  [key: string]: unknown;
}

interface WorkflowConfig {
  on?: WorkflowTrigger | string | string[];
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

const TEST_RELEVANT_PATHS = [
  "src/**",
  "lib/**",
  "packages/**",
  "app/**",
  "components/**",
  "modules/**",
  "pages/**",
  "api/**",
  "services/**",
  "utils/**",
  "hooks/**",
];

function isPathExclusionRisk(pathsIgnore: string[]): boolean {
  const testPathPatterns = TEST_RELEVANT_PATHS.map((p) => p.replace("/**", ""));
  for (const ignored of pathsIgnore) {
    const normalizedIgnored = ignored.replace("/**", "").replace(/^\*\//, "");
    for (const testPath of testPathPatterns) {
      if (
        normalizedIgnored === testPath ||
        normalizedIgnored.startsWith(testPath) ||
        testPath.startsWith(normalizedIgnored)
      ) {
        return true;
      }
    }
  }
  return false;
}

export function detectWorkflowBypasses(
  workflowConfig: unknown,
): BypassPattern[] {
  const patterns: BypassPattern[] = [];
  if (typeof workflowConfig !== "object" || workflowConfig === null) {
    return patterns;
  }
  const config = workflowConfig as WorkflowConfig;

  const triggers = config.on;
  if (
    typeof triggers === "object" &&
    triggers !== null &&
    !Array.isArray(triggers)
  ) {
    for (const [eventName, triggerConfig] of Object.entries(triggers)) {
      if (
        typeof triggerConfig === "object" &&
        triggerConfig !== null &&
        !Array.isArray(triggerConfig)
      ) {
        const cfg = triggerConfig as PathFilterConfig;
        if (cfg["paths-ignore"] && cfg["paths-ignore"].length > 0) {
          if (isPathExclusionRisk(cfg["paths-ignore"])) {
            patterns.push({
              type: "path-filter-exclusion",
              description:
                `The "${eventName}" trigger uses paths-ignore that may exclude ` +
                `test-relevant source paths: [${cfg["paths-ignore"].join(", ")}].`,
              risk: "high",
              affectedJobs: ["(all jobs triggered by " + eventName + ")"],
            });
          }
        }
      }
    }
  }

  if (config.jobs) {
    for (const [jobName, job] of Object.entries(config.jobs)) {
      if (job.if) {
        const condition = job.if;
        if (
          condition.includes("github.event_name") ||
          condition.includes("github.ref") ||
          condition.includes("github.head_ref") ||
          condition.includes("github.base_ref")
        ) {
          patterns.push({
            type: "conditional-test-execution",
            description:
              `Job "${jobName}" has a conditional expression that may skip ` +
              `test execution: ${condition}.`,
            risk: "medium",
            affectedJobs: [jobName],
          });
        }
      }
    }
  }

  if (config.jobs) {
    const testJobNames = Object.keys(config.jobs).filter(
      (name) =>
        name.toLowerCase().includes("test") ||
        name.toLowerCase().includes("check") ||
        name.toLowerCase().includes("lint") ||
        name.toLowerCase().includes("verify"),
    );

    const requiredJobs = new Set<string>();
    for (const job of Object.values(config.jobs)) {
      const needs = job.needs;
      if (typeof needs === "string") requiredJobs.add(needs);
      else if (Array.isArray(needs))
        for (const n of needs) if (typeof n === "string") requiredJobs.add(n);
    }

    for (const testJob of testJobNames) {
      if (!requiredJobs.has(testJob)) {
        const job = config.jobs[testJob];
        if (!job?.if) {
          patterns.push({
            type: "missing-status-check",
            description:
              `Test job "${testJob}" is not required by any other job ` +
              `and has no conditional guard — it may not be enforced as a status check.`,
            risk: "low",
            affectedJobs: [testJob],
          });
        }
      }
    }
  }

  return patterns;
}
