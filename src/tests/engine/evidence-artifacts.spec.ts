import { describe, expect, it } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  validateArtifact,
  ingestArtifact,
  EVIDENCE_ARTIFACT_SCHEMA_VERSION,
  type EvidenceArtifact,
} from "../../src/engine/evidence-artifacts.js";

function tmpDir(): string {
  const dir = join(
    tmpdir(),
    `mjolnir-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function validArtifact(): EvidenceArtifact {
  return {
    schemaVersion: EVIDENCE_ARTIFACT_SCHEMA_VERSION,
    artifactType: "runtime-report",
    provider: "playwright",
    acquiredAt: new Date().toISOString(),
    repositoryIdentity: "owner/repo",
    contentFingerprint: "abc123",
    completeness: true,
    provenance: {
      source: "test-results/report.json",
      ingestedBy: "mjolnir.forensics",
    },
  };
}

describe("validateArtifact", () => {
  it("accepts a valid artifact", () => {
    const result = validateArtifact(validArtifact());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects wrong schema version", () => {
    const artifact = {
      ...validArtifact(),
      schemaVersion: 99,
    } as unknown as EvidenceArtifact;
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("schema version");
  });

  it("rejects empty provider", () => {
    const artifact = { ...validArtifact(), provider: "" };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("provider"))).toBe(true);
  });

  it("rejects invalid acquiredAt", () => {
    const artifact = { ...validArtifact(), acquiredAt: "not-a-date" };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("acquiredAt"))).toBe(true);
  });

  it("rejects empty repositoryIdentity", () => {
    const artifact = { ...validArtifact(), repositoryIdentity: "" };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("repositoryIdentity"))).toBe(
      true,
    );
  });

  it("rejects empty contentFingerprint", () => {
    const artifact = { ...validArtifact(), contentFingerprint: "" };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("contentFingerprint"))).toBe(
      true,
    );
  });

  it("rejects non-boolean completeness", () => {
    const artifact = {
      ...validArtifact(),
      completeness: "yes",
    } as unknown as EvidenceArtifact;
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("completeness"))).toBe(true);
  });

  it("rejects missing provenance", () => {
    const artifact = {
      ...validArtifact(),
      provenance: undefined,
    } as unknown as EvidenceArtifact;
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("provenance"))).toBe(true);
  });

  it("collects multiple errors", () => {
    const artifact = { ...validArtifact(), provider: "", acquiredAt: "" };
    const result = validateArtifact(artifact);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("ingestArtifact", () => {
  it("reads a valid artifact from disk", () => {
    const dir = tmpDir();
    try {
      const artifact = validArtifact();
      const path = join(dir, "artifact.json");
      writeFileSync(path, JSON.stringify(artifact), "utf8");
      const result = ingestArtifact(path);
      expect(result.schemaVersion).toBe(EVIDENCE_ARTIFACT_SCHEMA_VERSION);
      expect(result.provider).toBe("playwright");
      expect(result.contentFingerprint).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws on non-JSON content", () => {
    const dir = tmpDir();
    try {
      const path = join(dir, "bad.json");
      writeFileSync(path, "not json", "utf8");
      expect(() => ingestArtifact(path)).toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws on invalid artifact fields", () => {
    const dir = tmpDir();
    try {
      const path = join(dir, "invalid.json");
      writeFileSync(path, JSON.stringify({ schemaVersion: 99 }), "utf8");
      expect(() => ingestArtifact(path)).toThrow(/Invalid artifact/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("computes content fingerprint deterministically", () => {
    const dir = tmpDir();
    try {
      const artifact = validArtifact();
      const path = join(dir, "det.json");
      writeFileSync(path, JSON.stringify(artifact), "utf8");
      const r1 = ingestArtifact(path);
      const r2 = ingestArtifact(path);
      expect(r1.contentFingerprint).toBe(r2.contentFingerprint);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
