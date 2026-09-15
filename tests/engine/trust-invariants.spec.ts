/**
 * Trust invariants registry suite (INVARIANT-001).
 *
 * Locks: registry completeness (20 invariants, TI-001–TI-020),
 * ID uniqueness, lookup helpers, scope/quarter filtering, and the
 * structural property that every CURRENT invariant has no quarter.
 */

import { describe, expect, it } from "vitest";

import {
  TRUST_INVARIANTS,
  getInvariantById,
  getRequiredForQuarter,
  getInvariantsByScope,
} from "../../src/trust/invariants.js";

describe("TRUST_INVARIANTS registry", () => {
  it("contains exactly 20 invariants", () => {
    expect(TRUST_INVARIANTS).toHaveLength(20);
  });

  it("covers TI-001 through TI-020 without gaps", () => {
    const ids = TRUST_INVARIANTS.map((inv) => inv.id);
    for (let i = 1; i <= 20; i++) {
      const expected = `TI-${String(i).padStart(3, "0")}`;
      expect(ids).toContain(expected);
    }
  });

  it("has unique IDs", () => {
    const ids = TRUST_INVARIANTS.map((inv) => inv.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every invariant has a non-empty description", () => {
    for (const inv of TRUST_INVARIANTS) {
      expect(inv.description.length).toBeGreaterThan(0);
    }
  });

  it("every invariant has a non-empty verificationTest", () => {
    for (const inv of TRUST_INVARIANTS) {
      expect(inv.verificationTest.length).toBeGreaterThan(0);
    }
  });

  it("every invariant has a valid scope", () => {
    const validScopes = new Set([
      "Scan",
      "Trust",
      "Exit",
      "Evidence",
      "Identity",
      "Scoring",
      "Plugins",
      "PR Comments",
    ]);
    for (const inv of TRUST_INVARIANTS) {
      expect(validScopes.has(inv.scope)).toBe(true);
    }
  });

  it("CURRENT invariants have no quarter", () => {
    for (const inv of TRUST_INVARIANTS) {
      if (inv.status === "CURRENT") {
        expect(inv.quarter).toBeUndefined();
      }
    }
  });

  it("REQUIRED invariants have a quarter", () => {
    for (const inv of TRUST_INVARIANTS) {
      if (inv.status === "REQUIRED") {
        expect(inv.quarter).toBeDefined();
      }
    }
  });

  it("TI-001 is CURRENT with scope Scan", () => {
    const inv = getInvariantById("TI-001");
    expect(inv).toBeDefined();
    expect(inv?.status).toBe("CURRENT");
    expect(inv?.scope).toBe("Scan");
  });

  it("TI-005 is REQUIRED Q4 in Scan scope", () => {
    const inv = getInvariantById("TI-005");
    expect(inv).toBeDefined();
    expect(inv?.status).toBe("REQUIRED");
    expect(inv?.quarter).toBe("Q4");
    expect(inv?.scope).toBe("Scan");
  });
});

describe("getInvariantById", () => {
  it("returns the invariant for a known ID", () => {
    const inv = getInvariantById("TI-010");
    expect(inv).toBeDefined();
    expect(inv?.id).toBe("TI-010");
    expect(inv?.scope).toBe("Scoring");
  });

  it("returns undefined for an unknown ID", () => {
    expect(getInvariantById("TI-999")).toBeUndefined();
    expect(getInvariantById("")).toBeUndefined();
  });
});

describe("getRequiredForQuarter", () => {
  it("Q1 returns TI-013, TI-015, TI-017", () => {
    const q1 = getRequiredForQuarter("Q1");
    const ids = q1.map((inv) => inv.id);
    expect(ids).toContain("TI-013");
    expect(ids).toContain("TI-015");
    expect(ids).toContain("TI-017");
    for (const inv of q1) {
      expect(inv.status).toBe("REQUIRED");
      expect(inv.quarter).toBe("Q1");
    }
  });

  it("Q2 returns TI-009, TI-014, TI-018, TI-019", () => {
    const q2 = getRequiredForQuarter("Q2");
    const ids = q2.map((inv) => inv.id);
    expect(ids).toContain("TI-009");
    expect(ids).toContain("TI-014");
    expect(ids).toContain("TI-018");
    expect(ids).toContain("TI-019");
  });

  it("Q3 returns TI-011, TI-012, TI-016, TI-020", () => {
    const q3 = getRequiredForQuarter("Q3");
    const ids = q3.map((inv) => inv.id);
    expect(ids).toContain("TI-011");
    expect(ids).toContain("TI-012");
    expect(ids).toContain("TI-016");
    expect(ids).toContain("TI-020");
  });

  it("Q4 returns TI-005 only", () => {
    const q4 = getRequiredForQuarter("Q4");
    expect(q4).toHaveLength(1);
    expect(q4[0]?.id).toBe("TI-005");
  });
});

describe("getInvariantsByScope", () => {
  it("Scan scope returns 6 invariants", () => {
    const scan = getInvariantsByScope("Scan");
    expect(scan).toHaveLength(6);
    for (const inv of scan) {
      expect(inv.scope).toBe("Scan");
    }
  });

  it("Identity scope returns TI-011, TI-012, TI-015, TI-017", () => {
    const identity = getInvariantsByScope("Identity");
    const ids = identity.map((inv) => inv.id);
    expect(ids).toContain("TI-011");
    expect(ids).toContain("TI-012");
    expect(ids).toContain("TI-015");
    expect(ids).toContain("TI-017");
  });

  it("PR Comments scope returns TI-018, TI-019, TI-020", () => {
    const pr = getInvariantsByScope("PR Comments");
    const ids = pr.map((inv) => inv.id);
    expect(ids).toContain("TI-018");
    expect(ids).toContain("TI-019");
    expect(ids).toContain("TI-020");
  });

  it("every scope appears at least once", () => {
    const scopes = new Set(TRUST_INVARIANTS.map((inv) => inv.scope));
    expect(scopes.size).toBe(8);
  });

  it("returned arrays are fresh copies, not the same reference", () => {
    const a = getInvariantsByScope("Scan");
    const b = getInvariantsByScope("Scan");
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
