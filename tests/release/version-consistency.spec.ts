import { describe, expect, it } from "vitest";
import {
  isValidSemver,
  checkVersionConsistency,
} from "../../src/release/version-consistency.js";

describe("version-consistency (SUPPLY-003)", () => {
  describe("isValidSemver", () => {
    it("accepts standard semver", () => {
      expect(isValidSemver("1.0.0")).toBe(true);
      expect(isValidSemver("0.1.2")).toBe(true);
      expect(isValidSemver("10.20.30")).toBe(true);
    });

    it("accepts prerelease versions", () => {
      expect(isValidSemver("1.0.0-alpha.1")).toBe(true);
      expect(isValidSemver("2.0.0-rc.1")).toBe(true);
    });

    it("accepts build metadata", () => {
      expect(isValidSemver("1.0.0+build.123")).toBe(true);
      expect(isValidSemver("1.0.0-beta+sha.abc123")).toBe(true);
    });

    it("rejects non-semver strings", () => {
      expect(isValidSemver("")).toBe(false);
      expect(isValidSemver("1.0")).toBe(false);
      expect(isValidSemver("v1.0.0")).toBe(false);
      expect(isValidSemver("1.0.0.0")).toBe(false);
      expect(isValidSemver("abc")).toBe(false);
    });
  });

  describe("checkVersionConsistency", () => {
    it("reports consistent when all sources match", () => {
      const result = checkVersionConsistency({
        "package.json": "1.0.10",
        engine: "1.0.10",
      });
      expect(result.consistent).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("reports violation when versions differ", () => {
      const result = checkVersionConsistency({
        "package.json": "1.0.10",
        engine: "1.0.9",
      });
      expect(result.consistent).toBe(false);
      expect(result.violations.some((v) => v.includes("mismatch"))).toBe(true);
    });

    it("reports non-semver versions as violations", () => {
      const result = checkVersionConsistency({
        "package.json": "1.0.10",
        engine: "dev",
      });
      expect(result.consistent).toBe(false);
      expect(
        result.violations.some((v) => v.includes("not valid semver")),
      ).toBe(true);
    });

    it("passes with a single source", () => {
      const result = checkVersionConsistency({
        "package.json": "2.0.0",
      });
      expect(result.consistent).toBe(true);
    });
  });
});
