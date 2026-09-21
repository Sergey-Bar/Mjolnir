import { describe, expect, it } from "vitest";
import {
  BENCHMARK_CLASSES,
  REGRESSION_GATES,
  checkRegression,
} from "../../src/bench/regression-gates.js";

describe("performance baselines (ENGINE-009)", () => {
  describe("BENCHMARK_CLASSES", () => {
    it("defines 5 benchmark classes", () => {
      expect(BENCHMARK_CLASSES).toHaveLength(5);
    });

    it("each class has a unique id", () => {
      const ids = BENCHMARK_CLASSES.map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("each class has at least one scenario", () => {
      for (const c of BENCHMARK_CLASSES) {
        expect(c.scenarios.length).toBeGreaterThan(0);
      }
    });

    it("each class has a positive baseline", () => {
      for (const c of BENCHMARK_CLASSES) {
        expect(c.baselineMs).toBeGreaterThan(0);
      }
    });

    it("each class has a positive peakMemoryBytes", () => {
      for (const c of BENCHMARK_CLASSES) {
        expect(c.peakMemoryBytes).toBeGreaterThan(0);
      }
    });

    it("tolerance is in (0, 1] range", () => {
      for (const c of BENCHMARK_CLASSES) {
        expect(c.tolerance).toBeGreaterThan(0);
        expect(c.tolerance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("REGRESSION_GATES", () => {
    it("has a gate for every benchmark class", () => {
      for (const c of BENCHMARK_CLASSES) {
        expect(REGRESSION_GATES.some((g) => g.classId === c.id)).toBe(true);
      }
    });

    it("all gates have threshold > 1", () => {
      for (const g of REGRESSION_GATES) {
        expect(g.threshold).toBeGreaterThan(1);
      }
    });
  });

  describe("checkRegression", () => {
    it("passes when measured is within threshold", () => {
      const result = checkRegression("warm-start-small", 1000);
      expect(result.passed).toBe(true);
      expect(result.measuredMs).toBe(1000);
    });

    it("fails when measured exceeds threshold", () => {
      const result = checkRegression("warm-start-small", 10000);
      expect(result.passed).toBe(false);
    });

    it("returns correct ratio", () => {
      const cls = BENCHMARK_CLASSES.find((c) => c.id === "warm-start-small");
      expect(cls).toBeDefined();
      expect(cls).not.toBeUndefined();
      if (!cls) return;
      const measured = cls.baselineMs * 2;
      const result = checkRegression("warm-start-small", measured);
      expect(result.ratio).toBeCloseTo(2.0, 1);
    });

    it("handles unknown class id gracefully", () => {
      const result = checkRegression("nonexistent", 1000);
      expect(result.passed).toBe(true);
      expect(result.message).toContain("no benchmark class");
    });

    it("includes gate and class info in result", () => {
      const result = checkRegression("cold-start-small", 5000);
      expect(result.gate.classId).toBe("cold-start-small");
      expect(result.benchmarkClass.id).toBe("cold-start-small");
    });

    it("passes at exactly the threshold boundary", () => {
      const cls = BENCHMARK_CLASSES.find((c) => c.id === "cache-hit");
      const gate = REGRESSION_GATES.find((g) => g.classId === "cache-hit");
      expect(cls).toBeDefined();
      expect(gate).toBeDefined();
      if (!cls || !gate) return;
      const exactThreshold = cls.baselineMs * gate.threshold;
      const result = checkRegression("cache-hit", exactThreshold);
      expect(result.passed).toBe(true);
    });

    it("fails just above the threshold", () => {
      const cls = BENCHMARK_CLASSES.find((c) => c.id === "cache-hit");
      const gate = REGRESSION_GATES.find((g) => g.classId === "cache-hit");
      expect(cls).toBeDefined();
      expect(gate).toBeDefined();
      if (!cls || !gate) return;
      const justAbove = cls.baselineMs * gate.threshold + 1;
      const result = checkRegression("cache-hit", justAbove);
      expect(result.passed).toBe(false);
    });

    it("handles zero measured gracefully", () => {
      const result = checkRegression("warm-start-small", 0);
      expect(result.passed).toBe(true);
      expect(result.ratio).toBe(0);
    });
  });
});
