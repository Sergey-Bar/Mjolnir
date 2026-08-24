/**
 * QA-CI-001 — `continue-on-error: true` masks a failing job.
 * Severity: error · Confidence: high · deterministic-defect
 * THE flagship finding: this job can fail every day and CI stays green.
 */

import { defineRule } from '../rule.js';

interface WorkflowDoc {
  jobs?: Record<string, JobNode>;
}
interface JobNode {
  'continue-on-error'?: boolean | string;
  steps?: StepNode[];
}
interface StepNode {
  'continue-on-error'?: boolean | string;
}

export const continueOnError = defineRule({
  id: 'QA-CI-001',
  category: 'QA-CI',
  title: 'continue-on-error masks a failing required test',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'ci-workflows',
  run(ctx) {
    const findings: Omit<
      import('../../types.js').Finding,
      'ruleId' | 'category'
    >[] = [];

    // The workflow model (W4-03) provides the parsed doc via ast; until then
    // the CI rule runner passes a parsed YAML object here.
    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc || typeof doc !== 'object') return findings;

    const jobs = doc.jobs ?? {};
    for (const [jobName, job] of Object.entries(jobs)) {
      if (job && job['continue-on-error'] === true) {
        findings.push({
          severity: 'error',
          confidence: 'high',
          findingType: 'deterministic-defect',
          file: ctx.path,
          line: findLine(ctx.text, new RegExp(`^\\s{2,6}${escapeRe(jobName)}:`)),
          column: 1,
          message: `Job \`${jobName}\` has \`continue-on-error: true\`.`,
          why: 'This job can fail every day and CI will still show green. The checkmark on this workflow cannot be trusted.',
          fix: 'Remove continue-on-error, or scope it to individual non-blocking steps only.',
        });
      }
      for (const [i, step] of (job?.steps ?? []).entries()) {
        if (step && step['continue-on-error'] === true) {
          findings.push({
            severity: 'warning',
            confidence: 'high',
            findingType: 'deterministic-defect',
            file: ctx.path,
            line: findLine(ctx.text, /continue-on-error:/g),
            column: 1,
            message: `Step #${i + 1} in \`${jobName}\` has \`continue-on-error: true\`.`,
            why: 'A failing critical step will not fail the job — verify this step is genuinely optional.',
            fix: 'Remove continue-on-error unless the step is explicitly best-effort.',
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
  for (let i = 0; i < m.index; i++) if (text[i] === '\n') line++;
  return line;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
