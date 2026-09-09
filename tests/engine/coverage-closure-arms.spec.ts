/**
 * Coverage-closure arms — final sweep (0.6.x). Each factory tolerates
 * explicitly-undefined stamps the way tests/engine/evidence-core.spec.ts
 * does (strip undefined before spread) so exactOptionalPropertyTypes
 * stays green while the fallback arms are actually exercised.
 */

import { describe, expect, it } from "vitest";

import {
  buildEvidenceRecords,
  findTestAt,
} from "../../src/engine/evidence-core.js";
import { buildTrustSummary } from "../../src/engine/trust-summary.js";
import { workflowRows } from "../../src/forensics/triage.js";
import { topFixes } from "../../src/scorer/prioritize.js";
import { renderTerminal } from "../../src/reporter/terminal.js";
import type {
  ForensicsReport,
  TestVerdict,
} from "../../src/forensics/types.js";
import type { Finding, ScanResult } from "../../src/types.js";

type VerdictOverrides = Partial<{
  [K in keyof TestVerdict]: K extends "line"
    ? number | undefined
    : TestVerdict[K];
}>;

function verdict(o: VerdictOverrides = {}): TestVerdict {
  const clean = Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<TestVerdict>;
  return {
    file: "e2e/a.spec.ts",
    title: "t",
    attempts: 1,
    finalStatus: "passed",
    totalDurationMs: 1,
    passedOnRetry: false,
    everFailed: false,
    skipped: false,
    ...clean,
  };
}

function report(verdicts: TestVerdict[]): ForensicsReport {
  return {
    source: "playwright-json",
    totalTests: verdicts.length,
    failed: 0,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 1,
    verdicts,
  };
}

type FindingOverrides = Partial<{
  [K in keyof Finding]: K extends "evidenceLevel" | "trustLevel"
    ? Finding[K] | undefined
    : Finding[K];
}>;

function finding(o: FindingOverrides = {}): Finding {
  const clean = Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<Finding>;
  return {
    ruleId: "QA-PW-004",
    category: "QA-PW",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "FLAKY-RISK",
    file: "e2e/a.spec.ts",
    line: 3,
    column: 1,
    message: "m",
    why: "w",
    fix: "f",
    ...clean,
  };
}

function scanOf(findings: Finding[]): ScanResult {
  return {
    schemaVersion: 1,
    partial: false,
    score: 90,
    frameworks: [],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings,
    testDeclarationCount: 10,
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1,
    },
  };
}

describe("evidence-core: comparator + findTestAt arms", () => {
  it("same file+line+title → the stable-0 final arm (no fabricated order)", () => {
    const recs = buildEvidenceRecords(
      report([verdict({ line: 5 }), verdict({ line: 5 })]),
      "x.json",
    );
    expect(recs).toHaveLength(2);
    expect(recs[0]).toEqual(recs[1]);
  });

  it("multi-file list: the continue arm skips a line-absent record", () => {
    const recs = buildEvidenceRecords(
      report([
        verdict({ file: "e2e/a.spec.ts", title: "first", line: 1 }),
        verdict({ file: "e2e/b.spec.ts", title: "other", line: undefined }),
        verdict({ file: "e2e/a.spec.ts", title: "second", line: 30 }),
      ]),
      "x.json",
    );
    expect(findTestAt(recs, "e2e/a.spec.ts", 50)?.title).toBe("second");
    expect(findTestAt(recs, "e2e/b.spec.ts", 50)).toBeUndefined();
  });
});

describe("trust-summary: evidenceMass fallback chain", () => {
  it("observation without a stamp → E0 → confidence 0", () => {
    const s = buildTrustSummary(
      scanOf([
        finding({
          evidenceLevel: undefined,
          findingType: "observation",
          trustLevel: undefined,
        }),
      ]),
      new Map(),
    );
    expect(s.confidence).toBe(0);
  });

  it("heuristic-risk without a stamp → E1 → composite 0.35", () => {
    const s = buildTrustSummary(
      scanOf([
        finding({
          evidenceLevel: undefined,
          findingType: "heuristic-risk",
          trustLevel: undefined,
        }),
      ]),
      new Map(),
    );
    expect(s.confidence).toBeCloseTo(0.35, 5);
  });

  it("low-confidence without a stamp → E1 → composite 0.35", () => {
    const s = buildTrustSummary(
      scanOf([
        finding({
          evidenceLevel: undefined,
          findingType: "deterministic-defect",
          confidence: "low",
          trustLevel: undefined,
        }),
      ]),
      new Map(),
    );
    expect(s.confidence).toBeCloseTo(0.35, 5);
  });

  it("advisory-only file backs nothing (the isAdvisoryFinding filter arm)", () => {
    const s = buildTrustSummary(
      scanOf([
        finding({
          evidenceLevel: "E0",
          findingType: "observation",
          trustLevel: undefined,
        }),
      ]),
      new Map([["e2e/a.spec.ts", 4]]),
    );
    expect(s.evidenceCoverage).toBe(0);
  });
});

describe("triage: duration tie-break", () => {
  it("equal flake/attempts → duration descending", () => {
    const rows = workflowRows(
      report([
        verdict({
          title: "slow",
          totalDurationMs: 9000,
          finalStatus: "failed",
          everFailed: true,
        }),
        verdict({
          title: "fast",
          totalDurationMs: 100,
          finalStatus: "failed",
          everFailed: true,
        }),
      ]),
    );
    expect(rows.map((r) => r.test)).toEqual(["slow", "fast"]);
  });
});

describe("prioritize: full-tie 0 keeps stable input order", () => {
  it("identical file+line+ruleId entries preserve input order", () => {
    const f: Finding = {
      ruleId: "QA-PW-004",
      category: "QA-PW",
      severity: "error",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      evidenceLevel: "E2",
      file: "e2e/a.spec.ts",
      line: 7,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    };
    const prioritized = topFixes([f, { ...f, column: 2 }], 2);
    expect(prioritized.map((p) => p.finding.column)).toEqual([1, 2]);
  });
});

describe("terminal: group-evidence wrap arm", () => {
  it("a long group header + evidence tag exceeds a narrow card → wrapped arm", () => {
    const f: Finding = {
      ruleId: "QA-PW-101-very-long-rule-group-header",
      category: "QA-PW",
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "FLAKY-RISK",
      evidenceLevel: "E2",
      measuredFpRate: 0.429,
      measuredFpN: 20,
      file: "e2e/a.spec.ts",
      line: 3,
      column: 1,
      message: "m",
      why: "w",
      fix: "f",
    };
    const f2: Finding = { ...f, line: 8, message: "m2" };
    const scan: ScanResult = {
      schemaVersion: 1,
      partial: false,
      score: 90,
      frameworks: ["playwright"],
      frameworkDetectionUnknown: false,
      dimensions: [],
      findings: [f, f2],
      testFileCount: 1,
      testDeclarationCount: 2,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1,
      },
    };
    const narrow = renderTerminal(scan, {
      isTTY: false,
      width: 60,
      ascii: true,
      verbose: true,
    });
    expect(narrow).toContain("QA-PW-101");
    expect(narrow).toContain("E2");
    const wide = renderTerminal(scan, {
      isTTY: false,
      width: 200,
      ascii: true,
      verbose: true,
    });
    expect(wide).toContain("QA-PW-101");
  });
});
