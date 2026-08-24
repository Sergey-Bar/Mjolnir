/**
 * Terminal reporter (W1-06). Respects NO_COLOR and non-TTY (R11).
 * Symbols accompany color for color-blind users.
 */

import type { ScanResult } from '../types.js';

export function renderTerminal(result: ScanResult, opts: { isTTY: boolean }): string {
  const c = opts.isTTY && !process.env['NO_COLOR'] ? colors : noColors;
  const lines: string[] = [];

  lines.push('');
  lines.push(c.bold('                 QA DOCTOR'));
  lines.push('');
  if (result.score === null) {
    lines.push('          NO TESTS DETECTED');
    lines.push('');
    lines.push('No Jest/Vitest/Playwright test files were found.');
    lines.push('A score cannot be calculated honestly.');
    lines.push('');
    lines.push('If your tests live elsewhere: qa-doctor --tests-dir <path>');
    return lines.join('\n');
  }

  const filled = Math.round(result.score / 5);
  const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
  lines.push(`             SCORE:  ${result.score} / 100`);
  lines.push('');
  lines.push(`        ${bar}`);
  lines.push('');

  const counts = countBySeverity(result);
  lines.push(
    `   ${counts.total} issues found (${counts.error} errors, ${counts.warning} warnings)`,
  );

  const top = result.findings.slice(0, 5);
  if (top.length > 0) {
    lines.push('');
    lines.push('   TOP ISSUES');
    lines.push('');
    for (const f of top) {
      const icon = f.severity === 'error' ? '✗' : f.severity === 'warning' ? '⚠' : 'ℹ';
      const sev = f.severity.toUpperCase().padEnd(7);
      lines.push(`   ${icon} ${c[f.severity](sev)} ${f.message}`);
      lines.push(`          ${f.file}:${f.line}`);
    }
    const rest = counts.total - top.length;
    if (rest > 0) lines.push(`   … +${rest} more. Run with --verbose for all findings.`);
  }

  lines.push('');
  lines.push(
    `   Analysis: ${result.analysisStatus.discovery === 'partial' ? 'PARTIAL — verdict may be incomplete' : 'complete'}` +
      ` · ${result.analysisStatus.durationMs}ms`,
  );
  lines.push('');
  return lines.join('\n');
}

function countBySeverity(result: ScanResult) {
  const counts = { error: 0, warning: 0, info: 0, total: 0 };
  for (const f of result.findings) {
    counts[f.severity]++;
    counts.total++;
  }
  return counts;
}

const colors = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  error: (s: string) => `\x1b[31m${s}\x1b[0m`,
  warning: (s: string) => `\x1b[33m${s}\x1b[0m`,
  info: (s: string) => `\x1b[36m${s}\x1b[0m`,
};

const noColors = {
  bold: (s: string) => s,
  error: (s: string) => s,
  warning: (s: string) => s,
  info: (s: string) => s,
};
