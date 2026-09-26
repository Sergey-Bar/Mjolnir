import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DependencyGraph,
  buildDependencyGraph,
  getReachableFiles,
} from "../../src/engine/dependency-graph.js";

describe("dependency-graph (ECO-005)", () => {
  describe("DependencyGraph", () => {
    it("adds and retrieves nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b", "c"] });
      expect(graph.getDependencies("a")).toEqual(["b", "c"]);
      expect(graph.size).toBe(1);
    });

    it("returns empty for unknown path", () => {
      const graph = new DependencyGraph();
      expect(graph.getDependencies("unknown")).toEqual([]);
    });

    it("overwrites duplicate paths", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b"] });
      graph.addNode({ path: "a", dependencies: ["c"] });
      expect(graph.getDependencies("a")).toEqual(["c"]);
    });

    describe("getTransitiveDependencies", () => {
      it("returns direct dependencies for single level", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["b", "c"] });
        graph.addNode({ path: "b", dependencies: [] });
        graph.addNode({ path: "c", dependencies: [] });
        const transitive = graph.getTransitiveDependencies("a");
        expect(transitive).toContain("b");
        expect(transitive).toContain("c");
        expect(transitive).not.toContain("a");
      });

      it("follows transitive chain A→B→C", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["b"] });
        graph.addNode({ path: "b", dependencies: ["c"] });
        graph.addNode({ path: "c", dependencies: [] });
        const transitive = graph.getTransitiveDependencies("a");
        expect(transitive).toEqual(["b", "c"]);
      });

      it("handles diamond transitive dependencies", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["b", "c"] });
        graph.addNode({ path: "b", dependencies: ["d"] });
        graph.addNode({ path: "c", dependencies: ["d"] });
        graph.addNode({ path: "d", dependencies: [] });
        const transitive = graph.getTransitiveDependencies("a");
        expect(transitive).toEqual(["b", "c", "d"]);
      });

      it("returns empty for unknown node", () => {
        const graph = new DependencyGraph();
        expect(graph.getTransitiveDependencies("nonexistent")).toEqual([]);
      });

      it("handles cycles without infinite loop", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["b"] });
        graph.addNode({ path: "b", dependencies: ["a"] });
        const transitive = graph.getTransitiveDependencies("a");
        expect(transitive).toContain("b");
        expect(transitive).not.toContain("a");
      });

      it("returns empty for node with no dependencies", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: [] });
        expect(graph.getTransitiveDependencies("a")).toEqual([]);
      });
    });

    describe("getDependents", () => {
      it("returns nodes that depend on the given path", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["lib"] });
        graph.addNode({ path: "b", dependencies: ["lib"] });
        graph.addNode({ path: "lib", dependencies: [] });
        const dependents = graph.getDependents("lib");
        expect(dependents).toContain("a");
        expect(dependents).toContain("b");
      });

      it("returns empty when nothing depends on the path", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: [] });
        expect(graph.getDependents("a")).toEqual([]);
      });
    });

    describe("allPaths", () => {
      it("returns sorted paths", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "c", dependencies: [] });
        graph.addNode({ path: "a", dependencies: [] });
        graph.addNode({ path: "b", dependencies: [] });
        expect(graph.allPaths).toEqual(["a", "b", "c"]);
      });
    });
  });

  describe("buildDependencyGraph", () => {
    it("returns empty graph for nonexistent root", () => {
      const graph = buildDependencyGraph("/nonexistent/path/xyz");
      expect(graph.size).toBe(0);
    });

    it("parses package.json manifest", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-test-"));
      try {
        const pkg = {
          name: "test-pkg",
          dependencies: { lodash: "^4.0.0" },
          devDependencies: { vitest: "^1.0.0" },
        };
        fs.writeFileSync(
          path.join(tmpDir, "package.json"),
          JSON.stringify(pkg),
        );
        const graph = buildDependencyGraph(tmpDir);
        const allPaths = graph.allPaths;
        expect(allPaths.length).toBeGreaterThanOrEqual(1);
        for (const p of allPaths) {
          const deps = graph.getDependencies(p);
          expect(deps).toContain("lodash");
          expect(deps).toContain("vitest");
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("scans packages/* subdirectories", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-test-"));
      try {
        const pkgDir = path.join(tmpDir, "packages", "my-lib");
        fs.mkdirSync(pkgDir, { recursive: true });
        const pkg = { name: "my-lib", dependencies: { express: "^4.0.0" } };
        fs.writeFileSync(
          path.join(pkgDir, "package.json"),
          JSON.stringify(pkg),
        );
        const graph = buildDependencyGraph(tmpDir);
        const allPaths = graph.allPaths;
        expect(allPaths.length).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("parses pyproject.toml manifest", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-test-"));
      try {
        const content = `[project]\nname = "test"\ndependencies = [\n  "requests>=2.0",\n  "click>=8.0",\n]\n`;
        fs.writeFileSync(path.join(tmpDir, "pyproject.toml"), content);
        const graph = buildDependencyGraph(tmpDir);
        const allPaths = graph.allPaths;
        expect(allPaths.length).toBe(1);
        const deps = graph.getDependencies(allPaths[0] as string);
        expect(deps).toContain("requests");
        expect(deps).toContain("click");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("parses pom.xml manifest", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-test-"));
      try {
        const content = `<project><dependencies><dependency><artifactId>spring-core</artifactId></dependency><dependency><artifactId>junit</artifactId></dependency></dependencies></project>`;
        fs.writeFileSync(path.join(tmpDir, "pom.xml"), content);
        const graph = buildDependencyGraph(tmpDir);
        const allPaths = graph.allPaths;
        expect(allPaths.length).toBe(1);
        const deps = graph.getDependencies(allPaths[0] as string);
        expect(deps).toContain("spring-core");
        expect(deps).toContain("junit");
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("returns empty graph for dir with no manifests", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-test-"));
      try {
        fs.writeFileSync(path.join(tmpDir, "readme.txt"), "hello");
        const graph = buildDependencyGraph(tmpDir);
        expect(graph.size).toBe(0);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("getReachableFiles", () => {
    // These four tests used to assert that an unresolvable query returns its
    // own input — which is how a fabricated "Reachable files: N" survived,
    // where N was the input size. They now assert the honest report.

    it("reports the starting points it could not resolve, and reaches nothing", () => {
      // The old expectation was `['a.ts','b.ts']`. That said "these two files
      // are reachable" when the graph was EMPTY and nothing was traversed.
      const graph = new DependencyGraph();
      const result = getReachableFiles(["a.ts", "b.ts"], graph);
      expect(result.reachable).toEqual([]);
      expect(result.unresolvedStarts).toEqual(["a.ts", "b.ts"]);
      expect(result.resolvedAny).toBe(false);
    });

    it("follows dependency chain", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "test.spec.ts", dependencies: ["src.ts"] });
      graph.addNode({ path: "src.ts", dependencies: ["lib.ts"] });
      graph.addNode({ path: "lib.ts", dependencies: [] });
      const { reachable, unresolvedStarts } = getReachableFiles(
        ["test.spec.ts"],
        graph,
      );
      expect(reachable).toContain("test.spec.ts");
      expect(reachable).toContain("src.ts");
      expect(reachable).toContain("lib.ts");
      expect(unresolvedStarts).toEqual([]);
    });

    it("handles diamond dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b", "c"] });
      graph.addNode({ path: "b", dependencies: ["d"] });
      graph.addNode({ path: "c", dependencies: ["d"] });
      graph.addNode({ path: "d", dependencies: [] });
      expect(getReachableFiles(["a"], graph).reachable).toEqual([
        "a",
        "b",
        "c",
        "d",
      ]);
    });

    it("deduplicates reachable files", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["c"] });
      graph.addNode({ path: "b", dependencies: ["c"] });
      graph.addNode({ path: "c", dependencies: [] });
      const { reachable } = getReachableFiles(["a", "b"], graph);
      expect(reachable.filter((f) => f === "c")).toHaveLength(1);
    });

    it("a source path is NOT resolvable against a manifest-keyed graph", () => {
      // The defect this whole change exists for, locked.
      //
      // `buildDependencyGraph` keys nodes by MANIFEST path; callers pass
      // SOURCE paths. Every lookup missed, so the function returned its input
      // unchanged and the caller printed that as "Reachable files: N". This
      // is the shape production actually produces, and the four tests above
      // never built it — they hand-built a graph keyed by the very paths being
      // queried, so the seam was never exercised.
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-graph-"));
      try {
        fs.writeFileSync(path.join(root, "package.json"), '{"name":"root"}');
        fs.mkdirSync(path.join(root, "packages", "a"), { recursive: true });
        fs.writeFileSync(
          path.join(root, "packages", "a", "package.json"),
          '{"name":"a","dependencies":{"root":"1.0.0"}}',
        );
        const graph = buildDependencyGraph(root);
        expect(graph.size).toBeGreaterThan(0);

        const result = getReachableFiles(
          ["packages/a/tests/a.spec.ts", "tests/b.spec.ts"],
          graph,
        );
        // Honest: the graph resolved NEITHER source path, so nothing is
        // claimed reachable and both are named as unresolved.
        expect(result.reachable).toEqual([]);
        expect(result.unresolvedStarts).toEqual([
          "packages/a/tests/a.spec.ts",
          "tests/b.spec.ts",
        ]);
        expect(result.resolvedAny).toBe(false);
        // The specific number that used to be fabricated.
        expect(result.reachable.length).not.toBe(2);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
