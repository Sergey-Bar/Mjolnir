import { describe, expect, it } from "vitest";

import {
  COMPAT_MATRIX,
  getCompatConfig,
  getAllCompatConfigs,
} from "../../src/frameworks/compat-ci.js";

describe("COMPAT_MATRIX", () => {
  it("contains exactly 3 framework configs", () => {
    expect(COMPAT_MATRIX).toHaveLength(3);
  });

  it("has configs for playwright, jest, and pytest", () => {
    const ids = COMPAT_MATRIX.map((c) => c.frameworkId);
    expect(ids).toContain("playwright");
    expect(ids).toContain("jest");
    expect(ids).toContain("pytest");
  });

  it("every framework has exactly 3 lanes", () => {
    for (const config of COMPAT_MATRIX) {
      expect(config.lanes).toHaveLength(3);
    }
  });

  it("every framework has MINIMUM_SUPPORTED, REPRESENTATIVE_STABLE, and LATEST_VALIDATED", () => {
    const expectedLanes = [
      "MINIMUM_SUPPORTED",
      "REPRESENTATIVE_STABLE",
      "LATEST_VALIDATED",
    ];
    for (const config of COMPAT_MATRIX) {
      const laneTypes = config.lanes.map((l) => l.compatLane);
      for (const lane of expectedLanes) {
        expect(laneTypes).toContain(lane);
      }
    }
  });

  it("LATEST_VALIDATED version is >= REPRESENTATIVE_STABLE version", () => {
    for (const config of COMPAT_MATRIX) {
      const latest = config.lanes.find(
        (l) => l.compatLane === "LATEST_VALIDATED",
      );
      expect(latest).toBeDefined();
      const stable = config.lanes.find(
        (l) => l.compatLane === "REPRESENTATIVE_STABLE",
      );
      expect(stable).toBeDefined();
      if (!latest || !stable) return;
      expect(latest.version >= stable.version).toBe(true);
    }
  });
});

describe("getCompatConfig", () => {
  it("returns config for known framework", () => {
    const config = getCompatConfig("playwright");
    expect(config).toBeDefined();
    expect(config?.frameworkId).toBe("playwright");
  });

  it("returns undefined for unknown framework", () => {
    const config = getCompatConfig("nonexistent");
    expect(config).toBeUndefined();
  });
});

describe("getAllCompatConfigs", () => {
  it("returns all 3 configs", () => {
    expect(getAllCompatConfigs()).toHaveLength(3);
  });
});
