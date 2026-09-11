/**
 * Jenkins adapter (P3c) — discovery, honest accounting, and the
 * crash-isolation contract. The Jenkinsfile is a TEXT-target kind:
 * runRules delivers raw text with no ast (mirrors the workflow adapters'
 * arms; there is no parse-skip signal because nothing is parsed).
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { jenkinsAdapter } from "../../../src/adapters/jenkins.js";
import type { ScanContext } from "../../../src/engine/adapter.js";

const tmpRoots: string[] = [];

function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-jf-"));
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
    workspace: { root, name: "jf", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Date.now() + 5_000,
    maxFiles: 100,
    ignoreMatcher: { isIgnored: () => false },
    onSkippedFile: vi.fn(),
    onDiscoveryTruncated: vi.fn(),
    ...over,
  };
}

describe("jenkinsAdapter.isTestFile", () => {
  it("claims only the root Jenkinsfile", () => {
    expect(jenkinsAdapter.isTestFile("Jenkinsfile")).toBe(true);
    expect(jenkinsAdapter.isTestFile("ci/Jenkinsfile")).toBe(false);
    expect(jenkinsAdapter.isTestFile("Jenkinsfile.dev")).toBe(false);
  });
});

describe("jenkinsAdapter.discoverTestFiles", () => {
  it("discovers the root Jenkinsfile", () => {
    const root = makeRoot({ Jenkinsfile: "pipeline {\n}\n" });
    const ctx = ctxFor(root);
    jenkinsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.onSkippedFile).not.toHaveBeenCalled();
  });

  it("discovers nothing without a Jenkinsfile", () => {
    const root = makeRoot({ "package.json": "{}\n" });
    const ctx = ctxFor(root);
    jenkinsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
  });
});

describe("jenkinsAdapter.runRules", () => {
  it("delivers raw text with no ast and emits findings", () => {
    const seen: Array<{ path: string; text: string; ast?: unknown }> = [];
    const emitted: string[] = [];
    jenkinsAdapter.runRules(
      [
        {
          id: "QA-CI-TEST",
          category: "QA-CI",
          appliesTo: ["jenkins"],
          run(file) {
            seen.push(file);
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
        },
      ],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      (_f, ruleId) => emitted.push(ruleId),
    );
    expect(emitted).toEqual(["QA-CI-TEST"]);
    expect(seen[0]).toEqual({ path: "Jenkinsfile", text: "pipeline {\n}\n" });
  });

  it("isolates a crashing rule into onCrash and keeps the sibling running", () => {
    const onCrash = vi.fn();
    const emitted: string[] = [];
    jenkinsAdapter.runRules(
      [
        {
          id: "QA-CI-CRASH",
          category: "QA-CI",
          appliesTo: ["jenkins"],
          run() {
            throw new Error("boom");
          },
        },
        {
          id: "QA-CI-OK",
          category: "QA-CI",
          appliesTo: ["jenkins"],
          run: () => [
            {
              severity: "error" as const,
              confidence: "high" as const,
              findingType: "deterministic-defect" as const,
              qaImpact: "FALSE-GREEN" as const,
              file: "Jenkinsfile",
              line: 1,
              column: 1,
              message: "ok",
              why: "w",
              fix: "f",
            },
          ],
        },
      ],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      (_f, ruleId) => emitted.push(ruleId),
      onCrash,
    );
    expect(onCrash).toHaveBeenCalledWith("QA-CI-CRASH", expect.any(Error));
    expect(emitted).toEqual(["QA-CI-OK"]);
  });

  it("routes only rules that declare this adapter", () => {
    const run = vi.fn();
    jenkinsAdapter.runRules(
      [
        {
          id: "QA-OTHER",
          category: "QA-PW",
          appliesTo: ["typescript"],
          run,
        },
      ],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      () => {},
    );
    expect(run).not.toHaveBeenCalled();
  });
});
