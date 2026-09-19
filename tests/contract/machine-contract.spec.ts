/**
 * Machine Verification Contract tests (Contract D).
 *
 * `buildMachineContract()` in src/engine/machine-contract.ts is the
 * ONLY canonical projection from ScanResult to the machine-readable
 * contract. This file tests that projection.
 *
 * Laws tested here:
 *   1. Same ScanResult → same contract (determinism).
 *   2. Different ScanResult → different digest (fingerprinting).
 *   3. durationMs is EXCLUDED from the digest (byte-equality safe).
 *   4. E0 findings are advisory and reported at notice level.
 *   5. buildMachineContract is the sole projection — no reimplementation.
 */

import { describe, expect, it } from "vitest";

import {
  buildMachineContract,
  CONTRACT_VERSION,
  ANNOTATIONS_LIMIT,
  type MachineAnnotation,
} from "../../src/engine/machine-contract.js";
import {
  SCHEMA_VERSION,
  type Finding,
  type ScanResult,
  type TrustSummary,
} from "../../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "BLOCKS-RELEASE",
    evidenceLevel: "E2",
    file: "e2e/checkout.spec.ts",
    line: 1,
    column: 1,
    message: "test.only is committed",
    why: "Why it matters",
    fix: "How to fix",
    ...overrides,
  };
}

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    schemaVersion: SCHEMA_VERSION,
    partial: false,
    score: 95,
    frameworks: ["playwright"],
    frameworkDetectionUnknown: false,
    dimensions: [],
    findings: [],
    analysisStatus: {
      discovery: "complete",
      rules: "complete",
      skippedFiles: 0,
      durationMs: 1000,
    },
    ...overrides,
  };
}

describe("Machine Contract", () => {
  it("CONTRACT_VERSION is 1", () => {
    expect(CONTRACT_VERSION).toBe(1);
  });

  it("ANNOTATIONS_LIMIT is 50", () => {
    expect(ANNOTATIONS_LIMIT).toBe(50);
  });

  it("buildMachineContract() is the sole projection — exports from machine-contract.js", async () => {
    await import("../../src/engine/machine-contract.js").then((mod) => {
      expect(typeof mod.buildMachineContract).toBe("function");
    });
  });

  it("same ScanResult produces byte-identical contract", () => {
    const findings = [makeFinding({ ruleId: "QA-TEST-001" })];
    const result = makeScanResult({ findings });
    const contract1 = buildMachineContract(result);
    const contract2 = buildMachineContract(result);
    expect(JSON.stringify(contract1)).toBe(JSON.stringify(contract2));
  });

  it("different findings produce different digests", () => {
    const result1 = makeScanResult({
      findings: [makeFinding({ ruleId: "QA-TEST-001" })],
    });
    const result2 = makeScanResult({
      findings: [makeFinding({ ruleId: "QA-TEST-002" })],
    });
    const contract1 = buildMachineContract(result1);
    const contract2 = buildMachineContract(result2);
    expect(contract1.summary.digest).not.toBe(contract2.summary.digest);
  });

  it("different durations do NOT change the digest (byte-equality safe)", () => {
    const findings = [makeFinding({ ruleId: "QA-TEST-001" })];
    const result1 = makeScanResult({
      findings,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 1000,
      },
    });
    const result2 = makeScanResult({
      findings,
      analysisStatus: {
        discovery: "complete",
        rules: "complete",
        skippedFiles: 0,
        durationMs: 5000,
      },
    });
    const contract1 = buildMachineContract(result1);
    const contract2 = buildMachineContract(result2);
    expect(contract1.summary.digest).toBe(contract2.summary.digest);
  });

  it("contract has required top-level fields", () => {
    const result = makeScanResult();
    const contract = buildMachineContract(result);
    expect(contract.contractVersion).toBe(1);
    expect(contract.summary).toBeDefined();
    expect(contract.annotations).toBeDefined();
    expect(contract.annotationsTruncated).toBeDefined();
    expect(contract.completeness).toBeDefined();
  });

  it("summary contains correct counts", () => {
    const findings = [
      makeFinding({ ruleId: "QA-TEST-001", severity: "error" }),
      makeFinding({ ruleId: "QA-TEST-002", severity: "warning" }),
      makeFinding({ ruleId: "QA-TEST-003", severity: "info" }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(contract.summary.errors).toBe(1);
    expect(contract.summary.warnings).toBe(1);
    expect(contract.summary.infos).toBe(1);
    expect(contract.summary.findings).toBe(3);
    expect(contract.summary.score).toBe(95);
  });

  it("annotations are capped at ANNOTATIONS_LIMIT", () => {
    const findings: Finding[] = [];
    for (let i = 0; i < 60; i++) {
      findings.push(
        makeFinding({
          ruleId: `QA-TEST-${String(i).padStart(3, "0")}`,
          line: i + 1,
        }),
      );
    }
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(contract.annotations.length).toBe(ANNOTATIONS_LIMIT);
    expect(contract.annotationsTruncated).toBe(true);
  });

  it("E0 (advisory) findings are advisory and reported at notice level", () => {
    const findings = [
      makeFinding({
        ruleId: "QA-TEST-001",
        severity: "error",
        confidence: "low",
        evidenceLevel: "E0",
      }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    const annotation = contract.annotations[0] as MachineAnnotation;
    expect(annotation.advisory).toBe(true);
    expect(annotation.annotation_level).toBe("notice");
  });

  it("error findings are reported at failure level", () => {
    const findings = [
      makeFinding({ ruleId: "QA-TEST-001", severity: "error" }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(
      (contract.annotations[0] as MachineAnnotation).annotation_level,
    ).toBe("failure");
  });

  it("warning findings are reported at warning level", () => {
    const findings = [
      makeFinding({ ruleId: "QA-TEST-001", severity: "warning" }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(
      (contract.annotations[0] as MachineAnnotation).annotation_level,
    ).toBe("warning");
  });

  it("completeness accurately reflects the scan status", () => {
    const result = makeScanResult({
      partial: true,
      analysisStatus: {
        discovery: "partial",
        rules: "partial",
        skippedFiles: 5,
        durationMs: 500,
      },
    });
    const contract = buildMachineContract(result);
    expect(contract.completeness.partial).toBe(true);
    expect(contract.completeness.discovery).toBe("partial");
    expect(contract.completeness.rules).toBe("partial");
    expect(contract.completeness.skippedFiles).toBe(5);
    expect(contract.completeness.durationMs).toBe(500);
  });

  it("trustSummary is included when present on ScanResult", () => {
    const trustSummary: TrustSummary = {
      level: "L2",
      confidence: 0.95,
      evidenceCoverage: 0.9,
      inconclusiveRate: 0.1,
      provisionalRuleIds: [],
      ceilingReasons: [],
    };
    const result = makeScanResult({ trustSummary });
    const contract = buildMachineContract(result);
    expect(contract.trustSummary).toBeDefined();
    expect((contract.trustSummary as TrustSummary).level).toBe("L2");
  });

  it("trustSummary is absent when not on ScanResult", () => {
    const result = makeScanResult();
    const contract = buildMachineContract(result);
    expect(contract.trustSummary).toBeUndefined();
  });

  it("provenance (agenticProfile) is included when present on ScanResult", () => {
    const result = makeScanResult({
      agenticProfile: {
        testFiles: 10,
        generatedMarkedFiles: 2,
        codegenLikeFiles: 1,
        shareMarkedGenerated: 0.2,
        findingsInGeneratedFiles: 1,
        findingsInUnmarkedFiles: 4,
        note: "test",
      },
    });
    const contract = buildMachineContract(result);
    expect(contract.provenance).toBeDefined();
    expect(contract.provenance?.testFiles).toBe(10);
  });

  it("forensicVerdicts is included when present on ScanResult", () => {
    const result = makeScanResult({
      forensicVerdicts: {
        classifications: 3,
        byVerdict: { "likely-real-defect": 2, inconclusive: 1 },
        inconclusive: 1,
      },
    });
    const contract = buildMachineContract(result);
    expect(contract.forensicVerdicts).toBeDefined();
    expect(contract.forensicVerdicts?.classifications).toBe(3);
  });

  it("forensicVerdicts is absent when not on ScanResult", () => {
    const result = makeScanResult();
    const contract = buildMachineContract(result);
    expect(contract.forensicVerdicts).toBeUndefined();
  });

  it("annotations carry ruleId for machine identity", () => {
    const findings = [
      makeFinding({ ruleId: "QA-TEST-001", message: "test.only" }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect((contract.annotations[0] as MachineAnnotation).ruleId).toBe(
      "QA-TEST-001",
    );
    expect((contract.annotations[0] as MachineAnnotation).message).toBe(
      "QA-TEST-001: test.only",
    );
  });

  it("annotations carry detectorRevision when present", () => {
    const findings = [
      makeFinding({ ruleId: "QA-TEST-001", detectorRevision: 5 }),
    ];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(
      (contract.annotations[0] as MachineAnnotation).detectorRevision,
    ).toBe(5);
  });

  it("annotations omit detectorRevision when absent", () => {
    const findings = [makeFinding({ ruleId: "QA-TEST-001" })];
    const result = makeScanResult({ findings });
    const contract = buildMachineContract(result);
    expect(
      (contract.annotations[0] as MachineAnnotation).detectorRevision,
    ).toBeUndefined();
  });
});
