import { describe, expect, it } from "vitest";
import {
  profileMemory,
  checkMemoryRegression,
} from "../../src/bench/memory-profiling.js";

describe("memory-profiling (ECO-010)", () => {
  describe("profileMemory", () => {
    it("returns a valid memory profile", async () => {
      const profile = await profileMemory(() => {
        const _arr = new Array(1000).fill(0);
      });
      expect(profile.peakRss).toBeGreaterThan(0);
      expect(profile.heapUsed).toBeGreaterThan(0);
      expect(profile.heapTotal).toBeGreaterThan(0);
    });

    it("handles async functions", async () => {
      const profile = await profileMemory(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(profile.peakRss).toBeGreaterThan(0);
    });

    it("measures memory increase from allocation", async () => {
      const profile = await profileMemory(() => {
        const _arr = new Array(1_000_000).fill("x");
      });
      expect(profile.heapUsed).toBeGreaterThan(0);
      expect(profile.peakRss).toBeGreaterThan(0);
    });
  });

  describe("checkMemoryRegression", () => {
    it("returns ok when within threshold", () => {
      const baseline = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const current = {
        peakRss: 110_000_000,
        heapUsed: 55_000_000,
        heapTotal: 85_000_000,
        external: 1_100_000,
        arrayBuffers: 550_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("warns when exceeding threshold", () => {
      const baseline = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const current = {
        peakRss: 200_000_000,
        heapUsed: 100_000_000,
        heapTotal: 160_000_000,
        external: 2_000_000,
        arrayBuffers: 1_000_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("+100%");
    });

    it("ignores zero baselines", () => {
      const baseline = {
        peakRss: 0,
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
      };
      const current = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(true);
    });

    it("supports custom threshold", () => {
      const baseline = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const current = {
        peakRss: 105_000_000,
        heapUsed: 52_000_000,
        heapTotal: 83_000_000,
        external: 1_050_000,
        arrayBuffers: 520_000,
      };
      // 5% increase — passes at 25% threshold
      expect(checkMemoryRegression(current, baseline, 0.25).ok).toBe(true);
      // Fails at 1% threshold
      expect(checkMemoryRegression(current, baseline, 0.01).ok).toBe(false);
    });
  });
});
