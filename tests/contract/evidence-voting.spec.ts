/**
 * TI-009 — E1+E1+E1 ≠ E2 (heuristic voting cannot manufacture proof).
 *
 * Verifies the correlation engine's enforcement: multiple weak-evidence
 * findings (E1) can SUPPORT each other but can NEVER combine into
 * STRONG evidence (E2). Only E2 or runtime corroboration yields STRONG.
 *
 * This is the No False Proof law in its evidence-combination form.
 */

import { describe, expect, it } from "vitest";

import { correlateFindings } from "../../src/engine/correlation-engine.js";
import type { Finding } from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    file: "tests/example.spec.ts",
    line: 10,
    column: 0,
    severity: "warning",
    message: "test finding",
    findingType: "heuristic-risk",
    confidence: "medium",
    evidenceLevel: "E1",
    ...overrides,
  } as Finding;
}

describe("TI-009: E1+E1+E1 ≠ E2", () => {
  it("three E1 findings converge as SUPPORTING, never STRONG", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "shared-root",
        evidenceLevel: "E1",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "shared-root",
        evidenceLevel: "E1",
      }),
      makeFinding({
        findingId: "f3",
        rootCauseId: "shared-root",
        evidenceLevel: "E1",
      }),
    ];

    const conclusions = correlateFindings(findings);

    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent.length).toBeGreaterThanOrEqual(1);

    for (const c of convergent) {
      expect(c.certainty).toBe("SUPPORTING");
      expect(c.certainty).not.toBe("STRONG");
    }
  });

  it("a single E2 finding achieves STRONG", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "shared-root",
        evidenceLevel: "E2",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "shared-root",
        evidenceLevel: "E2",
      }),
    ];

    const conclusions = correlateFindings(findings);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent.length).toBeGreaterThanOrEqual(1);
    expect(convergent[0]?.certainty).toBe("STRONG");
  });

  it("runtime corroboration achieves STRONG regardless of evidence level", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "shared-root",
        evidenceLevel: "E1",
        runtimeCorroboration: {
          level: "test",
          source: "playwright-json",
          testsExecuted: 5,
        },
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "shared-root",
        evidenceLevel: "E1",
        runtimeCorroboration: {
          level: "file",
          source: "playwright-json",
          testsExecuted: 5,
        },
      }),
    ];

    const conclusions = correlateFindings(findings);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent.length).toBeGreaterThanOrEqual(1);
    expect(convergent[0]?.certainty).toBe("STRONG");
  });

  it("mixed E1+E2 findings yield STRONG (best evidence wins)", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "mixed-root",
        evidenceLevel: "E1",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "mixed-root",
        evidenceLevel: "E2",
      }),
    ];

    const conclusions = correlateFindings(findings);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent.length).toBeGreaterThanOrEqual(1);
    expect(convergent[0]?.certainty).toBe("STRONG");
  });

  it("two E1 findings are SUPPORTING (not STRONG)", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "pair-root",
        evidenceLevel: "E1",
      }),
      makeFinding({
        findingId: "f2",
        rootCauseId: "pair-root",
        evidenceLevel: "E1",
      }),
    ];

    const conclusions = correlateFindings(findings);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent.length).toBeGreaterThanOrEqual(1);
    expect(convergent[0]?.certainty).toBe("SUPPORTING");
  });

  it("a single E1 finding yields NONE (no self-corroboration)", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        rootCauseId: "solo-root",
        evidenceLevel: "E1",
      }),
    ];

    const conclusions = correlateFindings(findings);
    const convergent = conclusions.filter(
      (c) => c.conclusionType === "CONVERGENT",
    );
    expect(convergent).toHaveLength(0);
  });

  it("CORROBORATED conclusions require runtime evidence", () => {
    const findings = [
      makeFinding({
        findingId: "f1",
        runtimeCorroboration: {
          level: "test",
          source: "junit-xml",
          testsExecuted: 3,
        },
      }),
    ];

    const conclusions = correlateFindings(findings);
    const corroborated = conclusions.filter(
      (c) => c.conclusionType === "CORROBORATED",
    );
    expect(corroborated).toHaveLength(1);
    expect(corroborated[0]?.certainty).toBe("STRONG");
  });

  it("findings without runtime corroboration produce no CORROBORATED conclusion", () => {
    const findings = [
      makeFinding({ findingId: "f1" }),
      makeFinding({ findingId: "f2" }),
    ];

    const conclusions = correlateFindings(findings);
    const corroborated = conclusions.filter(
      (c) => c.conclusionType === "CORROBORATED",
    );
    expect(corroborated).toHaveLength(0);
  });
});
