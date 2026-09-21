/**
 * Package Provenance Verification (SUPPLY-001).
 *
 * Checks npm provenance attestations for installed packages.
 * Provenance links a published package to its source commit and build
 * pipeline, providing supply-chain transparency.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ProvenanceInfo {
  packageName: string;
  version: string;
  registry: string;
  attestations: Attestation[];
  signatures: Signature[];
}

export interface Attestation {
  predicateType: string;
  predicateBuilderId?: string | undefined;
  sigstore?: boolean | undefined;
}

export interface Signature {
  keyid: string;
  sig: string;
}

interface PackageLockEntry {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  signatures?: Array<{ keyid: string; sig: string }>;
}

/**
 * Verify npm provenance attestation for an installed package directory.
 * Reads the package's _package.json from node_modules and checks for
 * provenance metadata (npm audit signatures, attestations).
 */
export function verifyProvenance(pkgDir: string): ProvenanceInfo {
  const pkgJsonPath = join(pkgDir, "package.json");
  let packageName = "";
  let version = "";
  let registry = "";

  if (existsSync(pkgJsonPath)) {
    try {
      const raw = readFileSync(pkgJsonPath, "utf8");
      const pkg = JSON.parse(raw) as Record<string, unknown>;
      packageName = typeof pkg["name"] === "string" ? pkg["name"] : "";
      version = typeof pkg["version"] === "string" ? pkg["version"] : "";
    } catch {
      // corrupt package.json — return empty provenance
    }
  }

  const attestations: Attestation[] = [];
  const signatures: Signature[] = [];

  // Check for npm provenance metadata in _integrity or _signatures
  const provenancePath = join(pkgDir, ".npm", "provenance.json");
  if (existsSync(provenancePath)) {
    try {
      const raw = readFileSync(provenancePath, "utf8");
      const prov = JSON.parse(raw) as Record<string, unknown>;
      if (typeof prov["predicateType"] === "string") {
        attestations.push({
          predicateType: prov["predicateType"],
          predicateBuilderId:
            typeof prov["predicateBuilderId"] === "string"
              ? prov["predicateBuilderId"]
              : undefined,
          sigstore: prov["sigstore"] === true,
        });
      }
    } catch {
      // corrupt provenance file — skip
    }
  }

  // Look for signature in node_modules/.package-lock.json
  const lockPath = join(pkgDir, "..", "..", ".package-lock.json");
  if (existsSync(lockPath)) {
    try {
      const raw = readFileSync(lockPath, "utf8");
      const lock = JSON.parse(raw) as Record<string, unknown>;
      const packages = lock["packages"] as
        Record<string, PackageLockEntry> | undefined;
      if (packages) {
        const key = `node_modules/${packageName}`;
        const entry = packages[key];
        if (entry?.signatures) {
          for (const sig of entry.signatures) {
            signatures.push({ keyid: sig.keyid, sig: sig.sig });
          }
        }
        if (entry?.resolved) {
          try {
            registry = new URL(entry.resolved).hostname;
          } catch {
            // invalid URL — leave empty
          }
        }
      }
    } catch {
      // corrupt lock file — skip
    }
  }

  return { packageName, version, registry, attestations, signatures };
}

/**
 * Quick check: does the package directory have any provenance
 * attestation or signature?
 */
export function hasProvenance(pkgDir: string): boolean {
  const info = verifyProvenance(pkgDir);
  return info.attestations.length > 0 || info.signatures.length > 0;
}
