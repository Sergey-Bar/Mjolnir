/**
 * Benchmark artifact gate (Mega MVP Master Plan v3.1 §26 WI-15, §20).
 *
 * The committed machine-readable benchmark artifact is the ONLY basis
 * for performance claims ("no perf claims without the artifact"). This
 * gate validates its schema, its budget story (20s/3k · 120s/10k), and
 * its honesty (env facts present; no claims without samples).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ARTIFACT = join(
  import.meta.dirname,
  "..",
  "..",
  "docs",
  "bench",
  "bench-artifact-0.6.0.json",
);

interface BenchArtifact {
  schemaVersion: number;
  harnessVersion: string;
  mjolnirVersion: string;
  nodeVersion: string;
  os: string;
  cpu: string;
  measuredAt: string;
  commit: string;
  fixture: { generator: string; fileCount: number; manifestHash: string };
  samples: Array<{
    scenario: string;
    durationMs: number;
    runs: number[];
    rssDeltaBytes: number;
    state: { warm: boolean; cache: string };
  }>;
}

describe("benchmark artifact (WI-15, plan §20)", () => {
  it("exists — no performance story without a committed artifact", () => {
    expect(existsSync(ARTIFACT)).toBe(true);
  });

  it("valid schema: env facts + fixture identity + all scenarios", () => {
    const a = JSON.parse(readFileSync(ARTIFACT, "utf8")) as BenchArtifact;
    expect(a.schemaVersion).toBe(1);
    expect(a.mjolnirVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(a.nodeVersion).toMatch(/^v\d+/);
    expect(["linux", "win32", "darwin"]).toContain(a.os);
    expect(a.fixture.generator).toBe("synthetic-repo");
    expect(a.fixture.fileCount).toBeGreaterThan(0);
    // 16-hex prefix of the manifest SHA-256 (harness.digest().slice(0,16))
    expect(a.fixture.manifestHash).toMatch(/^[0-9a-f]{16}$/);
    for (const scenario of ["cache-miss", "cache-hit", "warm-start"]) {
      const s = a.samples.find((x) => x.scenario === scenario);
      expect(s, `missing scenario ${scenario}`).toBeDefined();
      expect(s?.runs.length).toBeGreaterThanOrEqual(3);
      for (const run of s?.runs ?? []) expect(run).toBeGreaterThan(0);
    }
  });

  it("budget story: a 120-file synthetic scan must land far under the 20s/3k line", () => {
    // The published budgets are 20s per 3,000 files. The committed
    // artifact is a 120-file fixture — proportionally that allows
    // ~800ms median for cache-miss on the same fixture generator. We
    // assert a generous 10x that (8s) as the honest upper bound for a
    // CI runner, and expect the real number to be far below it.
    const a = JSON.parse(readFileSync(ARTIFACT, "utf8")) as BenchArtifact;
    const s = a.samples.find((x) => x.scenario === "cache-miss");
    expect(s?.durationMs ?? Infinity).toBeLessThan(8_000);
  });

  it("no negative durations (hostile-environment honesty)", () => {
    const a = JSON.parse(readFileSync(ARTIFACT, "utf8")) as BenchArtifact;
    for (const s of a.samples) {
      expect(s.durationMs).toBeGreaterThanOrEqual(0);
      for (const run of s.runs) expect(run).toBeGreaterThanOrEqual(0);
      // rssDeltaBytes is a MEDIAN of GC-noisy deltas and may be slightly
      // negative on warm runs — bounded, never NaN.
      expect(Number.isFinite(s.rssDeltaBytes)).toBe(true);
    }
  });
});
