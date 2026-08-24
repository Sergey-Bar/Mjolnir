/**
 * QA-PW-003 — Committed `page.pause()` or `test.only()` in e2e specs.
 * Severity: error · Confidence: high · deterministic-defect
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const committedDebugArtifacts = defineRule({
  id: 'QA-PW-003',
  category: 'QA-PW',
  title: 'Debug artifact committed to e2e spec',
  severity: 'error',
  confidence: 'high',
  findingType: 'deterministic-defect',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    const patterns = [
      { re: /\bpage\.pause\s*\(\s*\)/g, label: 'page.pause()' },
      { re: /\btest\.only\s*\(/g, label: 'test.only()' },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: 'error',
          confidence: 'high',
          findingType: 'deterministic-defect',
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `\`${label}\` committed in an e2e spec.`,
          why:
            label === 'page.pause()'
              ? 'In CI, page.pause() hangs the runner until timeout — the job stalls and may be retried or masked.'
              : 'test.only() skips every other e2e test while CI reports green.',
          fix:
            label === 'page.pause()'
              ? 'Remove the pause; use --debug locally instead.'
              : 'Remove `.only` before committing.',
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
