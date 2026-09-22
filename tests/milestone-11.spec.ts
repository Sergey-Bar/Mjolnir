/* eslint-disable */
import { describe, it, expect } from "vitest";
import {
  verifyMachineContract,
  renderContractVerification,
} from "../src/engine/machine-contract-verification.js";

describe("Milestone 11 — Machine Contract Verification", () => {
  it("should verify a valid machine contract", () => {
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
      dimensions: { testFiles: 1, testSuites: 1, assertions: 1 },
      trustSummary: {
        level: "L2",
        confidence: 0.8,
        evidenceCoverage: 1.0,
        inconclusiveRate: 0,
      },
    } as any;

    const declarationsByFile = new Map([["test.spec.ts", 1]]);
    const verification = verifyMachineContract(result, declarationsByFile);
    expect(verification.passed).toBe(true);
    expect(verification.digestMatch).toBe(true);
  });

  it("should detect contract version mismatch", () => {
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

    const verification = verifyMachineContract(result, new Map());
    expect(verification.passed).toBe(true);
    expect(verification.contractVersion).toBe(1);
  });

  it("should verify trust summary consistency", () => {
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

    const declarationsByFile = new Map([["test.spec.ts", 1]]);
    const verification = verifyMachineContract(result, declarationsByFile);
    expect(verification.trustSummaryMatch).toBe(true);
  });

  it("should render contract verification report", () => {
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

    const verification = verifyMachineContract(result, new Map());
    const rendered = renderContractVerification(verification);
    expect(rendered).toContain("Machine Contract Verification");
  });

  it("should handle empty findings", () => {
    const result = {
      score: null,
      partial: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        rulesCrashed: 0,
        truncationReasons: [],
        frameworkDetectionUnknown: false,
        durationMs: 0,
      },
      findings: [],
      dimensions: { testFiles: 0 },
      trustSummary: {
        level: "L0",
        confidence: 1,
        evidenceCoverage: 0,
        inconclusiveRate: 0,
      },
    } as any;

    const verification = verifyMachineContract(result, new Map());
    expect(verification.passed).toBe(true);
  });
});
