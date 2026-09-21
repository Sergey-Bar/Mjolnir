/**
 * Benchmark artifact schema contract (blueprint §20 / §339-340).
 *
 * The artifact is machine-readable truth about performance claims. This
 * spec pins the schema SHAPE (never wall-clock values — those vary by
 * runner) and the advisory-compare policy.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BENCH_HARNESS_VERSION,
  BENCH_SCHEMA_VERSION,
  type BenchArtifact,
  type BenchSample,
} from "../../src/bench/schema.js";
import {
  generateFixture,
  median,
  runBenchmark,
  advisoryCompare,
} from "../../src/bench/harness.js";

const createdDirs: string[] = [];
function tmpRepo(prefix: string): string {
  const d = mkdtempSync(join(tmpdir(), `mjolnir-bench-${prefix}-`));
  createdDirs.push(d);
  return d;
}
afterEach(() => {
  while (createdDirs.length > 0) {
    const d = createdDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});
describe("fixture generator determinism", () => {
  it("produces the identical manifest hash for the same file count", () => {
    const a = tmpRepo("fix-a");
    const b = tmpRepo("fix-b");
    const fa = generateFixture(a, { fileCount: 30 });
    const fb = generateFixture(b, { fileCount: 30 });
    expect(fa.manifestHash).toBe(fb.manifestHash);
    expect(fa.fileCount).toBe(30);
    expect(fb.fileCount).toBe(30);
  });
});

describe("median", () => {
  it("is the middle value, deterministic for even counts (lower middle)", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2);
  });
});

describe("artifact schema", () => {
  it(
    "carries the full §339 environment + fixture identity + per-scenario medians",
    { timeout: 120_000 },
    async () => {
      const root = tmpRepo("schema");
      const fixture = generateFixture(root, { fileCount: 24 });
      const artifact = await runBenchmark(root, fixture, {
        mjolnirVersion: "0.0.0-test",
        commit: "deadbeef",
      });
      expect(artifact.schemaVersion).toBe(BENCH_SCHEMA_VERSION);
      expect(artifact.harnessVersion).toBe(BENCH_HARNESS_VERSION);
      expect(artifact.mjolnirVersion).toBe("0.0.0-test");
      expect(artifact.nodeVersion).toMatch(/^v\d+/);
      expect(typeof artifact.os).toBe("string");
      expect(artifact.commit).toBe("deadbeef");
      expect(artifact.fixture.generator).toBe("synthetic-repo");
      expect(artifact.fixture.fileCount).toBe(24);
      expect(artifact.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      const scenarios = artifact.samples.map((s) => s.scenario);
      expect(scenarios).toContain("cache-miss");
      expect(scenarios).toContain("cache-hit");
      expect(scenarios).toContain("warm-start");
      expect(scenarios).toContain("startup-overhead");
      for (const s of artifact.samples) {
        // Timed scenarios take the full median-of-3; startup-overhead is
        // a single module-load measurement by construction (already warm
        // from the earlier scenarios, so its duration can round to 0ms —
        // that IS the honest reading of "overhead already paid").
        const timed = s.scenario !== "startup-overhead";
        expect(s.runs.length).toBe(timed ? 3 : 1);
        expect(s.durationMs).toBe(median(s.runs));
        expect(s.durationMs).toBeGreaterThanOrEqual(0);
        if (timed) expect(s.durationMs).toBeGreaterThan(0);
        expect(s.state.warm).toBeTypeOf("boolean");
      }
    },
  );

  it("is serializable JSON that round-trips the schema", async () => {
    const root = tmpRepo("roundtrip");
    const fixture = generateFixture(root, { fileCount: 12 });
    const artifact = await runBenchmark(root, fixture, {
      mjolnirVersion: "0.0.0-test",
      commit: "",
    });
    const json = JSON.parse(JSON.stringify(artifact)) as BenchArtifact;
    expect(json.samples).toHaveLength(artifact.samples.length);
    expect(json.harnessVersion).toBe(BENCH_HARNESS_VERSION);
  });
});

describe("advisory compare policy (§340)", () => {
  const baseWarmStart: BenchSample = {
    scenario: "warm-start",
    durationMs: 100,
    runs: [100, 100, 100],
    rssDeltaBytes: 0,
    state: { warm: true, cache: "none" },
  };
  const base: BenchArtifact = {
    schemaVersion: BENCH_SCHEMA_VERSION,
    harnessVersion: BENCH_HARNESS_VERSION,
    mjolnirVersion: "0.0.0",
    nodeVersion: "v0",
    os: "test",
    cpu: "",
    measuredAt: "2026-01-01T00:00:00.000Z",
    commit: "base",
    fixture: { generator: "synthetic-repo", fileCount: 1, manifestHash: "x" },
    samples: [
      {
        scenario: "warm-start",
        durationMs: 100,
        runs: [100, 100, 100],
        rssDeltaBytes: 0,
        state: { warm: true, cache: "none" },
      },
    ],
  };

  it("warns when a scenario regresses beyond 25% of the pinned median", () => {
    // 124ms is inside the 25% band (warn threshold is strictly >125).
    const fresh: BenchArtifact = {
      ...base,
      samples: [{ ...baseWarmStart, durationMs: 124, runs: [124, 124, 124] }],
    };
    expect(advisoryCompare(fresh, base)).toHaveLength(0);
    // 126ms is >125% of 100 → a warning with the honest delta.
    const regressed: BenchArtifact = {
      ...base,
      samples: [{ ...baseWarmStart, durationMs: 126, runs: [126, 126, 126] }],
    };
    const warnings = advisoryCompare(regressed, base);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("+26%");
  });

  it("stays silent for unknown-to-baseline scenarios (additive evolution)", () => {
    const fresh: BenchArtifact = {
      ...base,
      samples: [
        ...base.samples,
        {
          scenario: "cold-start",
          durationMs: 999,
          runs: [999],
          rssDeltaBytes: 0,
          state: { warm: false, cache: "none" },
        },
      ],
    };
    expect(advisoryCompare(fresh, base)).toHaveLength(0);
  });
});
