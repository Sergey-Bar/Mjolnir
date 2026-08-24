/**
 * QA-PY-005 — time.sleep() in tests.
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const pyHardSleep = defineRule({
  id: 'QA-PY-005',
  category: 'QA-TEST',
  title: 'time.sleep() in test',
  severity: 'warning',
  confidence: 'high',
  findingType: 'deterministic-defect',
  qaImpact: 'FLAKY-RISK',
  appliesTo: 'python' as unknown as 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];
    if (!ctx.path.endsWith('.py')) return findings;

    const re = /\btime\.sleep\s*\(\s*\d+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'warning',
        confidence: 'high',
        findingType: 'deterministic-defect',
        qaImpact: 'FLAKY-RISK',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Hard sleep: \`${m[0]}…\`.`,
        why: 'Fixed sleeps make tests slow and flaky — they guess at timing instead of waiting for state.',
        fix: 'Wait for an explicit condition (polling helper, pytest-timeout wait_until, or event).',
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
