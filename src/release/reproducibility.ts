/**
 * Reproducibility Investigation (SUPPLY-004).
 *
 * Analyzes build configuration for non-deterministic steps that prevent
 * reproducible builds. Reports issues and recommendations.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface ReproducibilityReport {
  buildCommand: string;
  deterministic: boolean;
  issues: ReproducibilityIssue[];
  recommendations: string[];
}

export interface ReproducibilityIssue {
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  file?: string;
}

function checkPackageJson(projectRoot: string): ReproducibilityIssue[] {
  const issues: ReproducibilityIssue[] = [];
  const pkgPath = join(projectRoot, "package.json");
  if (!existsSync(pkgPath)) return issues;

  try {
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const scripts = pkg["scripts"] as Record<string, string> | undefined;

    if (scripts) {
      for (const [name, cmd] of Object.entries(scripts)) {
        if (/date|timestamp|now\(\)|random|uuid|nanoid/i.test(cmd)) {
          issues.push({
            severity: "warning",
            category: "timestamp-or-random",
            message: `script "${name}" contains timestamp/random references: ${cmd.slice(0, 100)}`,
            file: "package.json",
          });
        }
      }
    }

    const deps = pkg["dependencies"] as Record<string, string> | undefined;
    if (deps) {
      for (const [name, version] of Object.entries(deps)) {
        if (version === "*" || version === "latest" || version === "next") {
          issues.push({
            severity: "error",
            category: "unpinned-dependency",
            message: `dependency "${name}" uses non-deterministic version: "${version}"`,
            file: "package.json",
          });
        }
        if (version.includes(">=") || version.includes("~>")) {
          issues.push({
            severity: "warning",
            category: "loose-version-range",
            message: `dependency "${name}" uses loose version range: "${version}"`,
            file: "package.json",
          });
        }
      }
    }
  } catch {
    // unreadable — skip
  }

  return issues;
}

function checkBuildConfig(projectRoot: string): ReproducibilityIssue[] {
  const issues: ReproducibilityIssue[] = [];

  // Check for tsconfig with sourceMap/declarationMap (timestamps in output)
  const tsconfigPath = join(projectRoot, "tsconfig.json");
  if (existsSync(tsconfigPath)) {
    try {
      const raw = readFileSync(tsconfigPath, "utf8");
      const tsconfig = JSON.parse(raw) as Record<string, unknown>;
      const compilerOptions = tsconfig["compilerOptions"] as
        Record<string, unknown> | undefined;
      if (compilerOptions?.["sourceMap"] === true) {
        issues.push({
          severity: "info",
          category: "sourcemap",
          message: "source maps may embed non-deterministic paths",
          file: "tsconfig.json",
        });
      }
    } catch {
      // unreadable — skip
    }
  }

  // Check for lockfile existence (critical for reproducibility)
  const lockfiles = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];
  const hasLockfile = lockfiles.some((f) => existsSync(join(projectRoot, f)));
  if (!hasLockfile) {
    issues.push({
      severity: "error",
      category: "missing-lockfile",
      message:
        "no lockfile found — builds are not reproducible without a lockfile",
    });
  }

  return issues;
}

function checkFileOrdering(projectRoot: string): ReproducibilityIssue[] {
  const issues: ReproducibilityIssue[] = [];

  // Check for glob patterns in build config that might produce unordered results
  const tsdownPath = join(projectRoot, "tsdown.config.ts");
  const vitePath = join(projectRoot, "vite.config.ts");
  const webpackPath = join(projectRoot, "webpack.config.js");

  for (const [name, path] of [
    ["tsdown", tsdownPath],
    ["vite", vitePath],
    ["webpack", webpackPath],
  ] as const) {
    if (existsSync(path)) {
      try {
        const raw = readFileSync(path, "utf8");
        if (/readdir|glob|\*\*/i.test(raw) && !/sort/i.test(raw)) {
          issues.push({
            severity: "warning",
            category: "unordered-file-list",
            message: `${name} config may process files in non-deterministic order (no sort after glob/readdir)`,
            file: name + ".config.ts",
          });
        }
      } catch {
        // unreadable — skip
      }
    }
  }

  return issues;
}

/**
 * Analyze project build configuration for reproducibility issues.
 * Checks for timestamps, random IDs, unpinned dependencies, unordered
 * file lists, and missing lockfiles.
 */
export function checkReproducibility(
  projectRoot: string,
): ReproducibilityReport {
  const issues = [
    ...checkPackageJson(projectRoot),
    ...checkBuildConfig(projectRoot),
    ...checkFileOrdering(projectRoot),
  ];

  const recommendations: string[] = [];
  const categories = new Set(issues.map((i) => i.category));

  if (categories.has("unpinned-dependency")) {
    recommendations.push(
      "Pin all dependency versions (exact versions or lockfile)",
    );
  }
  if (categories.has("missing-lockfile")) {
    recommendations.push(
      "Commit a lockfile (package-lock.json, yarn.lock, or pnpm-lock.yaml)",
    );
  }
  if (categories.has("timestamp-or-random")) {
    recommendations.push(
      "Remove timestamps and random values from build scripts",
    );
  }
  if (categories.has("unordered-file-list")) {
    recommendations.push("Sort file lists after glob/readdir operations");
  }
  if (categories.has("loose-version-range")) {
    recommendations.push(
      "Consider pinning loose version ranges for reproducible installs",
    );
  }

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    buildCommand: "npm run build",
    deterministic:
      !hasErrors && issues.filter((i) => i.severity === "warning").length === 0,
    issues,
    recommendations,
  };
}
