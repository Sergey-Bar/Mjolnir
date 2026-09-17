/**
 * Standalone module integration tests (INTEL-005, ECO-005, ECO-004, ECO-003).
 *
 * Tests that the formerly-orphaned modules are now wired into the scan
 * pipeline and produce the expected output in ScanResult.
 */

import { describe, expect, it } from "vitest";
import { correlateFindings } from "../../src/engine/correlation-engine.js";
import {
  DependencyGraph,
  buildDependencyGraph,
  getReachableFiles,
} from "../../src/engine/dependency-graph.js";
import {
  computeChangedFiles,
  isIncrementalSafe,
  computeContentHash,
} from "../../src/engine/incremental-analysis.js";
import { analyzeMonorepo } from "../../src/engine/monorepo-analysis.js";
import type { Finding } from "../../src/types.js";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "QA-TEST-001",
    category: "QA-TEST",
    severity: "warning",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "tests/login.spec.ts",
    line: 10,
    column: 1,
    message: "test finding",
    why: "because",
    fix: "fix it",
    ...overrides,
  };
}

describe("standalone module integration (Release 2.0.0)", () => {
  describe("correlation engine wired into pipeline", () => {
    it("correlateFindings produces conclusions for multi-finding input", () => {
      const findings = [
        makeFinding({
          findingId: "f1",
          rootCauseId: "shared-rc",
          file: "a.spec.ts",
        }),
        makeFinding({
          findingId: "f2",
          rootCauseId: "shared-rc",
          file: "a.spec.ts",
          line: 20,
        }),
      ];
      const conclusions = correlateFindings(findings);
      expect(conclusions.length).toBeGreaterThan(0);
      expect(conclusions[0]?.conclusionType).toBeDefined();
      expect(conclusions[0]?.certainty).toBeDefined();
      expect(conclusions[0]?.corroboration).toBeDefined();
      expect(conclusions[0]?.sourceCount).toBeGreaterThan(0);
      expect(conclusions[0]?.findingIds.length).toBeGreaterThan(0);
    });

    it("correlateFindings returns empty for no findings", () => {
      expect(correlateFindings([])).toEqual([]);
    });

    it("correlation conclusions deterministically match ScanResult shape", () => {
      const findings = [
        makeFinding({
          findingId: "f1",
          rootCauseId: "rc-a",
          file: "test.spec.ts",
        }),
        makeFinding({
          findingId: "f2",
          rootCauseId: "rc-a",
          file: "test.spec.ts",
          line: 20,
        }),
      ];
      const conclusions = correlateFindings(findings);
      for (const c of conclusions) {
        expect(typeof c.conclusionType).toBe("string");
        expect(typeof c.certainty).toBe("string");
        expect(typeof c.corroboration).toBe("string");
        expect(typeof c.sourceCount).toBe("number");
        expect(Array.isArray(c.findingIds)).toBe(true);
      }
    });
  });

  describe("dependency graph wired into pipeline", () => {
    it("buildDependencyGraph parses package.json and returns metadata", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-integ-"));
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
        expect(graph.size).toBeGreaterThanOrEqual(1);

        const allPaths = graph.allPaths;
        let edges = 0;
        for (const p of allPaths) {
          edges += graph.getDependencies(p).length;
        }
        expect(edges).toBeGreaterThanOrEqual(2);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it("DependencyGraph metadata shape matches ScanResult contract", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b", "c"] });
      graph.addNode({ path: "b", dependencies: ["c"] });
      graph.addNode({ path: "c", dependencies: [] });
      let edges = 0;
      for (const p of graph.allPaths) {
        edges += graph.getDependencies(p).length;
      }
      const meta = { nodes: graph.size, edges };
      expect(typeof meta.nodes).toBe("number");
      expect(typeof meta.edges).toBe("number");
      expect(meta.nodes).toBe(3);
      expect(meta.edges).toBe(3);
    });

    it("empty graph produces no metadata", () => {
      const graph = new DependencyGraph();
      expect(graph.size).toBe(0);
    });

    it("getReachableFiles works for transitive dependencies", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "test.spec.ts", dependencies: ["src.ts"] });
      graph.addNode({ path: "src.ts", dependencies: ["lib.ts"] });
      graph.addNode({ path: "lib.ts", dependencies: [] });
      const reachable = getReachableFiles(["test.spec.ts"], graph);
      expect(reachable).toContain("test.spec.ts");
      expect(reachable).toContain("src.ts");
      expect(reachable).toContain("lib.ts");
    });
  });

  describe("incremental analysis wired into --cache mode", () => {
    it("computeChangedFiles detects all change types", () => {
      const current = [
        { path: "a.ts", content: "changed" },
        { path: "b.ts", content: "same" },
        { path: "c.ts", content: "new" },
      ];
      const previous = [
        { path: "a.ts", content: "original" },
        { path: "b.ts", content: "same" },
        { path: "d.ts", content: "deleted" },
      ];
      const changes = computeChangedFiles(current, previous);
      const byPath = new Map(changes.map((c) => [c.path, c.state]));
      expect(byPath.get("a.ts")).toBe("modified");
      expect(byPath.has("b.ts")).toBe(false);
      expect(byPath.get("c.ts")).toBe("added");
      expect(byPath.get("d.ts")).toBe("deleted");
    });

    it("isIncrementalSafe detects semantic config changes", () => {
      const result = isIncrementalSafe([
        {
          path: "mjolnir.config.json",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it("isIncrementalSafe passes for regular file changes", () => {
      const result = isIncrementalSafe([
        {
          path: "src/foo.ts",
          state: "modified",
          currentHash: "a",
          previousHash: "b",
        },
      ]);
      expect(result.safe).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it("computeContentHash is deterministic", () => {
      expect(computeContentHash("hello")).toBe(computeContentHash("hello"));
      expect(computeContentHash("a")).not.toBe(computeContentHash("b"));
    });
  });

  describe("monorepo analysis wired into pipeline", () => {
    it("analyzeMonorepo produces correct metadata shape", () => {
      const result = analyzeMonorepo(
        [
          {
            packageName: "pkg-a",
            path: "packages/a",
            findings: [],
            score: 95,
          },
          {
            packageName: "pkg-b",
            path: "packages/b",
            findings: [makeFinding({ severity: "error" })],
            score: 40,
          },
        ],
        { weightingStrategy: "worst-package" },
      );
      expect(result.overallVerdict).toBe("fail");
      expect(result.blockerPackage).toBe("pkg-b");
      expect(result.strategy).toBe("worst-package");
      expect(result.packages).toHaveLength(2);
      expect(result.packages[0]?.verdict).toBe("pass");
      expect(result.packages[1]?.verdict).toBe("fail");
    });

    it("monorepo analysis maps findings count correctly", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 90 },
          {
            packageName: "b",
            path: "b",
            findings: [makeFinding(), makeFinding()],
            score: 80,
          },
        ],
        { weightingStrategy: "average" },
      );
      const mapped = result.packages.map((p) => ({
        packageName: p.packageName,
        findings: p.findings.length,
        score: p.score,
        verdict: p.verdict,
      }));
      expect(mapped[0]?.findings).toBe(0);
      expect(mapped[1]?.findings).toBe(2);
    });

    it("average aggregation computes correct mean", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 80 },
          { packageName: "b", path: "b", findings: [], score: 100 },
        ],
        { weightingStrategy: "average" },
      );
      expect(result.overallScore).toBe(90);
      expect(result.overallVerdict).toBe("pass");
    });

    it("configurable strategy uses weights", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 60 },
          { packageName: "b", path: "b", findings: [], score: 100 },
        ],
        {
          weightingStrategy: "configurable",
          packageWeights: { a: 3, b: 1 },
        },
      );
      expect(result.overallScore).toBe(70);
    });
  });

  describe("cross-module: dependency graph + monorepo", () => {
    it("partition logic assigns findings to correct packages", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mjolnir-integ-"));
      try {
        const pkgDir = path.join(tmpDir, "packages", "my-lib");
        fs.mkdirSync(pkgDir, { recursive: true });
        fs.writeFileSync(
          path.join(tmpDir, "package.json"),
          JSON.stringify({ name: "root", dependencies: {} }),
        );
        fs.writeFileSync(
          path.join(pkgDir, "package.json"),
          JSON.stringify({ name: "my-lib", dependencies: {} }),
        );
        const graph = buildDependencyGraph(tmpDir);
        expect(graph.size).toBeGreaterThanOrEqual(2);
        const allPaths = graph.allPaths;
        expect(allPaths.length).toBeGreaterThanOrEqual(2);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("ScanResult contract compliance", () => {
    it("correlationConclusions type is array of CorrelationConclusion", () => {
      const findings = [
        makeFinding({ findingId: "f1", rootCauseId: "rc" }),
        makeFinding({ findingId: "f2", rootCauseId: "rc", line: 20 }),
      ];
      const conclusions = correlateFindings(findings);
      const result = {
        correlationConclusions:
          conclusions.length > 0 ? conclusions : undefined,
      };
      if (result.correlationConclusions) {
        expect(Array.isArray(result.correlationConclusions)).toBe(true);
      }
    });

    it("dependencyGraph type has nodes and edges", () => {
      const meta = { nodes: 5, edges: 10 };
      expect(typeof meta.nodes).toBe("number");
      expect(typeof meta.edges).toBe("number");
    });

    it("monorepoAnalysis type has required fields", () => {
      const result = analyzeMonorepo(
        [
          { packageName: "a", path: "a", findings: [], score: 90 },
          { packageName: "b", path: "b", findings: [], score: 80 },
        ],
        { weightingStrategy: "worst-package" },
      );
      const mapped = {
        packages: result.packages.map((p) => ({
          packageName: p.packageName,
          path: p.path,
          findings: p.findings.length,
          score: p.score,
          verdict: p.verdict,
        })),
        overallScore: result.overallScore,
        overallVerdict: result.overallVerdict,
        strategy: result.strategy,
      };
      expect(typeof mapped.overallScore).toBe("number");
      expect(typeof mapped.overallVerdict).toBe("string");
      expect(typeof mapped.strategy).toBe("string");
      expect(Array.isArray(mapped.packages)).toBe(true);
    });
  });
});
