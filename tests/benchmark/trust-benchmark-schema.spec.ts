import { describe, expect, it } from "vitest";
import {
  type TrustClassification,
  type TrustBenchmarkEntry,
  type TrustBenchmarkDataset,
  TRUST_DIMENSION_KEYS,
  validateBenchmarkEntry,
  validateBenchmarkDataset,
} from "../../src/benchmark/trust-benchmark-schema.js";

const validClassification: TrustClassification = {
  measured: true,
  revisionFresh: true,
  coreTier: true,
  runtimeCorroborated: false,
  strongEvidence: true,
  highConfidence: true,
  lowFpRisk: true,
  hasAstPath: false,
  depthJustified: true,
  lowMeasuredFp: true,
  fixtureVerified: true,
};

const validEntry: TrustBenchmarkEntry = {
  ruleId: "QA-TEST-001",
  classification: validClassification,
};

const validDataset: TrustBenchmarkDataset = {
  version: 1,
  generatedAt: "2026-09-15T00:00:00Z",
  entries: [validEntry],
};

describe("trust benchmark schema (ENGINE-011)", () => {
  describe("TRUST_DIMENSION_KEYS", () => {
    it("contains exactly 11 dimensions", () => {
      expect(TRUST_DIMENSION_KEYS).toHaveLength(11);
    });

    it("includes all expected keys", () => {
      expect(TRUST_DIMENSION_KEYS).toContain("measured");
      expect(TRUST_DIMENSION_KEYS).toContain("revisionFresh");
      expect(TRUST_DIMENSION_KEYS).toContain("coreTier");
      expect(TRUST_DIMENSION_KEYS).toContain("runtimeCorroborated");
      expect(TRUST_DIMENSION_KEYS).toContain("strongEvidence");
      expect(TRUST_DIMENSION_KEYS).toContain("highConfidence");
      expect(TRUST_DIMENSION_KEYS).toContain("lowFpRisk");
      expect(TRUST_DIMENSION_KEYS).toContain("hasAstPath");
      expect(TRUST_DIMENSION_KEYS).toContain("depthJustified");
      expect(TRUST_DIMENSION_KEYS).toContain("lowMeasuredFp");
      expect(TRUST_DIMENSION_KEYS).toContain("fixtureVerified");
    });
  });

  describe("validateBenchmarkEntry", () => {
    it("accepts a valid entry with zero violations", () => {
      expect(validateBenchmarkEntry(validEntry, 0)).toHaveLength(0);
    });

    it("rejects missing ruleId", () => {
      const bad = { ...validEntry, ruleId: "" };
      const violations = validateBenchmarkEntry(bad, 0);
      expect(violations.some((v) => v.field === "ruleId")).toBe(true);
    });

    it("rejects non-boolean classification dimension", () => {
      const bad = {
        ...validEntry,
        classification: {
          ...validClassification,
          measured: "yes" as unknown as boolean,
        },
      };
      const violations = validateBenchmarkEntry(bad, 0);
      expect(violations.some((v) => v.field.includes("measured"))).toBe(true);
    });

    it("rejects missing classification object", () => {
      const bad = {
        ...validEntry,
        classification: null as unknown as TrustClassification,
      };
      const violations = validateBenchmarkEntry(bad, 0);
      expect(violations.some((v) => v.field === "classification")).toBe(true);
    });

    it("reports entryIndex in violations", () => {
      const bad = { ...validEntry, ruleId: "" };
      const violations = validateBenchmarkEntry(bad, 5);
      expect(violations[0]?.entryIndex).toBe(5);
    });

    it("validates all 11 dimension types", () => {
      for (const key of TRUST_DIMENSION_KEYS) {
        const bad = {
          ...validEntry,
          classification: {
            ...validClassification,
            [key]: 42 as unknown as boolean,
          },
        };
        const violations = validateBenchmarkEntry(bad, 0);
        expect(
          violations.some((v) => v.field.includes(key)),
          `dimension ${key} should be validated`,
        ).toBe(true);
      }
    });
  });

  describe("validateBenchmarkDataset", () => {
    it("accepts a valid dataset with zero violations", () => {
      expect(validateBenchmarkDataset(validDataset)).toHaveLength(0);
    });

    it("rejects invalid version", () => {
      const bad = { ...validDataset, version: 0 };
      const violations = validateBenchmarkDataset(bad);
      expect(violations.some((v) => v.field === "version")).toBe(true);
    });

    it("rejects missing generatedAt", () => {
      const bad = { ...validDataset, generatedAt: "" };
      const violations = validateBenchmarkDataset(bad);
      expect(violations.some((v) => v.field === "generatedAt")).toBe(true);
    });

    it("rejects non-array entries", () => {
      const bad = {
        ...validDataset,
        entries: "not-an-array" as unknown as TrustBenchmarkEntry[],
      };
      const violations = validateBenchmarkDataset(bad);
      expect(violations.some((v) => v.field === "entries")).toBe(true);
    });

    it("validates each entry in the dataset", () => {
      const bad = {
        ...validDataset,
        entries: [validEntry, { ...validEntry, ruleId: "" }],
      };
      const violations = validateBenchmarkDataset(bad);
      expect(violations.length).toBeGreaterThan(0);
    });

    it("accepts empty entries array", () => {
      const empty = { ...validDataset, entries: [] };
      expect(validateBenchmarkDataset(empty)).toHaveLength(0);
    });

    it("accepts an all-false classification", () => {
      const allFalse: TrustClassification = {
        measured: false,
        revisionFresh: false,
        coreTier: false,
        runtimeCorroborated: false,
        strongEvidence: false,
        highConfidence: false,
        lowFpRisk: false,
        hasAstPath: false,
        depthJustified: false,
        lowMeasuredFp: false,
        fixtureVerified: false,
      };
      const entry = { ...validEntry, classification: allFalse };
      const dataset = { ...validDataset, entries: [entry] };
      expect(validateBenchmarkDataset(dataset)).toHaveLength(0);
    });
  });
});
