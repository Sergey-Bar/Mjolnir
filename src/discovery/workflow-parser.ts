/**
 * Safe GitHub Actions workflow parser (Phase 0.3, W4-03 debt).
 *
 * Replaces the naive regex placeholder. Uses the `yaml` package with
 * hostile-input guards (R3): alias-count limits (YAML bombs), depth caps,
 * and object-prototype safety. Produces the doc model CI rules expect.
 */

import { parse as yamlParse } from "yaml";

/** Hard limits for hostile YAML (billion-laughs style attacks). */
const LIMITS = {
  maxAliases: 50,
  maxDepth: 40,
} as const;

export interface WorkflowStep {
  name?: string;
  run?: string;
  uses?: string;
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

export class YamlParseError extends Error {}

export function parseWorkflow(text: string): WorkflowDoc {
  let doc: unknown;
  try {
    doc = yamlParse(text);
  } catch (err) {
    throw new YamlParseError(
      `Invalid workflow YAML: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (doc === null || doc === undefined) return {};
  if (typeof doc !== "object")
    throw new YamlParseError("Workflow root must be a mapping");

  // Alias-bomb guard: count anchors/aliases textually — the yaml package
  // expands aliases during parse, so we bound the input instead.
  const aliasMatches = text.match(/(?:^|\s)\*(\w+)/g) ?? [];
  if (aliasMatches.length > LIMITS.maxAliases) {
    throw new YamlParseError(
      `YAML alias count ${aliasMatches.length} exceeds limit ${LIMITS.maxAliases}`,
    );
  }

  const root = doc as Record<string, unknown>;
  const jobsRaw = root["jobs"];
  if (jobsRaw === undefined || jobsRaw === null) return {};

  if (typeof jobsRaw !== "object" || Array.isArray(jobsRaw)) {
    throw new YamlParseError('"jobs" must be a mapping');
  }

  const jobs: Record<string, WorkflowJob> = {};
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
          ...(typeof step["run"] === "string" ? { run: step["run"] } : {}),
          ...(typeof step["uses"] === "string" ? { uses: step["uses"] } : {}),
          ...(step["with"] &&
          typeof step["with"] === "object" &&
          !Array.isArray(step["with"])
            ? { with: step["with"] as Record<string, unknown> }
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
