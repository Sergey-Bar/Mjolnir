/**
 * QA-TEST-010 — Empty test body.
 * Severity: error · Confidence: high · deterministic-defect
 * A test that executes nothing can never fail — the purest false proof.
 */

import { defineRule } from '../rule.js';

export const emptyTestBody = defineRule({
  id: 'QA-TEST-010',
  category: 'QA-TEST',
  title: 'Empty test body',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  qaImpact: 'FALSE-GREEN',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<
      import('../../types.js').Finding,
      'ruleId' | 'category'
    >[] = [];

    // Matches it/test/describe-with-it whose callback is empty or comment-only:
    // `it('x', () => {})` / `it('x', () => { /* nothing */ })`
    const re =
      /\b(?:it|test)\s*\(\s*['"`][^'"`]*['"`]\s*,\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)?\s*\}\s*\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'error',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: 'Test has an empty body — it can never fail.',
        why: 'An empty test inflates pass counts and proves nothing about behavior.',
        fix: 'Implement the test or remove it.',
        qaImpact: 'FALSE-GREEN',
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
