/**
 * Run Identity suite (IDENTITY-001).
 *
 * Locks: verdict-affecting inputs included in scanId, missing optional
 * fields don't break, identical semantic identity → identical results
 * (TI-015), suppression fingerprint changes modify identity (TI-017),
 * non-semantic metadata excluded from scanId.
 */

import { describe, expect, it } from "vitest";

import { buildRunIdentity } from "../../src/engine/run-identity.js";

const BASE_FILES = [
  { path: "src/foo.ts", size: 100, hash: "aaa" },
  { path: "src/bar.ts", size: 200, hash: "bbb" },
];

const BASE_RULES = [
  { id: "QA-001", detectorRevision: 1 },
  { id: "QA-002", detectorRevision: 2 },
];

const FULL_INPUT = {
  files: BASE_FILES,
  rules: BASE_RULES,
  config: { gate: "error" },
  engineVersion: "1.0.0",
  reportDigest: "deadbeef",
  trustModelVersion: "1.0.0",
  scoringModelVersion: "1.0.0",
  frameworkSupportMatrixVersion: "1.0.0",
  evidenceSchemaVersions: [1],
  suppressionFingerprint: "sup-hash",
  policyFingerprint: "pol-hash",
  historicalEvidenceFingerprint: "hist-hash",
};

describe("buildRunIdentity", () => {
  it("canonicalizes nested config key order", () => {
    const a = buildRunIdentity({
      ...FULL_INPUT,
      config: { a: 1, b: { c: 2, d: 3 } },
    });
    const b = buildRunIdentity({
      ...FULL_INPUT,
      config: { b: { d: 3, c: 2 }, a: 1 },
    });
    expect(a.scanId).toBe(b.scanId);
    expect(a.inputFingerprint).toBe(b.inputFingerprint);
  });

  it("returns deterministic scanId for identical inputs", () => {
    const a = buildRunIdentity(FULL_INPUT);
    const b = buildRunIdentity(FULL_INPUT);
    expect(a.scanId).toBe(b.scanId);
  });

  it("TI-015: identical semantic identity → identical results", () => {
    // Two inputs differing only in non-semantic field order (files sorted)
    const reorderedFiles = [BASE_FILES[1], BASE_FILES[0]].filter(
      (f): f is (typeof BASE_FILES)[number] => f !== undefined,
    );
    const a = buildRunIdentity({ ...FULL_INPUT });
    const b = buildRunIdentity({ ...FULL_INPUT, files: reorderedFiles });
    expect(a.scanId).toBe(b.scanId);
    expect(a.inputFingerprint).toBe(b.inputFingerprint);
  });

  describe("new verdict-affecting fields affect scanId", () => {
    it("trustModelVersion changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        trustModelVersion: "2.0.0",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("scoringModelVersion changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        scoringModelVersion: "2.0.0",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("frameworkSupportMatrixVersion changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        frameworkSupportMatrixVersion: "2.0.0",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("evidenceSchemaVersions changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        evidenceSchemaVersions: [2],
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("policyFingerprint changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        policyFingerprint: "different",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("TI-017: suppression fingerprint changes modify identity", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        suppressionFingerprint: "different-supp",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("historicalEvidenceFingerprint changes scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        historicalEvidenceFingerprint: "different-hist",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });
  });

  describe("missing optional fields don't break", () => {
    it("minimal input (only required fields)", () => {
      const result = buildRunIdentity({
        files: BASE_FILES,
        rules: BASE_RULES,
        config: null,
        engineVersion: "1.0.0",
      });
      expect(result.scanId).toMatch(/^[a-f0-9]{64}$/);
      expect(result.trustModelVersion).toBeUndefined();
      expect(result.scoringModelVersion).toBeUndefined();
      expect(result.frameworkSupportMatrixVersion).toBeUndefined();
    });

    it("partial new fields", () => {
      const result = buildRunIdentity({
        files: BASE_FILES,
        rules: BASE_RULES,
        config: null,
        engineVersion: "1.0.0",
        trustModelVersion: "1.0.0",
      });
      expect(result.scanId).toMatch(/^[a-f0-9]{64}$/);
      expect(result.trustModelVersion).toBe("1.0.0");
      expect(result.scoringModelVersion).toBeUndefined();
    });
  });

  describe("output includes new version fields when provided", () => {
    it("populates trustModelVersion, scoringModelVersion, frameworkSupportMatrixVersion", () => {
      const result = buildRunIdentity(FULL_INPUT);
      expect(result.trustModelVersion).toBe("1.0.0");
      expect(result.scoringModelVersion).toBe("1.0.0");
      expect(result.frameworkSupportMatrixVersion).toBe("1.0.0");
    });

    it("omits version fields when not provided", () => {
      const result = buildRunIdentity({
        files: BASE_FILES,
        rules: BASE_RULES,
        config: null,
        engineVersion: "1.0.0",
      });
      expect(result).not.toHaveProperty("trustModelVersion");
      expect(result).not.toHaveProperty("scoringModelVersion");
      expect(result).not.toHaveProperty("frameworkSupportMatrixVersion");
    });
  });

  describe("non-semantic metadata excluded", () => {
    it("evidenceSchemaVersions sorted — [1,2] same as [2,1]", () => {
      const a = buildRunIdentity({
        ...FULL_INPUT,
        evidenceSchemaVersions: [1, 2],
      });
      const b = buildRunIdentity({
        ...FULL_INPUT,
        evidenceSchemaVersions: [2, 1],
      });
      expect(a.scanId).toBe(b.scanId);
    });
  });

  describe("existing fields still work", () => {
    it("engineVersion affects scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        engineVersion: "2.0.0",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("reportDigest affects scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        reportDigest: "cafebabe",
      });
      expect(a.scanId).not.toBe(b.scanId);
    });

    it("config affects scanId", () => {
      const a = buildRunIdentity(FULL_INPUT);
      const b = buildRunIdentity({
        ...FULL_INPUT,
        config: { gate: "warning" },
      });
      expect(a.scanId).not.toBe(b.scanId);
    });
  });
});
