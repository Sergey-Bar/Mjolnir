import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/fuzz/**/*.fuzz.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    passWithNoTests: false,
  },
});
