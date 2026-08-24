/**
 * QA-CI-002 — `|| true` swallows a command's exit code.
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const swallowedExitCode = defineRule({
  id: 'QA-CI-002',
  category: 'QA-CI',
  title: 'Ignored exit code (|| true)',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'ci-workflows',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // run: blocks containing `|| true` / `|| echo ...` failure swallowing.
    const re = /(?:\|\|\s*true\b)|(?::\s*(?:npm|yarn|pnpm|make|pytest|go)\b[^`\n]*\|\|\s*echo)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'error',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: 'Command exit code is swallowed with `|| true`.',
        why: 'A failing step becomes a passing one — the workflow checkmark no longer reflects reality.',
        fix: 'Remove `|| true`. If the step is genuinely optional, mark it clearly and use `continue-on-error` on that step only.',
      });
    }
    return findings;
  },
});

function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text[i] === '\n') line++;
  return line;
}

function colAt(text: string, index: number): number {
  const lastBreak = text.lastIndexOf('\n', index - 1);
  return index - lastBreak;
}
