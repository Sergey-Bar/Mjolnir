import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.spec.ts"],
    // E2E journeys (tests/e2e/**) spawn dist/cli.mjs as a real child
    // process — parallel workers must not race a concurrent tsdown
    // rebuild (tsdown cleans outDir), so the build happens once, here,
    // before any worker starts.
    globalSetup: ["tests/e2e/global-setup.ts"],
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
      // M-04: widened to any .cache* clone dir (e.g. a rogue .cache-kit).
      "tests/corpus/.cache*/**",
      // Committed §08 class-B/C fixture corpora are DATA too — their
      // .spec.ts files deliberately contain anti-patterns.
      "tests/corpus/positive-fixtures/**",
      "tests/corpus/negative-fixtures/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      // json-summary feeds the CI job-summary step (bug-audit G6).
      reporter: ["text", "json", "json-summary", "html"],
      // Types-only modules carry no executable code paths.
      // Bug-audit G6: src/engine/adapter.ts is EXCLUDED no more — it is
      // executable interface glue (the ScanContext contract every adapter
      // implements); excluding it let real code paths escape the ratchet.
      exclude: [
        "src/types.ts",
        "src/forensics/types.ts",
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
        //
        // Re-baselined 2026-08-30 after the bug-audit CI-hardening landing:
        // the config/scope/fix hardening + ~120 new tests measured at
        // 94.24 stmts / 86.81 branches / 97.31 fns / 95.42 lines. The
        // branch floor follows the measured value (previous 87 was
        // inherited from a smaller denominator); raise as coverage climbs.
        // G6: the four percentages are printed into the CI job summary and
        // coverage/ is uploaded as an artifact every run.
        //
        // Open-Beta E2E test plan (2026-08-31): the coverage climb reached
        // literal 100% on all four axes — the ratchet is now the maximum,
        // with per-file enforcement so no single source file can hide a
        // gap behind the global average.
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
        perFile: true,
      },
    },
  },
});
