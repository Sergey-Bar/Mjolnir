/* eslint-disable */
import { describe, it, expect } from "vitest";
import {
  buildEvidenceGraphFromScan,
  queryFindingsByFile,
  queryFindingsByRule,
  computeEvidenceChain,
  renderEvidenceGraphResult,
} from "../src/engine/evidence-graph.js";
import { buildRunIdentity } from "../src/engine/run-identity.js";

describe("Milestone 13 — Evidence Graph and Provenance", () => {
  it("should build an evidence graph from a scan result", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [
        {
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test uses .only",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        },
      ],
      dimensions: { testFiles: 1 },
      trustSummary: {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1.0,
        inconclusiveRate: 0,
      },
    } as any;

    const graphResult = buildEvidenceGraphFromScan(
      result,
      runIdentity,
      new Map([["test.spec.ts", 1]]),
    );
    expect(graphResult.nodes.length).toBeGreaterThan(0);
    expect(graphResult.edges.length).toBeGreaterThan(0);
    expect(graphResult.agenticProfile).toBeDefined();
  });

  it("should query findings by file", () => {
    const _runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [
        {
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test uses .only",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        },
        {
          ruleId: "QA-TEST-002",
          detectorRevision: 1,
          file: "other.spec.ts",
          line: 5,
          column: 1,
          severity: "error" as const,
          evidenceLevel: "E2" as const,
          trustLevel: "L3" as const,
          confidence: "high" as const,
          findingType: "observation" as const,
          message: "Other finding",
          rootCauseId: "QA-TEST-002",
          fixGroupId: null,
        },
      ],
      dimensions: { testFiles: 1 },
      trustSummary: {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1.0,
        inconclusiveRate: 0,
      },
    } as any;

    const findings = queryFindingsByFile(result, "test.spec.ts");
    expect(findings.length).toBe(1);
    const firstFinding = findings[0];
    if (!firstFinding) throw new Error("expected a finding");
    expect(firstFinding.file).toBe("test.spec.ts");
  });

  it("should query findings by rule", () => {
    const _runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [
        {
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test uses .only",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        },
      ],
      dimensions: { testFiles: 1 },
      trustSummary: {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1.0,
        inconclusiveRate: 0,
      },
    } as any;

    const findings = queryFindingsByRule(result, "QA-TEST-001");
    expect(findings.length).toBe(1);
    const firstRuleFinding = findings[0];
    if (!firstRuleFinding) throw new Error("expected a finding");
    expect(firstRuleFinding.ruleId).toBe("QA-TEST-001");
  });

  it("should compute evidence chain for a finding", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const finding = {
      ruleId: "QA-TEST-001",
      detectorRevision: 1,
      file: "test.spec.ts",
      line: 1,
      column: 1,
      severity: "warning" as const,
      evidenceLevel: "E1" as const,
      trustLevel: "L2" as const,
      confidence: "medium" as const,
      findingType: "heuristic-risk" as const,
      message: "Test uses .only",
      rootCauseId: "QA-TEST-001",
      fixGroupId: null,
    } as any;

    const chain = computeEvidenceChain(finding, runIdentity);
    expect(chain.length).toBeGreaterThan(0);
    expect(chain[0]).toContain("QA-TEST-001");
  });

  it("should render evidence graph report", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [],
      dimensions: { testFiles: 1 },
      trustSummary: {
        level: "L0",
        confidence: 1,
        evidenceCoverage: 0,
        inconclusiveRate: 0,
      },
    } as any;

    const graphResult = buildEvidenceGraphFromScan(
      result,
      runIdentity,
      new Map(),
    );
    const rendered = renderEvidenceGraphResult(graphResult);
    expect(rendered).toContain("Evidence Graph Report");
  });

  it("should include agentic profile in evidence graph", () => {
    const runIdentity = buildRunIdentity({
      files: [{ path: "test.spec.ts", size: 100, hash: "abc" }],
      rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
      config: null,
      engineVersion: "2.0.0",
    });
    const result = {
      score: 85,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 1000,
      },
      findings: [
        {
          ruleId: "QA-TEST-001",
          detectorRevision: 1,
          file: "test.spec.ts",
          line: 1,
          column: 1,
          severity: "warning" as const,
          evidenceLevel: "E1" as const,
          trustLevel: "L2" as const,
          confidence: "medium" as const,
          findingType: "heuristic-risk" as const,
          message: "Test",
          rootCauseId: "QA-TEST-001",
          fixGroupId: null,
        },
      ],
      dimensions: { testFiles: 1 },
      trustSummary: {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1.0,
        inconclusiveRate: 0,
      },
    } as any;

    const graphResult = buildEvidenceGraphFromScan(
      result,
      runIdentity,
      new Map(),
    );
    expect(graphResult.agenticProfile).toBeDefined();
    expect(graphResult.agenticProfile.testFiles).toBe(1);
  });
});
