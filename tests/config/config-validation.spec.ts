import { describe, expect, it } from "vitest";
import {
  validateConfigSchema,
  MJOLNIR_CONFIG_SCHEMA,
} from "../../src/config/config-schema.js";

describe("MJOLNIR_CONFIG_SCHEMA", () => {
  it("exports a valid JSON Schema object", () => {
    expect(MJOLNIR_CONFIG_SCHEMA).toBeDefined();
    expect(MJOLNIR_CONFIG_SCHEMA.$schema).toBe(
      "http://json-schema.org/draft-07/schema#",
    );
  });

  it("defines gate enum", () => {
    const gate = MJOLNIR_CONFIG_SCHEMA.properties.gate;
    expect(gate.type).toBe("string");
    expect(gate.enum).toEqual(["advisory", "error", "warning"]);
  });

  it("defines exclude as string array", () => {
    const exclude = MJOLNIR_CONFIG_SCHEMA.properties.exclude;
    expect(exclude.type).toBe("array");
    expect(exclude.items.type).toBe("string");
  });

  it("defines severityOverrides as object with severity values", () => {
    const so = MJOLNIR_CONFIG_SCHEMA.properties.severityOverrides;
    expect(so.type).toBe("object");
    expect(so.additionalProperties.enum).toEqual(["error", "warning", "info"]);
  });

  it("defines ignore array with required ruleId and reason", () => {
    const ignore = MJOLNIR_CONFIG_SCHEMA.properties.ignore;
    expect(ignore.type).toBe("array");
    expect(ignore.items.required).toContain("ruleId");
    expect(ignore.items.required).toContain("reason");
  });

  it("defines plugins object", () => {
    const plugins = MJOLNIR_CONFIG_SCHEMA.properties.plugins;
    expect(plugins.type).toBe("object");
  });
});

describe("validateConfigSchema", () => {
  describe("valid configs", () => {
    it("accepts empty object (zero-config)", () => {
      const result = validateConfigSchema({});
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("accepts valid gate value", () => {
      const result = validateConfigSchema({ gate: "advisory" });
      expect(result.valid).toBe(true);
    });

    it("accepts gate 'error'", () => {
      expect(validateConfigSchema({ gate: "error" }).valid).toBe(true);
    });

    it("accepts gate 'warning'", () => {
      expect(validateConfigSchema({ gate: "warning" }).valid).toBe(true);
    });

    it("accepts valid exclude array", () => {
      const result = validateConfigSchema({ exclude: ["**/node_modules/**"] });
      expect(result.valid).toBe(true);
    });

    it("accepts valid severityOverrides", () => {
      const result = validateConfigSchema({
        severityOverrides: { "QA-TEST-001": "error" },
      });
      expect(result.valid).toBe(true);
    });

    it("accepts valid ignore entry", () => {
      const result = validateConfigSchema({
        ignore: [{ ruleId: "QA-TEST-001", reason: "known issue" }],
      });
      expect(result.valid).toBe(true);
    });

    it("accepts ignore entry with all optional fields", () => {
      const result = validateConfigSchema({
        ignore: [
          {
            ruleId: "QA-TEST-001",
            reason: "known issue",
            files: ["**/*.test.ts"],
            expires: "2026-12-31",
          },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it("accepts plugins object", () => {
      const result = validateConfigSchema({ plugins: { myPlugin: {} } });
      expect(result.valid).toBe(true);
    });

    it("accepts full valid config", () => {
      const result = validateConfigSchema({
        gate: "warning",
        exclude: ["dist/**"],
        severityOverrides: { "QA-PW-102": "info" },
        ignore: [
          {
            ruleId: "QA-TEST-001",
            reason: "flaky",
            files: ["tests/e2e/**"],
            expires: "2027-01-01",
          },
        ],
        plugins: {},
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("invalid configs", () => {
    it("rejects null", () => {
      const result = validateConfigSchema(null);
      expect(result.valid).toBe(false);
    });

    it("rejects array", () => {
      const result = validateConfigSchema([]);
      expect(result.valid).toBe(false);
    });

    it("rejects primitive", () => {
      const result = validateConfigSchema("hello");
      expect(result.valid).toBe(false);
    });

    it("rejects invalid gate value", () => {
      const result = validateConfigSchema({ gate: "strict" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("gate"))).toBe(true);
    });

    it("rejects non-string gate", () => {
      const result = validateConfigSchema({ gate: 42 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("gate"))).toBe(true);
    });

    it("rejects non-array exclude", () => {
      const result = validateConfigSchema({ exclude: "dist/**" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exclude"))).toBe(true);
    });

    it("rejects non-string exclude entries", () => {
      const result = validateConfigSchema({ exclude: [1, "dist/**"] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("exclude[0]"))).toBe(true);
    });

    it("rejects non-object severityOverrides", () => {
      const result = validateConfigSchema({ severityOverrides: "bad" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("severityOverrides"))).toBe(
        true,
      );
    });

    it("rejects invalid severity values", () => {
      const result = validateConfigSchema({
        severityOverrides: { "QA-TEST-001": "critical" },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("QA-TEST-001"))).toBe(true);
    });

    it("rejects non-array ignore", () => {
      const result = validateConfigSchema({ ignore: "bad" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("ignore"))).toBe(true);
    });

    it("rejects non-object ignore entry", () => {
      const result = validateConfigSchema({ ignore: ["bad"] });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("ignore[0]"))).toBe(true);
    });

    it("rejects ignore entry without ruleId", () => {
      const result = validateConfigSchema({
        ignore: [{ reason: "test" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("ruleId"))).toBe(true);
    });

    it("rejects ignore entry without reason", () => {
      const result = validateConfigSchema({
        ignore: [{ ruleId: "QA-TEST-001" }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("reason"))).toBe(true);
    });

    it("rejects ignore entry with non-string files", () => {
      const result = validateConfigSchema({
        ignore: [{ ruleId: "QA-TEST-001", reason: "test", files: [1] }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("files[0]"))).toBe(true);
    });

    it("rejects ignore entry with non-string expires", () => {
      const result = validateConfigSchema({
        ignore: [{ ruleId: "QA-TEST-001", reason: "test", expires: 123 }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("expires"))).toBe(true);
    });

    it("rejects ignore entry with unknown properties", () => {
      const result = validateConfigSchema({
        ignore: [{ ruleId: "QA-TEST-001", reason: "test", unknown: true }],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("unknown"))).toBe(true);
    });

    it("rejects non-object plugins", () => {
      const result = validateConfigSchema({ plugins: "bad" });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("plugins"))).toBe(true);
    });

    it("collects multiple errors", () => {
      const result = validateConfigSchema({
        gate: "bad",
        exclude: 42,
        ignore: "bad",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });
  });
});
