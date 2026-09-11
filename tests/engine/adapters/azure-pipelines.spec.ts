/**
 * Azure DevOps adapter (P3b) — discovery, honest accounting, and the
 * parse-skip/crash-isolation contract, mirroring the GitHub Actions
 * adapter spec's arms.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { azurePipelinesAdapter } from "../../../src/adapters/azure-pipelines.js";
import type { ScanContext } from "../../../src/engine/adapter.js";

const tmpRoots: string[] = [];

function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-az-"));
  tmpRoots.push(root);
  for (const [name, body] of Object.entries(files)) {
    const p = join(root, name);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, body);
  }
  return root;
}

afterEach(() => {
  while (tmpRoots.length) rmSync(tmpRoots.pop() as string, { recursive: true });
});

function ctxFor(root: string, over: Partial<ScanContext> = {}): ScanContext {
  return {
    workspace: { root, name: "az", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Date.now() + 5_000,
    maxFiles: 100,
    ignoreMatcher: { isIgnored: () => false },
    onSkippedFile: vi.fn(),
    onDiscoveryTruncated: vi.fn(),
    ...over,
  };
}

describe("azurePipelinesAdapter.isTestFile", () => {
  it("claims only the root pipeline file names (both spellings)", () => {
    expect(azurePipelinesAdapter.isTestFile("azure-pipelines.yml")).toBe(true);
    expect(azurePipelinesAdapter.isTestFile("azure-pipelines.yaml")).toBe(true);
    expect(azurePipelinesAdapter.isTestFile("nested/azure-pipelines.yml")).toBe(
      false,
    );
    expect(azurePipelinesAdapter.isTestFile("ci.yml")).toBe(false);
  });
});

describe("azurePipelinesAdapter.discoverTestFiles", () => {
  it("discovers the root azure-pipelines.yml", () => {
    const root = makeRoot({
      "azure-pipelines.yml": "steps:\n  - script: npm test\n",
    });
    const ctx = ctxFor(root);
    azurePipelinesAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.onSkippedFile).not.toHaveBeenCalled();
  });

  it("ignores a root azure-pipelines.yaml when the .yml spelling exists (first-match)", () => {
    const root = makeRoot({
      "azure-pipelines.yml": "steps:\n  - script: npm test\n",
      "azure-pipelines.yaml": "steps:\n  - script: npm test\n",
    });
    const ctx = ctxFor(root);
    azurePipelinesAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.testFiles[0]?.endsWith("azure-pipelines.yml")).toBe(true);
  });

  it("discovers nothing without a pipeline file and skips nothing", () => {
    const root = makeRoot({ "package.json": "{}\n" });
    const ctx = ctxFor(root);
    azurePipelinesAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
    expect(ctx.onSkippedFile).not.toHaveBeenCalled();
  });
});

describe("azurePipelinesAdapter.runRules", () => {
  it("hands rules the parsed Azure doc through the ast slot and emits findings", () => {
    const seen: unknown[] = [];
    const emitted: string[] = [];
    const rule = {
      id: "QA-CI-TEST",
      category: "QA-CI",
      appliesTo: ["azure-pipelines"],
      run(file: { path: string; text: string; ast?: unknown }) {
        seen.push(file.ast);
        return [
          {
            severity: "error" as const,
            confidence: "high" as const,
            findingType: "deterministic-defect" as const,
            qaImpact: "FALSE-GREEN" as const,
            file: file.path,
            line: 1,
            column: 1,
            message: "x",
            why: "w",
            fix: "f",
          },
        ];
      },
    };
    azurePipelinesAdapter.runRules(
      [rule],
      {
        path: "azure-pipelines.yml",
        text: "steps:\n  - script: npm test\n",
      },
      (f, ruleId) => emitted.push(ruleId),
    );
    expect(emitted).toEqual(["QA-CI-TEST"]);
    expect(seen[0]).toMatchObject({ platform: "azure-pipelines" });
  });

  it("routes only rules that declare this adapter", () => {
    const run = vi.fn();
    azurePipelinesAdapter.runRules(
      [
        {
          id: "QA-OTHER",
          category: "QA-PW",
          appliesTo: ["typescript"],
          run,
        },
      ],
      { path: "azure-pipelines.yml", text: "steps:\n  - script: npm test\n" },
      () => {},
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("throws the counted parse-skip signal on hostile YAML", () => {
    expect(() =>
      azurePipelinesAdapter.runRules(
        [
          {
            id: "QA-CI-TEST",
            category: "QA-CI",
            appliesTo: ["azure-pipelines"],
            run: () => [],
          },
        ],
        { path: "azure-pipelines.yml", text: "{[[[[\n" },
        () => {},
      ),
    ).toThrow();
  });

  it("isolates a crashing rule into onCrash and keeps the sibling running", () => {
    const onCrash = vi.fn();
    const emitted: string[] = [];
    const crasher = {
      id: "QA-CI-CRASH",
      category: "QA-CI",
      appliesTo: ["azure-pipelines"],
      run() {
        throw new Error("boom");
      },
    };
    const healthy = {
      id: "QA-CI-OK",
      category: "QA-CI",
      appliesTo: ["azure-pipelines"],
      run: () => [
        {
          severity: "error" as const,
          confidence: "high" as const,
          findingType: "deterministic-defect" as const,
          qaImpact: "FALSE-GREEN" as const,
          file: "azure-pipelines.yml",
          line: 1,
          column: 1,
          message: "ok",
          why: "w",
          fix: "f",
        },
      ],
    };
    azurePipelinesAdapter.runRules(
      [crasher, healthy],
      { path: "azure-pipelines.yml", text: "steps:\n  - script: npm test\n" },
      (_f, ruleId) => emitted.push(ruleId),
      onCrash,
    );
    expect(onCrash).toHaveBeenCalledWith("QA-CI-CRASH", expect.any(Error));
    expect(emitted).toEqual(["QA-CI-OK"]);
  });
});
