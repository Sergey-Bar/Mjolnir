import { defineConfig } from "vitest/config";

// Property-test config — isolated from the default vitest.config.ts run.
//
// fast-check generates random inputs, so a failure here is only meaningful
// if it is REPRODUCIBLE. Seeds live per-property in the spec file
// (fast-check's `fc.assert(..., { seed })`) — vitest has no top-level seed
// — and each property declares its own numRuns. Bump the shared SEED
// constant deliberately when a legitimate invariant shifts, and record
// the reason in the CHANGELOG; a silent seed bump is how flaky property
// tests ship.
//
// Runs in its own worker pool (no globalSetup, no coverage) so a
// property test's timing sensitivity never contends with the 10k-test
// suite — a flaky property test must be visible as a property-test
// problem, not noise in the unit suite.

export default defineConfig({
  test: {
    include: ["tests/**/property-invariants.spec.ts"],
    testTimeout: 60_000,
    hookTimeout: 30_000,
    // Property tests are pure logic over src/ — no global setup. (The
    // default config's globalSetup builds dist/ so e2e tests can spawn
    // the CLI; property tests touch no built artifact.)
    globalSetup: [],
  },
});
