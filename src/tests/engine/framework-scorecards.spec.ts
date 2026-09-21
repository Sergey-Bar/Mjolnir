import { describe, expect, it } from "vitest";

import {
  FRAMEWORK_SCORECARDS,
  getAllGapIds,
  getMissingAndWeakEntries,
  validateScorecard,
  SCORECARD_DIMENSIONS,
} from "../../src/frameworks/scorecard.js";
import { FRAMEWORK_INVENTORY } from "../../src/frameworks/framework-inventory.js";

describe("FRAMEWORK_SCORECARDS", () => {
  it("has exactly 14 scorecards matching FRAMEWORK_INVENTORY", () => {
    expect(FRAMEWORK_SCORECARDS).toHaveLength(14);
  });

  it("every inventory framework has a scorecard", () => {
    const scorecardIds = FRAMEWORK_SCORECARDS.map((s) => s.frameworkId);
    for (const fw of FRAMEWORK_INVENTORY) {
      expect(scorecardIds).toContain(fw.frameworkId);
    }
  });

  it("every scorecard has all 27 dimensions", () => {
    for (const scorecard of FRAMEWORK_SCORECARDS) {
      const dims = scorecard.entries.map((e) => e.dimension);
      expect(dims).toHaveLength(27);
      for (const dim of SCORECARD_DIMENSIONS) {
        expect(dims).toContain(dim);
      }
    }
  });

  it("playwright has EXCELLENT discovery and CURRENT target", () => {
    const pw = FRAMEWORK_SCORECARDS.find((s) => s.frameworkId === "playwright");
    expect(pw).toBeDefined();
    const discovery = pw?.entries.find((e) => e.dimension === "discovery");
    expect(discovery).toBeDefined();
    expect(discovery?.current).toBe("EXCELLENT");
    expect(discovery?.target).toBe("EXCELLENT");
  });

  it("playwright uses GAP-PW-001 for astUsage", () => {
    const pw = FRAMEWORK_SCORECARDS.find((s) => s.frameworkId === "playwright");
    expect(pw).toBeDefined();
    const ast = pw?.entries.find((e) => e.dimension === "astUsage");
    expect(ast).toBeDefined();
    expect(ast?.gapId).toBe("GAP-PW-001");
    expect(ast?.current).toBe("PARTIAL");
  });

  it("jest uses GAP-JEST-002 through GAP-JEST-015 correctly", () => {
    const jest = FRAMEWORK_SCORECARDS.find((s) => s.frameworkId === "jest");
    expect(jest).toBeDefined();
    const sem = jest?.entries.find(
      (e) => e.dimension === "semanticUnderstanding",
    );
    expect(sem).toBeDefined();
    expect(sem?.gapId).toBe("GAP-JEST-002");
    expect(sem?.current).toBe("WEAK");

    const snapshot = jest?.entries.find(
      (e) => e.dimension === "snapshotSemantics",
    );
    expect(snapshot).toBeDefined();
    expect(snapshot?.gapId).toBe("GAP-JEST-011");
    expect(snapshot?.current).toBe("MISSING");
  });

  it("gitlab-ci has F0 maturity gaps with GAP-GL-001 for discovery", () => {
    const gl = FRAMEWORK_SCORECARDS.find((s) => s.frameworkId === "gitlab-ci");
    expect(gl).toBeDefined();
    const discovery = gl?.entries.find((e) => e.dimension === "discovery");
    expect(discovery).toBeDefined();
    expect(discovery?.gapId).toBe("GAP-GL-001");
    expect(discovery?.current).toBe("MISSING");
  });

  it("CI providers have NOT_APPLICABLE for test-only dimensions", () => {
    for (const id of ["github-actions", "azure-devops", "jenkins"]) {
      const sc = FRAMEWORK_SCORECARDS.find((s) => s.frameworkId === id);
      expect(sc).toBeDefined();
      const ast = sc?.entries.find((e) => e.dimension === "astUsage");
      expect(ast).toBeDefined();
      expect(ast?.current).toBe("NOT_APPLICABLE");
      expect(ast?.target).toBe("NOT_APPLICABLE");
    }
  });
});

describe("getAllGapIds", () => {
  it("returns a non-empty sorted list of unique GAP-* ids", () => {
    const ids = getAllGapIds();
    expect(ids.length).toBeGreaterThan(0);
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("all returned ids match GAP-XXX-NNN format", () => {
    for (const id of getAllGapIds()) {
      expect(id).toMatch(/^GAP-[A-Z]+-\d{3}$/);
    }
  });

  it("contains known playwright gaps", () => {
    const ids = getAllGapIds();
    expect(ids).toContain("GAP-PW-001");
    expect(ids).toContain("GAP-PW-006");
  });

  it("contains known jest gaps", () => {
    const ids = getAllGapIds();
    expect(ids).toContain("GAP-JEST-002");
    expect(ids).toContain("GAP-JEST-015");
  });

  it("contains known gitlab-ci gaps", () => {
    const ids = getAllGapIds();
    expect(ids).toContain("GAP-GL-001");
    expect(ids).toContain("GAP-GL-010");
  });
});

describe("getMissingAndWeakEntries", () => {
  it("returns only entries with MISSING or WEAK current rating", () => {
    const entries = getMissingAndWeakEntries();
    for (const entry of entries) {
      expect(["MISSING", "WEAK"]).toContain(entry.current);
    }
  });

  it("includes jest semanticUnderstanding (WEAK)", () => {
    const entries = getMissingAndWeakEntries();
    const found = entries.find(
      (e) =>
        e.frameworkId === "jest" && e.dimension === "semanticUnderstanding",
    );
    expect(found).toBeDefined();
    expect(found?.current).toBe("WEAK");
  });

  it("includes playwright mockingSemantics (MISSING)", () => {
    const entries = getMissingAndWeakEntries();
    const found = entries.find(
      (e) =>
        e.frameworkId === "playwright" && e.dimension === "mockingSemantics",
    );
    expect(found).toBeDefined();
    expect(found?.current).toBe("MISSING");
  });
});

describe("validateScorecard", () => {
  it("returns valid with no errors for the current scorecards", () => {
    const result = validateScorecard();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
