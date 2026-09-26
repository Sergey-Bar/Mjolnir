/**
 * Dependency Graph (ECO-005).
 *
 * Parses package manifests (package.json, pyproject.toml, pom.xml) to
 * build a dependency graph. Supports transitive dependency resolution,
 * dependent lookup, and reachable-file computation from test files.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export interface DependencyNode {
  path: string;
  dependencies: string[];
}

export class DependencyGraph {
  private readonly nodes = new Map<string, DependencyNode>();

  addNode(node: DependencyNode): void {
    this.nodes.set(node.path, {
      path: node.path,
      dependencies: [...node.dependencies],
    });
  }

  getDependencies(path: string): string[] {
    return this.nodes.get(path)?.dependencies ?? [];
  }

  getTransitiveDependencies(path: string): string[] {
    const visited = new Set<string>();
    const stack = [path];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;
      if (visited.has(current)) continue;
      visited.add(current);
      const node = this.nodes.get(current);
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) stack.push(dep);
        }
      }
    }
    visited.delete(path);
    return [...visited].sort();
  }

  getDependents(path: string): string[] {
    const dependents: string[] = [];
    for (const [key, node] of this.nodes) {
      if (node.dependencies.includes(path)) dependents.push(key);
    }
    return dependents.sort();
  }

  get allPaths(): string[] {
    return [...this.nodes.keys()].sort();
  }

  get size(): number {
    return this.nodes.size;
  }

  /** Whether the graph knows this exact key. Reachability must not
   *  treat "not in the graph" as "nothing to traverse" without saying so. */
  has(path: string): boolean {
    return this.nodes.has(path);
  }
}

function parsePackageJson(filePath: string): DependencyNode | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    const raw = readFileSync(filePath, "utf8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;
    const deps = [
      ...Object.keys(
        (pkg["dependencies"] as Record<string, string> | undefined) ?? {},
      ),
      ...Object.keys(
        (pkg["devDependencies"] as Record<string, string> | undefined) ?? {},
      ),
    ];
    return { path: filePath, dependencies: deps };
  } catch {
    return undefined;
  }
}

function parsePyprojectToml(filePath: string): DependencyNode | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    const raw = readFileSync(filePath, "utf8");
    const deps: string[] = [];
    const depSection = raw.match(
      /\[project\][\s\S]*?dependencies\s*=\s*\[([\s\S]*?)\]/,
    );
    if (depSection?.[1]) {
      const lines = depSection[1].split("\n");
      for (const line of lines) {
        const match = line.match(/^\s*"([\w-]+)/);
        if (match?.[1]) deps.push(match[1]);
      }
    }
    return { path: filePath, dependencies: deps };
  } catch {
    return undefined;
  }
}

function parsePomXml(filePath: string): DependencyNode | undefined {
  if (!existsSync(filePath)) return undefined;
  try {
    const raw = readFileSync(filePath, "utf8");
    const deps: string[] = [];
    const re = /<artifactId>([^<]+)<\/artifactId>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw)) !== null) {
      if (m[1]) deps.push(m[1]);
    }
    return { path: filePath, dependencies: deps };
  } catch {
    return undefined;
  }
}

/**
 * Build a dependency graph from project manifests. Scans for package.json,
 * pyproject.toml, and pom.xml at the project root and one level deep.
 */
export function buildDependencyGraph(projectRoot: string): DependencyGraph {
  const graph = new DependencyGraph();

  const manifestPatterns = [
    "package.json",
    "pyproject.toml",
    "pom.xml",
    join("packages", "*", "package.json"),
  ];

  for (const pattern of manifestPatterns) {
    if (pattern.includes("*")) {
      const [base, , file] = pattern.split(/[\\/]/);
      if (base === undefined || file === undefined) continue;
      const baseDir = resolve(projectRoot, base);
      if (!existsSync(baseDir)) continue;
      try {
        const entries = readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const manifestPath = resolve(baseDir, entry.name, file);
            const node = parseManifest(manifestPath);
            if (node) graph.addNode(node);
          }
        }
      } catch {
        // unreadable directory — skip
      }
    } else {
      const manifestPath = resolve(projectRoot, pattern);
      const node = parseManifest(manifestPath);
      if (node) graph.addNode(node);
    }
  }

  return graph;
}

function parseManifest(filePath: string): DependencyNode | undefined {
  if (filePath.endsWith("package.json")) return parsePackageJson(filePath);
  if (filePath.endsWith("pyproject.toml")) return parsePyprojectToml(filePath);
  if (filePath.endsWith("pom.xml")) return parsePomXml(filePath);
  return undefined;
}

/**
 * What a reachability query actually managed to do.
 *
 * `reachable` alone is not enough to report, and that is the whole reason this
 * type exists. The previous signature returned `string[]`, and because the
 * graph is keyed by MANIFEST path while callers pass SOURCE paths, every
 * lookup missed and the function returned its own input unchanged. The caller
 * then printed that count as "Reachable files: N", where N was simply how many
 * files went in — a number derived from nothing, presented as if it came from
 * a traversal.
 *
 * `unresolvedStarts` is what makes that state visible: every starting point
 * the graph could not place. A caller that sees a non-empty list knows the
 * result is the input echoed back, and must say so rather than imply it
 * traversed anything.
 */
export interface ReachabilityResult {
  /** Files reachable from the resolved starting points, sorted. */
  reachable: string[];
  /**
   * Starting points the graph could not resolve to an owning manifest,
   * sorted. Non-empty means the graph is not connected to these paths and
   * `reachable` is NOT evidence of a traversal.
   */
  unresolvedStarts: string[];
  /** True when the graph resolved at least one starting point. */
  resolvedAny: boolean;
}

/**
 * Given a set of starting files (e.g. test files), return the files
 * transitively reachable through the dependency graph, plus an honest
 * account of what could not be resolved.
 *
 * KNOWN LIMITATION (BW-022, still open): the graph is keyed by manifest path
 * and this query is given source paths, so today `unresolvedStarts` is
 * normally every input. The traversal itself is correct for a graph whose
 * keys are the paths being queried — which is what the unit tests build, and
 * which is why they passed while production did nothing. Fixing the seam
 * means giving a file a resolvable owning manifest and deciding impact's
 * direction (dependents, not dependencies), which is a design change, not a
 * patch. Until then this function reports that it resolved nothing instead
 * of implying otherwise.
 */
export function getReachableFiles(
  fromFiles: ReadonlyArray<string>,
  graph: DependencyGraph,
): ReachabilityResult {
  const reachable = new Set<string>();
  const unresolvedStarts: string[] = [];
  const stack = [...fromFiles];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    if (reachable.has(current)) continue;
    if (graph.has(current)) {
      reachable.add(current);
    } else if (fromFiles.includes(current)) {
      // A STARTING point the graph does not know. Recorded rather than
      // silently echoed back, which is what produced the false count.
      unresolvedStarts.push(current);
      continue;
    }
    for (const dep of graph.getDependencies(current)) {
      if (!reachable.has(dep)) stack.push(dep);
    }
  }
  return {
    reachable: [...reachable].sort(),
    unresolvedStarts: unresolvedStarts.sort(),
    resolvedAny: unresolvedStarts.length < fromFiles.length,
  };
}
