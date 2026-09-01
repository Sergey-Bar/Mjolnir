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

interface StepNode {
  run?: string;
  name?: string;
  "continue-on-error"?: boolean | string;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
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
  detectionStrategy: "regex pattern",
  introduced: "0.1.0",

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
      const suspicious =
        /^\s*exit\s+0\s*$/m.test(last.run) ||
        /^\s*(?:echo|printf)\b[^&|;]*$/.test(last.run.trim()) ||
        /^\s*true\s*$/.test(last.run.trim());

      // Only flag when an earlier step tolerates failure — otherwise a
      // final echo is harmless decoration.
      const earlierTolerant = steps
        .slice(0, -1)
        .some(
          (s) =>
            s?.["continue-on-error"] === true ||
            /\|\|\s*true\b/.test(s?.run ?? ""),
        );

      if (suspicious && earlierTolerant) {
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
