/**
 * QA-CI-015 — CI install steps lack safety flags.
 * Severity: warning · Confidence: medium · deterministic-defect
 *
 * CI workflows that run `npm install`, `yarn install`, or `pnpm install`
 * without `--prefer-offline` (or `--frozen-lockfile`/`--ci`) can pull
 * fresh packages on every run, introducing non-determinism and supply-chain
 * exposure. An advisory-first gate: the finding recommends adding safety
 * flags but does not block the pipeline.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
}

interface JobNode {
  steps?: StepNode[];
}

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}

const INSTALL_RE =
  /\b(?:npm|yarn|pnpm)\s+install\b(?!\s+--(?:prefer-offline|frozen-lockfile|ci|audit=false))/;

const SAFETY_FLAG_RE =
  /\b(?:npm|yarn|pnpm)\s+install\b.*\b(?:--prefer-offline|--frozen-lockfile|--ci|--audit=false)/;

export const installSafety = defineRule({
  id: "QA-CI-015",
  category: "QA-CI",
  title: "CI install steps lack safety flags",
  severity: "warning",
  confidence: "medium",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes: "regex heuristic on parsed workflow AST step run commands",
  introduced: "2.0.0",
  tier: "quarantine",
  detectorRevision: 1,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      for (const step of job?.steps ?? []) {
        const runCmd = step?.run ?? "";
        if (!INSTALL_RE.test(runCmd)) continue;
        if (SAFETY_FLAG_RE.test(runCmd)) continue;

        findings.push({
          severity: "warning",
          confidence: "medium",
          findingType: "deterministic-defect",
          file: ctx.path,
          line: 1,
          column: 1,
          message: `Job \`${jobName}\` runs \`${runCmd.trim()}\` without safety flags (--prefer-offline, --frozen-lockfile, --ci, or --audit=false).`,
          why: "Installing packages without safety flags on every CI run pulls fresh artifacts, introducing non-determinism and supply-chain exposure. The green checkmark may verify a different package set than the one tested locally.",
          fix: "Add --prefer-offline or --frozen-lockfile to the install step so CI uses the lockfile contents deterministically.",
          qaImpact: "FALSE-GREEN",
        });
      }
    }
    return findings;
  },
});
