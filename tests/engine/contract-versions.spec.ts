/**
 * Contract versions suite (VERSION-001).
 *
 * Locks: registry completeness (8 entries), identifier uniqueness,
 * version constant stability, composite contract format, and lookup
 * helper correctness.
 */

import { describe, expect, it } from "vitest";

import {
  CONTRACT_REGISTRY,
  TRUST_MODEL_VERSION,
  SCORING_MODEL_VERSION,
  FRAMEWORK_SUPPORT_MATRIX_VERSION,
  EVIDENCE_SCHEMA_VERSION,
  FORENSICS_SCHEMA_VERSION,
  getContractByIdentifier,
} from "../../src/engine/contract-versions.js";
import { ENGINE_VERSION } from "../../src/engine/version.js";
import { SCHEMA_VERSION } from "../../src/types.js";

describe("version constants", () => {
  it("TRUST_MODEL_VERSION is a semver string", () => {
    expect(TRUST_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("SCORING_MODEL_VERSION is a semver string", () => {
    expect(SCORING_MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("FRAMEWORK_SUPPORT_MATRIX_VERSION is a semver string", () => {
    expect(FRAMEWORK_SUPPORT_MATRIX_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("EVIDENCE_SCHEMA_VERSION is the version ADR 0015 set", () => {
    // Pinned, not "a positive integer". A test that accepts any integer
    // accepts the version this bump exists to reject: an artifact written by a
    // 1.x engine carries the assumption that no TRX source exists, and that
    // assumption has to be falsified by a number change or by nothing.
    expect(EVIDENCE_SCHEMA_VERSION).toBe(2);
    expect(Number.isInteger(EVIDENCE_SCHEMA_VERSION)).toBe(true);
  });

  it("FORENSICS_SCHEMA_VERSION is the version ADR 0015 set", () => {
    expect(FORENSICS_SCHEMA_VERSION).toBe(2);
    expect(Number.isInteger(FORENSICS_SCHEMA_VERSION)).toBe(true);
  });
});

describe("CONTRACT_REGISTRY", () => {
  it("contains exactly 8 entries", () => {
    expect(CONTRACT_REGISTRY).toHaveLength(8);
  });

  it("has unique identifiers", () => {
    const ids = CONTRACT_REGISTRY.map((c) => c.identifier);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has a non-empty description", () => {
    for (const c of CONTRACT_REGISTRY) {
      expect(c.description.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty compatibilityPolicy", () => {
    for (const c of CONTRACT_REGISTRY) {
      expect(c.compatibilityPolicy.length).toBeGreaterThan(0);
    }
  });

  it("engineVersion matches ENGINE_VERSION", () => {
    const entry = getContractByIdentifier("engineVersion");
    expect(entry).toBeDefined();
    expect(entry?.version).toBe(ENGINE_VERSION);
  });

  it("schemaVersion matches SCHEMA_VERSION", () => {
    const entry = getContractByIdentifier("schemaVersion");
    expect(entry).toBeDefined();
    expect(entry?.version).toBe(SCHEMA_VERSION);
  });

  it("contractVersion is a composite of engine + schema", () => {
    const entry = getContractByIdentifier("contractVersion");
    expect(entry).toBeDefined();
    expect(entry?.version).toBe(`${ENGINE_VERSION}+schema${SCHEMA_VERSION}`);
  });
});

describe("getContractByIdentifier", () => {
  it("returns the contract for a known identifier", () => {
    const c = getContractByIdentifier("trustModelVersion");
    expect(c).toBeDefined();
    expect(c?.version).toBe(TRUST_MODEL_VERSION);
  });

  it("returns undefined for an unknown identifier", () => {
    expect(getContractByIdentifier("nonexistent")).toBeUndefined();
    expect(getContractByIdentifier("")).toBeUndefined();
  });
});
