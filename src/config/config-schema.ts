/* eslint-disable security/detect-object-injection -- bracket access on validated config keys */
/**
 * Config schema validation (ENGINE-007).
 *
 * Lightweight recursive validator for mjolnir.config.json against
 * a structural schema. No external schema library — just the shapes
 * the engine actually consumes, validated deterministically.
 */

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_GATES = new Set(["advisory", "error", "warning"]);
const VALID_SEVERITIES = new Set(["error", "warning", "info"]);

/**
 * JSON Schema draft-07 for mjolnir.config.json. Kept as a reference
 * structure for documentation; the actual validation is done by
 * `validateConfigSchema` below which is type-aware and recursive.
 */
export const MJOLNIR_CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object" as const,
  properties: {
    gate: {
      type: "string" as const,
      enum: ["advisory", "error", "warning"],
    },
    exclude: {
      type: "array" as const,
      items: { type: "string" as const },
    },
    severityOverrides: {
      type: "object" as const,
      additionalProperties: {
        type: "string" as const,
        enum: ["error", "warning", "info"],
      },
    },
    ignore: {
      type: "array" as const,
      items: {
        type: "object" as const,
        required: ["ruleId", "reason"],
        properties: {
          ruleId: { type: "string" as const },
          reason: { type: "string" as const },
          files: {
            type: "array" as const,
            items: { type: "string" as const },
          },
          expires: { type: "string" as const },
        },
        additionalProperties: false,
      },
    },
    plugins: {
      type: "object" as const,
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

/**
 * Validates a config object against the structural schema.
 * Returns { valid: true } when the config is structurally sound,
 * or { valid: false, errors } listing each violation.
 */
export function validateConfigSchema(config: unknown): ConfigValidationResult {
  const errors: string[] = [];

  if (config === null || typeof config !== "object" || Array.isArray(config)) {
    return { valid: false, errors: ["config must be a non-null object"] };
  }

  const cfg = config as Record<string, unknown>;

  if (cfg["gate"] !== undefined) {
    if (typeof cfg["gate"] !== "string") {
      errors.push(`gate must be a string, got ${typeof cfg["gate"]}`);
    } else if (!VALID_GATES.has(cfg["gate"])) {
      errors.push(
        `gate must be one of advisory|error|warning, got "${cfg["gate"]}"`,
      );
    }
  }

  if (cfg["exclude"] !== undefined) {
    if (!Array.isArray(cfg["exclude"])) {
      errors.push(`exclude must be an array, got ${typeof cfg["exclude"]}`);
    } else {
      for (let i = 0; i < cfg["exclude"].length; i++) {
        if (typeof cfg["exclude"][i] !== "string") {
          errors.push(
            `exclude[${i}] must be a string, got ${typeof cfg["exclude"][i]}`,
          );
        }
      }
    }
  }

  if (cfg["severityOverrides"] !== undefined) {
    if (
      typeof cfg["severityOverrides"] !== "object" ||
      cfg["severityOverrides"] === null ||
      Array.isArray(cfg["severityOverrides"])
    ) {
      errors.push("severityOverrides must be an object");
    } else {
      for (const [key, value] of Object.entries(
        cfg["severityOverrides"] as Record<string, unknown>,
      )) {
        if (typeof value !== "string") {
          errors.push(
            `severityOverrides["${key}"] must be a string, got ${typeof value}`,
          );
        } else if (!VALID_SEVERITIES.has(value)) {
          errors.push(
            `severityOverrides["${key}"] must be one of error|warning|info, got "${value}"`,
          );
        }
      }
    }
  }

  if (cfg["ignore"] !== undefined) {
    if (!Array.isArray(cfg["ignore"])) {
      errors.push(`ignore must be an array, got ${typeof cfg["ignore"]}`);
    } else {
      for (let i = 0; i < cfg["ignore"].length; i++) {
        const entry = cfg["ignore"][i] as unknown;
        const prefix = `ignore[${i}]`;
        if (
          entry === null ||
          typeof entry !== "object" ||
          Array.isArray(entry)
        ) {
          errors.push(`${prefix} must be an object`);
          continue;
        }
        const ign = entry as Record<string, unknown>;
        if (typeof ign["ruleId"] !== "string" || ign["ruleId"] === "") {
          errors.push(`${prefix}.ruleId must be a non-empty string`);
        }
        if (typeof ign["reason"] !== "string" || ign["reason"] === "") {
          errors.push(`${prefix}.reason must be a non-empty string`);
        }
        if (ign["files"] !== undefined) {
          if (!Array.isArray(ign["files"])) {
            errors.push(`${prefix}.files must be an array`);
          } else {
            for (let j = 0; j < (ign["files"] as unknown[]).length; j++) {
              if (typeof (ign["files"] as unknown[])[j] !== "string") {
                errors.push(
                  `${prefix}.files[${j}] must be a string, got ${typeof (ign["files"] as unknown[])[j]}`,
                );
              }
            }
          }
        }
        if (
          ign["expires"] !== undefined &&
          typeof ign["expires"] !== "string"
        ) {
          errors.push(
            `${prefix}.expires must be a string, got ${typeof ign["expires"]}`,
          );
        }
        const allowedKeys = new Set(["ruleId", "reason", "files", "expires"]);
        for (const key of Object.keys(ign)) {
          if (!allowedKeys.has(key)) {
            errors.push(`${prefix} has unknown property "${key}"`);
          }
        }
      }
    }
  }

  if (cfg["plugins"] !== undefined) {
    if (cfg["plugins"] === null || typeof cfg["plugins"] !== "object") {
      errors.push("plugins must be an object or array");
    }
  }

  return { valid: errors.length === 0, errors };
}
