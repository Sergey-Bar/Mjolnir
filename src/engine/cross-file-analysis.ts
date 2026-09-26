/**
 * M10 — Cross-File Analysis Engine.
 *
 * Integrates cross-file signal detection: duplicate test names,
 * shared imports, circular dependencies, and shared mutable state
 * across the scanned surface. Provides deterministic, pure
 * analysis results that feed into the scan pipeline.
 *
 * TI-009 enforcement: cross-file correlations are SUPPORTING
 * evidence only — they never elevate a finding's evidence level
 * on their own.
 */

import type { Finding } from "../types.js";
import { findDuplicateTestNames } from "./cross-file.js";
import { correlateFindings } from "./correlation-engine.js";
import {
  buildDependencyGraph,
  getReachableFiles,
  type ReachabilityResult,
} from "./dependency-graph.js";

export interface CrossFileSignal {
  type:
    "duplicate-test-name" | "shared-import" | "circular-dep" | "shared-state";
  files: string[];
  message: string;
  severity: "warning" | "info";
}

export interface CrossFileAnalysisResult {
  signals: CrossFileSignal[];
  duplicateTestNames: CrossFileSignal[];
  sharedImports: CrossFileSignal[];
  circularDependencies: CrossFileSignal[];
  correlationConclusions: string;
  dependencyGraphSize: number;
  /**
   * What the dependency graph actually managed to resolve.
   *
   * This replaced a `reachableFilesCount: number`, which was fabricated: the
   * graph is keyed by manifest path, the query was given source paths, every
   * lookup missed, and the "reachable" count was the number of files that went
   * in. Carrying the resolution report instead means no caller can print a
   * traversal that never happened.
   */
  reachability: ReachabilityResult;
}

/**
 * Analyze cross-file signals across the scanned test files.
 * Pure function — same input always produces same output.
 */
export function analyzeCrossFileSignals(
  files: ReadonlyArray<{ path: string; text: string }>,
  findings: readonly Finding[],
  root: string,
): CrossFileAnalysisResult {
  const orderedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const duplicateTestNames = findDuplicateTestNames(orderedFiles).map(
    (dup) => ({
      type: "duplicate-test-name" as const,
      files: dup.files,
      message: `Duplicate test name "${dup.name}" found in ${dup.files.length} files`,
      severity: "warning" as const,
    }),
  );

  const sharedImports = detectSharedImports(orderedFiles).map((imp) => ({
    type: "shared-import" as const,
    files: imp.files,
    message: imp.message,
    severity: "info" as const,
  }));

  const circularDependencies = detectCircularDependencies(orderedFiles).map(
    (circ) => ({
      type: "circular-dep" as const,
      files: circ.files,
      message: circ.message,
      severity: "warning" as const,
    }),
  );

  const correlationConclusions = correlateFindings(findings)
    .map((c) => `${c.conclusionType}: ${c.corroboration}`)
    .join("; ");

  const graph = buildDependencyGraph(root);
  const reachability = getReachableFiles(
    orderedFiles.map((f) => f.path),
    graph,
  );

  return {
    signals: [...duplicateTestNames, ...sharedImports, ...circularDependencies],
    duplicateTestNames,
    sharedImports,
    circularDependencies,
    correlationConclusions,
    dependencyGraphSize: graph.size,
    reachability,
  };
}

function detectSharedImports(
  files: ReadonlyArray<{ path: string; text: string }>,
): Array<{ files: string[]; message: string }> {
  const importByModule = new Map<string, Set<string>>();
  for (const { path, text } of files) {
    const importRegex = /\b(?:from\s+|import\s*)['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(text)) !== null) {
      const module = match[1] as string;
      const set = importByModule.get(module) ?? new Set();
      set.add(path);
      importByModule.set(module, set);
    }
  }

  const out: Array<{ files: string[]; message: string }> = [];
  for (const [module, paths] of importByModule) {
    if (paths.size > 1) {
      out.push({
        files: [...paths].sort(),
        message: `Module "${module}" imported by ${paths.size} files`,
      });
    }
  }
  return out.sort((a, b) => a.message.localeCompare(b.message));
}

function detectCircularDependencies(
  files: ReadonlyArray<{ path: string; text: string }>,
): Array<{ files: string[]; message: string }> {
  const importMap = new Map<string, string[]>();
  const filePaths = new Set(files.map((f) => f.path));

  for (const { path: filePath, text } of files) {
    const imports: string[] = [];
    const importRegex = /\b(?:from\s+|import\s*)['"]([^'"]+)['"]/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(text)) !== null) {
      const imported = match[1] as string;
      let resolved = imported;
      if (imported.startsWith("./") || imported.startsWith("../")) {
        const dir = filePath.substring(0, filePath.lastIndexOf("/") + 1);
        resolved = dir + imported.replace(/^\.\//, "");
      }
      // Try to resolve the import path against known file paths
      if (!filePaths.has(resolved)) {
        // Try adding common extensions
        for (const ext of [".ts", ".tsx", ".js", ".jsx"]) {
          if (filePaths.has(resolved + ext)) {
            resolved = resolved + ext;
            break;
          }
        }
      }
      if (filePaths.has(resolved) || filePaths.has(imported)) {
        imports.push(filePaths.has(resolved) ? resolved : imported);
      }
    }
    importMap.set(filePath, imports);
  }

  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const deps = importMap.get(node) ?? [];
    for (const dep of deps) {
      dfs(dep, path);
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of importMap.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles.map((cycle) => ({
    files: cycle,
    message: `Circular dependency detected: ${cycle.join(" → ")}`,
  }));
}

export function renderCrossFileAnalysis(
  result: CrossFileAnalysisResult,
): string {
  const lines: string[] = [];
  lines.push("Cross-File Analysis Report");
  lines.push(`Signals detected: ${result.signals.length}`);
  lines.push(`Duplicate test names: ${result.duplicateTestNames.length}`);
  lines.push(`Shared imports: ${result.sharedImports.length}`);
  lines.push(`Circular dependencies: ${result.circularDependencies.length}`);
  lines.push(`Dependency graph size: ${result.dependencyGraphSize}`);
  // The honest line. It used to read `Reachable files: ${count}`, where the
  // count was the input size — so the report claimed a traversal that never
  // ran. A number nobody can trace is the failure this product exists to
  // catch, including in its own output.
  const { reachability } = result;
  if (reachability.resolvedAny) {
    lines.push(
      `Reachable files: ${reachability.reachable.length} (resolved from the dependency graph)`,
    );
  } else {
    lines.push(
      `Reachable files: not resolved — the graph is keyed by package manifest ` +
        `and none of the ${reachability.unresolvedStarts.length} starting ` +
        `file(s) could be placed. This number is not evidence of a traversal.`,
    );
  }
  lines.push("");

  if (result.signals.length > 0) {
    lines.push("Signals:");
    for (const signal of result.signals) {
      const icon = signal.severity === "warning" ? "⚠" : "ℹ";
      lines.push(`  ${icon} [${signal.type}] ${signal.message}`);
    }
    lines.push("");
  }

  if (result.correlationConclusions) {
    lines.push("Correlation Conclusions:");
    lines.push(`  ${result.correlationConclusions}`);
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
