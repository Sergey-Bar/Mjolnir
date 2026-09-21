/**
 * Ecosystem Detection (ENGINE-005).
 *
 * Detects the programming ecosystem and workspace structure of a
 * project directory by probing for characteristic manifest files
 * (package.json, pyproject.toml, pom.xml, build.gradle, etc.).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type Ecosystem =
  "node" | "python" | "java" | "csharp" | "mixed" | "unknown";

export interface EcosystemSignals {
  packageJson: boolean;
  pyprojectToml: boolean;
  pomXml: boolean;
  buildGradle: boolean;
  csproj: boolean;
  gemfile: boolean;
  cargoToml: boolean;
}

export interface WorkspaceRoot {
  path: string;
  ecosystem: Ecosystem;
  signals: EcosystemSignals;
}

export interface WorkspaceStructure {
  root: WorkspaceRoot;
  hasWorkspaces: boolean;
  workspaceCount: number;
  hasTests: boolean;
  testFrameworks: string[];
}

function detectSignals(rootDir: string): EcosystemSignals {
  return {
    packageJson: existsSync(join(rootDir, "package.json")),
    pyprojectToml: existsSync(join(rootDir, "pyproject.toml")),
    pomXml: existsSync(join(rootDir, "pom.xml")),
    buildGradle:
      existsSync(join(rootDir, "build.gradle")) ||
      existsSync(join(rootDir, "build.gradle.kts")),
    csproj:
      existsSync(join(rootDir, "*.csproj")) ||
      (() => {
        try {
          return readdirSync(rootDir).some(
            (f) => f.endsWith(".csproj") || f.endsWith(".sln"),
          );
        } catch {
          return false;
        }
      })(),
    gemfile: existsSync(join(rootDir, "Gemfile")),
    cargoToml: existsSync(join(rootDir, "Cargo.toml")),
  };
}

function deriveEcosystem(signals: EcosystemSignals): Ecosystem {
  const present = [
    signals.packageJson && "node",
    signals.pyprojectToml && "python",
    signals.pomXml && "java",
    signals.buildGradle && "java",
    signals.csproj && "csharp",
  ].filter(Boolean) as string[];

  if (present.length === 0) return "unknown";
  if (present.length > 1) return "mixed";
  return present[0] as Ecosystem;
}

/**
 * Detect the ecosystem of a project directory by probing for
 * characteristic manifest files.
 */
export function detectEcosystem(rootDir: string): WorkspaceRoot {
  const signals = detectSignals(rootDir);
  return {
    path: rootDir,
    ecosystem: deriveEcosystem(signals),
    signals,
  };
}

/**
 * Detect the workspace structure: workspaces, test presence, and
 * detected frameworks.
 */
export function detectWorkspaceStructure(
  rootDir: string,
  ecosystem?: Ecosystem,
): WorkspaceStructure {
  const root = detectEcosystem(rootDir);
  const eco = ecosystem ?? root.ecosystem;

  let hasWorkspaces = false;
  let workspaceCount = 0;

  if (root.signals.packageJson) {
    try {
      const pkg = JSON.parse(
        readFileSync(join(rootDir, "package.json"), "utf8"),
      ) as Record<string, unknown>;
      const ws = pkg["workspaces"];
      if (Array.isArray(ws)) {
        hasWorkspaces = ws.length > 0;
        workspaceCount = ws.length;
      } else if (
        ws &&
        typeof ws === "object" &&
        Array.isArray((ws as { packages?: unknown[] }).packages)
      ) {
        const pkgs = (ws as { packages: unknown[] }).packages;
        hasWorkspaces = pkgs.length > 0;
        workspaceCount = pkgs.length;
      }
    } catch {
      // unreadable package.json
    }
  }

  const testFrameworks: string[] = [];
  const hasTests =
    existsSync(join(rootDir, "tests")) ||
    existsSync(join(rootDir, "test")) ||
    existsSync(join(rootDir, "__tests__")) ||
    existsSync(join(rootDir, "spec"));

  if (eco === "node" || eco === "unknown" || eco === "mixed") {
    if (
      existsSync(join(rootDir, "vitest.config.ts")) ||
      existsSync(join(rootDir, "vitest.config.js"))
    ) {
      testFrameworks.push("vitest");
    }
    if (
      existsSync(join(rootDir, "jest.config.js")) ||
      existsSync(join(rootDir, "jest.config.ts"))
    ) {
      testFrameworks.push("jest");
    }
    if (
      existsSync(join(rootDir, "playwright.config.ts")) ||
      existsSync(join(rootDir, "playwright.config.js"))
    ) {
      testFrameworks.push("playwright");
    }
  }

  if (eco === "python" || eco === "mixed") {
    if (
      existsSync(join(rootDir, "conftest.py")) ||
      existsSync(join(rootDir, "pytest.ini")) ||
      existsSync(join(rootDir, "setup.cfg"))
    ) {
      testFrameworks.push("pytest");
    }
  }

  if (eco === "java" || eco === "mixed") {
    testFrameworks.push("junit");
  }

  return {
    root,
    hasWorkspaces,
    workspaceCount,
    hasTests,
    testFrameworks,
  };
}
