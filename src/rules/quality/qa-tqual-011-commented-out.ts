/**
 * QA-TQUAL-011 — Commented-out tests.
 * Severity: warning · Confidence: high · deterministic-defect
 * Hidden fake-green hygiene: disabled checks nobody remembers to restore.
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const commentedOutTest = defineRule({
  id: 'QA-TQUAL-011',
  category: 'QA-TQUAL',
  title: 'Commented-out test',
  severity: 'warning',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // `// it(...)` / `// test(...)` / `/* it(...) */` — commented test calls.
    const re =
      /(?:\/\/\s*(?:it|test)\s*\()|(?:\/\*\s*(?:it|test)\s*\()/g;

    let m: RegExpExecArray | null;
    while ((m = re.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'warning',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: 'Commented-out test detected.',
        why: 'Disabled tests hide known-unverified behavior behind a green checkmark and rot silently.',
        fix: 'Re-enable the test, or delete it with a tracked issue referencing what it covered.',
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
