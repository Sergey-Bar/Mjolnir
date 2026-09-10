/**
 * QA-CI-008 — Always-success step at the end of a job.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A final step that cannot fail (e.g. `exit 0`, `echo done`) after a
 * failure-tolerant pattern can flip a red job green — the classic
 * false-green trick.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";
import { looksLikeVerificationGate } from "./verification-gate.js";
import {
  isAzurePipelineDoc,
  jobRunsVerificationGate,
  locateAzureJobKey,
} from "./azure-gates.js";
import type { AzurePipelineDoc } from "../../discovery/azure-pipeline-parser.js";

interface StepNode {
  name?: string;
  run?: string;
  uses?: string;
  if?: string;
  "continue-on-error"?: boolean | string;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

/**
 * Failure-enforcement shapes that legitimately follow tolerated steps: a
 * later `if: always()` step that checks the recorded status and exits
 * non-zero on failure. Adjudication (hashicorp/vault build.yml:889,
 * ci.yml:492, test-go.yml:992 — 2026-09-02) proved the rev-1 detector
 * blind to this canonical honest pattern: the tolerated steps' outcomes
 * ARE enforced after them, so nothing is masked.
 */
const ENFORCED_FAILURE_LATER =
  /(?:result|status)[^\n]*!=\s*['"]?success['"]?|exit\s+1\b|FAILURE|has\s*failed/i;

function laterStepEnforcesFailure(
  steps: StepNode[],
  fromIndex: number,
): boolean {
  return steps
    .slice(fromIndex + 1)
    .some(
      (s) =>
        typeof s?.if === "string" &&
        /always\s*\(\)/.test(s.if) &&
        /!=\s*['"]?success['"]?|==\s*['"]?failure['"]?|result/i.test(s.if) &&
        typeof s?.run === "string" &&
        ENFORCED_FAILURE_LATER.test(s.run),
    );
}

export const alwaysSuccessStep = defineRule({
  id: "QA-CI-008",
  category: "QA-CI",
  title: "Always-success step masks failures",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  // P3b: Azure verification jobs/stages conditioned to run regardless of
  // prerequisite failures (`condition: always()` / `succeededOrFailed()`).
  frameworks: ["github-actions", "azure-pipelines"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  strategyJustification: {
    reasonCode: "runner-semantic",
    detail:
      "always()-success is a workflow-step outcome contract, not a code " +
      "construct; the detector matches the step's run/if keys, which are " +
      "string fields of the YAML config surface — on Azure DevOps the same " +
      "contract lives in job/stage `condition:` text",
  },
  introduced: "0.1.0",

  // Measured (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (M2, 2026-09-04): two rev-1 blindness classes fixed —
  // (a) earlier-tolerated steps must include an actual verification gate,
  // (b) a later always() enforcement step re-enforces failure. Rev-1
  // measurement invalidated per plan §07 (stale → re-measured).
  // detectorRevision 3 (P3b, 2026-09-10): Azure DevOps arm added — a
  // verification gate job conditioned `always()`/`succeededOrFailed()`
  // (master-plan P3b shape). Additive platform detection; GitHub paths
  // unchanged.
  tier: "quarantine",
  detectorRevision: 3,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | AzurePipelineDoc | undefined;
    if (isAzurePipelineDoc(doc)) {
      azureArm(ctx, doc, findings);
      return findings;
    }
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      const steps = job?.steps ?? [];
      if (steps.length < 2) continue;

      const last = steps[steps.length - 1];
      if (!last?.run) continue;

      // Final step that unconditionally exits 0 or is a bare echo/true.
      // detectorRevision 2: a run block that ENFORCES failure (exit 1,
      // status != 'success' checks) is never an always-success flip, even
      // when it contains echo lines — vault FP class.
      const enforcementShaped =
        /exit\s+1\b|!=\s*['"]?success['"]?|==\s*['"]?failure['"]?/.test(
          last.run,
        );
      const suspicious =
        !enforcementShaped &&
        (/^\s*exit\s+0\s*$/m.test(last.run) ||
          /^\s*(?:echo|printf)\b[^&|;]*$/.test(last.run.trim()) ||
          /^\s*true\s*$/.test(last.run.trim()));

      // Only flag when an earlier step tolerates failure — otherwise a
      // final echo is harmless decoration. The tolerated step must also be
      // a VERIFICATION GATE: continue-on-error on artifact uploads, digests,
      // bot comments, or cleanup is ordinary best-effort engineering, not a
      // masked gate (adjudicated FP class, 2026-09-02).
      const earlierTolerantGate = steps
        .slice(0, -1)
        .some(
          (s) =>
            (s?.["continue-on-error"] === true ||
              /\|\|\s*true\b/.test(s?.run ?? "")) &&
            (looksLikeVerificationGate(s?.run ?? "") ||
              (s?.uses !== undefined &&
                /playwright|cypress|codecov\/codecov-action/i.test(s.uses))),
        );

      // Adjudicated FP class (hashicorp/vault): a later step keyed on
      // always() that re-checks the tolerated outcomes and exits 1 on
      // failure means the verdict IS enforced — nothing is masked.
      // Enforcement is checked from the TOLERATED step onward: an
      // always() step that follows the gate is what makes the verdict
      // honest, so a step between the gate and the end that checks
      // `steps.<gate>.result` and exits 1 suppresses the finding for
      // that gate. (`steps.indexOf(last)` always sliced past the final
      // element — an empty window — so rev-2's enforcement arm could
      // never fire; found via the coverage floor.)
      const toleratedIdx = steps.findIndex(
        (s) =>
          (s?.["continue-on-error"] === true ||
            /\|\|\s*true\b/.test(s?.run ?? "")) &&
          (looksLikeVerificationGate(s?.run ?? "") ||
            (s?.uses !== undefined &&
              /playwright|cypress|codecov\/codecov-action/i.test(s.uses))),
      );
      if (
        toleratedIdx !== -1 &&
        laterStepEnforcesFailure(steps, toleratedIdx)
      ) {
        continue;
      }

      if (suspicious && earlierTolerantGate) {
        findings.push({
          severity: "error",
          confidence: "high",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: findStepLine(ctx.text, last.name ?? last.run),
          column: 1,
          message: `Final step in \`${jobName}\` always succeeds while earlier steps tolerate failure.`,
          why: "This combination can flip a failed job to green — the checkmark no longer reflects whether tests passed.",
          fix: "Remove the always-success final step and let the real test step determine the job result.",
          qaImpact: "FALSE-GREEN",
        });
      }
    }
    return findings;
  },
});

function findStepLine(text: string, needle: string): number {
  const idx = text.indexOf(needle);
  if (idx === -1) return 1;
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") line++;
  return line;
}

type FindingPart = Omit<Finding, "ruleId" | "category">;

/**
 * Azure DevOps arm (detectorRevision 3, P3b — master-plan shape): a
 * verification gate job conditioned `always()` / `succeededOrFailed()`.
 * Such a job runs even when the build or prerequisite jobs failed, so its
 * own green result cannot certify the pipeline path it was meant to guard;
 * combined with tolerated steps its failure can never surface at all.
 * Reporting-only jobs (no gate steps) are excluded by the gate check.
 */
function azureArm(
  ctx: { path: string; text: string },
  doc: AzurePipelineDoc,
  findings: FindingPart[],
): void {
  const jobs = [
    ...(doc.stages ?? []).flatMap((s) => s.jobs ?? []),
    ...(doc.jobs ?? []),
  ];
  if (doc.steps?.length) {
    jobs.push({ name: "steps", kind: "job" as const, steps: doc.steps });
  }
  const RUNS_ANYWAY_RE = /\balways\s*\(\s*\)|succeededOrFailed\s*\(\s*\)/i;
  for (const job of jobs) {
    const cond = job.condition ?? "";
    if (!RUNS_ANYWAY_RE.test(cond)) continue;
    if (!jobRunsVerificationGate(job)) continue;
    findings.push({
      severity: "error",
      confidence: "medium",
      findingType: "deterministic-defect",
      qaImpact: "FALSE-GREEN",
      file: ctx.path,
      line: locateAzureJobKey(ctx.text, job, "condition"),
      column: 1,
      message: `Verification job \`${job.name ?? "?"}\` is conditioned \`${cond.trim()}\` — it runs even when its prerequisites failed.`,
      why: "A green result from this job cannot prove the pipeline path it was meant to guard: it executes on failed pipelines too, and its verdict is decoupled from the build it verifies.",
      fix: "Condition the verification job on success (the default), or add an explicit failure-enforcement step that fails when the guarded work did not succeed.",
    });
  }
}
