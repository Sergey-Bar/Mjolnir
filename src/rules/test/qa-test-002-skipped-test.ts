/**
 * QA-TEST-002 — Skipped test (`it.skip`, `xit`, `test.skip`, `describe.skip`).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';

export const skippedTest = defineRule({
  id: 'QA-TEST-002',
  category: 'QA-TEST',
  title: 'Skipped test',
  severity: 'warning',
  confidence: 'high',
  findingType: 'deterministic-defect',
  qaImpact: 'FALSE-GREEN',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<
      import('../../types.js').Finding,
      'ruleId' | 'category'
    >[] = [];

    const patterns = [
      /(?:^|[^\w$.])(?:xit|xdescribe)\s*\(/g,
      /\b(?:it|test|describe|bench)\.skip\s*\(/g,
      /\b(?:it|test)\.todo\s*\(/g, // todo is intentional — reported as info? No:
    ];

    // it.todo is an intentional placeholder; treat separately at info level.
    const skipPatterns = patterns.slice(0, 2);
    for (const re of skipPatterns) {
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
          message: `Skipped test detected: \`${m[0].trim()}\`.`,
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
