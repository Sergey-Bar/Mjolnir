/**
 * SARIF v2.1.0 Compliance (ECO-008).
 *
 * Validation and mapping utilities for SARIF v2.1.0 output compliance.
 * Ensures QA Doctor's SARIF output conforms to the specification structure.
 *
 * @see https://json.schemastore.org/sarif-2.1.0.json
 */

import type { Finding } from "../types.js";

export const SARIF_SCHEMA_URL = "https://json.schemastore.org/sarif-2.1.0.json";

export const SARIF_VERSION = "2.1.0";

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note" | "none";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string };
      region: { startLine: number; startColumn: number };
    };
  }>;
}

interface SarifReportingDescriptor {
  id: string;
  shortDescription?: { text: string };
  helpUri?: string;
  properties?: Record<string, unknown>;
}

interface _SarifRun {
  tool: {
    driver: {
      name: string;
      version?: string;
      informationUri?: string;
      rules?: SarifReportingDescriptor[];
    };
  };
  results: SarifResult[];
}

export interface SarifValidationError {
  path: string;
  message: string;
}

/**
 * Validate a parsed JSON object against the SARIF v2.1.0 structure.
 * Returns an array of validation errors (empty = valid).
 */
export function validateSarifOutput(
  sarifJson: unknown,
): SarifValidationError[] {
  const errors: SarifValidationError[] = [];

  if (typeof sarifJson !== "object" || sarifJson === null) {
    return [{ path: "$", message: "root must be an object" }];
  }

  const root = sarifJson as Record<string, unknown>;

  if (root["$schema"] !== SARIF_SCHEMA_URL) {
    errors.push({
      path: "$.$schema",
      message: `expected "${SARIF_SCHEMA_URL}"`,
    });
  }

  if (root["version"] !== SARIF_VERSION) {
    errors.push({
      path: "$.version",
      message: `expected "${SARIF_VERSION}"`,
    });
  }

  if (!Array.isArray(root["runs"])) {
    errors.push({ path: "$.runs", message: "must be an array" });
    return errors;
  }

  for (let i = 0; i < root["runs"].length; i++) {
    const run = root["runs"][i] as Record<string, unknown>;
    const prefix = `$.runs[${i}]`;

    if (typeof run !== "object" || run === null) {
      errors.push({ path: prefix, message: "must be an object" });
      continue;
    }

    const tool = run["tool"] as Record<string, unknown> | undefined;
    if (typeof tool !== "object" || tool === null) {
      errors.push({ path: `${prefix}.tool`, message: "must be an object" });
      continue;
    }

    const driver = tool["driver"] as Record<string, unknown> | undefined;
    if (typeof driver !== "object" || driver === null) {
      errors.push({
        path: `${prefix}.tool.driver`,
        message: "must be an object",
      });
      continue;
    }

    if (typeof driver["name"] !== "string") {
      errors.push({
        path: `${prefix}.tool.driver.name`,
        message: "must be a string",
      });
    }

    if (!Array.isArray(run["results"])) {
      errors.push({ path: `${prefix}.results`, message: "must be an array" });
      continue;
    }

    for (let j = 0; j < run["results"].length; j++) {
      const result = run["results"][j] as Record<string, unknown>;
      const rPrefix = `${prefix}.results[${j}]`;

      if (typeof result["ruleId"] !== "string") {
        errors.push({
          path: `${rPrefix}.ruleId`,
          message: "must be a string",
        });
      }

      const validLevels = ["error", "warning", "note", "none"];
      if (!validLevels.includes(result["level"] as string)) {
        errors.push({
          path: `${rPrefix}.level`,
          message: `must be one of: ${validLevels.join(", ")}`,
        });
      }

      const msg = result["message"] as Record<string, unknown> | undefined;
      if (
        typeof msg !== "object" ||
        msg === null ||
        typeof msg["text"] !== "string"
      ) {
        errors.push({
          path: `${rPrefix}.message.text`,
          message: "must be a string",
        });
      }

      if (!Array.isArray(result["locations"])) {
        errors.push({
          path: `${rPrefix}.locations`,
          message: "must be an array",
        });
      }
    }
  }

  return errors;
}

/**
 * Map a QA Doctor Finding to a SARIF result object.
 */
export function toSarifResult(finding: Finding): SarifResult {
  const level = sarifLevel(finding.severity);
  return {
    ruleId: finding.ruleId,
    level,
    message: {
      text: `${finding.message} — ${finding.why} Fix: ${finding.fix}`,
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.file },
          region: {
            startLine: Math.max(1, finding.line),
            startColumn: Math.max(1, finding.column),
          },
        },
      },
    ],
  };
}

/**
 * Map a rule to a SARIF reporting descriptor.
 */
export function toSarifReportingDescriptor(rule: {
  id: string;
  title?: string;
  docsUrl?: string;
  falsePositiveRisk?: string;
}): SarifReportingDescriptor {
  return {
    id: rule.id,
    ...(rule.title ? { shortDescription: { text: rule.title } } : {}),
    ...(rule.docsUrl ? { helpUri: rule.docsUrl } : {}),
    ...(rule.falsePositiveRisk
      ? { properties: { falsePositiveRisk: rule.falsePositiveRisk } }
      : {}),
  };
}

function sarifLevel(
  severity: Finding["severity"],
): "error" | "warning" | "note" {
  if (severity === "error") return "error";
  if (severity === "warning") return "warning";
  return "note";
}
