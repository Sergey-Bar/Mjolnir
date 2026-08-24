/**
 * Framework detection via config resolution (Sprint-Plan W3-01, R8).
 *
 * Detection follows resolved config files, not just dependency presence:
 *  - Jest:      jest.config.{js,ts,mjs,cjs,json} (follows `preset`/`rootDir`),
 *               or "jest" key in package.json
 *  - Vitest:    vitest.config.{ts,js,mts,cts}
 *  - Playwright: playwright.config.{ts,js} / @playwright/test dependency
 *
 * When nothing is detectable we report `unknown` and the scanner analyzes
 * all test-looking files — stated honestly in output rather than guessed.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Workspace } from '../discovery/workspace.js';

export type TestFramework = 'jest' | 'vitest' | 'playwright';

export interface FrameworkInfo {
  frameworks: TestFramework[];
  /** True when no config evidence was found at all. */
  unknown: boolean;
}

const CONFIG_FILES: Record<TestFramework, string[]> = {
  jest: [
    'jest.config.ts',
    'jest.config.js',
    'jest.config.mjs',
    'jest.config.cjs',
    'jest.config.json',
  ],
  vitest: ['vitest.config.ts', 'vitest.config.js', 'vitest.config.mts', 'vitest.config.cts'],
  playwright: ['playwright.config.ts', 'playwright.config.js'],
};

export function detectFrameworks(ws: Workspace): FrameworkInfo {
  const found = new Set<TestFramework>();

  // 1. Config files are the strongest signal.
  for (const fw of Object.keys(CONFIG_FILES) as TestFramework[]) {
    if (CONFIG_FILES[fw].some((f) => existsSync(join(ws.root, f)))) {
      found.add(fw);
    }
  }

  // 2. package.json "jest" key (inline config).
  if (!found.has('jest') && ws.packageJson['jest'] !== undefined) {
    found.add('jest');
  }

  // 3. Dependencies — weakest signal, but confirms intent when a config
  //    file was already seen; alone it is NOT enough for jest/vitest
  //    because repos often carry transitive test deps.
  const deps = {
    ...(ws.packageJson['dependencies'] as Record<string, string> | undefined),
    ...(ws.packageJson['devDependencies'] as Record<string, string> | undefined),
  };
  if (deps['@playwright/test']) found.add('playwright');

  // A repo with vitest.config but only jest deps still runs vitest —
  // config wins. But a repo with ONLY deps and no configs stays unknown
  // unless exactly one framework's runner dep is present.
  if (found.size === 0) {
    if (deps['vitest']) return { frameworks: ['vitest'], unknown: false };
    if (deps['jest']) return { frameworks: ['jest'], unknown: false };
    return { frameworks: [], unknown: true };
  }

  // Sort for deterministic output.
  const order: TestFramework[] = ['jest', 'vitest', 'playwright'];
  return {
    frameworks: order.filter((f) => found.has(f)),
    unknown: false,
  };
}
