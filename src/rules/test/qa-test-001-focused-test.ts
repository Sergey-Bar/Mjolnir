/**
 * QA-TEST-001 — Focused test committed (`fit`/`fdescribe`/`.only`).
 * Severity: error · Confidence: high · deterministic-defect
 *
 * A focused suite runs a fraction of the tests while CI shows green.
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

interface CallLike {
  getExpression?: () => { getText?: () => string };
  getArguments?: () => unknown[];
}

export const focusedTestCommitted = defineRule({
  id: 'QA-TEST-001',
  category: 'QA-TEST',
  title: 'Focused test committed',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // Fast textual pre-pass for `.only(` / `fit(`/`fdescribe(` call targets.
    const onlyCall = /(?:^|[^\w$.])(?:fit|fdescribe)\s*\(/g;
    const dotOnly = /\.only\s*\(/g;

    let m: RegExpExecArray | null;
    while ((m = onlyCall.exec(ctx.text)) !== null) {
      findings.push({
        severity: 'error',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: `Focused test committed: \`${m[0].trim()}\` restricts the run to a subset of tests.`,
        why: 'CI will show green while the vast majority of the suite never executed.',
        fix: 'Remove the focus modifier and commit the full suite.',
      });
    }
    while ((m = dotOnly.exec(ctx.text)) !== null) {
      // Avoid double-reporting fit().only patterns; textual heuristic is
      // refined by AST pass in the rule runner (W2 fixture harness locks it).
      findings.push({
        severity: 'error',
        confidence: 'high',
        findingType: 'deterministic-defect',
        file: ctx.path,
        line: lineAt(ctx.text, m.index),
        column: colAt(ctx.text, m.index),
        message: '`.only` focus modifier committed.',
        why: 'Only the focused subset executes; the rest of the suite is silently skipped in CI.',
        fix: 'Remove `.only` before committing.',
      });
    }
    void (ctx.ast as { forEachDescendant?: (cb: (node: CallLike) => void) => void } | undefined);
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
