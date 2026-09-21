import { describe, expect, it } from "vitest";
import {
  validateForensicsSchema,
  isCompatibleForensicsSchema,
} from "../../src/forensics/schema-validation.js";
import { FORENSICS_SCHEMA_VERSION } from "../../src/forensics/types.js";
import type { ForensicsReport } from "../../src/forensics/types.js";

function validReport(): ForensicsReport {
  return {
    forensicsSchemaVersion: 1,
    source: "playwright-json",
    totalTests: 5,
    failed: 1,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 1234,
    verdicts: [],
    analysisComplete: true,
    skippedReports: 0,
    incompleteReasons: [],
  };
}

describe("FORENSICS_SCHEMA_VERSION", () => {
  it("is defined and equals 1", () => {
    expect(FORENSICS_SCHEMA_VERSION).toBe(1);
  });

  it("is a const literal type", () => {
    expect(typeof FORENSICS_SCHEMA_VERSION).toBe("number");
  });
});

describe("validateForensicsSchema", () => {
  it("accepts a valid report", () => {
    const result = validateForensicsSchema(validReport());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects null input", () => {
    const result = validateForensicsSchema(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("report is not a non-null object");
  });

  it("rejects array input", () => {
    const result = validateForensicsSchema([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("report is not a non-null object");
  });

  it("rejects primitive input", () => {
    const result = validateForensicsSchema("hello");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("report is not a non-null object");
  });

  it("reports missing forensicsSchemaVersion", () => {
    const report = { ...validReport() };
    delete (report as Record<string, unknown>)["forensicsSchemaVersion"];
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("forensicsSchemaVersion is missing");
  });

  it("reports wrong forensicsSchemaVersion type", () => {
    const report = { ...validReport(), forensicsSchemaVersion: "1" };
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) =>
        e.includes("forensicsSchemaVersion must be a number"),
      ),
    ).toBe(true);
  });

  it("reports incompatible forensicsSchemaVersion", () => {
    const report = { ...validReport(), forensicsSchemaVersion: 99 };
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes("forensicsSchemaVersion is 99")),
    ).toBe(true);
  });

  it("reports missing source", () => {
    const report = { ...validReport() };
    delete (report as Record<string, unknown>)["source"];
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("source"))).toBe(true);
  });

  it("reports missing totalTests", () => {
    const report = { ...validReport() };
    delete (report as Record<string, unknown>)["totalTests"];
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("totalTests"))).toBe(true);
  });

  it("reports missing verdicts array", () => {
    const report = { ...validReport() };
    delete (report as Record<string, unknown>)["verdicts"];
    const result = validateForensicsSchema(report);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("verdicts"))).toBe(true);
  });

  it("reports multiple errors at once", () => {
    const result = validateForensicsSchema({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(5);
  });

  it("stamps forensicsSchemaVersion on analyze output", () => {
    const report = validReport();
    expect(report.forensicsSchemaVersion).toBe(FORENSICS_SCHEMA_VERSION);
  });
});

describe("isCompatibleForensicsSchema", () => {
  it("returns true for version 1", () => {
    expect(isCompatibleForensicsSchema(1)).toBe(true);
  });

  it("returns false for version 0", () => {
    expect(isCompatibleForensicsSchema(0)).toBe(false);
  });

  it("returns false for version 2", () => {
    expect(isCompatibleForensicsSchema(2)).toBe(false);
  });

  it("returns false for negative version", () => {
    expect(isCompatibleForensicsSchema(-1)).toBe(false);
  });

  it("returns false for NaN", () => {
    expect(isCompatibleForensicsSchema(NaN)).toBe(false);
  });
});
