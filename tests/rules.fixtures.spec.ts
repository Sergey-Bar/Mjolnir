/**
 * Fixture harness (Sprint-Plan W2-03, Product-MVP §18.1).
 * Every rule ships with must-fire AND must-not-fire fixtures.
 * A rule that fires on its own negative fixture CANNOT ship.
 *
 * Fixtures live in tests/fixtures/<rule-id>/{must-fire,must-not-fire}/
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RULES } from '../src/rules/index.js';

const FIXTURES_ROOT = join(import.meta.dirname, 'fixtures');

for (const rule of RULES) {
  if (rule.appliesTo !== 'test-files') continue; // CI rules get corpus tests in W4

  describe(`${rule.id} — ${rule.title}`, () => {
    const mustFire = join(FIXTURES_ROOT, rule.id, 'must-fire');
    const mustNotFire = join(FIXTURES_ROOT, rule.id, 'must-not-fire');

    if (existsSync(mustFire)) {
      for (const file of listFiles(mustFire)) {
        it(`fires: ${file}`, () => {
          const text = readFileSync(join(mustFire, file), 'utf8');
          const findings = rule.run({ path: file, text });
          expect(findings.length).toBeGreaterThan(0);
        });
      }
    }

    if (existsSync(mustNotFire)) {
      for (const file of listFiles(mustNotFire)) {
        it(`stays silent: ${file}`, () => {
          const text = readFileSync(join(mustNotFire, file), 'utf8');
          const findings = rule.run({ path: file, text });
          expect(findings).toHaveLength(0);
        });
      }
    }
  });
}

function listFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => !f.startsWith('.'));
  } catch {
    return [];
  }
}
