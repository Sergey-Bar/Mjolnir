import { defineConfig } from "vitest/config";

// Property-test config — isolated from the default vitest.config.ts run.
//
// fast-check generates random inputs, so a failure here is only meaningful
// if it is REPRODUCIBLE. Seeds live per-property in the spec file
// (fast-check's `fc.assert(..., { seed })`) — vitest has no top-level seed
// — and this config enforces a minimum run count so every CI run
// exercises the same corpus.
//
// Runs in its own worker pool (no globalSetup, no coverage) so a
// property test's timing sensitivity never contends with the 10k-test
// suite — a flaky property test must be visible as a property-test
// problem, not noise in the unit suite.

export default defineConfig({
  test: {
    include: ["tests/**/property-invariants.spec.ts"],
    // Floor on top of each spec's own numRuns: a spec that declares
    // 50 runs in a 200-run config is a spec that has not been thought
    // about. Enforced by scripts/check-property-runs.mjs.
    minRuns: 200,
    testTimeout: 60_000,
    hookTimeout: 30_000,
    // Property tests are pure logic over src/ — no global setup, no
    // coverage (istanbul's branch instrumentation slows fast-check's
    // shrink paths and the corpus is small).
    globalSetup: [],
    coverage: { enabled: false },
  },
});
