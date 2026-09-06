/**
 * Benchmark artifact schema (blueprint §20 / §339).
 *
 * Machine-readable, versioned, additive-only: a perf claim ships with
 * the environment it was measured in, or it is not a claim. The harness
 * records per-scenario medians of ≥3 runs; consumers compare against a
 * PINNED baseline revision's artifact, never an absolute number.
 *
 * Targets are hypotheses until measured — no "under 1 second" marketing
 * without an artifact from this schema under a defined environment.
 */

import { cpus } from "node:os";

/** Schema version of the artifact itself (additive-only evolution). */
export const BENCH_SCHEMA_VERSION = 1;

/** Harness version — bump when measurement methodology changes. */
export const BENCH_HARNESS_VERSION = "1.0.0";

/** Every scenario the harness measures. Closed set; additive evolution. */
export type BenchScenario =
  "cold-start" | "warm-start" | "cache-hit" | "cache-miss" | "startup-overhead";

/** One measured scenario: median of runs, with every individual sample. */
export interface BenchSample {
  scenario: BenchScenario;
  /** Median duration across runs, milliseconds. */
  durationMs: number;
  /** Every individual run's duration — medians hide variance. */
  runs: number[];
  /** Median peak RSS delta across runs (bytes; where measurable). */
  rssDeltaBytes: number;
  /** State descriptor: cold/warm + cache hit/miss per §339. */
  state: {
    warm: boolean;
    cache: "hit" | "miss" | "none";
  };
}

/** The fixture identity: what was scanned, reproducibly. */
export interface BenchFixture {
  /** Synthetic fixture generator name (deterministic across machines). */
  generator: "synthetic-repo";
  /** File count the generator produced. */
  fileCount: number;
  /** SHA-256 of the fixture manifest (path+size list) — reproducibility. */
  manifestHash: string;
}

/** The full artifact: environment + fixture + samples. */
export interface BenchArtifact {
  schemaVersion: number;
  harnessVersion: string;
  /** mjolnir-qa package version under measurement. */
  mjolnirVersion: string;
  /** Node.js version string (process.version). */
  nodeVersion: string;
  /** process.platform. */
  os: string;
  /** CPU model where the platform exposes it ("" otherwise). */
  cpu: string;
  /** ISO-8601 measurement timestamp. */
  measuredAt: string;
  /** Commit SHA the measurement ran at ("" when unknown). */
  commit: string;
  fixture: BenchFixture;
  samples: BenchSample[];
}

/** Environment facts the harness collects. */
export function collectEnvironment(
  cpuList: ReadonlyArray<{ model?: string }> = cpus(),
): {
  nodeVersion: string;
  os: string;
  cpu: string;
} {
  return {
    nodeVersion: process.version,
    os: process.platform,
    cpu: cpuList[0]?.model ?? "",
  };
}
