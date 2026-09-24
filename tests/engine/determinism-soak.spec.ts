/**
 * TI-015 — Determinism soak test.
 *
 * Two scans with identical semantic run identity MUST produce
 * identical trust results. This test exercises the full identity
 * construction with adversarial inputs to verify determinism.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runScan } from "../../src/engine/scan-pipeline.js";
import type { ScanResult } from "../../src/types.js";

import {
  buildRunIdentity,
  buildEvidenceGraph,
  type RunIdentityInput,
} from "../../src/engine/run-identity.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function trustResult(result: ScanResult) {
  return {
    findings: result.findings,
    score: result.score,
    dimensions: result.dimensions,
    rawDeductions: result.rawDeductions,
    effectiveDeductions: result.effectiveDeductions,
    trustSummary: result.trustSummary,
    scopeIntegrity: result.scopeIntegrity,
    analysisStatus: { ...result.analysisStatus, durationMs: undefined },
    partial: result.partial,
    testFileCount: result.testFileCount,
    testDeclarationCount: result.testDeclarationCount,
  };
}

describe("TI-015: determinism soak", () => {
  it("repeated real scans with identical identity produce identical trust results", async () => {
    const directory = mkdtempSync(join(process.cwd(), ".ti015-"));
    directories.push(directory);
    writeFileSync(
      join(directory, "checkout.spec.ts"),
      `import { test, expect } from '@playwright/test';\ntest('checkout', async ({ page }) => {\n  await page.waitForTimeout(3000);\n  expect(true).toBe(true);\n});\n`,
    );
    writeFileSync(
      join(directory, "mjolnir.report.json"),
      JSON.stringify({
        suites: [
          {
            specs: [
              {
                title: "checkout",
                file: "checkout.spec.ts",
                line: 2,
                tests: [
                  {
                    results: [
                      { status: "failed", duration: 10 },
                      { status: "passed", duration: 10 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const args = {
      target: directory,
      maxDurationMs: Number.POSITIVE_INFINITY,
      json: true,
      verbose: false,
      scopeChanged: false,
      format: "json" as const,
      cache: false,
    };
    const baseline = await runScan(args);
    expect(baseline.partial).toBe(false);
    expect(baseline.runIdentity?.scanId).toMatch(/^[a-f0-9]{64}$/);
    expect(baseline.findings.some((f) => f.ruleId === "QA-PW-101")).toBe(true);
    expect(
      baseline.findings.some((f) => f.runtimeCorroboration !== undefined),
    ).toBe(true);
    expect(baseline.trustSummary).toBeDefined();
    for (let i = 0; i < 5; i++) {
      const result = await runScan(args);
      expect(result.runIdentity).toEqual(baseline.runIdentity);
      expect(trustResult(result)).toEqual(trustResult(baseline));
    }
  });
  describe("adversarial file ordering", () => {
    it("different readdir order produces same identity", () => {
      const files = Array.from({ length: 50 }, (_, i) => ({
        path: `src/module-${String(i).padStart(3, "0")}.ts`,
        size: 100 + i,
      }));

      const shuffled = [...files].reverse();
      const inputA: RunIdentityInput = {
        files,
        rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
        config: null,
        engineVersion: "1.1.1",
      };
      const inputB: RunIdentityInput = {
        files: shuffled,
        rules: [{ id: "QA-TEST-001", detectorRevision: 1 }],
        config: null,
        engineVersion: "1.1.1",
      };

      const a = buildRunIdentity(inputA);
      const b = buildRunIdentity(inputB);
      expect(a.scanId).toBe(b.scanId);
    });
  });

  describe("adversarial rule ordering", () => {
    it("rules registered in different order produce same identity", () => {
      const rules = [
        { id: "QA-PW-101", detectorRevision: 1 },
        { id: "QA-TEST-001", detectorRevision: 2 },
        { id: "QA-CI-001", detectorRevision: 1 },
        { id: "QA-PY-003", detectorRevision: 3 },
      ];

      const inputA: RunIdentityInput = {
        files: [{ path: "test.spec.ts", size: 50 }],
        rules,
        config: {},
        engineVersion: "1.1.1",
      };
      const inputB: RunIdentityInput = {
        files: [{ path: "test.spec.ts", size: 50 }],
        rules: [...rules].reverse(),
        config: {},
        engineVersion: "1.1.1",
      };

      const a = buildRunIdentity(inputA);
      const b = buildRunIdentity(inputB);
      expect(a.scanId).toBe(b.scanId);
    });
  });

  describe("config key ordering", () => {
    it("canonicalizes config key ordering", () => {
      // NOTE: buildRunIdentity uses JSON.stringify for config, which
      // preserves insertion order. Different key order = different fingerprint.
      // This is a known limitation — callers must canonicalize config before
      // passing it to buildRunIdentity if key ordering varies.
      const inputA: RunIdentityInput = {
        files: [],
        rules: [],
        config: { z: 1, a: 2 },
        engineVersion: "1.1.1",
      };
      const inputB: RunIdentityInput = {
        files: [],
        rules: [],
        config: { a: 2, z: 1 },
        engineVersion: "1.1.1",
      };

      const a = buildRunIdentity(inputA);
      const b = buildRunIdentity(inputB);
      expect(a.configFingerprint).toBe(b.configFingerprint);
    });

    it("same config object produces same fingerprint", () => {
      const config = { a: 2, z: 1 };
      const inputA: RunIdentityInput = {
        files: [],
        rules: [],
        config,
        engineVersion: "1.1.1",
      };
      const inputB: RunIdentityInput = {
        files: [],
        rules: [],
        config,
        engineVersion: "1.1.1",
      };

      const a = buildRunIdentity(inputA);
      const b = buildRunIdentity(inputB);
      expect(a.configFingerprint).toBe(b.configFingerprint);
    });
  });

  describe("null/undefined config", () => {
    it("null config produces stable fingerprint", () => {
      const input: RunIdentityInput = {
        files: [],
        rules: [],
        config: null,
        engineVersion: "1.1.1",
      };
      const a = buildRunIdentity(input);
      const b = buildRunIdentity(input);
      expect(a.configFingerprint).toBe(b.configFingerprint);
    });
  });

  describe("evidence graph", () => {
    it("chain links are always present in full order", () => {
      const graph = buildEvidenceGraph({});
      const expected = [
        "verdict",
        "evidence",
        "execution",
        "scope",
        "source",
        "rule",
        "fixture",
        "reproduction",
      ];
      expect(graph.chain.map((n) => n.link)).toEqual(expected);
    });

    it("links with known refs carry them", () => {
      const runId = buildRunIdentity({
        files: [],
        rules: [],
        config: null,
        engineVersion: "1.1.1",
      });
      const graph = buildEvidenceGraph({
        runId,
        source: "jest-json",
        fixture: "corpus-v1",
        reproduction: "commit-abc",
      });

      const execution = graph.chain.find((n) => n.link === "execution");
      expect(execution?.ref).toBe(runId.scanId);

      const rule = graph.chain.find((n) => n.link === "rule");
      expect(rule?.ref).toBe(runId.rulesDigest);
    });

    it("links without known refs omit the ref field", () => {
      const graph = buildEvidenceGraph({});
      for (const node of graph.chain) {
        expect(node.ref).toBeUndefined();
      }
    });
  });
});
