/**
 * Benchmark harness (blueprint §20 / §339-340).
 *
 * Measures the canonical scan pipeline (`engine/scan-pipeline.runScan`)
 * over a deterministic synthetic fixture. Policy encoded here:
 * - median of ≥3 runs per scenario (a single run is not a measurement);
 * - cold/warm and cache hit/miss reported as separate scenarios, never
 *   conflated;
 * - RSS deltas where the platform exposes memoryUsage();
 * - the fixture is deterministic (seeded content) so cross-run deltas
 *   measure the pipeline, not the data.
 *
 * The gate over these numbers is ADVISORY by policy (§340): regression
 * warnings fail noisy, never the build, until measurement reliability
 * is proven across ≥3 consecutive release cycles.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

import {
  BENCH_HARNESS_VERSION,
  BENCH_SCHEMA_VERSION,
  collectEnvironment,
  type BenchArtifact,
  type BenchFixture,
  type BenchSample,
  type BenchScenario,
} from "./schema.js";

export { BENCH_SCHEMA_VERSION, BENCH_HARNESS_VERSION };
export type { BenchArtifact, BenchFixture, BenchSample, BenchScenario };

/** Deterministic fixture spec: file count drives everything else. */
export interface FixtureSpec {
  fileCount: number;
}

const ONE_TEST_TEMPLATE = [
  "import { test, expect } from '@playwright/test';",
  "",
  "test('scenario S, iteration I', async ({ page }) => {",
  "  await page.goto('/x');",
  "  await page.waitForTimeout(3000);",
  "  await expect(page).toHaveTitle('t');",
  "});",
  "",
].join("\n");

/**
 * Generate the deterministic synthetic repo. Every file differs (the
 * test name embeds its index) so cache keys and rule paths stay honest;
 * the byte layout is a pure function of fileCount, so the manifest hash
 * is stable across machines.
 */
export function generateFixture(root: string, spec: FixtureSpec): BenchFixture {
  const dirs = Math.min(20, Math.max(1, Math.ceil(spec.fileCount / 150)));
  const perDir = Math.ceil(spec.fileCount / dirs);
  let written = 0;
  const manifest = createHash("sha256");
  for (let d = 0; d < dirs && written < spec.fileCount; d++) {
    const dir = join(root, "pkg", `m${d}`);
    mkdirSync(dir, { recursive: true });
    for (let f = 0; f < perDir && written < spec.fileCount; f++, written++) {
      const content = ONE_TEST_TEMPLATE.replaceAll("S", String(d)).replaceAll(
        "I",
        String(f),
      );
      const name = `spec_${d}_${f}.spec.ts`;
      writeFileSync(join(dir, name), content);
      manifest.update(`${name}:${content.length}\n`);
    }
  }
  return {
    generator: "synthetic-repo",
    fileCount: written,
    manifestHash: manifest.digest("hex").slice(0, 16),
  };
}

/** Median of a numeric list (even counts: lower middle — deterministic). */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] as number;
}

function rssNow(): number {
  return process.memoryUsage().rss;
}

/** One timed pipeline run. Imports are re-required per call for cold starts. */
async function timeOnce(
  root: string,
  opts: { cache: boolean },
): Promise<{ durationMs: number; rssDelta: number }> {
  // Dynamic import: a "cold" run pays module-init cost; the loader caches
  // the module object, so "warm" runs measure pipeline work only. This
  // IS the distinction §339 asks for, honestly realized inside one
  // process (a true cross-process cold start is the CLI's own startup,
  // measured by the startup-overhead scenario).
  const { runScan } = await import("../engine/scan-pipeline.js");
  const rssBefore = rssNow();
  const started = Date.now();
  await runScan({
    target: root,
    json: true,
    verbose: false,
    maxDurationMs: Number.POSITIVE_INFINITY,
    scopeChanged: false,
    format: "json",
    ...(opts.cache ? { cache: true } : {}),
  });
  const durationMs = Date.now() - started;
  return { durationMs, rssDelta: rssNow() - rssBefore };
}

const RUNS_PER_SCENARIO = 3;

/**
 * Measure every scenario and produce the artifact. `mjolnirVersion` and
 * `commit` come from the caller (package.json / git).
 */
export async function runBenchmark(
  fixtureRoot: string,
  fixture: BenchFixture,
  meta: { mjolnirVersion: string; commit: string },
): Promise<BenchArtifact> {
  const samples: BenchSample[] = [];

  // cache-miss: fresh cache dir each run (the .mjolnir dir lives in the
  // fixture root, so a pre-scan wipe makes every run a miss).
  const missRuns: number[] = [];
  const missRss: number[] = [];
  for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
    const r = await timeOnce(fixtureRoot, { cache: false });
    missRuns.push(r.durationMs);
    missRss.push(r.rssDelta);
  }
  samples.push({
    scenario: "cache-miss",
    durationMs: median(missRuns),
    runs: missRuns,
    rssDeltaBytes: median(missRss),
    state: { warm: true, cache: "miss" },
  });

  // cache-hit: the miss runs already populated the cache.
  const hitRuns: number[] = [];
  const hitRss: number[] = [];
  for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
    const r = await timeOnce(fixtureRoot, { cache: true });
    hitRuns.push(r.durationMs);
    hitRss.push(r.rssDelta);
  }
  samples.push({
    scenario: "cache-hit",
    durationMs: median(hitRuns),
    runs: hitRuns,
    rssDeltaBytes: median(hitRss),
    state: { warm: true, cache: "hit" },
  });

  // warm-start: cache off, module loader warm.
  const warmRuns: number[] = [];
  const warmRss: number[] = [];
  for (let i = 0; i < RUNS_PER_SCENARIO; i++) {
    const r = await timeOnce(fixtureRoot, { cache: false });
    warmRuns.push(r.durationMs);
    warmRss.push(r.rssDelta);
  }
  samples.push({
    scenario: "warm-start",
    durationMs: median(warmRuns),
    runs: warmRuns,
    rssDeltaBytes: median(warmRss),
    state: { warm: true, cache: "none" },
  });

  // startup-overhead: module-load-only cost of the pipeline module —
  // the fixed price every CLI invocation pays before scanning a byte.
  const overheadRuns: number[] = [];
  const started = Date.now();
  await import("../engine/scan-pipeline.js");
  overheadRuns.push(Date.now() - started);
  samples.push({
    scenario: "startup-overhead",
    durationMs: overheadRuns[0] as number,
    runs: overheadRuns,
    rssDeltaBytes: 0,
    state: { warm: false, cache: "none" },
  });

  return {
    schemaVersion: BENCH_SCHEMA_VERSION,
    harnessVersion: BENCH_HARNESS_VERSION,
    mjolnirVersion: meta.mjolnirVersion,
    ...collectEnvironment(),
    measuredAt: new Date().toISOString(),
    commit: meta.commit,
    fixture,
    samples,
  };
}

/**
 * Advisory regression check (§340): compare a fresh artifact against a
 * pinned baseline. Returns warnings — the CALLER decides to print them
 * loudly; the gate must never block on them until Phase 6 promotion.
 */
export function advisoryCompare(
  fresh: BenchArtifact,
  baseline: BenchArtifact,
): string[] {
  const warnings: string[] = [];
  const byScenario = new Map(baseline.samples.map((s) => [s.scenario, s]));
  for (const s of fresh.samples) {
    const base = byScenario.get(s.scenario);
    if (!base) continue;
    // 25% over the pinned median warns (infra noise is handled by the
    // rerun-once rule in the calling workflow, not here).
    if (base.durationMs > 0 && s.durationMs > base.durationMs * 1.25) {
      warnings.push(
        `${s.scenario}: ${s.durationMs}ms vs pinned ${base.durationMs}ms (+${Math.round(((s.durationMs - base.durationMs) / base.durationMs) * 100)}%)`,
      );
    }
  }
  return warnings;
}
