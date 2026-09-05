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
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.1.0",

  // Measured (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (M2, 2026-09-04): two rev-1 blindness classes fixed —
  // (a) earlier-tolerated steps must include an actual verification gate,
  // (b) a later always() enforcement step re-enforces failure. Rev-1
  // measurement invalidated per plan §07 (stale → re-measured).
  tier: "quarantine",
  detectorRevision: 2,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
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
      if (laterStepEnforcesFailure(steps, steps.indexOf(last))) continue;

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
