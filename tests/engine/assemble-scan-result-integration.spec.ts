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
import {
  assembleScanResult,
  summarizeForensicVerdicts,
} from "../../src/engine/scan-pipeline.js";
import { DependencyGraph } from "../../src/engine/dependency-graph.js";
import type { Finding } from "../../src/types.js";
import type { ForensicsReport } from "../../src/forensics/types.js";
import { disabledScanCache } from "../../src/engine/scan-cache.js";

function makeForensicsReport(
  overrides: Partial<ForensicsReport> = {},
): ForensicsReport {
  return {
    forensicsSchemaVersion: 1,
    source: "playwright-json",
    totalTests: 0,
    failed: 0,
    skipped: 0,
    retriedTests: 0,
    flakyTests: 0,
    totalDurationMs: 0,
    verdicts: [],
    analysisComplete: true,
    skippedReports: 0,
    incompleteReasons: [],
    ...overrides,
  };
}

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
    forensicVerdicts: undefined,
    config: {},
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
          ruleId: "QA-PW-102",
          file: "packages/a/src/foo.spec.ts",
        }),
        makeFinding({
          findingId: "f2",
          ruleId: "QA-PW-102",
          file: "packages/b/src/bar.spec.ts",
        }),
      ];
      const result = assembleScanResult(
        minimalInput({
          findings,
          declarationsByFile: new Map([
            ["packages/a/src/foo.spec.ts", 1],
            ["packages/b/src/bar.spec.ts", 9],
          ]),
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
      expect(result.monorepoAnalysis?.packages.map((p) => p.score)).toEqual([
        93, 99,
      ]);
      expect(result.monorepoAnalysis?.overallScore).toBe(93);
      expect(result.monorepoAnalysis?.overallVerdict).toBe("pass");
    });

    it("keeps clean untested packages unknown and assigns root findings to root", () => {
      const graph = new DependencyGraph();
      for (const path of [
        "/test/pyproject.toml",
        "/test/packages/a/package.json",
        "/test/packages/b/package.json",
      ]) {
        graph.addNode({ path, dependencies: [] });
      }
      const input = minimalInput({
        dependencyGraph: graph,
        findings: [
          makeFinding({ ruleId: "QA-PW-102", file: "tests/root.spec.ts" }),
        ],
        declarationsByFile: new Map([
          ["tests/root.spec.ts", 1],
          ["packages/a/a.spec.ts", 2],
          ["packages/b/empty.spec.ts", 0],
        ]),
      });
      input.args.monorepo = true;
      const result = assembleScanResult(input).monorepoAnalysis;
      expect(result?.packages.find((p) => p.path === ".")).toMatchObject({
        findings: 1,
        score: 93,
      });
      expect(
        result?.packages.find((p) => p.path === "packages/a"),
      ).toMatchObject({ findings: 0, score: 100 });
      expect(
        result?.packages.find((p) => p.path === "packages/b"),
      ).toMatchObject({ findings: 0, score: null });
      expect(result?.overallScore).toBeNull();
      expect(result?.overallVerdict).toBe("fail");
    });

    it.each([
      { rulesCrashed: 1 },
      { skippedFiles: 1 },
      { discoveryTruncated: true },
      { rulesPartial: true },
      { parseFailed: 1 },
      { scopeIgnored: 1 },
    ])(
      "does not publish complete package scores from incomplete analysis %j",
      (status) => {
        const graph = new DependencyGraph();
        graph.addNode({ path: "/test/package.json", dependencies: [] });
        graph.addNode({
          path: "/test/packages/a/package.json",
          dependencies: [],
        });
        const input = minimalInput({
          ...status,
          dependencyGraph: graph,
          declarationsByFile: new Map([
            ["root.spec.ts", 1],
            ["packages/a/a.spec.ts", 1],
          ]),
        });
        input.args.monorepo = true;
        expect(
          assembleScanResult(input).monorepoAnalysis?.packages.map(
            (p) => p.score,
          ),
        ).toEqual([null, null]);
      },
    );

    it("keeps changed-scope package scores unknown instead of mixing denominators", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "/test/package.json", dependencies: [] });
      graph.addNode({
        path: "/test/packages/a/package.json",
        dependencies: [],
      });
      const input = minimalInput({ dependencyGraph: graph });
      input.args.monorepo = true;
      input.args.scopeChanged = true;
      expect(
        assembleScanResult(input).monorepoAnalysis?.packages.every(
          (p) => p.score === null,
        ),
      ).toBe(true);
    });

    it("applies suite-invalidating scoring within its owning package", () => {
      const graph = new DependencyGraph();
      graph.addNode({ path: "/test/package.json", dependencies: [] });
      graph.addNode({
        path: "/test/packages/a/package.json",
        dependencies: [],
      });
      const input = minimalInput({
        dependencyGraph: graph,
        declarationsByFile: new Map([
          ["root.spec.ts", 100],
          ["packages/a/a.spec.ts", 100],
        ]),
        findings: [
          makeFinding({
            ruleId: "QA-TEST-001",
            file: "packages/a/a.spec.ts",
            severity: "error",
          }),
        ],
      });
      input.args.monorepo = true;
      const result = assembleScanResult(input).monorepoAnalysis;
      expect(
        result?.packages.find((p) => p.path === "packages/a")?.score,
      ).toBeLessThanOrEqual(49);
      expect(result?.overallVerdict).toBe("fail");
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

  describe("WAVE 5: forensicVerdicts", () => {
    it("includes forensicVerdicts when provided", () => {
      const result = assembleScanResult(
        minimalInput({
          forensicVerdicts: {
            classifications: 3,
            byVerdict: { flaky: 1, inconclusive: 2 },
            inconclusive: 2,
          },
        }),
      );
      expect(result.forensicVerdicts).toEqual({
        classifications: 3,
        byVerdict: { flaky: 1, inconclusive: 2 },
        inconclusive: 2,
      });
    });

    it("omits forensicVerdicts when undefined", () => {
      const result = assembleScanResult(minimalInput());
      expect(result.forensicVerdicts).toBeUndefined();
    });

    it("does not interfere with scoring or other fields", () => {
      const result = assembleScanResult(
        minimalInput({
          forensicVerdicts: {
            classifications: 1,
            byVerdict: { "likely-real-defect": 1 },
            inconclusive: 0,
          },
        }),
      );
      expect(result.score).toBeDefined();
      expect(result.trustSummary).toBeDefined();
    });
  });

  describe("summarizeForensicVerdicts", () => {
    it("returns undefined for an empty report", () => {
      expect(summarizeForensicVerdicts(makeForensicsReport())).toBeUndefined();
    });

    it("returns undefined when no verdict carries a classification", () => {
      const report = makeForensicsReport({
        verdicts: [
          {
            file: "a.spec.ts",
            title: "t",
            attempts: 1,
            finalStatus: "passed",
            totalDurationMs: 1,
            passedOnRetry: false,
            everFailed: false,
            skipped: false,
          },
        ],
      });
      expect(summarizeForensicVerdicts(report)).toBeUndefined();
    });

    it("aggregates classifications and counts inconclusive", () => {
      const report = makeForensicsReport({
        verdicts: [
          {
            file: "a.spec.ts",
            title: "a",
            attempts: 2,
            finalStatus: "passed",
            totalDurationMs: 10,
            passedOnRetry: true,
            everFailed: true,
            skipped: false,
            forensic: {
              verdict: "flaky",
              evidenceState: "exists",
              signals: { environmental: 0, infrastructure: 0, construction: 0 },
            },
          },
          {
            file: "b.spec.ts",
            title: "b",
            attempts: 1,
            finalStatus: "failed",
            totalDurationMs: 10,
            passedOnRetry: false,
            everFailed: true,
            skipped: false,
            forensic: {
              verdict: "likely-real-defect",
              evidenceState: "exists",
              signals: { environmental: 0, infrastructure: 0, construction: 0 },
            },
          },
          {
            file: "c.spec.ts",
            title: "c",
            attempts: 1,
            finalStatus: "skipped",
            totalDurationMs: 0,
            passedOnRetry: false,
            everFailed: false,
            skipped: true,
            forensic: {
              verdict: "inconclusive",
              evidenceState: "insufficient",
              signals: { environmental: 0, infrastructure: 0, construction: 0 },
            },
          },
        ],
      });
      const summary = summarizeForensicVerdicts(report);
      expect(summary).toEqual({
        classifications: 3,
        byVerdict: { flaky: 1, "likely-real-defect": 1, inconclusive: 1 },
        inconclusive: 1,
      });
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
