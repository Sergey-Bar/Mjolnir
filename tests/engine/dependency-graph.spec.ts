import { describe, expect, it } from "vitest";
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

      it("follows transitive chain", () => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "a", dependencies: ["b"] });
        graph.addNode({ path: "b", dependencies: ["c"] });
        graph.addNode({ path: "c", dependencies: [] });
        const transitive = graph.getTransitiveDependencies("a");
        expect(transitive).toContain("b");
        expect(transitive).toContain("c");
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
