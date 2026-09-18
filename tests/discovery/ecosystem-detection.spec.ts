import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectEcosystem,
  detectWorkspaceStructure,
} from "../../src/discovery/ecosystem-detection.js";

function makeTmpDir(name: string): string {
  const dir = join(tmpdir(), `qa-doctor-eco-${name}-${Date.now()}`);
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

    it("detects csharp ecosystem from .csproj file", () => {
      const dir = makeTmpDir("csharp");
      writeFileSync(join(dir, "MyApp.csproj"), "<Project />");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("csharp");
      expect(result.signals.csproj).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects csharp ecosystem from .sln file", () => {
      const dir = makeTmpDir("csharp-sln");
      writeFileSync(
        join(dir, "MyApp.sln"),
        "Microsoft Visual Studio Solution File",
      );
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("csharp");
      expect(result.signals.csproj).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects ruby ecosystem from Gemfile", () => {
      const dir = makeTmpDir("ruby");
      writeFileSync(join(dir, "Gemfile"), "source 'https://rubygems.org'");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("unknown");
      expect(result.signals.gemfile).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects rust ecosystem from Cargo.toml", () => {
      const dir = makeTmpDir("rust");
      writeFileSync(join(dir, "Cargo.toml"), "[package]\nname='test'\n");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("unknown");
      expect(result.signals.cargoToml).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects java ecosystem from build.gradle.kts", () => {
      const dir = makeTmpDir("java-kts");
      writeFileSync(join(dir, "build.gradle.kts"), "plugins { java }");
      const result = detectEcosystem(dir);
      expect(result.ecosystem).toBe("java");
      expect(result.signals.buildGradle).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects mixed ecosystem when three markers present", () => {
      const dir = makeTmpDir("mixed3");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      writeFileSync(join(dir, "pom.xml"), "<project/>");
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
      expect(result.signals.csproj).toBe(false);
      expect(result.signals.gemfile).toBe(false);
      expect(result.signals.cargoToml).toBe(false);
      rmSync(dir, { recursive: true, force: true });
    });

    it("sets path to rootDir", () => {
      const dir = makeTmpDir("path-check");
      const result = detectEcosystem(dir);
      expect(result.path).toBe(dir);
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

    it("detects workspaces as object with packages array", () => {
      const dir = makeTmpDir("workspaces-obj");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ workspaces: { packages: ["a", "b", "c"] } }),
      );
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(true);
      expect(result.workspaceCount).toBe(3);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects empty workspaces array", () => {
      const dir = makeTmpDir("workspaces-empty");
      writeFileSync(
        join(dir, "package.json"),
        JSON.stringify({ workspaces: [] }),
      );
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(false);
      expect(result.workspaceCount).toBe(0);
      rmSync(dir, { recursive: true, force: true });
    });

    it("has no workspaces when none defined", () => {
      const dir = makeTmpDir("no-ws");
      writeFileSync(join(dir, "package.json"), "{}");
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(false);
      expect(result.workspaceCount).toBe(0);
      rmSync(dir, { recursive: true, force: true });
    });

    it("handles unreadable package.json", () => {
      const dir = makeTmpDir("unreadable-pkg");
      writeFileSync(join(dir, "package.json"), "{bad json");
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(false);
      expect(result.workspaceCount).toBe(0);
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

    it("detects test/ directory presence", () => {
      const dir = makeTmpDir("test-dir");
      writeFileSync(join(dir, "package.json"), "{}");
      mkdirSync(join(dir, "test"));
      const result = detectWorkspaceStructure(dir);
      expect(result.hasTests).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects __tests__ directory presence", () => {
      const dir = makeTmpDir("dunder-tests");
      writeFileSync(join(dir, "package.json"), "{}");
      mkdirSync(join(dir, "__tests__"));
      const result = detectWorkspaceStructure(dir);
      expect(result.hasTests).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects spec/ directory presence", () => {
      const dir = makeTmpDir("spec-dir");
      writeFileSync(join(dir, "package.json"), "{}");
      mkdirSync(join(dir, "spec"));
      const result = detectWorkspaceStructure(dir);
      expect(result.hasTests).toBe(true);
      rmSync(dir, { recursive: true, force: true });
    });

    it("hasTests is false when no test dirs exist", () => {
      const dir = makeTmpDir("no-tests");
      writeFileSync(join(dir, "package.json"), "{}");
      const result = detectWorkspaceStructure(dir);
      expect(result.hasTests).toBe(false);
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

    it("detects vitest.config.js", () => {
      const dir = makeTmpDir("vitest-js");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "vitest.config.js"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("vitest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects jest config", () => {
      const dir = makeTmpDir("jest");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "jest.config.js"), "module.exports = {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("jest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects jest.config.ts", () => {
      const dir = makeTmpDir("jest-ts");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "jest.config.ts"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("jest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects playwright config", () => {
      const dir = makeTmpDir("playwright");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "playwright.config.ts"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("playwright");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects playwright.config.js", () => {
      const dir = makeTmpDir("playwright-js");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "playwright.config.js"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("playwright");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects pytest from conftest.py", () => {
      const dir = makeTmpDir("pytest-conftest");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      writeFileSync(join(dir, "conftest.py"), "");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("pytest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects pytest from pytest.ini", () => {
      const dir = makeTmpDir("pytest-ini");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      writeFileSync(join(dir, "pytest.ini"), "[pytest]");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("pytest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects pytest from setup.cfg", () => {
      const dir = makeTmpDir("pytest-cfg");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      writeFileSync(join(dir, "setup.cfg"), "[tool:pytest]");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("pytest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects junit for java ecosystem", () => {
      const dir = makeTmpDir("junit");
      writeFileSync(join(dir, "pom.xml"), "<project/>");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("junit");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects junit for mixed ecosystem", () => {
      const dir = makeTmpDir("junit-mixed");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "pom.xml"), "<project/>");
      mkdirSync(join(dir, "tests"));
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("junit");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects pytest for mixed ecosystem", () => {
      const dir = makeTmpDir("pytest-mixed");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "pyproject.toml"), "[project]\nname='test'\n");
      writeFileSync(join(dir, "conftest.py"), "");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("pytest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("detects multiple test frameworks simultaneously", () => {
      const dir = makeTmpDir("multi-fw");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "vitest.config.ts"), "export default {}");
      writeFileSync(join(dir, "jest.config.js"), "module.exports = {}");
      writeFileSync(join(dir, "playwright.config.ts"), "export default {}");
      const result = detectWorkspaceStructure(dir);
      expect(result.testFrameworks).toContain("vitest");
      expect(result.testFrameworks).toContain("jest");
      expect(result.testFrameworks).toContain("playwright");
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

    it("uses provided ecosystem override", () => {
      const dir = makeTmpDir("eco-override");
      writeFileSync(join(dir, "package.json"), "{}");
      writeFileSync(join(dir, "conftest.py"), "");
      const result = detectWorkspaceStructure(dir, "python");
      expect(result.testFrameworks).toContain("pytest");
      expect(result.testFrameworks).not.toContain("vitest");
      rmSync(dir, { recursive: true, force: true });
    });

    it("handles empty directory with no signals", () => {
      const dir = makeTmpDir("empty-ws");
      const result = detectWorkspaceStructure(dir);
      expect(result.hasWorkspaces).toBe(false);
      expect(result.workspaceCount).toBe(0);
      expect(result.hasTests).toBe(false);
      expect(result.testFrameworks).toHaveLength(0);
      rmSync(dir, { recursive: true, force: true });
    });
  });
});
