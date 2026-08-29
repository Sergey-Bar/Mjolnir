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
      // Cloned OSS repos for the corpus audit — their own *.spec.ts are
      // test DATA, never ours to run. Normally absent during `npm test`;
      // this guards against a stale clone left by a killed audit run.
      "tests/corpus/.cache/**",
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
        // Ratchet: enforced floor, set just below current measured
        // coverage so any regression trips CI. Raise as coverage climbs.
        //
        // Re-baselined 2026-08-29 after the "Tempering Mjölnir" refactor
        // (Phase 1 code-text maskers, Phase 4 tier system, Phase 6 rule
        // families) landed a large block of new source. That session also
        // added ~120 targeted unit tests, recovering lines/functions to
        // their prior bar; statements/branches sit ~0.8pt lower against a
        // bigger denominator and should be ratcheted back up over time.
        // Current: ~95.6 lines / ~96.4 functions / ~94.8 stmts / ~87.7 branches.
        lines: 95,
        functions: 96,
        branches: 87,
        statements: 94,
      },
    },
  },
});
