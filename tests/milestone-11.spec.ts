/* eslint-disable */
import { describe, it, expect } from "vitest";
import {
  verifyMachineContract,
  renderContractVerification,
} from "../src/engine/machine-contract-verification.js";
import { buildMachineContract } from "../src/engine/machine-contract.js";

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

    const verification = verifyMachineContract(
      result,
      buildMachineContract(result),
    );
    expect(verification.passed).toBe(true);
    expect(verification.digestMatch).toBe(true);
  });

  it("verifies a freshly built contract by default", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
    } as any;

    expect(verifyMachineContract(result).passed).toBe(true);
  });

  it("rejects an unsupported contract version", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
    } as any;
    const contract = buildMachineContract(result);
    (contract as { contractVersion: number }).contractVersion = 2;

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.contractVersion).toBe(2);
    expect(verification.violations).toContain("Unsupported contract version 2");
  });

  it("rejects forged summary counts", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
    } as any;
    const contract = buildMachineContract(result);
    contract.summary.findings = 99;

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.summaryMatch).toBe(false);
    expect(verification.violations).toContain(
      "Machine contract summary mismatch",
    );
  });

  it("rejects a contract with a corrupted digest", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete" as const,
        rules: "complete" as const,
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
    } as any;
    const contract = buildMachineContract(result);
    contract.summary.digest = "sha256:corrupted";

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.digestMatch).toBe(false);
    expect(verification.violations).toContain(
      "Machine contract digest mismatch",
    );
  });

  it("rejects a contract with a corrupted trust summary", () => {
    const trustSummary = {
      level: "L2" as const,
      confidence: 0.8,
      evidenceCoverage: 1,
      inconclusiveRate: 0,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
      trustSummary,
    } as any;
    const contract = buildMachineContract(result);
    contract.trustSummary = { ...trustSummary, confidence: 0.1 };

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.trustSummaryMatch).toBe(false);
    expect(verification.violations).toContain("Trust summary mismatch");
    expect(renderContractVerification(verification)).toContain("Violations:");
  });

  it("rejects annotations that do not match scan findings", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      dimensions: [],
      findings: [
        {
          ruleId: "QA-TEST-001",
          category: "QA-TEST",
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          evidenceLevel: "E1",
          file: "test.spec.ts",
          line: 1,
          column: 1,
          message: "Test uses .only",
          why: "Why",
          fix: "Fix",
        },
      ],
    } as any;
    const contract = buildMachineContract(result);
    const annotation = contract.annotations[0];
    if (!annotation) throw new Error("expected annotation");
    annotation.path = "other.spec.ts";

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.annotationsMatch).toBe(false);
    expect(verification.violations).toContain("Annotation projection mismatch");
  });

  it("rejects a finding without source coordinates", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      dimensions: [],
      findings: [
        {
          ruleId: "QA-TEST-001",
          category: "QA-TEST",
          severity: "warning",
          confidence: "medium",
          findingType: "heuristic-risk",
          qaImpact: "HYGIENE",
          evidenceLevel: "E1",
          file: "test.spec.ts",
          column: 1,
          message: "Missing line",
          why: "Why",
          fix: "Fix",
        },
      ],
    } as any;
    const contract = buildMachineContract(result);

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.evidenceIntegrity).toBe(false);
    expect(verification.violations).toContain(
      "Evidence integrity check failed",
    );
  });

  it("rejects a completeness block with a forged partial state", () => {
    const result = {
      schemaVersion: 1,
      score: 85,
      partial: false,
      frameworks: [],
      frameworkDetectionUnknown: false,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
      findings: [],
      dimensions: [],
    } as any;
    const contract = buildMachineContract(result);
    contract.completeness.partial = true;

    const verification = verifyMachineContract(result, contract);

    expect(verification.passed).toBe(false);
    expect(verification.completenessCheck).toContain("Partial flag mismatch");
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

    const verification = verifyMachineContract(
      result,
      buildMachineContract(result),
    );
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

    const verification = verifyMachineContract(
      result,
      buildMachineContract(result),
    );
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

    const verification = verifyMachineContract(
      result,
      buildMachineContract(result),
    );
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

    const verification = verifyMachineContract(
      result,
      buildMachineContract(result),
    );
    expect(verification.passed).toBe(true);
  });
});
