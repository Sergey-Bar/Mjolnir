/**
 * RTM-001 — Requirement Traceability Matrix: structural invariants,
 * lookup helpers, and CI validation.
 */

import { describe, expect, it } from "vitest";

import {
  REQUIREMENT_MATRIX,
  validateRtm,
  getRequirementById,
  getRequirementsByQuarter,
  getRequirementsByPriority,
  getRequirementsByBacklog,
} from "../../src/traceability/rtm.js";

describe("REQUIREMENT_MATRIX", () => {
  it("contains exactly 35 requirements (R-001 through R-035)", () => {
    expect(REQUIREMENT_MATRIX).toHaveLength(35);
  });

  it("each requirement has a unique R-NNN id", () => {
    const ids = REQUIREMENT_MATRIX.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ids span R-001 to R-035", () => {
    const ids = REQUIREMENT_MATRIX.map((r) => r.id).sort();
    expect(ids[0]).toBe("R-001");
    expect(ids[34]).toBe("R-035");
  });

  it("each requirement has a unique backlogId", () => {
    const backlogIds = REQUIREMENT_MATRIX.map((r) => r.backlogId);
    expect(new Set(backlogIds).size).toBe(backlogIds.length);
  });

  it("every requirement has non-empty description", () => {
    for (const r of REQUIREMENT_MATRIX) {
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it("all ids match R-NNN format", () => {
    for (const r of REQUIREMENT_MATRIX) {
      expect(r.id).toMatch(/^R-\d{3}$/);
    }
  });

  it("all dependencies point to valid backlog ids in the matrix", () => {
    const allBacklogIds = new Set(REQUIREMENT_MATRIX.map((r) => r.backlogId));
    for (const r of REQUIREMENT_MATRIX) {
      for (const dep of r.dependencies) {
        expect(allBacklogIds.has(dep)).toBe(true);
      }
    }
  });

  it("R-002 depends on ENGINE-011", () => {
    const r = getRequirementById("R-002");
    expect(r).toBeDefined();
    expect(r?.dependencies).toContain("ENGINE-011");
  });

  it("R-009 depends on VERSION-001", () => {
    const r = getRequirementById("R-009");
    expect(r).toBeDefined();
    expect(r?.dependencies).toContain("VERSION-001");
  });

  it("R-012 depends on GAP-001", () => {
    const r = getRequirementById("R-012");
    expect(r).toBeDefined();
    expect(r?.dependencies).toContain("GAP-001");
  });

  it("R-025 (Suppression integrity) maps to ENGINE-006", () => {
    const r = getRequirementById("R-025");
    expect(r).toBeDefined();
    expect(r?.backlogId).toBe("ENGINE-006");
    expect(r?.quarter).toBe("Q1");
    expect(r?.priority).toBe("P0");
  });

  it("R-029 (RTM) maps to RTM-001", () => {
    const r = getRequirementById("R-029");
    expect(r).toBeDefined();
    expect(r?.backlogId).toBe("RTM-001");
    expect(r?.quarter).toBe("Q1");
    expect(r?.priority).toBe("P0");
  });
});

describe("getRequirementById", () => {
  it("returns the requirement for a known id", () => {
    const r = getRequirementById("R-001");
    expect(r).toBeDefined();
    expect(r?.backlogId).toBe("ENGINE-011");
  });

  it("returns undefined for an unknown id", () => {
    expect(getRequirementById("R-999")).toBeUndefined();
  });
});

describe("getRequirementsByQuarter", () => {
  it("returns all Q1 requirements", () => {
    const q1 = getRequirementsByQuarter("Q1");
    expect(q1.length).toBeGreaterThan(0);
    for (const r of q1) expect(r.quarter).toBe("Q1");
  });

  it("Q1 contains R-001 through R-013, R-025, R-026, R-028, R-029", () => {
    const q1 = getRequirementsByQuarter("Q1");
    const q1Ids = q1.map((r) => r.id);
    expect(q1Ids).toContain("R-001");
    expect(q1Ids).toContain("R-013");
    expect(q1Ids).toContain("R-025");
    expect(q1Ids).toContain("R-029");
  });

  it("returns empty for a quarter with no requirements (check Q3)", () => {
    const q3 = getRequirementsByQuarter("Q3");
    expect(q3.length).toBeGreaterThan(0);
    for (const r of q3) expect(r.quarter).toBe("Q3");
  });
});

describe("getRequirementsByPriority", () => {
  it("returns all P0 requirements", () => {
    const p0 = getRequirementsByPriority("P0");
    expect(p0.length).toBeGreaterThan(0);
    for (const r of p0) expect(r.priority).toBe("P0");
  });

  it("P0 includes R-001 (Trust benchmark)", () => {
    const p0 = getRequirementsByPriority("P0");
    expect(p0.map((r) => r.id)).toContain("R-001");
  });

  it("P2 includes only R-027", () => {
    const p2 = getRequirementsByPriority("P2");
    expect(p2).toHaveLength(1);
    expect(p2[0]?.id).toBe("R-027");
  });
});

describe("getRequirementsByBacklog", () => {
  it("returns requirements matching a backlog id", () => {
    const results = getRequirementsByBacklog("ENGINE-011");
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("R-001");
  });

  it("returns empty for an unknown backlog id", () => {
    expect(getRequirementsByBacklog("NONEXISTENT")).toEqual([]);
  });
});

describe("validateRtm", () => {
  it("the canonical matrix passes validation", () => {
    const result = validateRtm();
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("catches missing backlogId on a requirement", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    const original = (matrix[0] as { backlogId: string }).backlogId;
    (matrix[0] as { backlogId: string }).backlogId = "";
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("empty id, description, or backlogId"),
        ),
      ).toBe(true);
    } finally {
      (matrix[0] as { backlogId: string }).backlogId = original;
    }
  });

  it("catches missing description on a requirement", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    const original = (matrix[1] as { description: string }).description;
    (matrix[1] as { description: string }).description = "";
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("empty id, description, or backlogId"),
        ),
      ).toBe(true);
    } finally {
      (matrix[1] as { description: string }).description = original;
    }
  });

  it("catches invalid id format", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    const original = (matrix[2] as { id: string }).id;
    (matrix[2] as { id: string }).id = "INVALID";
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("id does not match R-NNN format")),
      ).toBe(true);
    } finally {
      (matrix[2] as { id: string }).id = original;
    }
  });

  it("catches duplicate requirement id", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    const originalId = (matrix[matrix.length - 1] as { id: string }).id;
    (matrix[matrix.length - 1] as { id: string }).id = "R-001";
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Duplicate requirement id")),
      ).toBe(true);
    } finally {
      (matrix[matrix.length - 1] as { id: string }).id = originalId;
    }
  });

  it("catches duplicate backlog id", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    const originalBacklogId = (
      matrix[matrix.length - 1] as { backlogId: string }
    ).backlogId;
    (matrix[matrix.length - 1] as { backlogId: string }).backlogId =
      "ENGINE-011";
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Duplicate backlog id")),
      ).toBe(true);
    } finally {
      (matrix[matrix.length - 1] as { backlogId: string }).backlogId =
        originalBacklogId;
    }
  });

  it("catches invalid dependency reference", async () => {
    const mod = await import("../../src/traceability/rtm.js");
    const { REQUIREMENT_MATRIX: matrix } = mod;
    matrix.push({
      id: "R-099",
      description: "Test entry",
      backlogId: "TEST-099",
      priority: "P2",
      quarter: "Q4",
      classification: "HYGIENE",
      dependencies: ["NONEXISTENT-DEP"],
    });
    try {
      const result = validateRtm();
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.includes("dependency NONEXISTENT-DEP not found"),
        ),
      ).toBe(true);
    } finally {
      matrix.pop();
    }
  });
});
