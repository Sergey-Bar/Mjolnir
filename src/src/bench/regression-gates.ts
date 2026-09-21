/**
 * Benchmark Classes and Regression Gates (ENGINE-009).
 *
 * Defines performance benchmark classes with their baselines and
 * regression gates that gate CI when a scenario exceeds its threshold.
 */

import type { BenchScenario } from "./schema.js";

export interface BenchmarkClass {
  /** Unique identifier for this benchmark class. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Which scenarios this class covers. */
  scenarios: BenchScenario[];
  /** Maximum allowed duration in ms (baseline). */
  baselineMs: number;
  /** Maximum allowed peak memory in bytes. */
  peakMemoryBytes: number;
  /** Regression tolerance as a fraction (e.g. 0.25 = 25%). */
  tolerance: number;
}

export const BENCHMARK_CLASSES: readonly BenchmarkClass[] = [
  {
    id: "cold-start-small",
    name: "Cold start (small fixture)",
    scenarios: ["cold-start"],
    baselineMs: 5000,
    peakMemoryBytes: 200 * 1024 * 1024,
    tolerance: 0.25,
  },
  {
    id: "warm-start-small",
    name: "Warm start (small fixture)",
    scenarios: ["warm-start"],
    baselineMs: 2000,
    peakMemoryBytes: 150 * 1024 * 1024,
    tolerance: 0.25,
  },
  {
    id: "cache-hit",
    name: "Cache hit (fully cached)",
    scenarios: ["cache-hit"],
    baselineMs: 1000,
    peakMemoryBytes: 100 * 1024 * 1024,
    tolerance: 0.3,
  },
  {
    id: "cache-miss",
    name: "Cache miss (full scan)",
    scenarios: ["cache-miss"],
    baselineMs: 4000,
    peakMemoryBytes: 200 * 1024 * 1024,
    tolerance: 0.25,
  },
  {
    id: "startup-overhead",
    name: "Startup overhead (module load)",
    scenarios: ["startup-overhead"],
    baselineMs: 500,
    peakMemoryBytes: 50 * 1024 * 1024,
    tolerance: 0.5,
  },
];

export interface RegressionGate {
  /** The benchmark class this gate applies to. */
  classId: string;
  /** Whether the gate is blocking (fails CI) or advisory (warns only). */
  blocking: boolean;
  /** Threshold multiplier over baseline that triggers the gate. */
  threshold: number;
}

export const REGRESSION_GATES: readonly RegressionGate[] = [
  { classId: "cold-start-small", blocking: false, threshold: 1.25 },
  { classId: "warm-start-small", blocking: false, threshold: 1.25 },
  { classId: "cache-hit", blocking: false, threshold: 1.3 },
  { classId: "cache-miss", blocking: false, threshold: 1.25 },
  { classId: "startup-overhead", blocking: false, threshold: 1.5 },
];

export interface RegressionCheckResult {
  passed: boolean;
  gate: RegressionGate;
  benchmarkClass: BenchmarkClass;
  measuredMs: number;
  baselineMs: number;
  ratio: number;
  message: string;
}

/**
 * Check whether a measured duration passes the regression gate for a
 * given benchmark class.
 */
export function checkRegression(
  classId: string,
  measuredMs: number,
): RegressionCheckResult {
  const benchClass = BENCHMARK_CLASSES.find((c) => c.id === classId);
  const gate = REGRESSION_GATES.find((g) => g.classId === classId);

  if (!benchClass || !gate) {
    return {
      passed: true,
      gate: gate ?? { classId, blocking: false, threshold: 1.25 },
      benchmarkClass: benchClass ?? {
        id: classId,
        name: classId,
        scenarios: [],
        baselineMs: 0,
        peakMemoryBytes: 0,
        tolerance: 0.25,
      },
      measuredMs,
      baselineMs: 0,
      ratio: 0,
      message: `no benchmark class or gate found for "${classId}" — skipping`,
    };
  }

  const ratio =
    benchClass.baselineMs > 0 ? measuredMs / benchClass.baselineMs : 0;
  const passed = ratio <= gate.threshold;

  return {
    passed,
    gate,
    benchmarkClass: benchClass,
    measuredMs,
    baselineMs: benchClass.baselineMs,
    ratio,
    message: passed
      ? `${benchClass.name}: ${measuredMs}ms (baseline ${benchClass.baselineMs}ms, ratio ${ratio.toFixed(2)})`
      : `REGRESSION: ${benchClass.name}: ${measuredMs}ms exceeds ${gate.threshold}x baseline ${benchClass.baselineMs}ms (ratio ${ratio.toFixed(2)})`,
  };
}
