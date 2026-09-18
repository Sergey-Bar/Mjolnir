/**
 * Versioned contract registry (VERSION-001).
 *
 * Single source of truth for every version constant the engine exposes
 * to consumers (run identity, evidence graph, machine contract).
 * Constants are `as const` — literal types flow into the identity
 * surface without widening.
 */

import { ENGINE_VERSION } from "./version.js";
import { SCHEMA_VERSION } from "../types.js";

export const TRUST_MODEL_VERSION = "1.0.0" as const;
export const SCORING_MODEL_VERSION = "1.0.0" as const;
export const FRAMEWORK_SUPPORT_MATRIX_VERSION = "1.0.0" as const;
export const EVIDENCE_SCHEMA_VERSION = 1 as const;
export const FORENSICS_SCHEMA_VERSION = 1 as const;

export interface VersionedContract {
  readonly identifier: string;
  readonly version: string | number;
  readonly description: string;
  readonly compatibilityPolicy: string;
}

export const CONTRACT_REGISTRY: readonly VersionedContract[] = [
  {
    identifier: "engineVersion",
    version: ENGINE_VERSION,
    description: "QA Doctor engine release version",
    compatibilityPolicy: "semver",
  },
  {
    identifier: "schemaVersion",
    version: SCHEMA_VERSION,
    description: "JSON contract schema version (ScanResult, Finding)",
    compatibilityPolicy: "additive-only",
  },
  {
    identifier: "contractVersion",
    version: `${ENGINE_VERSION}+schema${SCHEMA_VERSION}`,
    description: "Composite contract version binding engine + JSON schema",
    compatibilityPolicy: "additive-only",
  },
  {
    identifier: "trustModelVersion",
    version: TRUST_MODEL_VERSION,
    description: "Trust level derivation model version (L0–L5)",
    compatibilityPolicy: "semver + ADR required",
  },
  {
    identifier: "scoringModelVersion",
    version: SCORING_MODEL_VERSION,
    description: "Scoring formula and deduction model version",
    compatibilityPolicy: "semver + ADR required",
  },
  {
    identifier: "evidenceSchemaVersion",
    version: EVIDENCE_SCHEMA_VERSION,
    description: "Evidence artifact schema version",
    compatibilityPolicy: "version-bump",
  },
  {
    identifier: "forensicsSchemaVersion",
    version: FORENSICS_SCHEMA_VERSION,
    description: "Forensics report schema version",
    compatibilityPolicy: "version-bump",
  },
  {
    identifier: "frameworkSupportMatrixVersion",
    version: FRAMEWORK_SUPPORT_MATRIX_VERSION,
    description: "Framework detection and adapter support matrix version",
    compatibilityPolicy: "version-bump",
  },
] as const;

/**
 * Look up a versioned contract by its identifier string.
 * Returns `undefined` for unknown identifiers.
 */
export function getContractByIdentifier(
  identifier: string,
): VersionedContract | undefined {
  return CONTRACT_REGISTRY.find((c) => c.identifier === identifier);
}
