/**
 * QA-CI-009 — Test command does not propagate exit code.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A test step whose run block ends in a construct that discards the test
 * command's exit status — `cmd1; cmd2` sequencing where cmd2 succeeds, or
 * a pipeline without `set -o pipefail` piping tests into another tool
 * (e.g. `npm test | tee log`) — lets the job pass while tests failed.
 * Distinct from QA-CI-002 (explicit `|| true`): here the swallowing is
 * structural, not an explicit override.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
  name?: string;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

const TEST_CMD =
  /\b(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b|\b(?:jest|vitest|pytest|playwright|mocha)\b/;

export const exitCodeNotPropagated = defineRule({
  id: "QA-CI-009",
  category: "QA-CI",
  title: "Test command does not propagate exit code",
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
  detectionStrategy: "regex pattern on parsed workflow AST",
  introduced: "0.4.0",

  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      for (const step of job?.steps ?? []) {
        const run = step?.run;
        if (!run || !TEST_CMD.test(run)) continue;

        // pipefail already set → pipelines propagate failures correctly.
        if (/pipefail/.test(run)) continue;

        // Case 1: test command piped into another tool without pipefail.
        // e.g. `npm test | tee out.log` — the pipeline's status is the LAST
        // command's, so tee's success masks the test failure.
        const lines = run.split("\n");
        for (const line of lines) {
          if (!TEST_CMD.test(line)) continue;
          const afterCmd = line.slice(
            (TEST_CMD.exec(line)?.index ?? 0) +
              (TEST_CMD.exec(line)?.[0].length ?? 0),
          );
          const piped = /^\s*\|(?!\|)/.exec(afterCmd);
          if (piped && !/\|\|\s|&&\s/.test(afterCmd)) {
            findings.push({
              severity: "error",
              confidence: "high",
              findingType: "deterministic-defect",
              file: ctx.path,
              line: findLine(ctx.text, line.trim()),
              column: 1,
              message: `Job \`${jobName}\` pipes the test command into another tool without \`set -o pipefail\`.`,
              why: "In a shell pipeline only the last command's exit code counts — a failing test run is masked by the downstream tool succeeding.",
              fix: "Add `shell: bash` with `set -o pipefail`, or split into two steps so the test command's exit code is preserved.",
              qaImpact: "FALSE-GREEN",
            });
          }
        }

        // Case 2: `;`-sequenced commands after the test command — the final
        // command's success decides the step. e.g. `npm test; npm run lint`.
        // NOTE: TEST_CMD.source contains top-level alternation — it MUST be
        // wrapped in a group or the tail binds to only one branch.
        const seqRe = new RegExp(
          `(?:${TEST_CMD.source})[^\\n;]*;\\s*\\S+`,
          "g",
        );
        let sm: RegExpExecArray | null;
        while ((sm = seqRe.exec(run)) !== null) {
          // Skip when the sequence is guarded by && or || (status matters).
          const seg = sm[0];
          if (/&&|\|\|/.test(seg)) continue;
          findings.push({
            severity: "error",
            confidence: "medium",
            findingType: "deterministic-defect",
            file: ctx.path,
            line: findLine(ctx.text, seg.split(";")[0]?.trim() ?? seg),
            column: 1,
            message: `Job \`${jobName}\` sequences commands with \`; \` after the test command — the test result does not fail the step.`,
            why: "With `;` sequencing the step's exit status comes from the last command only, so failed tests still yield a green checkmark.",
            fix: "Chain with `&&` instead of `;` so a test failure fails the step.",
            qaImpact: "FALSE-GREEN",
          });
        }
      }
    }
    return findings;
  },
});

function findLine(text: string, needle: string): number {
  const idx = text.indexOf(needle);
  if (idx === -1) return 1;
  let line = 1;
  for (let i = 0; i < idx; i++) if (text[i] === "\n") line++;
  return line;
}
