/**
 * WI-15 benchmark-artifact gate (plan 1788882429145 §20/§25, blueprint
 * §20): the machine-readable benchmark artifact is schema-locked, and
 * the advisory comparison (fresh vs pinned baseline, 25% over median)
 * is a pure, deterministic function — tested here, wired advisory in CI
 * (§20: "advisory gate → blocking after proven reliability").
 *
 * Perf numbers are environment-dependent and are NEVER asserted — the
 * gate asserts structure and comparison semantics only.
 */

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { advisoryCompare } from "../../src/bench/harness.js";
import type { BenchArtifact } from "../../src/bench/harness.js";

const FIXTURE: BenchArtifact["fixture"] = {
  generator: "synthetic-repo",
  fileCount: 20,
  manifestHash: "fixed",
};

function artifact(samples: BenchArtifact["samples"]): BenchArtifact {
  return {
    schemaVersion: 1,
    harnessVersion: "test",
    mjolnirVersion: "test",
    nodeVersion: "test",
    os: "test",
    cpu: "test",
    measuredAt: "fixed",
    commit: "fixed",
    fixture: FIXTURE,
    samples,
  };
}

const BASELINE: BenchArtifact = artifact([
  {
    scenario: "cache-miss",
    durationMs: 400,
    runs: [],
    rssDeltaBytes: 0,
    state: { warm: false, cache: "miss" },
  },
  {
    scenario: "warm-start",
    durationMs: 300,
    runs: [],
    rssDeltaBytes: 0,
    state: { warm: true, cache: "miss" },
  },
]);

describe("bench artifact schema gate (WI-15)", () => {
  it("the committed pinned baseline is schema-valid", () => {
    const b = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          "..",
          "..",
          ".mjolnir",
          "bench-baseline.json",
        ),
        "utf8",
      ),
    ) as BenchArtifact;
    expect(b.schemaVersion).toBe(1);
    for (const s of b.samples) {
      expect(typeof s.scenario).toBe("string");
      expect(typeof s.durationMs).toBe("number");
      expect(Number.isFinite(s.durationMs)).toBe(true);
      expect(Array.isArray(s.runs)).toBe(true);
    }
  });

  it("advisoryCompare: >25% over the pinned median warns, within does not", () => {
    // cache-miss pinned 400ms: 600ms is +50% → warn; 450ms is +12.5% → silent.
    const fresh = artifact([
      {
        scenario: "cache-miss",
        durationMs: 600,
        runs: [],
        rssDeltaBytes: 0,
        state: { warm: false, cache: "miss" },
      },
      {
        scenario: "warm-start",
        durationMs: 310,
        runs: [],
        rssDeltaBytes: 0,
        state: { warm: true, cache: "miss" },
      },
    ]);
    const warnings = advisoryCompare(fresh, BASELINE);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("cache-miss: 600ms vs pinned 400ms (+50%)");
  });

  it("advisoryCompare: unknown scenarios are skipped, never fabricated", () => {
    // An EMPTY baseline has no pinned scenarios — every fresh scenario
    // is unknown and must be skipped without warnings or fabrication.
    const fresh = artifact([
      {
        scenario: "cache-miss",
        durationMs: 999_999,
        runs: [],
        rssDeltaBytes: 0,
        state: { warm: false, cache: "miss" },
      },
    ]);
    expect(advisoryCompare(fresh, artifact([]))).toEqual([]);
  });

  it("advisoryCompare: zero-duration pinned scenarios never divide by zero", () => {
    const zeroBase = artifact([
      {
        scenario: "cache-miss",
        durationMs: 0,
        runs: [],
        rssDeltaBytes: 0,
        state: { warm: false, cache: "miss" },
      },
    ]);
    expect(
      advisoryCompare(
        artifact([
          {
            scenario: "cache-miss",
            durationMs: 999,
            runs: [],
            rssDeltaBytes: 0,
            state: { warm: false, cache: "miss" },
          },
        ]),
        zeroBase,
      ),
    ).toEqual([]);
  });

  it(
    "end-to-end: runBenchmark regenerates a schema-valid artifact on a temp dir",
    { timeout: 120_000 },
    async () => {
      const out = mkdtempSync(join(tmpdir(), "mjolnir-bench-"));
      try {
        const { runBenchmark, generateFixture } =
          await import("../../src/bench/harness.js");
        const fixtureRoot = join(out, ".bench-fixture");
        mkdirSync(fixtureRoot, { recursive: true });
        const fixture = generateFixture(fixtureRoot, { fileCount: 20 });
        const b = await runBenchmark(fixtureRoot, fixture, {
          mjolnirVersion: "test",
          commit: "test",
        });
        writeFileSync(
          join(out, "bench-artifact.json"),
          JSON.stringify(b, null, 2) + "\n",
        );
        expect(b.schemaVersion).toBe(1);
        expect(b.samples.length).toBeGreaterThan(0);
        for (const s of b.samples) {
          expect(typeof s.scenario).toBe("string");
          expect(s.durationMs).toBeGreaterThanOrEqual(0);
          // No undefined/NaN leaks into the machine-readable artifact:
          expect(JSON.stringify(s)).not.toContain("undefined");
          expect(JSON.stringify(s)).not.toContain("NaN");
        }
      } finally {
        rmSync(out, { recursive: true, force: true });
      }
    },
  );
});
