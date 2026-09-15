import { defineConfig } from "vitest/config";

// Standalone config for the stress/performance gates (tests/stress/**).
// These spin up a synthetic 3,000-file scan; running them inside the
// parallel `npm test` suite contends with ~8k other tests and the wall-clock
// budget trips on machine load rather than on a real superlinear blowup.
// This config runs them on their own so the regression gate stays meaningful.
export default defineConfig({
  test: {
    include: ["tests/stress/**/*.spec.ts"],
    testTimeout: 120_000,
    globalSetup: ["tests/e2e/global-setup.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/fixtures/**",
      "tests/golden/repo/**",
      "tests/corpus/.cache*/**",
      "tests/corpus/positive-fixtures/**",
      "tests/corpus/negative-fixtures/**",
    ],
  },
});
