/**
 * Golden-repo regression test (Product-MVP §18.2, Sprint-Plan S4).
 *
 * The golden repo is a frozen synthetic repo under tests/golden/.
 * Expected findings are stored PER RULE ID (not just total score) so
 * adding a new rule doesn't break the gate — the expectations are
 * regenerated in the same PR that adds the rule, with an explicit diff.
 *
 * Regenerate:  npm run golden:update   (writes golden-expected.json)
 * Verify:      npm test (this file)
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RULES } from '../../src/rules/index.js';

const HERE = import.meta.dirname;
const GOLDEN_ROOT = join(HERE, 'repo');
const EXPECTED_PATH = join(HERE, 'golden-expected.json');
const UPDATE = process.env['GOLDEN_UPDATE'] === '1';

interface ExpectedEntry {
  /** ruleId → count of findings in this file. */
  [file: string]: Record<string, number>;
}

function scanGolden(): ExpectedEntry {
  const result: ExpectedEntry = {};
  const files = listTestFiles(GOLDEN_ROOT);
  for (const rel of files) {
    const text = readFileSync(join(GOLDEN_ROOT, rel), 'utf8');
    const counts: Record<string, number> = {};
    for (const rule of RULES) {
      if (rule.appliesTo !== 'test-files') continue;
      try {
        const found = rule.run({ path: rel, text });
        if (found.length > 0) counts[rule.id] = found.length;
      } catch {
        // crash isolation — a throwing rule counts as a failure below
      }
    }
    if (Object.keys(counts).length > 0) result[rel] = counts;
  }
  return result;
}

function listTestFiles(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...listTestFiles(join(dir, e.name), rel));
    else if (/\.(spec|test)\.(ts|js)$/.test(e.name)) out.push(rel);
  }
  return out;
}

describe('golden repo score lock', () => {
  it('expectations file exists (run GOLDEN_UPDATE=1 to create)', () => {
    expect(existsSync(EXPECTED_PATH), 'Run `GOLDEN_UPDATE=1 npx vitest run tests/golden` once').toBe(true);
  });

  if (existsSync(EXPECTED_PATH)) {
    it('findings match locked expectations exactly', () => {
      const expected: ExpectedEntry = JSON.parse(readFileSync(EXPECTED_PATH, 'utf8'));
      const actual = scanGolden();
      expect(actual).toEqual(expected);
    });
  }

  it('no rule crashes on the golden corpus', () => {
    for (const rel of listTestFiles(GOLDEN_ROOT)) {
      const text = readFileSync(join(GOLDEN_ROOT, rel), 'utf8');
      for (const rule of RULES) {
        expect(() => rule.run({ path: rel, text }), `${rule.id} on ${rel}`).not.toThrow();
      }
    }
  });
});

// Regeneration mode: node --experimental-vm-modules not needed; run via env flag.
if (UPDATE) {
  writeFileSync(EXPECTED_PATH, JSON.stringify(scanGolden(), null, 2) + '\n');
}
