/**
 * QA-CI-010 — Required test job is non-blocking for branch protection.
 * Severity: error · Confidence: medium · deterministic-defect
 *
 * A workflow whose test job is marked as skipped-by-default or excluded
 * from the paths that matter (`if:` guards that skip tests on PRs, or a
 * workflow-level `on:` filter that never triggers on pull_request) means
 * the branch-protection "required check" can pass without tests ever
 * running. The classic shape: tests only run on push to main, so PRs
 * merge with zero test execution.
 */

import { defineRule } from "../rule.js";
import type { Finding } from "../../types.js";

interface StepNode {
  run?: string;
}

interface JobNode {
  steps?: StepNode[];
  /** Raw `if:` condition text (kept as string by the safe parser). */
  if?: unknown;
}

interface WorkflowDoc {
  /** `true` when the workflow has no pull_request trigger. */
  name?: unknown;
  jobs?: Record<string, JobNode>;
}

const TEST_CMD =
  // eslint-disable-next-line security/detect-unsafe-regex -- bounded literal pattern (no quantifier exchange surface) — ReDoS is authoritatively gated by regexp/no-super-linear-backtracking (error in the ratchet) + tests/redos-audit.spec.ts
  /\b(?:npm|yarn|pnpm)\s+(?:run\s+)?test\b|\b(?:jest|vitest|pytest|playwright|mocha)\b/;

/**
 * `if:` conditions that skip the job on pull requests.
 * NOTE: `!=` only — `github.event_name == 'pull_request'` is the OPPOSITE
 * (run ONLY on PRs) and must never match here.
 *
 * detectorRevision 2 (M2, 2026-09-04): a condition that CONTAINS a
 * push-match alternative can still RUN on PRs via `||` branches —
 * `github.event_name == 'push' || ... || (pull_request && !draft)` runs on
 * non-draft PRs (adjudicated FPs: nocodb jest-unit-test.yml, grafana
 * pr-frontend-unit-tests.yml, streamlit publish jobs). The condition is a
 * skip only when EVERY PR-shaped alternative excludes PRs: i.e. the
 * condition contains a PR-inclusive branch (== pull_request, !draft,
 * labeled trigger) or consists solely of push/schedule/dispatch
 * alternatives — matched below only when no PR-inclusive alternative
 * exists anywhere in the condition.
 */
const PR_INCLUSIVE_RE =
  /github\.event_name\s*==\s*['"]?pull_request\b|pull_request[^\n]*!\s*=\s*['"]?draft|!\s*github\.event\.pull_request|github\.event\.label\.name|!=\s*['"]?draft['"]?|head\.repo\.fork\s*==\s*['"]?false['"]?/;

const SKIP_ON_PR =
  /github\.event_name\s*!=\s*['"]?pull_request|github\.event_name\s*==\s*['"]?(?:push|schedule|workflow_dispatch)\b|!\s*github\.event\b|github\.ref\s*==\s*['"]?refs\/heads\/(?:main|master)\b/;

export const nonBlockingTestJob = defineRule({
  id: "QA-CI-010",
  category: "QA-CI",
  title: "Tests skipped where they must block",
  severity: "error",
  confidence: "medium",
  findingType: "deterministic-defect",
  qaImpact: "FALSE-GREEN",
  appliesTo: "ci-workflows",
  // Trust Metadata
  languages: ["yaml"],
  frameworks: ["github-actions"],
  falsePositiveRisk: "medium",
  autofix: false,
  detectionStrategy: "FRAMEWORK",
  detectionNotes: "regex heuristic on parsed workflow AST",
  introduced: "0.4.0",

  // Measured (corpus wave 5): tier set from the measured envelope (plan §11.2).
  // detectorRevision 2 (M2, 2026-09-04): PR-inclusive compound conditions
  // no longer flagged. Rev-1 measurement invalidated per §07.
  tier: "quarantine",
  detectorRevision: 2,
  run(ctx) {
    const findings: Omit<Finding, "ruleId" | "category">[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      const runsTests = (job?.steps ?? []).some((s) =>
        TEST_CMD.test(s?.run ?? ""),
      );
      if (!runsTests) continue;

      const cond = typeof job?.if === "string" ? job.if : "";
      // detectorRevision 2: a compound condition with a PR-inclusive `||`
      // branch runs on PRs — not a skip (adjudicated FP class).
      if (cond && PR_INCLUSIVE_RE.test(cond)) continue;
      if (cond && SKIP_ON_PR.test(cond)) {
        findings.push({
          severity: "error",
          confidence: "medium",
          findingType: "deterministic-defect",
          file: ctx.path,
          // eslint-disable-next-line security/detect-non-literal-regexp -- escapeRe-quoted workflow value — no regex metacharacters survive
          line: findLine(ctx.text, new RegExp(escapeRe(cond))),
          column: 1,
          message: `Job \`${jobName}\` runs tests but its \`if:\` condition skips it on pull requests.`,
          why: "If this job is a required check, PRs can satisfy it while zero tests executed — the green checkmark verifies nothing.",
          fix: "Remove the skip-on-PR condition, or split into a dedicated PR test job and require THAT one in branch protection.",
          qaImpact: "FALSE-GREEN",
        });
      }
    }
    return findings;
  },
});

function findLine(text: string, re: RegExp): number {
  // The caller builds `re` from escapeRe(cond) — it always matches.
  const m = re.exec(text) as RegExpExecArray;
  let line = 1;
  for (let i = 0; i < m.index; i++) if (text[i] === "\n") line++;
  return line;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
