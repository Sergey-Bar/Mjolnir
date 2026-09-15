import { describe, expect, it } from "vitest";
import {
  computeKillRate,
  mutationEvidenceLevel,
} from "../../src/mutation/mutation-resilience.js";
import type { MutationReport } from "../../src/mutation/mutation-resilience.js";

function makeReport(overrides: Partial<MutationReport> = {}): MutationReport {
  return {
    killed: 0,
    survived: 0,
    noCoverage: 0,
    timeout: 0,
    totalFiles: 0,
    totalMutants: 0,
    ...overrides,
  };
}

describe("mutation-resilience", () => {
  describe("computeKillRate", () => {
    it("returns 0 when no exercised mutants", () => {
      expect(computeKillRate(makeReport())).toBe(0);
    });

    it("returns 1.0 when all exercised mutants are killed", () => {
      expect(computeKillRate(makeReport({ killed: 10, survived: 0 }))).toBe(1);
    });

    it("returns 0 when all exercised mutants survive", () => {
      expect(computeKillRate(makeReport({ killed: 0, survived: 10 }))).toBe(0);
    });

    it("excludes noCoverage from denominator", () => {
      // killed=8, survived=2, noCoverage=50
      // rate = 8 / (8+2) = 0.8, NOT 8/60
      const rate = computeKillRate(
        makeReport({ killed: 8, survived: 2, noCoverage: 50 }),
      );
      expect(rate).toBeCloseTo(0.8);
    });

    it("excludes timeout from denominator", () => {
      // killed=7, survived=3, timeout=20
      // rate = 7 / (7+3) = 0.7, NOT 7/30
      const rate = computeKillRate(
        makeReport({ killed: 7, survived: 3, timeout: 20 }),
      );
      expect(rate).toBeCloseTo(0.7);
    });

    it("excludes both timeout and noCoverage", () => {
      const rate = computeKillRate(
        makeReport({ killed: 5, survived: 5, noCoverage: 100, timeout: 50 }),
      );
      expect(rate).toBeCloseTo(0.5);
    });

    it("handles edge case: killed=0 survived=0 noCoverage>0", () => {
      expect(
        computeKillRate(makeReport({ noCoverage: 100, timeout: 50 })),
      ).toBe(0);
    });
  });

  describe("mutationEvidenceLevel", () => {
    it("returns E2 for killRate >= 0.8", () => {
      expect(mutationEvidenceLevel(0.8)).toBe("E2");
      expect(mutationEvidenceLevel(0.95)).toBe("E2");
      expect(mutationEvidenceLevel(1.0)).toBe("E2");
    });

    it("returns E1 for killRate >= 0.5 and < 0.8", () => {
      expect(mutationEvidenceLevel(0.5)).toBe("E1");
      expect(mutationEvidenceLevel(0.79)).toBe("E1");
      expect(mutationEvidenceLevel(0.65)).toBe("E1");
    });

    it("returns E0 for killRate < 0.5", () => {
      expect(mutationEvidenceLevel(0.49)).toBe("E0");
      expect(mutationEvidenceLevel(0)).toBe("E0");
      expect(mutationEvidenceLevel(0.25)).toBe("E0");
    });

    it("handles boundary exactly at 0.8", () => {
      expect(mutationEvidenceLevel(0.8)).toBe("E2");
      expect(mutationEvidenceLevel(0.7999)).toBe("E1");
    });

    it("handles boundary exactly at 0.5", () => {
      expect(mutationEvidenceLevel(0.5)).toBe("E1");
      expect(mutationEvidenceLevel(0.4999)).toBe("E0");
    });
  });
});
