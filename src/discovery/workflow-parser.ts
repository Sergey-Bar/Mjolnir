/**
 * Safe GitHub Actions workflow parser (Phase 0.3, W4-03 debt).
 *
 * Replaces the naive regex placeholder. Uses the `yaml` package through
 * the shared hostile-input guards (src/discovery/yaml-guards.ts — R3):
 * alias-count limits (YAML bombs), depth caps, and object-prototype
 * safety. Produces the doc model CI rules expect. The same guards back
 * the Azure DevOps pipeline parser (P3b), so both CI surfaces share one
 * attack-surface defense.
 */

import { YamlParseError, parseYamlGuarded } from "./yaml-guards.js";

// The shared guards throw THIS class — re-exported so every consumer's
// instanceof check (tests, adapter catch-sites) sees the same error type.
export { YamlParseError };

export interface WorkflowStep {
  name?: string;
  /** Step id — consumed by rules that look for outcome-keyed follow-ups. */
  id?: string;
  run?: string;
  uses?: string;
  /** Raw `if:` condition text (consumed by rules that key on outcomes). */
  if?: string;
  with?: Record<string, unknown>;
  "continue-on-error"?: boolean | string;
}

export interface WorkflowJob {
  "continue-on-error"?: boolean | string;
  /** Raw `if:` condition text, when present (consumed by CI rules). */
  if?: string;
  steps?: WorkflowStep[];
}

export interface WorkflowDoc {
  jobs?: Record<string, WorkflowJob>;
}

const LABELS = {
  invalidPrefix: "Invalid workflow YAML",
  rootMessage: "Workflow root must be a mapping",
  depthMessage: "Workflow nesting depth exceeds limit",
} as const;

export function parseWorkflow(text: string): WorkflowDoc {
  const doc = parseYamlGuarded(text, LABELS);

  if (doc === null || doc === undefined) return {};
  const root = doc as Record<string, unknown>;
  const jobsRaw = root["jobs"];
  if (jobsRaw === undefined || jobsRaw === null) return {};

  if (typeof jobsRaw !== "object" || Array.isArray(jobsRaw)) {
    throw new YamlParseError('"jobs" must be a mapping');
  }

  // Audit (workflow-parser): null-prototype map for job names — a
  // hostile workflow declaring `jobs: { __proto__: … }` must not reach
  // the parsed object's prototype chain (the assignment used to be a
  // silent prototype write, never an own property, and downstream
  // Object.entries iterations saw phantom keys).
  const jobs: Record<string, WorkflowJob> = Object.create(null) as Record<
    string,
    WorkflowJob
  >;
  for (const [jobName, jobVal] of Object.entries(
    jobsRaw as Record<string, unknown>,
  )) {
    if (jobVal === null || typeof jobVal !== "object" || Array.isArray(jobVal))
      continue;
    const job = jobVal as Record<string, unknown>;
    const parsedJob: WorkflowJob = {};

    if (
      typeof job["continue-on-error"] === "boolean" ||
      typeof job["continue-on-error"] === "string"
    ) {
      parsedJob["continue-on-error"] = job["continue-on-error"];
    }

    if (typeof job["if"] === "string") {
      parsedJob["if"] = job["if"];
    }

    if (Array.isArray(job["steps"])) {
      parsedJob.steps = (job["steps"] as unknown[]).map((s): WorkflowStep => {
        if (s === null || typeof s !== "object" || Array.isArray(s)) return {};
        const step = s as Record<string, unknown>;
        return {
          ...(typeof step["name"] === "string" ? { name: step["name"] } : {}),
          ...(typeof step["id"] === "string" ? { id: step["id"] } : {}),
          ...(typeof step["run"] === "string" ? { run: step["run"] } : {}),
          ...(typeof step["uses"] === "string" ? { uses: step["uses"] } : {}),
          ...(typeof step["if"] === "string" ? { if: step["if"] } : {}),
          ...(step["with"] &&
          typeof step["with"] === "object" &&
          !Array.isArray(step["with"])
            ? {
                // Audit (workflow-parser): the parsed doc is shared by
                // every CI rule for this file — `with` must be a copy,
                // or one rule's mutation of a step input would leak
                // into the other rules' view of the same workflow.
                with: { ...(step["with"] as Record<string, unknown>) },
              }
            : {}),
          ...(typeof step["continue-on-error"] === "boolean" ||
          typeof step["continue-on-error"] === "string"
            ? { "continue-on-error": step["continue-on-error"] }
            : {}),
        };
      });
    }

    jobs[jobName] = parsedJob;
  }

  return { jobs };
}
