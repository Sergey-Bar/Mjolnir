/**
 * "Fix this first" prioritization (Master-Stabilization-Plan Sprint 5,
 * Task 20).
 */

import { describe, expect, it } from "vitest";
import { prioritize, topFixes } from "../src/scorer/prioritize.js";
import type { Finding } from "../src/types.js";
import { renderTerminal } from "../src/reporter/terminal.js";
import type { ScanResult } from "../src/types.js";

function finding(over: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    evidenceLevel: "E2",
    file: "a.spec.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...over,
  };
}

describe("prioritize", () => {
  it("ranks a higher-severity (higher score-gain) finding before a lower one", () => {
    const error = finding({
      ruleId: "e",
      severity: "error",
      evidenceLevel: "E2",
    });
    const info = finding({
      ruleId: "i",
      severity: "info",
      evidenceLevel: "E2",
    });
    const [first, second] = prioritize([info, error]);
    expect(first?.finding.ruleId).toBe("e");
    expect(second?.finding.ruleId).toBe("i");
  });

  it("an E0 (advisory) finding has zero score-gain", () => {
    const advisory = finding({
      findingType: "observation",
      evidenceLevel: "E0",
      severity: "error",
    });
    const [only] = prioritize([advisory]);
    expect(only?.scoreGain).toBe(0);
  });

  it("evidence-discounted (E1) findings rank between full-strength and zero", () => {
    const full = finding({
      ruleId: "full",
      severity: "warning",
      evidenceLevel: "E2",
    });
    const half = finding({
      ruleId: "half",
      severity: "warning",
      evidenceLevel: "E1",
    });
    const [first, second] = prioritize([half, full]);
    expect(first?.finding.ruleId).toBe("full");
    expect(second?.finding.ruleId).toBe("half");
    expect(first?.scoreGain).toBeGreaterThan(second?.scoreGain ?? 0);
  });

  it("breaks a score-gain tie by autofixable-first", () => {
    // QA-TEST-001 (focused test) is autofix: true in the real registry;
    // pick a same-severity, non-autofixable rule ID to compare against.
    const autofix = finding({ ruleId: "QA-TEST-001", severity: "error" });
    const manual = finding({ ruleId: "QA-TQUAL-002", severity: "error" });
    const [first] = prioritize([manual, autofix]);
    expect(first?.finding.ruleId).toBe("QA-TEST-001");
    expect(first?.autofixable).toBe(true);
  });

  it("is deterministic for identical input regardless of array order", () => {
    const a = finding({
      ruleId: "a",
      file: "a.ts",
      line: 1,
      severity: "error",
    });
    const b = finding({
      ruleId: "b",
      file: "b.ts",
      line: 1,
      severity: "error",
    });
    const order1 = prioritize([a, b]).map((p) => p.finding.ruleId);
    const order2 = prioritize([b, a]).map((p) => p.finding.ruleId);
    expect(order1).toEqual(order2);
  });

  it("returns an empty array for no findings", () => {
    expect(prioritize([])).toEqual([]);
  });
});

describe("topFixes", () => {
  it("returns at most N entries", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      finding({ ruleId: `r${i}`, line: i + 1, severity: "error" }),
    );
    expect(topFixes(findings, 3)).toHaveLength(3);
  });

  it("excludes zero-score-gain (advisory) findings even within the top N", () => {
    const advisory = finding({
      findingType: "observation",
      evidenceLevel: "E0",
      severity: "error",
    });
    expect(topFixes([advisory], 3)).toHaveLength(0);
  });

  it("defaults to 3 when n is omitted", () => {
    const findings = Array.from({ length: 5 }, (_, i) =>
      finding({ ruleId: `r${i}`, line: i + 1, severity: "error" }),
    );
    expect(topFixes(findings)).toHaveLength(3);
  });
});

describe("terminal FIX THIS FIRST section (display-only)", () => {
  function result(findings: Finding[]): ScanResult {
    return {
      schemaVersion: 1,
      partial: false,
      score: 90,
      frameworks: ["vitest"],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
  }

  it("renders the section with score-gain and location per entry", () => {
    const out = renderTerminal(result([finding({ severity: "error" })]), {
      isTTY: false,
    });
    expect(out).toContain("FIX THIS FIRST");
    expect(out).toContain("pt");
    expect(out).toContain("QA-TEST-001");
  });

  it("marks autofix-eligible findings", () => {
    const out = renderTerminal(
      result([finding({ ruleId: "QA-TEST-001", severity: "error" })]),
      { isTTY: false },
    );
    expect(out).toContain("[autofix available]");
  });

  it("omits the section entirely when there is nothing worth fixing", () => {
    const out = renderTerminal(result([]), { isTTY: false });
    expect(out).not.toContain("FIX THIS FIRST");
  });
});
