import { describe, expect, it } from "vitest";
import {
  FRAMEWORK_INVENTORY,
  getFrameworkById,
  getFrameworksByStatus,
  getFrameworksByMaturity,
  getFrameworksByType,
} from "../../src/frameworks/framework-inventory.js";

describe("framework inventory (GAP-001)", () => {
  describe("FRAMEWORK_INVENTORY", () => {
    it("contains all 14 frameworks", () => {
      expect(FRAMEWORK_INVENTORY).toHaveLength(14);
    });

    it("contains expected framework IDs", () => {
      const ids = FRAMEWORK_INVENTORY.map((f) => f.frameworkId);
      expect(ids).toEqual([
        "playwright",
        "jest",
        "vitest",
        "pytest",
        "junit",
        "nunit",
        "xunit",
        "cypress",
        "selenium",
        "testng",
        "github-actions",
        "azure-devops",
        "jenkins",
        "gitlab-ci",
      ]);
    });

    it("every entry has required fields", () => {
      for (const fw of FRAMEWORK_INVENTORY) {
        expect(fw.frameworkId).toBeTruthy();
        expect(fw.entityType).toBeTruthy();
        expect(fw.language).toBeTruthy();
        expect(fw.maturity).toBeTruthy();
        expect(fw.supportStatus).toBeTruthy();
        expect(fw.targetMaturity).toBeTruthy();
        expect(fw.targetSupportStatus).toBeTruthy();
        expect(Array.isArray(fw.validatedVersions)).toBe(true);
        expect(fw.keyGapForNextLevel).toBeTruthy();
      }
    });
  });

  describe("getFrameworkById", () => {
    it("returns framework for valid ID", () => {
      const fw = getFrameworkById("vitest");
      expect(fw).toBeDefined();
      expect(fw?.frameworkId).toBe("vitest");
      expect(fw?.entityType).toBe("TEST_FRAMEWORK");
      expect(fw?.language).toBe("TypeScript/JavaScript");
    });

    it("returns undefined for invalid ID", () => {
      const fw = getFrameworkById("nonexistent-framework");
      expect(fw).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      const fw = getFrameworkById("");
      expect(fw).toBeUndefined();
    });

    it("finds each framework in the inventory", () => {
      for (const expected of FRAMEWORK_INVENTORY) {
        const fw = getFrameworkById(expected.frameworkId);
        expect(fw).toBe(expected);
      }
    });
  });

  describe("getFrameworksByStatus", () => {
    it("filters by OFFICIAL_PARTIAL", () => {
      const fws = getFrameworksByStatus("OFFICIAL_PARTIAL");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.supportStatus).toBe("OFFICIAL_PARTIAL");
      }
    });

    it("filters by EXPERIMENTAL", () => {
      const fws = getFrameworksByStatus("EXPERIMENTAL");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.supportStatus).toBe("EXPERIMENTAL");
      }
    });

    it("filters by UNSUPPORTED", () => {
      const fws = getFrameworksByStatus("UNSUPPORTED");
      expect(fws).toHaveLength(1);
      expect(fws[0]?.frameworkId).toBe("gitlab-ci");
    });

    it("returns empty array for status with no matches", () => {
      const fws = getFrameworksByStatus("DEPRECATED");
      expect(fws).toHaveLength(0);
    });

    it("filters by DISCOVERED", () => {
      const fws = getFrameworksByStatus("DISCOVERED");
      expect(fws).toHaveLength(0);
    });
  });

  describe("getFrameworksByMaturity", () => {
    it("filters by F0", () => {
      const fws = getFrameworksByMaturity("F0");
      expect(fws).toHaveLength(1);
      expect(fws[0]?.frameworkId).toBe("gitlab-ci");
    });

    it("filters by F1", () => {
      const fws = getFrameworksByMaturity("F1");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.maturity).toBe("F1");
      }
    });

    it("filters by F2", () => {
      const fws = getFrameworksByMaturity("F2");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.maturity).toBe("F2");
      }
    });

    it("filters by F3", () => {
      const fws = getFrameworksByMaturity("F3");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.maturity).toBe("F3");
      }
    });

    it("filters by F4", () => {
      const fws = getFrameworksByMaturity("F4");
      expect(fws).toHaveLength(1);
      expect(fws[0]?.frameworkId).toBe("playwright");
    });

    it("returns empty for F5 maturity", () => {
      const fws = getFrameworksByMaturity("F5");
      expect(fws).toHaveLength(0);
    });
  });

  describe("getFrameworksByType", () => {
    it("filters TEST_FRAMEWORK", () => {
      const fws = getFrameworksByType("TEST_FRAMEWORK");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.entityType).toBe("TEST_FRAMEWORK");
      }
    });

    it("filters E2E_FRAMEWORK", () => {
      const fws = getFrameworksByType("E2E_FRAMEWORK");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.entityType).toBe("E2E_FRAMEWORK");
      }
    });

    it("filters AUTOMATION_LIBRARY", () => {
      const fws = getFrameworksByType("AUTOMATION_LIBRARY");
      expect(fws).toHaveLength(1);
      expect(fws[0]?.frameworkId).toBe("selenium");
    });

    it("filters CI_PROVIDER", () => {
      const fws = getFrameworksByType("CI_PROVIDER");
      expect(fws.length).toBeGreaterThan(0);
      for (const fw of fws) {
        expect(fw.entityType).toBe("CI_PROVIDER");
      }
    });
  });
});
