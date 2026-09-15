import { describe, expect, it } from "vitest";
import { generateSbom, validateSbom } from "../../src/release/sbom.js";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("sbom (SUPPLY-002)", () => {
  function createTempProject(deps: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "sbom-test-"));
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: "test-project",
        version: "1.0.0",
        dependencies: deps,
      }),
    );
    return dir;
  }

  describe("generateSbom", () => {
    it("generates SPDX format SBOM", () => {
      const root = createTempProject({ lodash: "^4.17.0" });
      const sbom = generateSbom(root, "spdx");
      expect(sbom.format).toBe("spdx");
      expect(sbom.name).toBe("test-project");
      expect(sbom.version).toBe("1.0.0");
      expect(sbom.entries.length).toBeGreaterThanOrEqual(1);
      expect(sbom.entries.some((e) => e.name === "lodash")).toBe(true);
    });

    it("generates CycloneDX format SBOM", () => {
      const root = createTempProject({});
      const sbom = generateSbom(root, "cyclonedx");
      expect(sbom.format).toBe("cyclonedx");
    });

    it("includes devDependencies", () => {
      const dir = mkdtempSync(join(tmpdir(), "sbom-dev-"));
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({
          name: "dev-test",
          version: "0.1.0",
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { vitest: "^1.0.0" },
        }),
      );
      const sbom = generateSbom(dir, "spdx");
      expect(sbom.entries.some((e) => e.name === "vitest")).toBe(true);
      expect(sbom.entries.some((e) => e.name === "lodash")).toBe(true);
    });

    it("marks entries as direct type", () => {
      const root = createTempProject({ foo: "1.0.0" });
      const sbom = generateSbom(root, "spdx");
      expect(sbom.entries[0]?.type).toBe("direct");
    });

    it("handles missing package.json", () => {
      const sbom = generateSbom("/nonexistent/path/xyz", "spdx");
      expect(sbom.name).toBe("unknown");
      expect(sbom.entries).toHaveLength(0);
    });

    it("includes generatedAt timestamp", () => {
      const root = createTempProject({});
      const sbom = generateSbom(root, "spdx");
      expect(sbom.generatedAt).toBeTruthy();
      expect(new Date(sbom.generatedAt).getTime()).not.toBeNaN();
    });
  });

  describe("validateSbom", () => {
    it("passes for valid SBOM", () => {
      const sbom = {
        format: "spdx" as const,
        name: "test",
        version: "1.0.0",
        entries: [
          {
            name: "dep",
            version: "1.0.0",
            license: "MIT",
            type: "direct" as const,
          },
        ],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom)).toHaveLength(0);
    });

    it("rejects missing format", () => {
      const sbom = {
        format: "" as "spdx",
        name: "test",
        version: "1.0.0",
        entries: [],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom).some((e) => e.path === "format")).toBe(true);
    });

    it("rejects missing name", () => {
      const sbom = {
        format: "spdx" as const,
        name: "",
        version: "1.0.0",
        entries: [],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom).some((e) => e.path === "name")).toBe(true);
    });

    it("rejects missing version", () => {
      const sbom = {
        format: "spdx" as const,
        name: "test",
        version: "",
        entries: [],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom).some((e) => e.path === "version")).toBe(true);
    });

    it("rejects entries with empty name", () => {
      const sbom = {
        format: "spdx" as const,
        name: "test",
        version: "1.0.0",
        entries: [
          {
            name: "",
            version: "1.0.0",
            license: "MIT",
            type: "direct" as const,
          },
        ],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom).some((e) => e.path.includes("entries"))).toBe(
        true,
      );
    });

    it("rejects entries with invalid type", () => {
      const sbom = {
        format: "spdx" as const,
        name: "test",
        version: "1.0.0",
        entries: [
          {
            name: "dep",
            version: "1.0.0",
            license: "MIT",
            type: "invalid" as "direct",
          },
        ],
        generatedAt: new Date().toISOString(),
      };
      expect(validateSbom(sbom).some((e) => e.path.includes("type"))).toBe(
        true,
      );
    });
  });
});
