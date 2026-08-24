/**
 * QA-CI-005 — Report consumed but never generated.
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A step uploads/consumes a report artifact (coverage, test results)
 * that no previous step produces — the gate reads an empty or stale file
 * and passes vacuously. Product-MVP §35: "Required report not produced".
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

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
const CONSUMERS: Array<{ re: RegExp; producer: RegExp; label: string }> = [
  {
    // actions/upload-artifact with a coverage path, or lcov mentions
    re: /upload-artifact[\s\S]*?path\s*:.*(?:coverage|lcov)/i,
    producer: /\b(?:npx\s+)?(?:vitest|jest|nyc)\b[^]*--coverage|--coverage\b/i,
    label: 'coverage artifact',
  },
  {
    re: /codecov|coveralls/i,
    producer: /--coverage\b|(?:vitest|jest|nyc)\b[^]*coverage/i,
    label: 'coverage upload',
  },
];

export const reportNeverGenerated = defineRule({
  id: 'QA-CI-005',
  category: 'QA-CI',
  title: 'Report consumed but never generated',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'ci-workflows',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    const doc = ctx.ast as WorkflowDoc | undefined;
    if (!doc?.jobs) return findings;

    for (const [jobName, job] of Object.entries(doc.jobs)) {
      const steps = job?.steps ?? [];
      const allRunText = steps.map((s) => s?.run ?? '').join('\n');

      for (const consumer of CONSUMERS) {
        const consumes =
          consumer.re.test(allRunText) ||
          steps.some((s) => s?.uses && consumer.re.test(s.uses));
        if (!consumes) continue;
        const produces = consumer.producer.test(allRunText);
        if (!produces) {
          findings.push({
            severity: 'error',
            confidence: 'high',
            findingType: 'deterministic-defect',
            file: ctx.path,
            line: findLine(ctx.text, consumer.re),
            column: 1,
            message: `Job \`${jobName}\` consumes a ${consumer.label} that no step generates.`,
            why: 'The gate reads a report that is never produced — it passes on empty/stale data while appearing to verify something.',
            fix: 'Add a step that runs tests with --coverage (or generate the report) before this consumption step.',
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
