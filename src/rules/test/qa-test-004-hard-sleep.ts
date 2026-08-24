/**
 * QA-TEST-004 — Hard sleep (`sleep()`, `waitForTimeout()`, `setTimeout` as wait).
 * Severity: warning · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';

export const hardSleep = defineRule({
  id: 'QA-TEST-004',
  category: 'QA-TEST',
  title: 'Hard sleep in test',
  severity: 'warning',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<
      import('../../types.js').Finding,
      'ruleId' | 'category'
    >[] = [];

    const patterns = [
      /\bpage\.waitForTimeout\s*\(/g, // Playwright — fix hint: expect(locator).toBeVisible()
      /\bsleep\s*\(\s*\d+\s*\)/g,
      /\bawait\s+new\s+Promise\s*\(\s*\w+\s*=>\s*setTimeout\s*\(\s*\w+\s*,\s*\d+\s*\)\s*\)/g,
    ];

    for (const re of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        const isPlaywright = m[0].startsWith('page.waitForTimeout');
        findings.push({
          severity: 'warning',
          confidence: 'high',
          findingType: 'deterministic-defect',
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Hard sleep: \`${m[0]}\`.`,
          why: 'Fixed sleeps make tests both slow and flaky — they guess at timing instead of waiting for state.',
          fix: isPlaywright
            ? 'Replace with a condition wait: `await expect(locator).toBeVisible()`.'
            : 'Wait for an explicit condition (element state, promise, or signal) instead of a fixed delay.',
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
