import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    // Fixture files and the golden repo are DATA, not tests — they must
    // never be executed by our own runner.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/fixtures/**',
      'tests/golden/repo/**',
    ],
  },
});
