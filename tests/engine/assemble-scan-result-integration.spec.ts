/**
 * assembleScanResult integration tests — standalone module wiring.
 *
 * Tests that assembleScanResult correctly integrates:
 * - correlationConclusions (INTEL-005)
 * - dependencyGraph metadata (ECO-005)
 * - monorepoAnalysis (ECO-003)
 *
 * These tests call assembleScanResult with synthetic inputs to verify
 * the new additive fields appear in ScanResult.
 */

import { describe, expect, it } from "vitest";
import { assembleScanResult } from "../../src/engine/scan-pipeline.js";
import { DependencyGraph } from "../../src/engine/dependency-graph.js";
import type { Finding } from "../../src/types.js";
import { disabledScanCache } from "../../src/engine/scan-cache.js";

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
    findingId: "fp-1",
    rootCauseId: "rc-1",
    ...overrides,
  };
}

function minimalInput(
  overrides: Record<string, unknown> = {},
): Parameters<typeof assembleScanResult>[0] {
  return {
    findings: [],
    testFileCount: 5,
    testDeclarationCount: 10,
    declarationsByFile: new Map([
      ["tests/a.spec.ts", 5],
      ["tests/b.spec.ts", 5],
    ]),
    skippedFiles: 0,
    rulesCrashed: 0,
    truncationReasons: new Set<string>(),
    discoveryTruncated: false,
    rulesPartial: false,
    scopeIgnored: 0,
    scopeUnrecognized: 0,
    parseFailed: 0,
    scanned: 2,
    testFiles: ["tests/a.spec.ts", "tests/b.spec.ts"],
    workspace: {
      root: "/test",
      name: "test",
      packageJson: {},
      workspaceGlobs: [],
    },
    scanRoot: {
      root: "/test",
      name: "test",
      packageJson: {},
      workspaceGlobs: [],
    },
    args: {
      target: "/test",
      json: false,
      verbose: false,
      maxDurationMs: 30000,
      scopeChanged: false,
      format: "json" as const,
    },
    hooks: {},
    cache: disabledScanCache,
    REVISION_BY_RULE_ID: new Map([["QA-TEST-001", 1]]),
    pluginsLoaded: [],
    scopeInfo: { scope: "all" as const },
    suppressionCount: 0,
    frameworks: { frameworks: [], unknown: false },
    runtimeReportPath: undefined,
    config: undefined,
    fileProvenance: [],
    started: Date.now() - 100,
    stagedSurface: false,
    ...overrides,
  };
}

describe("assembleScanResult — standalone module wiring", () => {
  describe("INTEL-005: correlationConclusions", () => {
    it("includes correlationConclusions when findings are present", () => {
      const findings = [
        makeFinding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          file: "test.spec.ts",
        }),
        makeFinding({
          findingId: "f2",
          rootCauseId: "rc-shared",
          file: "test.spec.ts",
          line: 20,
        }),
      ];
      const result = assembleScanResult(minimalInput({ findings }));
      expect(result.correlationConclusions).toBeDefined();
      expect(result.correlationConclusions?.length).toBeGreaterThan(0);
    });

    it("omits correlationConclusions when no findings", () => {
      const result = assembleScanResult(minimalInput({ findings: [] }));
      expect(result.correlationConclusions).toBeUndefined();
    });

    it("correlationConclusions are deterministic", () => {
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
      const r1 = assembleScanResult(minimalInput({ findings }));
      const r2 = assembleScanResult(minimalInput({ findings }));
      expect(r1.correlationConclusions).toEqual(r2.correlationConclusions);
    });

    it("correlationConclusions are not mutated by scoring", () => {
      const findings = [
        makeFinding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          file: "test.spec.ts",
          severity: "error",
        }),
        makeFinding({
          findingId: "f2",
          rootCauseId: "rc-shared",
          file: "test.spec.ts",
          line: 20,
          severity: "warning",
        }),
      ];
      const result = assembleScanResult(minimalInput({ findings }));
      expect(result.correlationConclusions).toBeDefined();
      const conclusion = result.correlationConclusions?.[0];
      expect(conclusion).toBeDefined();
      expect(conclusion?.findingIds).toContain("f1");
      expect(conclusion?.findingIds).toContain("f2");
    });
  });

  describe("ECO-005: dependencyGraph metadata", () => {
    it("includes dependencyGraph when graph has nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "a", dependencies: ["b", "c"] });
      graph.addNode({ path: "b", dependencies: ["c"] });
      graph.addNode({ path: "c", dependencies: [] });
      const result = assembleScanResult(
        minimalInput({ dependencyGraph: graph }),
      );
      expect(result.dependencyGraph).toBeDefined();
      expect(result.dependencyGraph?.nodes).toBe(3);
      expect(result.dependencyGraph?.edges).toBe(3);
    });

    it("omits dependencyGraph when graph is empty", () => {
      const graph = new DependencyGraph();
      const result = assembleScanResult(
        minimalInput({ dependencyGraph: graph }),
      );
      expect(result.dependencyGraph).toBeUndefined();
    });

    it("omits dependencyGraph when not provided", () => {
      const result = assembleScanResult(minimalInput());
      expect(result.dependencyGraph).toBeUndefined();
    });

    it("edge count is sum of all dependency references", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "x", dependencies: ["y"] });
      graph.addNode({ path: "y", dependencies: [] });
      const result = assembleScanResult(
        minimalInput({ dependencyGraph: graph }),
      );
      expect(result.dependencyGraph?.edges).toBe(1);
    });
  });

  describe("ECO-003: monorepoAnalysis", () => {
    it("includes monorepoAnalysis when --monorepo and graph has >1 nodes", () => {
      const graph = new DependencyGraph();
      graph.addNode({
        path: "/test/packages/a/package.json",
        dependencies: [],
      });
      graph.addNode({
        path: "/test/packages/b/package.json",
        dependencies: [],
      });
      const findings = [
        makeFinding({
          findingId: "f1",
          file: "packages/a/src/foo.spec.ts",
        }),
        makeFinding({
          findingId: "f2",
          file: "packages/b/src/bar.spec.ts",
        }),
      ];
      const result = assembleScanResult(
        minimalInput({
          findings,
          dependencyGraph: graph,
          args: {
            target: "/test",
            json: false,
            verbose: false,
            maxDurationMs: 30000,
            scopeChanged: false,
            format: "json" as const,
            monorepo: true,
          },
        }),
      );
      expect(result.monorepoAnalysis).toBeDefined();
      expect(result.monorepoAnalysis?.packages.length).toBe(2);
      expect(typeof result.monorepoAnalysis?.overallVerdict).toBe("string");
      expect(["number", "object"]).toContain(
        typeof result.monorepoAnalysis?.overallScore,
      );
    });

    it("omits monorepoAnalysis when --monorepo is not set", () => {
      const graph = new DependencyGraph();
      graph.addNode({
        path: "/test/packages/a/package.json",
        dependencies: [],
      });
      graph.addNode({
        path: "/test/packages/b/package.json",
        dependencies: [],
      });
      const result = assembleScanResult(
        minimalInput({ dependencyGraph: graph }),
      );
      expect(result.monorepoAnalysis).toBeUndefined();
    });

    it("omits monorepoAnalysis when graph has only 1 node", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "/test/package.json", dependencies: [] });
      const result = assembleScanResult(
        minimalInput({
          dependencyGraph: graph,
          args: {
            target: "/test",
            json: false,
            verbose: false,
            maxDurationMs: 30000,
            scopeChanged: false,
            format: "json" as const,
            monorepo: true,
          },
        }),
      );
      expect(result.monorepoAnalysis).toBeUndefined();
    });
  });

  describe("backward compatibility", () => {
    it("existing ScanResult fields are preserved", () => {
      const result = assembleScanResult(minimalInput());
      expect(result.schemaVersion).toBe(1);
      expect(typeof result.partial).toBe("boolean");
      expect(result.score !== undefined).toBe(true);
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.dimensions)).toBe(true);
      expect(result.analysisStatus).toBeDefined();
      expect(result.runIdentity).toBeDefined();
      expect(result.evidenceGraph).toBeDefined();
    });

    it("new fields do not interfere with scoring", () => {
      const findings = [
        makeFinding({
          findingId: "f1",
          rootCauseId: "rc-shared",
          file: "test.spec.ts",
          severity: "error",
        }),
      ];
      const graph = new DependencyGraph();
      graph.addNode({ path: "/test/package.json", dependencies: ["lodash"] });
      const result = assembleScanResult(
        minimalInput({ findings, dependencyGraph: graph }),
      );
      expect(result.score).toBeDefined();
      expect(result.correlationConclusions).toBeDefined();
      expect(result.dependencyGraph).toBeDefined();
      expect(result.trustSummary).toBeDefined();
    });
  });
});
