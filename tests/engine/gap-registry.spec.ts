import { describe, expect, it } from "vitest";

import {
  GAP_REGISTRY,
  getGapById,
  getGapsByFramework,
  getGapsByPriority,
  getGapsByType,
  getOpenGaps,
  validateGapRegistry,
  validateScorecardCoverage,
} from "../../src/gaps/gap-registry.js";
import { getAllGapIds } from "../../src/frameworks/scorecard.js";

describe("GAP_REGISTRY", () => {
  it("is a non-empty array", () => {
    expect(GAP_REGISTRY.length).toBeGreaterThan(0);
  });

  it("every entry has a valid GAP-XXX-NNN format id", () => {
    for (const gap of GAP_REGISTRY) {
      expect(gap.gapId).toMatch(/^GAP-[A-Z]+-\d{3}$/);
    }
  });

  it("contains playwright gaps", () => {
    const pwGaps = getGapsByFramework("playwright");
    expect(pwGaps.length).toBeGreaterThanOrEqual(6);
    expect(pwGaps.map((g) => g.gapId)).toContain("GAP-PW-001");
    expect(pwGaps.map((g) => g.gapId)).toContain("GAP-PW-006");
  });

  it("contains jest gaps", () => {
    const jestGaps = getGapsByFramework("jest");
    expect(jestGaps.length).toBeGreaterThanOrEqual(14);
    expect(jestGaps.map((g) => g.gapId)).toContain("GAP-JEST-002");
  });

  it("contains gitlab-ci gaps", () => {
    const glGaps = getGapsByFramework("gitlab-ci");
    expect(glGaps.length).toBeGreaterThanOrEqual(10);
    expect(glGaps.map((g) => g.gapId)).toContain("GAP-GL-001");
  });
});

describe("getGapById", () => {
  it("finds GAP-PW-001", () => {
    const gap = getGapById("GAP-PW-001");
    expect(gap).toBeDefined();
    expect(gap?.frameworkId).toBe("playwright");
    expect(gap?.gapType).toBe("AST_ANALYSIS");
  });

  it("returns undefined for nonexistent id", () => {
    expect(getGapById("GAP-XX-999")).toBeUndefined();
  });
});

describe("getGapsByType", () => {
  it("returns SEMANTIC_UNDERSTANDING gaps", () => {
    const gaps = getGapsByType("SEMANTIC_UNDERSTANDING");
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.gapType).toBe("SEMANTIC_UNDERSTANDING");
    }
  });
});

describe("getGapsByPriority", () => {
  it("returns P0 gaps (gitlab-ci)", () => {
    const p0 = getGapsByPriority("P0");
    expect(p0.length).toBeGreaterThanOrEqual(2);
    for (const gap of p0) {
      expect(gap.priority).toBe("P0");
    }
  });
});

describe("getOpenGaps", () => {
  it("returns all gaps in the registry", () => {
    const open = getOpenGaps();
    expect(open).toHaveLength(GAP_REGISTRY.length);
  });
});

describe("validateGapRegistry", () => {
  it("returns valid with no errors", () => {
    const result = validateGapRegistry();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("validateScorecardCoverage", () => {
  it("all scorecard gap ids are covered by the registry", () => {
    const scorecardIds = getAllGapIds();
    const result = validateScorecardCoverage(scorecardIds);
    expect(result.missing).toHaveLength(0);
    expect(result.covered.length).toBe(scorecardIds.length);
  });

  it("reports missing ids when a gap id is not in registry", () => {
    const fakeIds = ["GAP-FAKE-001", "GAP-PW-001"];
    const result = validateScorecardCoverage(fakeIds);
    expect(result.missing).toContain("GAP-FAKE-001");
    expect(result.covered).toContain("GAP-PW-001");
  });
});
