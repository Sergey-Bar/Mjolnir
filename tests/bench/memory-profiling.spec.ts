import { afterEach, describe, expect, it, vi } from "vitest";
import {
  profileMemory,
  checkMemoryRegression,
} from "../../src/bench/memory-profiling.js";

describe("memory-profiling (ECO-010)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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
      let complete!: () => void;
      const work = new Promise<void>((resolve) => {
        complete = resolve;
      });
      const memoryUsage = vi.spyOn(process, "memoryUsage");
      const pending = profileMemory(() => work);
      await Promise.resolve();
      expect(memoryUsage).toHaveBeenCalledTimes(1);
      complete();
      const profile = await pending;
      expect(memoryUsage).toHaveBeenCalledTimes(2);
      expect(profile.peakRss).toBeGreaterThan(0);
    });

    it("measures memory increase from allocation", async () => {
      const profile = await profileMemory(() => {
        const _arr = new Array(1_000_000).fill("x");
      });
      expect(profile.heapUsed).toBeGreaterThan(0);
      expect(profile.peakRss).toBeGreaterThan(0);
    });

    it("captures peak memory via interval sampling", async () => {
      vi.useFakeTimers();
      const before = {
        rss: 100,
        heapUsed: 50,
        heapTotal: 80,
        external: 10,
        arrayBuffers: 5,
      };
      const sampled = { ...before, rss: 300, heapUsed: 150 };
      const after = { ...before, rss: 200, heapUsed: 75 };
      const memoryUsage = vi
        .spyOn(process, "memoryUsage")
        .mockReturnValueOnce(before)
        .mockReturnValueOnce(sampled)
        .mockReturnValue(after);
      let complete!: () => void;
      const work = new Promise<void>((resolve) => {
        complete = resolve;
      });
      const pending = profileMemory(() => work);
      expect(memoryUsage).toHaveBeenCalledTimes(1);
      await vi.advanceTimersToNextTimerAsync();
      expect(memoryUsage).toHaveBeenCalledTimes(2);
      complete();
      const profile = await pending;
      expect(profile).toEqual({
        peakRss: sampled.rss,
        heapUsed: after.heapUsed,
        heapTotal: after.heapTotal,
        external: after.external,
        arrayBuffers: after.arrayBuffers,
      });
      expect(memoryUsage).toHaveBeenCalledTimes(3);
      expect(vi.getTimerCount()).toBe(0);
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

    it("detects regression with exceeded threshold on single metric", () => {
      const baseline = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const current = {
        peakRss: 200_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain("peakRss");
      expect(result.warnings[0]).toContain("+100%");
    });

    it("uses default threshold of 25%", () => {
      const baseline = {
        peakRss: 100_000_000,
        heapUsed: 50_000_000,
        heapTotal: 80_000_000,
        external: 1_000_000,
        arrayBuffers: 500_000,
      };
      const current = {
        peakRss: 200_000_000,
        heapUsed: 200_000_000,
        heapTotal: 200_000_000,
        external: 2_000_000,
        arrayBuffers: 1_000_000,
      };
      const result = checkMemoryRegression(current, baseline);
      expect(result.ok).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("formats bytes in KB range", () => {
      const baseline = {
        peakRss: 5_000,
        heapUsed: 5_000,
        heapTotal: 5_000,
        external: 5_000,
        arrayBuffers: 5_000,
      };
      const current = {
        peakRss: 10_000,
        heapUsed: 10_000,
        heapTotal: 10_000,
        external: 10_000,
        arrayBuffers: 10_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(false);
      expect(result.warnings[0]).toContain("KB");
    });

    it("formats bytes in MB range", () => {
      const baseline = {
        peakRss: 5_000_000,
        heapUsed: 5_000_000,
        heapTotal: 5_000_000,
        external: 5_000_000,
        arrayBuffers: 5_000_000,
      };
      const current = {
        peakRss: 10_000_000,
        heapUsed: 10_000_000,
        heapTotal: 10_000_000,
        external: 10_000_000,
        arrayBuffers: 10_000_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(false);
      expect(result.warnings[0]).toContain("MB");
    });

    it("formats bytes in B range", () => {
      const baseline = {
        peakRss: 500,
        heapUsed: 500,
        heapTotal: 500,
        external: 500,
        arrayBuffers: 500,
      };
      const current = {
        peakRss: 1_000,
        heapUsed: 1_000,
        heapTotal: 1_000,
        external: 1_000,
        arrayBuffers: 1_000,
      };
      const result = checkMemoryRegression(current, baseline, 0.25);
      expect(result.ok).toBe(false);
      expect(result.warnings[0]).toContain("B");
      expect(result.warnings[0]).not.toContain("KB");
    });
  });
});
