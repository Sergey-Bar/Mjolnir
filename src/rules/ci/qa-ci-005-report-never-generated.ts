/**
 * QA-CI-005 — Report consumed but never generated.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A step uploads/consumes a report artifact (coverage, test results)
 * that no previous step produces — the gate reads an empty or stale file
 * and passes vacuously. Product-MVP §35: "Required report not produced".
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

/** Known report-consumption patterns and the commands that produce them. */
const CONSUMERS: Array<{
  /** Matches any consumption signal: uses:, with.path, or run text. */
  re: RegExp;
  /** Extra per-step signals checked against step objects. */
  stepRe?: RegExp;
  producer: RegExp;
  label: string;
}> = [
  {
    // coverage upload: codecov/coveralls actions, or artifact upload of
    // a coverage path (the path lives in `with`, not in run text).
    re: /codecov|coveralls/i,
    stepRe: /upload-artifact/i,
    producer:
      // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
      /\b(?:npx\s+)?(?:vitest|jest|nyc)\b[\s\S]*--coverage|--coverage\b/i,
    label: "coverage artifact",
  },
  {
    re: /codecov|coveralls/i,
    producer: /--coverage\b|(?:vitest|jest|nyc)\b[\s\S]+coverage/i,
    label: "coverage upload",
  },
];

export const reportNeverGenerated = defineRule({
  id: "QA-CI-005",
  category: "QA-CI",
  title: "Report consumed but never generated",
  severity: "error",
  confidence: "high",
  findingType: "deterministic-defect",
  qaImpact: "BLOCKS-RELEASE",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "low",
  autofix: false,
  detectionStrategy: "LEXICAL",
  introduced: "0.1.0",

  // Measured 2026-09-02 (corpus wave 5): tier set from the measured envelope (plan §11.2).
  tier: "quarantine",
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    const jobEntries = Object.entries(doc.jobs);
    // Bug-audit M0 #5: coverage artifacts are shared across jobs — the
    // canonical split-job layout (job A runs tests with `--coverage`,
    // job B uploads to codecov) was flagged as "consumes a report that
    // no step generates" because production/consumption were evaluated
    // per JOB. Production is workflow-level; only consumption stays
    // per-job (so the finding still names the offending job).
    const workflowRunText = jobEntries
      .map(([, j]) => (j?.steps ?? []).map((s) => s?.run ?? "").join("\n"))
      .join("\n");

    for (const [jobName, job] of jobEntries) {
      const steps = job?.steps ?? [];
      const allRunText = steps.map((s) => s?.run ?? "").join("\n");

      for (const consumer of CONSUMERS) {
        // Consumption signal: run text, uses:, or a coverage-ish `with.path`
        // on an upload step (the path lives in `with`, not in run text).
        const consumes =
          steps.some((s) => {
            // parseWorkflow normalizes every step entry to an object.
            if (s.uses && consumer.re.test(s.uses)) return true;
            if (
              consumer.stepRe &&
              s.uses &&
              consumer.stepRe.test(s.uses) &&
              s.with &&
              typeof s.with["path"] === "string" &&
              /coverage|lcov/i.test(s.with["path"])
            )
              return true;
            return false;
          }) || consumer.re.test(allRunText);
        if (!consumes) continue;
        const produces =
          consumer.producer.test(allRunText) ||
          consumer.producer.test(workflowRunText);
        if (!produces) {
          findings.push({
            severity: "error",
            confidence: "high",
            findingType: "deterministic-defect",
            file: ctx.path,
            line: findLine(ctx.text, consumer.re),
            column: 1,
            message: `Job \`${jobName}\` consumes a ${consumer.label} that no step generates.`,
            why: "The gate reads a report that is never produced — it passes on empty/stale data while appearing to verify something.",
            fix: "Add a step that runs tests with --coverage (or generate the report) before this consumption step.",
            qaImpact: "BLOCKS-RELEASE",
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
