/**
 * Safe Azure DevOps pipeline parser (product-gap master plan P3b).
 *
 * `azure-pipelines.yml` detection rides the same hostile-YAML machinery
 * as the GitHub Actions workflow parser (src/discovery/yaml-guards.ts):
 * alias-bomb pre-check, maxAliasCount on the parser, iterative depth
 * cap, and prototype-safe key access. Produces the doc model the QA-CI
 * rules consume through the `ast` slot.
 *
 * Azure schema notes the parser honors:
 *  - Pipeline shapes: `stages:` (multi-stage), `jobs:` (single-stage),
 *    and top-level `steps:` (single implicit job).
 *  - List entries self-identify by their kind key: `- stage: X`,
 *    `- job: X`, `- deployment: X`, `- task: X@1`, `- script: …`,
 *    `- bash: …`, `- pwsh: …`, `- powershell: …`, `- template: …`.
 *  - Keys are case-INSENSITIVE in Azure (`ContinueOnError` is the same
 *    key as `continueOnError`) — a masked gate must not hide behind
 *    casing, so schema-key resolution is case-insensitive.
 *  - `condition:` values parse as YAML — `condition: false` is the
 *    boolean false, not the text "false". Conditions are captured in
 *    their literal text form so a never-runs gate stays visible.
 *  - `deployment:` jobs keep their steps under `strategy.<mode>.deploy`
 *    (plus its onFailure/onSuccess hooks); those step arrays are parsed
 *    too — a gate inside a deployment job must not be a quiet gap.
 *  - Template entries (`- template: x.yml@t`) are opaque by design: the
 *    referenced file is not resolved (no fabrication of un-read data).
 */

import { parseYamlGuarded } from "./yaml-guards.js";

export interface AzureStep {
  /** `displayName` when present, else the kind-key value (task ref). */
  name?: string;
  /** Task reference, e.g. `Npm@1`. */
  task?: string;
  /** Inline command text from `script:` / `bash:` / `pwsh:` / `powershell:`. */
  script?: string;
  /** Which script kind carried the text. */
  scriptKind?: "script" | "bash" | "pwsh" | "powershell";
  /** Raw `condition:` text (booleans rendered as their literal text). */
  condition?: string;
  continueOnError?: boolean | string;
  retryCountOnTaskFailure?: number | string;
  enabled?: boolean | string;
  /** Template reference (`x.yml@t`) — opaque, never resolved. */
  template?: string;
  /**
   * Task `inputs:` mapping (string values only are consumed by rules —
   * e.g. Npm@1's `command: test`, CmdLine@2's `script:`). Copied, never
   * shared: the parsed doc is handed to every CI rule for this file.
   */
  inputs?: Record<string, unknown>;
}

export interface AzureJob {
  /** `displayName` when present, else the `job:`/`deployment:` key value. */
  name?: string;
  kind: "job" | "deployment";
  condition?: string;
  continueOnError?: boolean | string;
  steps: AzureStep[];
  template?: string;
}

export interface AzureStage {
  name?: string;
  condition?: string;
  jobs: AzureJob[];
  template?: string;
}

export interface AzurePipelineDoc {
  platform: "azure-pipelines";
  stages?: AzureStage[];
  jobs?: AzureJob[];
  /** Top-level single-implicit-job steps. */
  steps?: AzureStep[];
}

export class AzureParseError extends Error {}

const LABELS = {
  invalidPrefix: "Invalid azure-pipelines YAML",
  rootMessage: "azure-pipelines root must be a mapping",
  depthMessage: "azure-pipelines nesting depth exceeds limit",
} as const;

/** Step-kind keywords, in deterministic extraction order. */
const STEP_KIND_KEYS = [
  "task",
  "script",
  "bash",
  "pwsh",
  "powershell",
  "template",
  "checkout",
  "download",
  "downloadbuild",
  "getpackage",
  "publish",
  "reviewapp",
] as const;

const SCRIPT_KINDS: Partial<Record<string, AzureStep["scriptKind"]>> = {
  script: "script",
  bash: "bash",
  pwsh: "pwsh",
  powershell: "powershell",
};

/**
 * Prototype-safe, case-insensitive own-key lookup. Keys named
 * `__proto__`/`constructor`/`prototype` are skipped — a hostile
 * document must not reach any object's prototype chain.
 */
function ciGet(
  obj: Record<string, unknown>,
  key: string,
): { key: string; value: unknown } | undefined {
  const lower = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") {
      continue;
    }
    if (k.toLowerCase() === lower) {
      return { key: k, value: obj[k] };
    }
  }
  return undefined;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return undefined;
  return v as Record<string, unknown>;
}

/** Conditions/flags can parse as YAML booleans — keep their literal text. */
function literalText(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  return undefined;
}

function parseStep(raw: unknown): AzureStep {
  const rec = asRecord(raw);
  if (!rec) return {};
  const step: AzureStep = {};

  for (const kind of STEP_KIND_KEYS) {
    const hit = ciGet(rec, kind);
    if (hit === undefined) continue;
    if (kind === "task") {
      if (typeof hit.value === "string") {
        step.task = hit.value;
        if (step.name === undefined) step.name = hit.value;
      }
    } else if (kind === "template") {
      if (typeof hit.value === "string") step.template = hit.value;
    } else if (SCRIPT_KINDS[kind]) {
      if (typeof hit.value === "string") {
        step.script = hit.value;
        step.scriptKind = SCRIPT_KINDS[kind];
      }
    }
    // checkout/download/… carry no command text the rules consume.
  }

  const displayName = ciGet(rec, "displayName");
  if (displayName && typeof displayName.value === "string") {
    step.name = displayName.value;
  }
  const condition = ciGet(rec, "condition");
  const conditionText = condition ? literalText(condition.value) : undefined;
  if (conditionText !== undefined) step.condition = conditionText;
  const coe = ciGet(rec, "continueOnError");
  if (
    coe &&
    (typeof coe.value === "boolean" || typeof coe.value === "string")
  ) {
    step.continueOnError = coe.value;
  }
  const retry = ciGet(rec, "retryCountOnTaskFailure");
  if (
    retry &&
    (typeof retry.value === "number" || typeof retry.value === "string")
  ) {
    step.retryCountOnTaskFailure = retry.value;
  }
  const enabled = ciGet(rec, "enabled");
  if (
    enabled &&
    (typeof enabled.value === "boolean" || typeof enabled.value === "string")
  ) {
    step.enabled = enabled.value;
  }
  const inputs = ciGet(rec, "inputs");
  const inputsRec = inputs ? asRecord(inputs.value) : undefined;
  if (inputsRec) {
    // Audit (workflow-parser `with` copy) parity: the parsed doc is shared
    // by every CI rule for this file — `inputs` must be a copy, or one
    // rule's mutation of a task input would leak into the other rules'
    // view of the same pipeline. Own-string-keys only (prototype-safe).
    const copy: Record<string, unknown> = {};
    for (const k of Object.keys(inputsRec)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") {
        continue;
      }
      copy[k] = inputsRec[k];
    }
    step.inputs = copy;
  }
  return step;
}

const STRATEGY_MODES = ["runOnce", "rolling", "canary"] as const;
const DEPLOY_HOOKS = ["deploy", "onFailure", "onSuccess"] as const;

function parseDeploymentJob(
  name: string,
  rec: Record<string, unknown>,
): AzureJob {
  const job: AzureJob = { name, kind: "deployment", steps: [] };
  const condition = ciGet(rec, "condition");
  const conditionText = condition ? literalText(condition.value) : undefined;
  if (conditionText !== undefined) job.condition = conditionText;
  const coe = ciGet(rec, "continueOnError");
  if (
    coe &&
    (typeof coe.value === "boolean" || typeof coe.value === "string")
  ) {
    job.continueOnError = coe.value;
  }
  const strategy = asRecord(ciGet(rec, "strategy")?.value);
  if (strategy) {
    for (const mode of STRATEGY_MODES) {
      const modeRec = asRecord(ciGet(strategy, mode)?.value);
      if (!modeRec) continue;
      for (const hook of DEPLOY_HOOKS) {
        const hookRec = asRecord(ciGet(modeRec, hook)?.value);
        if (!hookRec) continue;
        const steps = ciGet(hookRec, "steps");
        if (steps && Array.isArray(steps.value)) {
          job.steps.push(...steps.value.map(parseStep));
        }
      }
    }
  }
  return job;
}

function parseJob(raw: unknown): AzureJob | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const jobKind = ciGet(rec, "job") ?? ciGet(rec, "deployment");
  if (!jobKind || typeof jobKind.value !== "string") return undefined;
  if (ciGet(rec, "deployment") !== undefined) {
    return parseDeploymentJob(jobKind.value, rec);
  }
  const job: AzureJob = { name: jobKind.value, kind: "job", steps: [] };
  const displayName = ciGet(rec, "displayName");
  if (displayName && typeof displayName.value === "string") {
    // The display name describes the job in findings ("Run tests" beats
    // the bare key "Test"); the key value stays the fallback.
    job.name = displayName.value;
  }
  const condition = ciGet(rec, "condition");
  const jobConditionText = condition ? literalText(condition.value) : undefined;
  if (jobConditionText !== undefined) job.condition = jobConditionText;
  const coe = ciGet(rec, "continueOnError");
  if (
    coe &&
    (typeof coe.value === "boolean" || typeof coe.value === "string")
  ) {
    job.continueOnError = coe.value;
  }
  const template = ciGet(rec, "template");
  if (template && typeof template.value === "string") {
    job.template = template.value;
  }
  const steps = ciGet(rec, "steps");
  if (steps && Array.isArray(steps.value)) {
    job.steps = steps.value.map(parseStep);
  }
  return job;
}

function parseStage(raw: unknown): AzureStage | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  const stageKey = ciGet(rec, "stage");
  if (!stageKey || typeof stageKey.value !== "string") return undefined;
  const stage: AzureStage = { name: stageKey.value, jobs: [] };
  const condition = ciGet(rec, "condition");
  const stageConditionText = condition
    ? literalText(condition.value)
    : undefined;
  if (stageConditionText !== undefined) stage.condition = stageConditionText;
  const template = ciGet(rec, "template");
  if (template && typeof template.value === "string") {
    stage.template = template.value;
  }
  const jobs = ciGet(rec, "jobs");
  if (jobs && Array.isArray(jobs.value)) {
    for (const j of jobs.value) {
      const job = parseJob(j);
      if (job) stage.jobs.push(job);
    }
  }
  return stage;
}

export function parseAzurePipeline(text: string): AzurePipelineDoc {
  const doc = parseYamlGuarded(text, LABELS);
  const out: AzurePipelineDoc = { platform: "azure-pipelines" };
  if (doc === null || doc === undefined) return out;

  const root = asRecord(doc);
  if (!root) throw new AzureParseError(LABELS.rootMessage);

  const stages = ciGet(root, "stages");
  if (stages && Array.isArray(stages.value)) {
    out.stages = stages.value
      .map(parseStage)
      .filter((s): s is AzureStage => s !== undefined);
    return out;
  }

  const jobs = ciGet(root, "jobs");
  if (jobs && Array.isArray(jobs.value)) {
    out.jobs = jobs.value
      .map(parseJob)
      .filter((j): j is AzureJob => j !== undefined);
    return out;
  }

  const steps = ciGet(root, "steps");
  if (steps && Array.isArray(steps.value)) {
    out.steps = steps.value.map(parseStep);
  }
  // `extends:` pipelines and empty documents carry nothing to analyze
  // inline — an honest empty doc, never fabricated content.
  return out;
}

/** The platform's default pipeline filenames (repo root convention). */
export const AZURE_PIPELINE_FILENAMES = [
  "azure-pipelines.yml",
  "azure-pipelines.yaml",
] as const;

const AZURE_PIPELINE_FILENAMES_SET: ReadonlySet<string> = new Set(
  AZURE_PIPELINE_FILENAMES,
);

/**
 * True when a repo-relative, forward-slashed path IS the platform's
 * default pipeline file — the fixture/explain/doc surfaces route their
 * parse through the matching machinery on this check.
 */
export function isAzurePipelineFixture(normalizedPath: string): boolean {
  const base = normalizedPath.replaceAll("\\", "/").split("/").pop() ?? "";
  return AZURE_PIPELINE_FILENAMES_SET.has(base);
}
