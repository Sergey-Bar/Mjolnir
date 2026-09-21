/**
 * Release Artifact Integrity (SUPPLY-003).
 *
 * Provides tarball hash computation and verification, plus package
 * provenance checking for release artifacts. Ensures that distributed
 * artifacts haven't been tampered with between build and install.
 */

import { createHash } from "node:crypto";

export interface TarballIntegrityResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  algorithm: string;
}

/**
 * Compute SHA-256 hash of a tarball buffer.
 */
export function computeTarballHash(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Verify tarball integrity by comparing its hash against an expected value.
 */
export function verifyTarballIntegrity(
  data: Buffer | Uint8Array,
  expectedHash: string,
): TarballIntegrityResult {
  const actualHash = computeTarballHash(data);
  return {
    valid: actualHash === expectedHash,
    expectedHash,
    actualHash,
    algorithm: "sha256",
  };
}

export interface PackageProvenance {
  name: string;
  version: string;
  integrity: string;
  resolved: string;
  /** Whether the integrity hash algorithm is sha512 (npm standard). */
  strongIntegrity: boolean;
}

/**
 * Compute a provenance record from package metadata. This is the
 * "expected" state that lockfiles encode.
 */
export function computePackageProvenance(meta: {
  name: string;
  version: string;
  integrity?: string;
  resolved?: string;
}): PackageProvenance {
  return {
    name: meta.name,
    version: meta.version,
    integrity: meta.integrity ?? "",
    resolved: meta.resolved ?? "",
    strongIntegrity: (meta.integrity ?? "").startsWith("sha512-"),
  };
}

export interface ProvenanceViolation {
  field: string;
  message: string;
}

/**
 * Verify that a package's installed provenance matches its expected
 * lockfile provenance. Returns violations (empty = valid).
 */
export function verifyProvenance(
  actual: PackageProvenance,
  expected: PackageProvenance,
): ProvenanceViolation[] {
  const violations: ProvenanceViolation[] = [];

  if (actual.name !== expected.name) {
    violations.push({
      field: "name",
      message: `name mismatch: "${actual.name}" vs "${expected.name}"`,
    });
  }

  if (actual.version !== expected.version) {
    violations.push({
      field: "version",
      message: `version mismatch: "${actual.version}" vs "${expected.version}"`,
    });
  }

  if (
    expected.integrity &&
    actual.integrity &&
    actual.integrity !== expected.integrity
  ) {
    violations.push({
      field: "integrity",
      message: `integrity hash mismatch`,
    });
  }

  return violations;
}
