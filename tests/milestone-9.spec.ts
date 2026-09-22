import { describe, it, expect } from "vitest";
import {
  buildMachineContract,
  CONTRACT_VERSION,
  ANNOTATIONS_LIMIT,
  type MachineAnnotation,
  type MachineContract,
} from "../src/engine/machine-contract.js";
import {
  CONTRACT_REGISTRY,
  TRUST_MODEL_VERSION,
  SCORING_MODEL_VERSION,
  FRAMEWORK_SUPPORT_MATRIX_VERSION,
  EVIDENCE_SCHEMA_VERSION,
  FORENSICS_SCHEMA_VERSION,
  getContractByIdentifier,
  type VersionedContract,
} from "../src/engine/contract-versions.js";
import { ENGINE_VERSION } from "../src/engine/version.js";
import { SCHEMA_VERSION } from "../src/types.js";
import { contractStability } from "../src/rules/machine/qa-apm-001-contract-stability.js";
import type { Finding } from "../src/types.js";

type RuleFinding = Omit<Finding, "ruleId" | "category">;

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

function makeScanResult(overrides: Partial<{
  schemaVersion: number;
  partial: boolean;
  score: number | null;
  frameworks: string[];
  frameworkDetectionUnknown: boolean;
  dimensions: unknown[];
  findings: Finding[];
  analysisStatus: {
    discovery: "complete" | "partial";
    rules: "complete" | "partial";
    skippedFiles: number;
    rulesCrashed?: number;
    truncationReasons?: string[];
    durationMs: number;
  };
  trustSummary?: {
    level: string;
    confidence: number;
    evidenceCoverage: number;
    inconclusiveRate: number;
    provisionalRuleIds: string[];
    ceilingReasons: string[];
  };
  agenticProfile?: {
    testFiles: number;
    generatedMarkedFiles: number;
    codegenLikeFiles: number;
    shareMarkedGenerated: number;
    findingsInGeneratedFiles: number;
    findingsInUnmarkedFiles: number;
    note: string;
  };
  forensicVerdicts?: {
    classifications: number;
    byVerdict: Record<string, number>;
    inconclusive: number;
  };
}> = {}): {
  schemaVersion: number;
  partial: boolean;
  score: number | null;
  frameworks: string[];
  frameworkDetectionUnknown: boolean;
  dimensions: unknown[];
  findings: Finding[];
  analysisStatus: {
    discovery: "complete" | "partial";
    rules: "complete" | "partial";
    skippedFiles: number;
    rulesCrashed?: number;
    truncationReasons?: string[];
    durationMs: number;
  };
  trustSummary?: {
    level: string;
    confidence: number;
    evidenceCoverage: number;
    inconclusiveRate: number;
    provisionalRuleIds: string[];
    ceilingReasons: string[];
  };
  agenticProfile?: {
    testFiles: number;
    generatedMarkedFiles: number;
    codegenLikeFiles: number;
    shareMarkedGenerated: number;
    findingsInGeneratedFiles: number;
    findingsInUnmarkedFiles: number;
    note: string;
  };
  forensicVerdicts?: {
    classifications: number;
    byVerdict: Record<string, number>;
    inconclusive: number;
  };
} {
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

describe("M9: Public Contract Stability for Machine API", () => {
  describe("Machine Contract (Contract D)", () => {
    it("CONTRACT_VERSION is 1", () => {
      expect(CONTRACT_VERSION).toBe(1);
    });

    it("ANNOTATIONS_LIMIT is 50", () => {
      expect(ANNOTATIONS_LIMIT).toBe(50);
    });

    it("buildMachineContract is the sole projection", async () => {
      await import("../src/engine/machine-contract.js").then((mod) => {
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

    it("derives E0 consistently for unstamped observations", () => {
      const observation = makeFinding({
        findingType: "observation",
        severity: "error",
      });
      delete observation.evidenceLevel;
      const findings = [observation];
      const contract = buildMachineContract(makeScanResult({ findings }));
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
      const trustSummary = {
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
      expect((contract.trustSummary as typeof trustSummary).level).toBe("L2");
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

  describe("Contract Versions (VERSION-001)", () => {
    it("TRUST_MODEL_VERSION is a semver string", () => {
      expect(TRUST_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("SCORING_MODEL_VERSION is a semver string", () => {
      expect(SCORING_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("FRAMEWORK_SUPPORT_MATRIX_VERSION is a semver string", () => {
      expect(FRAMEWORK_SUPPORT_MATRIX_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("EVIDENCE_SCHEMA_VERSION is a positive integer", () => {
      expect(EVIDENCE_SCHEMA_VERSION).toBe(1);
      expect(Number.isInteger(EVIDENCE_SCHEMA_VERSION)).toBe(true);
    });

    it("FORENSICS_SCHEMA_VERSION is a positive integer", () => {
      expect(FORENSICS_SCHEMA_VERSION).toBe(1);
      expect(Number.isInteger(FORENSICS_SCHEMA_VERSION)).toBe(true);
    });

    it("CONTRACT_REGISTRY contains exactly 8 entries", () => {
      expect(CONTRACT_REGISTRY).toHaveLength(8);
    });

    it("CONTRACT_REGISTRY has unique identifiers", () => {
      const ids = CONTRACT_REGISTRY.map((c) => c.identifier);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every entry has a non-empty description", () => {
      for (const c of CONTRACT_REGISTRY) {
        expect(c.description.length).toBeGreaterThan(0);
      }
    });

    it("every entry has a non-empty compatibilityPolicy", () => {
      for (const c of CONTRACT_REGISTRY) {
        expect(c.compatibilityPolicy.length).toBeGreaterThan(0);
      }
    });

    it("engineVersion matches ENGINE_VERSION", () => {
      const entry = getContractByIdentifier("engineVersion");
      expect(entry).toBeDefined();
      expect(entry?.version).toBe(ENGINE_VERSION);
    });

    it("schemaVersion matches SCHEMA_VERSION", () => {
      const entry = getContractByIdentifier("schemaVersion");
      expect(entry).toBeDefined();
      expect(entry?.version).toBe(SCHEMA_VERSION);
    });

    it("contractVersion is a composite of engine + schema", () => {
      const entry = getContractByIdentifier("contractVersion");
      expect(entry).toBeDefined();
      expect(entry?.version).toBe(`${ENGINE_VERSION}+schema${SCHEMA_VERSION}`);
    });

    it("getContractByIdentifier returns the contract for a known identifier", () => {
      const c = getContractByIdentifier("trustModelVersion");
      expect(c).toBeDefined();
      expect(c?.version).toBe(TRUST_MODEL_VERSION);
    });

    it("getContractByIdentifier returns undefined for an unknown identifier", () => {
      expect(getContractByIdentifier("nonexistent")).toBeUndefined();
      expect(getContractByIdentifier("")).toBeUndefined();
    });

    it("contract identifiers are stable and known", () => {
      const expectedIdentifiers = [
        "engineVersion",
        "schemaVersion",
        "contractVersion",
        "trustModelVersion",
        "scoringModelVersion",
        "evidenceSchemaVersion",
        "forensicsSchemaVersion",
        "frameworkSupportMatrixVersion",
      ];
      const actualIdentifiers = CONTRACT_REGISTRY.map((c) => c.identifier).sort();
      expect(actualIdentifiers).toEqual(expectedIdentifiers.sort());
    });
  });

  describe("Contract Stability Rule (QA-APM-001)", () => {
    it("flags an unversioned machine API endpoint", () => {
      const text = `machine: { url: "https://api.example.com/endpoint" }`;
      const findings = contractStability.run({ path: "config.ts", text });
      expect(findings.some((f: RuleFinding) => f.message.includes("Unversioned"))).toBe(true);
    });

    it("does not flag a versioned machine API endpoint", () => {
      const text = `machine: { url: "https://api.example.com/v1/endpoint" }`;
      const findings = contractStability.run({ path: "config.ts", text });
      expect(findings.some((f: RuleFinding) => f.message.includes("Unversioned"))).toBe(false);
    });

    it("flags a mutable contract surface", () => {
      const text = `export contract interface MyContract { mutable: boolean }`;
      const findings = contractStability.run({ path: "contract.ts", text });
      expect(findings.some((f: RuleFinding) => f.message.includes("Mutable"))).toBe(true);
    });

    it("returns no findings for stable contract code", () => {
      const text = `export interface StableContract { readonly version: string }`;
      const findings = contractStability.run({ path: "contract.ts", text });
      expect(findings).toHaveLength(0);
    });

    it("QA-APM-001 rule has correct metadata", () => {
      expect(contractStability.id).toBe("QA-APM-001");
      expect(contractStability.category).toBe("QA-APM");
      expect(contractStability.title).toBe("Public contract stability for machine API");
      expect(contractStability.severity).toBe("warning");
      expect(contractStability.confidence).toBe("high");
      expect(contractStability.findingType).toBe("deterministic-defect");
      expect(contractStability.qaImpact).toBe("FLAKY-RISK");
      expect(contractStability.appliesTo).toBe("all");
      expect(contractStability.languages).toEqual(["typescript", "javascript"]);
      expect(contractStability.frameworks).toEqual(["mcp"]);
      expect(contractStability.falsePositiveRisk).toBe("low");
      expect(contractStability.autofix).toBe(false);
      expect(contractStability.detectionStrategy).toBe("LEXICAL");
      expect(contractStability.tier).toBe("quarantine");
    });

    it("contractStability rule has valid strategyJustification", () => {
      expect(contractStability.strategyJustification).toBeDefined();
      expect(contractStability.strategyJustification?.reasonCode).toBe("string-content-defect");
      expect(contractStability.strategyJustification?.detail.length).toBeGreaterThan(20);
    });
  });

  describe("Machine Contract JSON Schema Stability", () => {
    it("MachineContract JSON is deterministic", () => {
      const findings = [makeFinding({ ruleId: "QA-TEST-001" })];
      const result = makeScanResult({ findings });
      const contract1 = buildMachineContract(result);
      const contract2 = buildMachineContract(result);
      expect(JSON.stringify(contract1)).toBe(JSON.stringify(contract2));
    });

    it("MachineContract has correct schema fields", () => {
      const result = makeScanResult();
      const contract = buildMachineContract(result);
      expect(contract).toHaveProperty("contractVersion");
      expect(contract).toHaveProperty("summary");
      expect(contract).toHaveProperty("annotations");
      expect(contract).toHaveProperty("annotationsTruncated");
      expect(contract).toHaveProperty("completeness");
      expect(typeof contract.contractVersion).toBe("number");
      expect(typeof contract.annotationsTruncated).toBe("boolean");
    });

    it("summary digest is a SHA-256 hex string", () => {
      const result = makeScanResult();
      const contract = buildMachineContract(result);
      expect(contract.summary.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it("annotations have required fields", () => {
      const findings = [makeFinding({ ruleId: "QA-TEST-001" })];
      const result = makeScanResult({ findings });
      const contract = buildMachineContract(result);
      const annotation = contract.annotations[0] as MachineAnnotation;
      expect(annotation).toHaveProperty("path");
      expect(annotation).toHaveProperty("start_line");
      expect(annotation).toHaveProperty("annotation_level");
      expect(annotation).toHaveProperty("message");
      expect(annotation).toHaveProperty("ruleId");
      expect(annotation).toHaveProperty("advisory");
      expect(typeof annotation.start_line).toBe("number");
      expect(typeof annotation.advisory).toBe("boolean");
    });

    it("completeness has required fields", () => {
      const result = makeScanResult();
      const contract = buildMachineContract(result);
      expect(contract.completeness).toHaveProperty("partial");
      expect(contract.completeness).toHaveProperty("discovery");
      expect(contract.completeness).toHaveProperty("rules");
      expect(contract.completeness).toHaveProperty("skippedFiles");
      expect(contract.completeness).toHaveProperty("rulesCrashed");
      expect(contract.completeness).toHaveProperty("truncationReasons");
      expect(contract.completeness).toHaveProperty("frameworkDetectionUnknown");
      expect(contract.completeness).toHaveProperty("durationMs");
    });
  });
});