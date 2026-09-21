/**
 * Forensics schema validation (CI-010).
 *
 * Validates that a forensics report carries the expected schema version
 * and required structural fields. Used by consumers to verify
 * compatibility before interpreting report data.
 */

import { FORENSICS_SCHEMA_VERSION } from "./types.js";

const COMPATIBLE_VERSIONS: ReadonlySet<number> = new Set([
  FORENSICS_SCHEMA_VERSION,
]);

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates that a report object has the correct forensics schema version
 * and required structural fields. Returns { valid: true } for a healthy
 * report, or { valid: false, errors } listing each violation.
 */
export function validateForensicsSchema(
  report: unknown,
): SchemaValidationResult {
  const errors: string[] = [];

  if (report === null || typeof report !== "object" || Array.isArray(report)) {
    return { valid: false, errors: ["report is not a non-null object"] };
  }

  const r = report as Record<string, unknown>;

  if (r["forensicsSchemaVersion"] === undefined) {
    errors.push("forensicsSchemaVersion is missing");
  } else if (typeof r["forensicsSchemaVersion"] !== "number") {
    errors.push(
      `forensicsSchemaVersion must be a number, got ${typeof r["forensicsSchemaVersion"]}`,
    );
  } else if (r["forensicsSchemaVersion"] !== FORENSICS_SCHEMA_VERSION) {
    errors.push(
      `forensicsSchemaVersion is ${r["forensicsSchemaVersion"]}, expected ${FORENSICS_SCHEMA_VERSION}`,
    );
  }

  if (typeof r["source"] !== "string" || r["source"] === "") {
    errors.push("source is missing or not a non-empty string");
  }

  if (typeof r["totalTests"] !== "number") {
    errors.push("totalTests is missing or not a number");
  }

  if (typeof r["failed"] !== "number") {
    errors.push("failed is missing or not a number");
  }

  if (typeof r["skipped"] !== "number") {
    errors.push("skipped is missing or not a number");
  }

  if (typeof r["retriedTests"] !== "number") {
    errors.push("retriedTests is missing or not a number");
  }

  if (typeof r["flakyTests"] !== "number") {
    errors.push("flakyTests is missing or not a number");
  }

  if (typeof r["totalDurationMs"] !== "number") {
    errors.push("totalDurationMs is missing or not a number");
  }

  if (!Array.isArray(r["verdicts"])) {
    errors.push("verdicts is missing or not an array");
  }

  if (typeof r["analysisComplete"] !== "boolean") {
    errors.push("analysisComplete is missing or not a boolean");
  }

  if (typeof r["skippedReports"] !== "number") {
    errors.push("skippedReports is missing or not a number");
  }

  if (!Array.isArray(r["incompleteReasons"])) {
    errors.push("incompleteReasons is missing or not an array");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Returns true only when the given version is in the compatible set
 * (currently v1 only). Used for forward-compatibility checks before
 * attempting to interpret a report.
 */
export function isCompatibleForensicsSchema(version: number): boolean {
  return COMPATIBLE_VERSIONS.has(version);
}
