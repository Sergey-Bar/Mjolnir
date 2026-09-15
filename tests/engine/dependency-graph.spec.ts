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
    it("returns starting files when graph is empty", () => {
      const graph = new DependencyGraph();
      expect(getReachableFiles(["a.ts", "b.ts"], graph)).toEqual([
        "a.ts",
        "b.ts",
      ]);
    });

    it("follows dependency chain", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "test.spec.ts", dependencies: ["src.ts"] });
      graph.addNode({ path: "src.ts", dependencies: ["lib.ts"] });
      graph.addNode({ path: "lib.ts", dependencies: [] });
      const reachable = getReachableFiles(["test.spec.ts"], graph);
      expect(reachable).toContain("test.spec.ts");
      expect(reachable).toContain("src.ts");
      expect(reachable).toContain("lib.ts");
    });

    it("handles diamond dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b", "c"] });
      graph.addNode({ path: "b", dependencies: ["d"] });
      graph.addNode({ path: "c", dependencies: ["d"] });
      graph.addNode({ path: "d", dependencies: [] });
      const reachable = getReachableFiles(["a"], graph);
      expect(reachable).toEqual(["a", "b", "c", "d"]);
    });

    it("deduplicates reachable files", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["c"] });
      graph.addNode({ path: "b", dependencies: ["c"] });
      graph.addNode({ path: "c", dependencies: [] });
      const reachable = getReachableFiles(["a", "b"], graph);
      const cCount = reachable.filter((f) => f === "c").length;
      expect(cCount).toBe(1);
    });
  });
});
