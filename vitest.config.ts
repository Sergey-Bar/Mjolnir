import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    // Fixture files and the golden repo are DATA, not tests — they must
    // never be executed by our own runner.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "tests/fixtures/**",
      "tests/golden/repo/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // Types-only modules carry no executable code paths.
      exclude: [
        "src/types.ts",
        "src/forensics/types.ts",
        "src/engine/adapter.ts",
        "src/playwright/selector-health-types.ts",
        "dist/**",
      ],
      thresholds: {
        // Ratchet: enforced floor. Raise as coverage improves toward 100.
        lines: 95,
        functions: 96,
        branches: 88,
        statements: 95,
      },
    },
  },
});
