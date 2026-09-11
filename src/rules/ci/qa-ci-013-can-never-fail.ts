/**
 * QA-CI-013 — Verification stage/job conditioned so it can never fail the
 * pipeline (product-gap master plan P3b).
 * Severity: error · Confidence: high · deterministic-defect
 *
 * The can-never-fail class: a verification gate whose Azure condition or
 * enablement guarantees it never executes on the pipeline path it is
 * supposed to guard —
 *   1. `condition: failed()` — the "rescue" shape: the gate runs ONLY when
 *      the pipeline has already failed; on the green path it is skipped,
 *      so the green check verifies nothing.
 *   2. `condition: false` (or the literal string) — the gate never runs.
 *   3. `enabled: false` — the gate is switched off.
 *
 * The sibling master-plan shape — a gate marked `succeededOrFailed()` /
 * `always()` (runs-after-failure semantics) — is QA-CI-008's Azure arm,
 * which owns that condition family; this rule owns the never-runs family.
 * Together the two rules cover the master plan's full can-never-fail list.
 *
 * BORN QUARANTINE (§15.5): unmeasured rules can never default into scans —
 * this rule surfaces only under --strict until corpus-measured.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import {
  isAzurePipelineDoc,
  locateAzureJobKey,
  locateAzureStepKey,
  stepIsVerificationGate,
} from "./azure-gates.js";
import type {
  AzureJob,
  AzurePipelineDoc,
  AzureStep,
} from "../../discovery/azure-pipeline-parser.js";

const NEVER_RUNS_RE = /^\s*(?:false|'false'|"false")\s*$/i;
const RESCUE_RE = /^\s*failed\s*\(\s*\)\s*$/i;

function stepNeverRuns(step: AzureStep): string | undefined {
  const cond = step.condition ?? "";
  if (RESCUE_RE.test(cond)) return `condition: ${cond.trim()}`;
  if (NEVER_RUNS_RE.test(cond)) return `condition: ${cond.trim()}`;
  if (step.enabled === false) return "enabled: false";
  return undefined;
}

function jobNeverRuns(job: AzureJob): string | undefined {
  const cond = job.condition ?? "";
  if (RESCUE_RE.test(cond)) return `condition: ${cond.trim()}`;
  if (NEVER_RUNS_RE.test(cond)) return `condition: ${cond.trim()}`;
  return undefined;
}

export const canNeverFailGate = defineRule({
  id: "QA-CI-013",
  category: "QA-CI",
  title: "Verification gate conditioned so it can never fail the pipeline",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["azure-pipelines"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes:
    "Azure condition/enabled semantics on the parsed pipeline AST",
  introduced: "1.1.0",

  // BORN QUARANTINE (§15.5): ships opt-in via --strict until the corpus
  // measurement proves its FP envelope. Never silent-core.
  tier: "quarantine",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as AzurePipelineDoc | undefined;
    if (!isAzurePipelineDoc(doc)) return findings;

    const jobs = [
      ...(doc.stages ?? []).flatMap((s) => s.jobs ?? []),
      ...(doc.jobs ?? []),
    ];
    if (doc.steps?.length) {
      jobs.push({ name: "steps", kind: "job" as const, steps: doc.steps });
    }

    for (const job of jobs) {
      // Job-level: a gate-bearing job that never runs on the green path.
      const jobShape = jobNeverRuns(job);
      if (jobShape && jobHasGate(job)) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: locateAzureJobKey(ctx.text, job, "condition"),
          column: 1,
          message: `Verification job \`${job.name ?? "?"}\` is guarded by \`${jobShape}\` — it never runs on a green pipeline.`,
          why: "The pipeline can pass with zero verification executed: on the success path this gate is skipped, so the green checkmark proves nothing was verified.",
          fix: "Remove the failed()/false condition or the enabled:false switch so the gate runs on the pipeline path it guards.",
          qaImpact: "FALSE-GREEN",
        });
        continue;
      }
      for (const step of job.steps ?? []) {
        if (!step) continue;
        const shape = stepNeverRuns(step);
        if (!shape || !stepIsVerificationGate(step)) continue;
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: locateAzureStepKey(ctx.text, step, "condition"),
          column: 1,
          message: `Verification step \`${step.name ?? "?"}\` in \`${job.name ?? "?"}\` is guarded by \`${shape}\` — it never runs on a green pipeline.`,
          why: "The pipeline can pass with zero verification executed: on the success path this gate is skipped, so the green checkmark proves nothing was verified.",
          fix: "Remove the failed()/false condition or the enabled:false switch so the gate runs on the pipeline path it guards.",
          qaImpact: "FALSE-GREEN",
        });
      }
    }
    return findings;
  },
});

function jobHasGate(job: AzureJob): boolean {
  return (job.steps ?? []).some(
    (s) => s !== undefined && stepIsVerificationGate(s),
  );
}
