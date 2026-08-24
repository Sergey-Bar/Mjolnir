/**
 * QA-PY-002 — Skipped test (`@pytest.mark.skip`, `xfail` non-strict).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const pySkippedTest = defineRule({
  id: 'QA-PY-002',
  category: 'QA-TEST',
  title: 'Skipped test',
  severity: 'warning',
  confidence: 'high',
  findingType: 'deterministic-defect',
  qaImpact: 'FALSE-GREEN',
  appliesTo: 'python' as unknown as 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];
    if (!ctx.path.endsWith('.py')) return findings;

    const patterns = [
      { re: /@pytest\.mark\.skip\b/g, label: '@pytest.mark.skip' },
      { re: /@pytest\.mark\.skipif\([^)]*reason\s*=\s*None/g, label: 'skipif without reason' },
      { re: /@pytest\.mark\.xfail(?![^)]*strict\s*=\s*True)/g, label: 'non-strict xfail' },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: 'warning',
          confidence: 'high',
          findingType: 'deterministic-defect',
          qaImpact: 'FALSE-GREEN',
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Skipped test detected: \`${label}\`.`,
          why: 'Skipped tests hide broken or unimplemented behavior behind a green checkmark.',
          fix: 'Fix and re-enable the test, or delete it with a tracked issue reference.',
        });
      }
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
