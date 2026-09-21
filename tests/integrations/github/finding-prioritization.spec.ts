/**
 * Finding Prioritization (PRUX-004) — test suite.
 *
 * Validates sorting by trust impact → false-green potential → severity
 * → evidence strength, and the expanded/collapsed display group logic.
 */

import { describe, expect, it } from "vitest";

import {
  prioritizeFindings,
  type PrioritizedFinding,
} from "../../../src/integrations/github/finding-prioritization.js";

function finding(
  overrides: Partial<PrioritizedFinding> = {},
): PrioritizedFinding {
  return {
    ruleId: "QA-TEST-001",
    severity: "warning",
    message: "test finding",
    file: "test.spec.ts",
    line: 1,
    priority: "important",
    ...overrides,
  };
}

describe("prioritizeFindings", () => {
  it("returns empty groups for empty input", () => {
    expect(prioritizeFindings([])).toEqual([]);
  });

  it("returns a single expanded group for few findings", () => {
    const findings = [finding(), finding({ ruleId: "QA-PW-101" })];
    const groups = prioritizeFindings(findings);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.expanded).toBe(true);
    expect(groups[0]?.findings).toHaveLength(2);
  });

  it("sorts blocking findings above important findings", () => {
    const findings = [
      finding({ priority: "important", ruleId: "IMP-1" }),
      finding({ priority: "blocking", ruleId: "BLK-1", severity: "error" }),
      finding({ priority: "important", ruleId: "IMP-2" }),
    ];
    const groups = prioritizeFindings(findings, 10);
    expect(groups[0]?.findings[0]?.ruleId).toBe("BLK-1");
  });

  it("sorts errors above warnings above info within same priority tier", () => {
    const findings = [
      finding({ severity: "info", ruleId: "INFO-1" }),
      finding({ severity: "error", ruleId: "ERR-1" }),
      finding({ severity: "warning", ruleId: "WARN-1" }),
    ];
    const groups = prioritizeFindings(findings, 10);
    const ids = groups[0]?.findings.map((f) => f.ruleId);
    expect(ids).toEqual(["ERR-1", "WARN-1", "INFO-1"]);
  });

  it("collapses findings beyond maxExpanded into a second group", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding({ ruleId: `R-${i}`, severity: "warning" }),
    );
    const groups = prioritizeFindings(findings, 3);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.expanded).toBe(true);
    expect(groups[0]?.findings).toHaveLength(3);
    expect(groups[1]?.expanded).toBe(false);
    expect(groups[1]?.findings).toHaveLength(7);
  });

  it("clamps maxExpanded to at least 3", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding({ ruleId: `R-${i}` }),
    );
    const groups = prioritizeFindings(findings, 1);
    expect(groups[0]?.findings.length).toBeGreaterThanOrEqual(3);
  });

  it("clamps maxExpanded to findings length", () => {
    const findings = [finding(), finding({ ruleId: "R-1" })];
    const groups = prioritizeFindings(findings, 100);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.findings).toHaveLength(2);
  });

  it("does not mutate the input array", () => {
    const findings = [
      finding({ ruleId: "B", severity: "info" }),
      finding({ ruleId: "A", severity: "error" }),
    ];
    const original = [...findings];
    prioritizeFindings(findings);
    expect(findings).toEqual(original);
  });

  it("default maxExpanded is 5", () => {
    const findings = Array.from({ length: 8 }, (_, i) =>
      finding({ ruleId: `R-${i}` }),
    );
    const groups = prioritizeFindings(findings);
    expect(groups[0]?.findings).toHaveLength(5);
    expect(groups[1]?.findings).toHaveLength(3);
  });

  it("mixed blocking+important sorts blocking errors first", () => {
    const findings = [
      finding({ priority: "important", severity: "error", ruleId: "IMP-ERR" }),
      finding({
        priority: "blocking",
        severity: "warning",
        ruleId: "BLK-WARN",
      }),
      finding({ priority: "blocking", severity: "error", ruleId: "BLK-ERR" }),
      finding({
        priority: "important",
        severity: "warning",
        ruleId: "IMP-WARN",
      }),
    ];
    const groups = prioritizeFindings(findings, 10);
    const ids = groups[0]?.findings.map((f) => f.ruleId);
    expect(ids).toEqual(["BLK-ERR", "BLK-WARN", "IMP-ERR", "IMP-WARN"]);
  });
});
