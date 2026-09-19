/**
 * Evidence Artifact Architecture (CI-001).
 *
 * Canonical artifact shape for runtime evidence provenance:
 * every piece of runtime evidence ingested by QA Doctor MUST carry
 * an artifact envelope — schema version, provider identity,
 * acquisition timestamp, content fingerprint, completeness flag,
 * and provenance chain. No network calls; local-only ingestion.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const EVIDENCE_ARTIFACT_SCHEMA_VERSION = 1 as const;

export type ArtifactType =
  "runtime-report" | "coverage-report" | "mutation-report" | "ci-provenance";

export interface EvidenceArtifact {
  schemaVersion: typeof EVIDENCE_ARTIFACT_SCHEMA_VERSION;
  artifactType: ArtifactType;
  provider: string;
  acquiredAt: string;
  repositoryIdentity: string;
  contentFingerprint: string;
  completeness: boolean;
  provenance: {
    source: string;
    ingestedBy: string;
  };
}

export interface ArtifactValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateArtifact(
  artifact: EvidenceArtifact,
): ArtifactValidationResult {
  const errors: string[] = [];

  const actualVersion: number = artifact.schemaVersion;
  if (actualVersion !== EVIDENCE_ARTIFACT_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schema version: ${actualVersion}. Expected ${EVIDENCE_ARTIFACT_SCHEMA_VERSION}.`,
    );
  }
  if (!artifact.provider || artifact.provider.trim().length === 0) {
    errors.push("provider must be a non-empty string.");
  }
  if (!artifact.acquiredAt || Number.isNaN(Date.parse(artifact.acquiredAt))) {
    errors.push("acquiredAt must be a valid ISO-8601 timestamp.");
  }
  if (
    !artifact.repositoryIdentity ||
    artifact.repositoryIdentity.trim().length === 0
  ) {
    errors.push("repositoryIdentity must be a non-empty string.");
  }
  if (
    !artifact.contentFingerprint ||
    artifact.contentFingerprint.trim().length === 0
  ) {
    errors.push("contentFingerprint must be a non-empty string.");
  }
  if (typeof artifact.completeness !== "boolean") {
    errors.push("completeness must be a boolean.");
  }
  if (!artifact.provenance) {
    errors.push("provenance is required.");
  } else {
    if (
      !artifact.provenance.source ||
      artifact.provenance.source.trim().length === 0
    ) {
      errors.push("provenance.source must be a non-empty string.");
    }
    if (
      !artifact.provenance.ingestedBy ||
      artifact.provenance.ingestedBy.trim().length === 0
    ) {
      errors.push("provenance.ingestedBy must be a non-empty string.");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function ingestArtifact(path: string, now?: string): EvidenceArtifact {
  const content = readFileSync(path, "utf8");
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`Artifact at ${path} is not a valid JSON object.`);
  }

  const obj = parsed as Record<string, unknown>;

  const fingerprint = createHash("sha256")
    .update(content, "utf8")
    .digest("hex");

  const artifact: EvidenceArtifact = {
    schemaVersion:
      typeof obj["schemaVersion"] === "number"
        ? (obj["schemaVersion"] as typeof EVIDENCE_ARTIFACT_SCHEMA_VERSION)
        : EVIDENCE_ARTIFACT_SCHEMA_VERSION,
    artifactType:
      typeof obj["artifactType"] === "string"
        ? (obj["artifactType"] as ArtifactType)
        : "runtime-report",
    provider: typeof obj["provider"] === "string" ? obj["provider"] : "unknown",
    acquiredAt:
      typeof obj["acquiredAt"] === "string"
        ? obj["acquiredAt"]
        : (now ?? new Date().toISOString()),
    repositoryIdentity:
      typeof obj["repositoryIdentity"] === "string"
        ? obj["repositoryIdentity"]
        : "unknown",
    contentFingerprint: fingerprint,
    completeness:
      typeof obj["completeness"] === "boolean" ? obj["completeness"] : false,
    provenance:
      typeof obj["provenance"] === "object" && obj["provenance"] !== null
        ? (obj["provenance"] as EvidenceArtifact["provenance"])
        : { source: path, ingestedBy: "qa-doctor.evidence-artifacts" },
  };

  const validation = validateArtifact(artifact);
  if (!validation.valid) {
    throw new Error(
      `Invalid artifact at ${path}: ${validation.errors.join("; ")}`,
    );
  }

  return artifact;
}
