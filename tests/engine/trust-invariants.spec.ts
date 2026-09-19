/**
 * Trust invariants registry suite (INVARIANT-001).
 *
 * Locks: registry completeness (20 invariants, TI-001–TI-020),
 * ID uniqueness, lookup helpers, scope/quarter filtering, and the
 * structural property that every CURRENT invariant has no quarter.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
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

  it("CURRENT invariants map to explicit executable test cases", () => {
    for (const inv of TRUST_INVARIANTS) {
      if (inv.status !== "CURRENT") continue;
      expect(inv.verificationTest).toMatch(/^tests\/.+\.spec\.ts$/);
      expect(inv.verificationCase).toBeTruthy();
      expect(inv.verificationGap).toBeUndefined();
      const path = fileURLToPath(
        new URL(`../../${inv.verificationTest}`, import.meta.url),
      );
      const source = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
      );
      const cases: string[] = [];
      function visit(node: ts.Node): void {
        if (
          ts.isCallExpression(node) &&
          ts.isIdentifier(node.expression) &&
          ["it", "test"].includes(node.expression.text)
        ) {
          const title = node.arguments[0];
          const callback = node.arguments[node.arguments.length - 1];
          if (
            title &&
            ts.isStringLiteral(title) &&
            callback &&
            (ts.isArrowFunction(callback) ||
              ts.isFunctionExpression(callback)) &&
            ts.isBlock(callback.body) &&
            callback.body.statements.length > 0
          ) {
            cases.push(title.text);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
      expect(cases, inv.id).toContain(inv.verificationCase);
    }
  });

  it("REQUIRED invariants disclose the missing behavior verifier", () => {
    for (const inv of TRUST_INVARIANTS) {
      if (inv.status !== "REQUIRED") continue;
      expect(inv.verificationGap, inv.id).toBeTruthy();
      expect(inv.verificationCase, inv.id).toBeUndefined();
    }
  });

  it("TI-001 is CURRENT with scope Scan", () => {
    const inv = getInvariantById("TI-001");
    expect(inv).toBeDefined();
    expect(inv?.status).toBe("CURRENT");
    expect(inv?.scope).toBe("Scan");
  });

  it("TI-005 remains REQUIRED until dependency-aware incremental scanning is verified", () => {
    const inv = getInvariantById("TI-005");
    expect(inv).toBeDefined();
    expect(inv?.status).toBe("REQUIRED");
    expect(inv?.quarter).toBeUndefined();
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
  it("returns only REQUIRED invariants targeted at the requested quarter", () => {
    for (const q of ["Q1", "Q2", "Q3", "Q4"] as const) {
      expect(getRequiredForQuarter(q)).toEqual(
        TRUST_INVARIANTS.filter(
          (inv) => inv.status === "REQUIRED" && inv.quarter === q,
        ),
      );
    }
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
