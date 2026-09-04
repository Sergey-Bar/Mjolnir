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

export class YamlParseError extends Error {}

export function parseWorkflow(text: string): WorkflowDoc {
  // Alias-bomb guard BEFORE parse: the yaml package expands aliases during
  // parsing, so a billion-laughs document would already have exploded by the
  // time we could count aliases in the parsed doc. Count textually first.
  const aliasMatches = text.match(/(?:^|[\s[{,])\*[^\s,\]}]+/g) ?? [];
  if (aliasMatches.length > LIMITS.maxAliases) {
    throw new YamlParseError(
      `YAML alias count ${aliasMatches.length} exceeds limit ${LIMITS.maxAliases}`,
    );
  }

  let doc: unknown;
  try {
    doc = yamlParse(text, { maxAliasCount: LIMITS.maxAliases });
  } catch (err) {
    // The yaml library throws Error subclasses, but it is third-party
    // code — degrade non-Error throwables to String() rather than trust it.
    const msg = err instanceof Error ? err.message : String(err);
    throw new YamlParseError(`Invalid workflow YAML: ${msg}`);
  }

  if (doc === null || doc === undefined) return {};
  if (typeof doc !== "object")
    throw new YamlParseError("Workflow root must be a mapping");

  // Audit (workflow-parser): enforce the documented depth cap by walking
  // the parsed doc. The yaml package's own alias guard does not bound
  // NESTING depth — a legitimately-alias-free document nested 10,000
  // levels deep would still be built (and later walked recursively by
  // consumers). Iterative walk, so the check itself cannot overflow the
  // stack on a hostile doc.
  enforceDepthCap(doc, LIMITS.maxDepth);

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

/**
 * Iterative depth check over any parsed YAML value. Throws when any
 * path from the root is deeper than `max` nesting levels (audit:
 * the documented cap was never enforced on the parsed structure).
 */
function enforceDepthCap(value: unknown, max: number): void {
  const stack: Array<{ v: unknown; d: number }> = [{ v: value, d: 0 }];
  while (stack.length > 0) {
    const { v, d } = stack.pop() as { v: unknown; d: number };
    if (v === null || typeof v !== "object") continue;
    if (d >= max) {
      throw new YamlParseError(`Workflow nesting depth exceeds limit ${max}`);
    }
    if (Array.isArray(v)) {
      for (const item of v) stack.push({ v: item, d: d + 1 });
    } else {
      for (const item of Object.values(v as Record<string, unknown>)) {
        stack.push({ v: item, d: d + 1 });
      }
    }
  }
}
