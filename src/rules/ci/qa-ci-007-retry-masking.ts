/**
 * QA-CI-007 — Retry masking test failures.
 * Severity: warning · Confidence: high · deterministic-defect
 *
 * workflow `retries` on a test job, or retry actions wrapping test steps,
 * can hide intermittent failures — the job passes even though tests failed
 * on the first run.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface JobNode {
  steps?: StepNode[];
  strategy?: { "max-parallel"?: number };
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

export const retryMasking = defineRule({
  id: "QA-CI-007",
  category: "QA-CI",
  title: "Retry masks test failures",
  severity: "warning",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "FLAKY-RISK",
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
      for (const step of job?.steps ?? []) {
        // nick-fields/retry or similar retry wrappers around test commands.
        if (step?.uses && /retry/i.test(step.uses)) {
          const withCfg = step.with ?? {};
          const command = String(
            withCfg["command"] ?? withCfg["max_tries"] ?? "",
          );
          const runsTests =
            /\b(?:npm|yarn|pnpm)\s+(?:test|run\s+test)|\b(?:jest|vitest|pytest|playwright)\b/.test(
              command,
            );
          // Fire only when the retry wrapper actually runs tests; a retry
          // around a non-test command (curl, deploy…) is legitimate.
          if (!runsTests) continue;
          findings.push({
            severity: "warning",
            confidence: "high",
            findingType: "deterministic-defect",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            line: findLine(ctx.text, new RegExp(escapeRe(step.uses))),
            column: 1,
            message: `Job \`${jobName}\` wraps a test command in an automatic retry action.`,
            why: "Retrying tests until they pass hides flaky and intermittent failures — the green check no longer means the suite passed.",
            fix: "Remove the retry wrapper; investigate the underlying flakiness instead.",
          });
        }
        // Inline shell retry loops around test commands.
        if (
          step?.run &&
          /\bfor\b[\s\S]*retry|max_attempts|until.*succeed/i.test(step.run) &&
          /test/i.test(step.run)
        ) {
          findings.push({
            severity: "warning",
            confidence: "medium",
            findingType: "heuristic-risk",
            qaImpact: "FLAKY-RISK",
            file: ctx.path,
            line: findLine(ctx.text, /max_attempts|until.*succeed/i),
            column: 1,
            message: `Job \`${jobName}\` contains a shell retry loop around tests.`,
            why: "Retry-until-pass loops mask intermittent failures instead of surfacing them.",
            fix: "Run tests once; track and fix flakes explicitly.",
          });
        }
      }
    }
    return findings;
  },
});

function findLine(text: string, re: RegExp): number {
  const m = re.exec(text);
  if (!m) return 1;
  let line = 1;
  for (let i = 0; i < m.index; i++) if (text[i] === "\n") line++;
  return line;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
