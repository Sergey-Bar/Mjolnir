import { describe, expect, it } from "vitest";
import {
  validateSarifOutput,
  toSarifResult,
  toSarifReportingDescriptor,
  SARIF_SCHEMA_URL,
  SARIF_VERSION,
} from "../../src/reporter/sarif-compliance.js";

describe("sarif-compliance (ECO-008)", () => {
  describe("constants", () => {
    it("SARIF_SCHEMA_URL points to schemastore", () => {
      expect(SARIF_SCHEMA_URL).toBe(
        "https://json.schemastore.org/sarif-2.1.0.json",
      );
    });

    it("SARIF_VERSION is 2.1.0", () => {
      expect(SARIF_VERSION).toBe("2.1.0");
    });
  });

  describe("validateSarifOutput", () => {
    it("passes for valid minimal SARIF", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: SARIF_VERSION,
        runs: [
          {
            tool: { driver: { name: "test" } },
            results: [],
          },
        ],
      };
      expect(validateSarifOutput(sarif)).toHaveLength(0);
    });

    it("rejects non-object root", () => {
      const errors = validateSarifOutput("not an object");
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.path).toBe("$");
    });

    it("rejects wrong schema URL", () => {
      const sarif = {
        $schema: "wrong",
        version: SARIF_VERSION,
        runs: [],
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path === "$.$schema")).toBe(true);
    });

    it("rejects wrong version", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: "1.0.0",
        runs: [],
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path === "$.version")).toBe(true);
    });

    it("rejects non-array runs", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: SARIF_VERSION,
        runs: "not-array",
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path === "$.runs")).toBe(true);
    });

    it("validates result entries", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: SARIF_VERSION,
        runs: [
          {
            tool: { driver: { name: "test" } },
            results: [
              {
                ruleId: 123,
                level: "invalid",
                message: { text: "ok" },
                locations: [],
              },
            ],
          },
        ],
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path.includes("ruleId"))).toBe(true);
      expect(errors.some((e) => e.path.includes("level"))).toBe(true);
    });

    it("validates message.text is string", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: SARIF_VERSION,
        runs: [
          {
            tool: { driver: { name: "test" } },
            results: [
              {
                ruleId: "R1",
                level: "error",
                message: { text: 42 },
                locations: [],
              },
            ],
          },
        ],
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path.includes("message.text"))).toBe(true);
    });

    it("requires tool.driver.name", () => {
      const sarif = {
        $schema: SARIF_SCHEMA_URL,
        version: SARIF_VERSION,
        runs: [
          {
            tool: { driver: {} },
            results: [],
          },
        ],
      };
      const errors = validateSarifOutput(sarif);
      expect(errors.some((e) => e.path.includes("driver.name"))).toBe(true);
    });
  });

  describe("toSarifResult", () => {
    it("maps a finding to SARIF result", () => {
      const result = toSarifResult({
        ruleId: "QA-TEST-001",
        category: "QA-TEST",
        severity: "error",
        confidence: "high",
        findingType: "deterministic-defect",
        qaImpact: "BLOCKS-RELEASE",
        file: "test.spec.ts",
        line: 10,
        column: 5,
        message: "found issue",
        why: "because",
        fix: "fix it",
      });
      expect(result.ruleId).toBe("QA-TEST-001");
      expect(result.level).toBe("error");
      expect(result.message.text).toContain("found issue");
      expect(result.locations[0]?.physicalLocation.artifactLocation.uri).toBe(
        "test.spec.ts",
      );
      expect(result.locations[0]?.physicalLocation.region.startLine).toBe(10);
    });

    it("maps warning severity to warning level", () => {
      const result = toSarifResult({
        ruleId: "R1",
        category: "QA-TEST",
        severity: "warning",
        confidence: "medium",
        findingType: "heuristic-risk",
        qaImpact: "FLAKY-RISK",
        file: "f.ts",
        line: 1,
        column: 1,
        message: "msg",
        why: "w",
        fix: "f",
      });
      expect(result.level).toBe("warning");
    });

    it("maps info severity to note level", () => {
      const result = toSarifResult({
        ruleId: "R1",
        category: "QA-TEST",
        severity: "info",
        confidence: "low",
        findingType: "observation",
        qaImpact: "HYGIENE",
        file: "f.ts",
        line: 1,
        column: 1,
        message: "msg",
        why: "w",
        fix: "f",
      });
      expect(result.level).toBe("note");
    });

    it("clamps line and column to at least 1", () => {
      const result = toSarifResult({
        ruleId: "R1",
        category: "QA-TEST",
        severity: "info",
        confidence: "low",
        findingType: "observation",
        qaImpact: "HYGIENE",
        file: "f.ts",
        line: 0,
        column: 0,
        message: "m",
        why: "w",
        fix: "f",
      });
      expect(result.locations[0]?.physicalLocation.region.startLine).toBe(1);
      expect(result.locations[0]?.physicalLocation.region.startColumn).toBe(1);
    });
  });

  describe("toSarifReportingDescriptor", () => {
    it("maps a rule with all fields", () => {
      const desc = toSarifReportingDescriptor({
        id: "QA-TEST-001",
        title: "Test Rule",
        docsUrl: "https://example.com",
        falsePositiveRisk: "low",
      });
      expect(desc.id).toBe("QA-TEST-001");
      expect(desc.shortDescription?.text).toBe("Test Rule");
      expect(desc.helpUri).toBe("https://example.com");
      expect(desc.properties?.falsePositiveRisk).toBe("low");
    });

    it("omits optional fields when absent", () => {
      const desc = toSarifReportingDescriptor({ id: "R1" });
      expect(desc.id).toBe("R1");
      expect(desc.shortDescription).toBeUndefined();
      expect(desc.helpUri).toBeUndefined();
      expect(desc.properties).toBeUndefined();
    });
  });
});
