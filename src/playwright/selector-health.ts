/**
 * Selector Health Score engine (Upgrade-Plan-v2 R3, the headline feature).
 *
 * Classifies every Playwright locator call per spec:
 *   GOOD  — getByRole/getByText/getByLabel/getByTestId (resilient)
 *   OK    — data-testid attribute selectors
 *   BAD   — CSS class chains, structural selectors, XPath (brittle)
 */

import { isDefaultIgnored } from '../discovery/ignores.js';
import type { LocatorClass } from './selector-health-types.js';

export type { LocatorClass } from './selector-health-types.js';

export interface SpecSelectorHealth {
  file: string;
  score: number; // 0–100
  counts: Record<LocatorClass, number>;
  weakestLine?: number;
}

const CLASSIFIERS: Array<{ cls: LocatorClass; re: RegExp }> = [
  { cls: 'role-based', re: /\bgetBy(?:Role|Text|Label|Placeholder|AltText|Title|TestId)\s*\(/ },
  { cls: 'testid', re: /locator\s*\(\s*['"`]\[data-testid/g },
  { cls: 'xpath', re: /\$x\s*\(|locator\s*\(\s*['"`]xpath=|page\.locator\(\s*['"`]\(/ },
  { cls: 'css-chain', re: /locator\s*\(\s*['"`][^'"`]*[.>#[^'"`]*['"`]/ },
];

export function classifyLocator(line: string): LocatorClass | null {
  if (!/locator|getBy|\$x/.test(line)) return null;
  if (/getBy(Role|Text|Label|Placeholder|AltText|Title|TestId)\s*\(/.test(line)) return 'role-based';
  if (/locator\s*\(\s*['"`]\[data-testid/.test(line)) return 'testid';
  if (/\$x\s*\(|locator\s*\(\s*['"`]xpath=/.test(line)) return 'xpath';
  if (/locator\s*\(\s*['"`][^'"`]*['"`]/.test(line)) {
    // Any locator with a quoted selector that isn't testid/xpath = CSS.
    const isStructural = /[.>#\[]/.test(line);
    return isStructural ? 'css-chain' : null;
  }
  return null;
}

export function computeSpecHealth(file: string, lines: string[]): SpecSelectorHealth {
  const counts: Record<LocatorClass, number> = { 'role-based': 0, testid: 0, 'css-chain': 0, xpath: 0 };
  let weakestLine: number | undefined;

  lines.forEach((line, i) => {
    const cls = classifyLocator(line);
    if (cls) {
      counts[cls]++;
      if ((cls === 'css-chain' || cls === 'xpath') && weakestLine === undefined) {
        weakestLine = i + 1;
      }
    }
  });

  const total = counts['role-based'] + counts.testid + counts['css-chain'] + counts.xpath;
  // Score: role/testid = full credit, css-chain = 0.3, xpath = 0.
  const good = counts['role-based'] + counts.testid;
  const score =
    total === 0
      ? 100
      : Math.round(((good + counts['css-chain'] * 0.3) / total) * 100);

  return { file, score, counts, ...(weakestLine !== undefined ? { weakestLine } : {}) };
}

export function renderSelectorHealth(specs: SpecSelectorHealth[]): string {
  const lines: string[] = ['', 'SELECTOR HEALTH', ''];
  for (const spec of specs) {
    const filled = Math.round(spec.score / 5);
    const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
    lines.push(`${spec.file}`);
    lines.push(`  ${bar}  ${spec.score} / 100`);
    lines.push(
      `  role/text: ${spec.counts['role-based']} · testid: ${spec.counts.testid}` +
        ` · css-chains: ${spec.counts['css-chain']} ⚠ · xpath: ${spec.counts.xpath}`,
    );
    lines.push('');
  }
  return lines.join('\n');
}

/** Walk a repo and compute Selector Health for every Playwright spec. */
export function computeSelectorHealth(root: string): SpecSelectorHealth[] {
  const { readdirSync, readFileSync, statSync } = require('node:fs') as typeof import('node:fs');
  const { join } = require('node:path') as typeof import('node:path');
  const specs: SpecSelectorHealth[] = [];

  const walk = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = full.slice(root.length + 1).replaceAll('\\', '/');
      if (isDefaultIgnored(rel)) continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.spec\.ts$/.test(entry.name)) {
        try {
          const text = readFileSync(full, 'utf8');
          specs.push(computeSpecHealth(rel, text.split('\n')));
        } catch {
          /* skip unreadable */
        }
      }
    }
  };

  walk(root);
  return specs.sort((a, b) => a.score - b.score); // weakest first
}
