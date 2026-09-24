import { describe, expect, it } from "vitest";

import { buildMachineContract } from "../../src/engine/machine-contract.js";
import { verifyMachineContract } from "../../src/engine/machine-contract-verification.js";
import type { ScanResult } from "../../src/types.js";

const baseResult = {
  schemaVersion: 1,
  score: 100,
  partial: false,
  frameworks: ["vitest"],
  frameworkDetectionUnknown: false,
  dimensions: [],
  findings: [],
  analysisStatus: {
    discovery: "complete",
    rules: "complete",
    skippedFiles: 0,
    durationMs: 1,
  },
} as ScanResult;

describe("machine contract optional projections", () => {
  it("deep-compares provenance and forensic verdicts", () => {
    const result = {
      ...baseResult,
      agenticProfile: {
        testFiles: 2,
        generatedMarkedFiles: 1,
        codegenLikeFiles: 0,
        shareMarkedGenerated: 0.5,
        findingsInGeneratedFiles: 0,
        findingsInUnmarkedFiles: 0,
        note: "fixture",
      },
      forensicVerdicts: {
        classifications: 2,
        inconclusive: 0,
        byVerdict: { PROVEN: 1, DISPROVEN: 1 },
      },
    } as ScanResult;
    const contract = buildMachineContract(result);
    expect(verifyMachineContract(result, contract).passed).toBe(true);

    const originalProvenance = contract.provenance;
    const originalForensics = contract.forensicVerdicts;
    if (!originalProvenance || !originalForensics) {
      throw new Error("expected optional contract projections");
    }
    const provenanceTampered = structuredClone(contract);
    provenanceTampered.provenance = {
      ...originalProvenance,
      shareMarkedGenerated: 0.25,
    };
    const provenanceResult = verifyMachineContract(result, provenanceTampered);
    expect(provenanceResult.provenanceMatch).toBe(false);
    expect(provenanceResult.passed).toBe(false);

    const forensicTampered = structuredClone(contract);
    forensicTampered.forensicVerdicts = {
      ...originalForensics,
      classifications: 1,
    };
    const forensicResult = verifyMachineContract(result, forensicTampered);
    expect(forensicResult.forensicVerdictsMatch).toBe(false);
    expect(forensicResult.passed).toBe(false);
  });
});
