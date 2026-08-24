/**
 * QA-PW-004 — Brittle CSS/XPath selectors vs role-based locators.
 * Severity: warning · Confidence: medium · heuristic-risk
 *
 * Chained CSS classes and XPath break on any DOM refactor. Playwright's
 * own docs recommend role/text-based locators (getByRole, getByText).
 */

import { defineRule } from '../rule.js';
import type { Finding } from '../../types.js';

export const brittleSelectors = defineRule({
  id: 'QA-PW-004',
  category: 'QA-PW',
  title: 'Brittle selector instead of role-based locator',
  severity: 'warning',
  confidence: 'medium',
  findingType: 'heuristic-risk',
  appliesTo: 'test-files',
  run(ctx) {
    const findings: Omit<Finding, 'ruleId' | 'category'>[] = [];

    // page.locator('.a.b.c') — multi-class chains
    // page.locator('div > span > a') — deep structural chains
    // page.$x(...) / xpath= — raw XPath
    const patterns = [
      {
        re: /locator\s*\(\s*['"`][^'"`]*\.[\w-]+\.[\w-]+[^'"`]*['"`]\s*\)/g,
        label: 'multi-class CSS selector',
      },
      {
        re: /locator\s*\(\s*['"`][^'"`]*>[^'"`]*>[^'"`]*['"`]\s*\)/g,
        label: 'deep structural CSS selector',
      },
      {
        re: /\$x\s*\(|locator\s*\(\s*['"`]xpath=/g,
        label: 'XPath selector',
      },
    ];

    for (const { re, label } of patterns) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(ctx.text)) !== null) {
        findings.push({
          severity: 'warning',
          confidence: 'medium',
          findingType: 'heuristic-risk',
          file: ctx.path,
          line: lineAt(ctx.text, m.index),
          column: colAt(ctx.text, m.index),
          message: `Brittle ${label}: \`${m[0].slice(0, 60)}\`.`,
          why: 'Structural selectors break on any DOM refactor and fail without telling you which behavior regressed.',
          fix: 'Prefer role-based locators: getByRole(), getByText(), getByLabel().',
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
