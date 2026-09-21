import { describe, expect, it } from "vitest";
import {
  computeTarballHash,
  verifyTarballIntegrity,
  computePackageProvenance,
  verifyProvenance,
} from "../../src/release/pack-audit.js";

describe("pack-audit (SUPPLY-003)", () => {
  describe("computeTarballHash", () => {
    it("returns a hex string", () => {
      const hash = computeTarballHash(Buffer.from("hello"));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic for the same input", () => {
      const a = computeTarballHash(Buffer.from("test-data"));
      const b = computeTarballHash(Buffer.from("test-data"));
      expect(a).toBe(b);
    });

    it("differs for different inputs", () => {
      const a = computeTarballHash(Buffer.from("a"));
      const b = computeTarballHash(Buffer.from("b"));
      expect(a).not.toBe(b);
    });

    it("works with Uint8Array input", () => {
      const hash = computeTarballHash(new Uint8Array([1, 2, 3]));
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("verifyTarballIntegrity", () => {
    it("returns valid=true for matching hash", () => {
      const data = Buffer.from("integrity-test");
      const hash = computeTarballHash(data);
      const result = verifyTarballIntegrity(data, hash);
      expect(result.valid).toBe(true);
      expect(result.algorithm).toBe("sha256");
    });

    it("returns valid=false for mismatched hash", () => {
      const data = Buffer.from("integrity-test");
      const result = verifyTarballIntegrity(data, "0".repeat(64));
      expect(result.valid).toBe(false);
    });

    it("includes expected and actual hashes", () => {
      const data = Buffer.from("test");
      const result = verifyTarballIntegrity(data, "0".repeat(64));
      expect(result.expectedHash).toBe("0".repeat(64));
      expect(result.actualHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("computePackageProvenance", () => {
    it("creates provenance from metadata", () => {
      const p = computePackageProvenance({
        name: "mjolnir-qa",
        version: "1.0.0",
        integrity: "sha512-abc123",
        resolved:
          "https://registry.npmjs.org/mjolnir-qa/-/mjolnir-qa-1.0.0.tgz",
      });
      expect(p.name).toBe("mjolnir-qa");
      expect(p.version).toBe("1.0.0");
      expect(p.strongIntegrity).toBe(true);
    });

    it("marks non-sha512 integrity as not strong", () => {
      const p = computePackageProvenance({
        name: "pkg",
        version: "1.0.0",
        integrity: "sha256-abc",
      });
      expect(p.strongIntegrity).toBe(false);
    });

    it("handles missing optional fields", () => {
      const p = computePackageProvenance({ name: "pkg", version: "0.0.1" });
      expect(p.integrity).toBe("");
      expect(p.resolved).toBe("");
      expect(p.strongIntegrity).toBe(false);
    });
  });

  describe("verifyProvenance", () => {
    it("returns empty violations for matching provenance", () => {
      const actual = computePackageProvenance({ name: "a", version: "1.0.0" });
      const expected = computePackageProvenance({
        name: "a",
        version: "1.0.0",
      });
      expect(verifyProvenance(actual, expected)).toHaveLength(0);
    });

    it("reports name mismatch", () => {
      const actual = computePackageProvenance({ name: "a", version: "1.0.0" });
      const expected = computePackageProvenance({
        name: "b",
        version: "1.0.0",
      });
      const violations = verifyProvenance(actual, expected);
      expect(violations.some((v) => v.field === "name")).toBe(true);
    });

    it("reports version mismatch", () => {
      const actual = computePackageProvenance({ name: "a", version: "1.0.0" });
      const expected = computePackageProvenance({
        name: "a",
        version: "2.0.0",
      });
      const violations = verifyProvenance(actual, expected);
      expect(violations.some((v) => v.field === "version")).toBe(true);
    });

    it("reports integrity mismatch when both are present", () => {
      const actual = computePackageProvenance({
        name: "a",
        version: "1.0.0",
        integrity: "sha512-aaa",
      });
      const expected = computePackageProvenance({
        name: "a",
        version: "1.0.0",
        integrity: "sha512-bbb",
      });
      const violations = verifyProvenance(actual, expected);
      expect(violations.some((v) => v.field === "integrity")).toBe(true);
    });
  });
});
