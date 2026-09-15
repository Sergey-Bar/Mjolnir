/**
 * Cross-Rule Evidence Correlation Engine (INTEL-005) — test suite.
 *
 * TI-009: E1+E1+E1 ≠ E2. Conclusion types.
 */

import { describe, expect, it } from "vitest";

import {
  correlateFindings,
} from "../../src/engine/correlation-engine.js";
import type { Finding } from "../../src/types.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "medium",
    findingType: "heuristic-risk",
    qaImpact: "FLAKY-RISK",
    file: "tests/login.spec.ts",
    line: 10,
    column: 1,
    message: "hard sleep in test",
    why: "Fixed sleeps are flaky",
    fix: "Use auto-wait",
    findingId: "fp-1",
    rootCauseId: "rc-1",
    ...overrides,
  };
}

describe("correlateFindings", () => {
  it("returns empty for empty input", () => {
    expect(correlateFindings([])).toEqual([]);
  });

  it("returns empty for single finding", () => {
    expect(correlateFindings([finding()])).toEqual([]);
  });

  describe("TI-009: E1+E1+E1 ≠ E2", () => {
    it("multiple E1 findings produce SUPPORTING, not STRONG", () => {
      const findings = [
        finding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          evidenceLevel: "E1",
        }),
        finding({
          findingId: "f2",
          rootCauseId: "rc-shared",
          evidenceLevel: "E1",
          line: 20,
        }),
        finding({
          findingId: "f3",
          rootCauseId: "rc-shared",
          evidenceLevel: "E1",
          line: 30,
        }),
      ];
      const conclusions = correlateFindings(findings);
      const convergent = conclusions.filter(
        (c) => c.conclusionType === "CONVERGENT",
      );
      expect(convergent.length).toBeGreaterThan(0);
      expect(convergent[0]?.certainty).toBe("SUPPORTING");
    });

    it("single E2 finding without runtime corroboration produces STRONG", () => {
      const findings = [
        finding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          evidenceLevel: "E2",
        }),
        finding({
          findingId: "f2",
          rootCauseId: "rc-shared",
          evidenceLevel: "E2",
          line: 20,
        }),
      ];
      const conclusions = correlateFindings(findings);
      const convergent = conclusions.filter(
        (c) => c.conclusionType === "CONVERGENT",
      );
      expect(convergent.length).toBeGreaterThan(0);
      expect(convergent[0]?.certainty).toBe("STRONG");
    });

    it("runtime corroboration elevates to STRONG regardless of evidence level", () => {
      const findings = [
        finding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          evidenceLevel: "E1",
          runtimeCorroboration: {
            level: "test",
            source: "playwright-json",
            testsExecuted: 1,
          },
        }),
        finding({
          findingId: "f2",
          rootCauseId: "rc-shared",
          evidenceLevel: "E1",
          line: 20,
        }),
      ];
      const conclusions = correlateFindings(findings);
      const convergent = conclusions.filter(
        (c) => c.conclusionType === "CONVERGENT",
      );
      expect(convergent.length).toBeGreaterThan(0);
      expect(convergent[0]?.certainty).toBe("STRONG");
    });
  });

  describe("conclusion types", () => {
    it("produces CONVERGENT for findings sharing root cause", () => {
      const findings = [
        finding({ findingId: "f1", rootCauseId: "shared-rc" }),
        finding({ findingId: "f2", rootCauseId: "shared-rc", line: 20 }),
      ];
      const conclusions = correlateFindings(findings);
      expect(conclusions.some((c) => c.conclusionType === "CONVERGENT")).toBe(
        true,
      );
    });

    it("produces AMPLIFIED for multiple findings in same file", () => {
      const findings = [
        finding({
          findingId: "f1",
          rootCauseId: "rc-a",
          file: "test.spec.ts",
          ruleId: "QA-TEST-001",
        }),
        finding({
          findingId: "f2",
          rootCauseId: "rc-b",
          file: "test.spec.ts",
          ruleId: "QA-PW-101",
          line: 30,
        }),
      ];
      const conclusions = correlateFindings(findings);
      expect(conclusions.some((c) => c.conclusionType === "AMPLIFIED")).toBe(
        true,
      );
    });

    it("produces CORROBORATED when runtime evidence exists", () => {
      const findings = [
        finding({
          findingId: "f1",
          runtimeCorroboration: {
            level: "test",
            source: "playwright-json",
            testsExecuted: 1,
          },
        }),
      ];
      const conclusions = correlateFindings(findings);
      expect(conclusions.some((c) => c.conclusionType === "CORROBORATED")).toBe(
        true,
      );
    });

    it("CORROBORATED conclusion is always STRONG", () => {
      const findings = [
        finding({
          findingId: "f1",
          evidenceLevel: "E0",
          runtimeCorroboration: {
            level: "file",
            source: "jest-json",
            testsExecuted: 5,
          },
        }),
      ];
      const conclusions = correlateFindings(findings);
      const corroborated = conclusions.find(
        (c) => c.conclusionType === "CORROBORATED",
      );
      expect(corroborated).toBeDefined();
      expect(corroborated?.certainty).toBe("STRONG");
    });

    it("includes findingIds in conclusions", () => {
      const findings = [
        finding({ findingId: "f1", rootCauseId: "rc-shared" }),
        finding({ findingId: "f2", rootCauseId: "rc-shared", line: 20 }),
      ];
      const conclusions = correlateFindings(findings);
      for (const c of conclusions) {
        expect(c.findingIds.length).toBeGreaterThan(0);
      }
    });

    it("includes sourceCount in conclusions", () => {
      const findings = [
        finding({ findingId: "f1", rootCauseId: "rc-shared" }),
        finding({ findingId: "f2", rootCauseId: "rc-shared", line: 20 }),
      ];
      const conclusions = correlateFindings(findings);
      for (const c of conclusions) {
        expect(c.sourceCount).toBeGreaterThan(0);
      }
    });
  });

  describe("determinism", () => {
    it("same input produces same output", () => {
      const findings = [
        finding({ findingId: "f1", rootCauseId: "rc-a" }),
        finding({ findingId: "f2", rootCauseId: "rc-a", line: 20 }),
        finding({
          findingId: "f3",
          rootCauseId: "rc-b",
          file: "other.ts",
          line: 5,
        }),
      ];
      const first = correlateFindings(findings);
      const second = correlateFindings(findings);
      expect(first).toEqual(second);
    });
  });

  describe("does not modify findings", () => {
    it("original findings array is unchanged", () => {
      const findings = [
        finding({ findingId: "f1", rootCauseId: "rc-shared" }),
        finding({ findingId: "f2", rootCauseId: "rc-shared", line: 20 }),
      ];
      const original = JSON.parse(JSON.stringify(findings)) as Finding[];
      correlateFindings(findings);
      expect(findings).toEqual(original);
    });
  });
});
