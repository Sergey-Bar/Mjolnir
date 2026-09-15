import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectEcosystem,
  detectWorkspaceStructure,
} from "../../src/discovery/ecosystem-detection.js";

function makeTmpDir(name: string): string {
  const dir = join(tmpdir(), `mjolnir-eco-${name}-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe("ecosystem detection (ENGINE-005)", () => {
  describe("detectEcosystem", () => {
    it("detects node ecosystem from package.json", () => {
      const dir = makeTmpDir("node");
      writeFileSync(join(dir, "package.json"), "{}");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("node");
      expect(result.signals.packageJson).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects python ecosystem from pyproject.toml", () => {
      const dir = makeTmpDir("python");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("python");
      expect(result.signals.pyprojectToml).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects java ecosystem from pom.xml", () => {
      const dir = makeTmpDir("java-pom");
      writeFileSync(join(dir, "pom.xml"), "<project/>");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("java");
      expect(result.signals.pomXml).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects java ecosystem from build.gradle", () => {
      const dir = makeTmpDir("java-gradle");
      writeFileSync(join(dir, "build.gradle"), "plugins { id 'java' }");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("java");
      expect(result.signals.buildGradle).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects mixed ecosystem when multiple markers present", () => {
      const dir = makeTmpDir("mixed");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("mixed");
      rmSync(dir, { recursive: true, force: true });
    });

    it("returns unknown for empty directory", () => {
      const dir = makeTmpDir("empty");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("unknown");
      rmSync(dir, { recursive: true, force: true });
    });

    it("all signals are false for empty directory", () => {
      const dir = makeTmpDir("empty-signals");
      const result = detectEcosystem(dir);
      expect(result.signals.packageJson).toBe(false);
      expect(result.signals.pyprojectToml).toBe(false);
      expect(result.signals.pomXml).toBe(false);
      expect(result.signals.buildGradle).toBe(false);
      rmSync(dir, { recursive: true, force: true });
    });
  });

  describe("detectWorkspaceStructure", () => {
    it("detects workspaces from package.json", () => {
      const dir = makeTmpDir("workspaces");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ workspaces: ["packages/*"] }),
      );
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(true);
      expect(result.workspaceCount).toBe(1);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects test directory presence", () => {
      const dir = makeTmpDir("tests-present");
      writeFileSync(join(dir, "package.json"), "{}");
      mkdirSync(join(dir, "tests"));
      const result = detectWorkspaceStructure(dir);
      expect(result.hasTests).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects vitest config", () => {
      const dir = makeTmpDir("vitest");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "vitest.config.ts"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("vitest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("returns empty frameworks for unknown ecosystem", () => {
      const dir = makeTmpDir("unknown-eco");
      const result = detectWorkspaceStructure(dir, "unknown");
      expect(result.testFrameworks).toHaveLength(0);
      rmSync(dir, { recursive: true, force: true });
    });

    it("returns ecosystem root info", () => {
      const dir = makeTmpDir("root-info");
      writeFileSync(join(dir, "package.json"), "{}");
      const result = detectWorkspaceStructure(dir);
      expect(result.root.path).toBe(dir);
      expect(result.root.ecosystem).toBe("node");
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
