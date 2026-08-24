/**
 * QA-TQUAL-002 — Tautological assertion.
 * Severity: error · Confidence: high · deterministic-defect
 * `expect(true).toBe(true)` proves the runtime exists, nothing more.
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const tautologicalAssertion = defineRule({
  id: 'QA-TQUAL-002',
  category: 'QA-TQUAL',
  title: 'Tautological assertion',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // expect(<literal>).<matcher>(<same-or-any-literal>)
    const re =
      /expect\s*\(\s*(true|false|null|undefined|\d+|['"`][^'"`]*['"`])\s*\)\s*\.\s*toBe(?:True|False)?\s*\(\s*(true|false|null|undefined|\d+|['"`][^'"`]*['"`])?\s*\)/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'error',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Tautological assertion: \`${m[0].slice(0, 60)}\`.`,
        why: 'Asserting a literal against a literal can never fail — it verifies no system behavior.',
        fix: 'Assert on actual output of the code under test.',
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
