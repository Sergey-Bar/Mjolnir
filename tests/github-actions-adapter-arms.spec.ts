/**
 * Phase 1 coverage: adapters/github-actions.ts discovery and runRules
 * arms — deadline, fixture-dir skip, unreadable dir, ignore matching,
 * file caps, oversized workflows, lazy-parse guards, and the per-rule
 * budget enforcement inside the rule loop.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const statSync = ((path: string, ...rest: unknown[]) => {
    if (String(path).endsWith("ghost.yml")) {
      throw new Error("stat failed (simulated)");
    }
    return (actual.statSync as unknown as (...a: unknown[]) => unknown)(
      path,
      ...rest,
    );
  }) as typeof actual.statSync;
  return { ...actual, statSync };
});

import {
  githubActionsAdapter,
  WorkflowParseSkipped,
} from "../src/adapters/github-actions.js";
import { createIgnoreMatcher } from "../src/discovery/ignores.js";
import type { ScanContext } from "../src/engine/adapter.js";
import type { UniversalRule } from "../src/engine/adapter.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-gha-arms-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.clearAllMocks();
});

function makeCtx(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    workspace: {
      root,
      name: "probe",
      packageJson: {},
      workspaceGlobs: [],
    },
    testFiles: [],
    deadline: Number.POSITIVE_INFINITY,
    maxFiles: 10_000,
    ignoreMatcher: createIgnoreMatcher(root),
    onSkippedFile: vi.fn(),
    onDiscoveryTruncated: vi.fn(),
    onRuleCrash: vi.fn(),
    ...overrides,
  };
}

function writeWorkflow(name: string, body = "on: push\njobs: {}\n"): string {
  const dir = join(root, ".github", "workflows");
  mkdirSync(dir, { recursive: true });
  const full = join(dir, name);
  writeFileSync(full, body);
  return full;
}

describe("discoverTestFiles guard rails", () => {
  it("reports the deadline truncation before touching the directory", () => {
    writeWorkflow("ci.yml");
    const onDiscoveryTruncated = vi.fn();
    const ctx = makeCtx({
      deadline: Date.now() - 1,
      onDiscoveryTruncated,
    });
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(onDiscoveryTruncated).toHaveBeenCalledWith("deadline");
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("skips a workflows directory that is a lint-fixture shape", () => {
    const dir = join(root, ".github", "workflows");
    mkdirSync(join(dir, "must-fire"), { recursive: true });
    mkdirSync(join(dir, "must-not-fire"), { recursive: true });
    const ctx = makeCtx();
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
    expect(ctx.onDiscoveryTruncated).not.toHaveBeenCalled();
  });

  it("degrades silently when the workflows path is not a directory", () => {
    const dir = join(root, ".github");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "workflows"), "not a directory");
    const ctx = makeCtx();
    expect(() => githubActionsAdapter.discoverTestFiles(ctx)).not.toThrow();
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("honors the ignore matcher", () => {
    writeFileSync(join(root, ".mjolnirignore"), ".github/**\n");
    writeWorkflow("ci.yml");
    const ctx = makeCtx({
      ignoreMatcher: createIgnoreMatcher(root),
    });
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
  });

  it("reports the per-adapter file cap", () => {
    writeWorkflow("ci.yml");
    writeWorkflow("nightly.yml");
    const onDiscoveryTruncated = vi.fn();
    const ctx = makeCtx({ maxFiles: 1, onDiscoveryTruncated });
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(onDiscoveryTruncated).toHaveBeenCalledWith(
      "file-cap:github-actions",
    );
  });

  it("counts a stat-failed workflow as skipped without a reason", () => {
    writeWorkflow("ghost.yml");
    const onSkippedFile = vi.fn();
    const ctx = makeCtx({ onSkippedFile });
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
    expect(onSkippedFile).toHaveBeenCalledWith();
  });

  it("counts an oversized workflow as skipped with a reason", () => {
    writeWorkflow("huge.yml", "on: push\n".repeat(200_000));
    const onSkippedFile = vi.fn();
    const ctx = makeCtx({ onSkippedFile });
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(0);
    expect(onSkippedFile).toHaveBeenCalledWith("file-too-large");
  });
});

describe("runRules lazy-parse guards", () => {
  const wfFile = { path: ".github/workflows/ci.yml", text: "on: push\n" };

  type FindingPart = Omit<
    import("../src/types.js").Finding,
    "ruleId" | "category"
  >;

  function ciRule(run: () => FindingPart[]): UniversalRule {
    return {
      id: "QA-CI-001",
      category: "QA-CI",
      appliesTo: ["github-actions"],
      run,
    };
  }

  it("returns before parsing when no CI rules apply", () => {
    const tsOnly = [
      {
        id: "QA-TEST-001",
        category: "QA-TEST",
        appliesTo: ["typescript"],
        run: () => [],
      },
    ];
    const emit = vi.fn();
    expect(() =>
      githubActionsAdapter.runRules(
        tsOnly,
        { ...wfFile, text: "{{{ not yaml" },
        emit,
        undefined,
        undefined,
      ),
    ).not.toThrow();
    expect(emit).not.toHaveBeenCalled();
  });

  it("reports the budget exceeded before parsing when the deadline is gone", () => {
    const onExceeded = vi.fn();
    githubActionsAdapter.runRules(
      [ciRule(() => [])],
      wfFile,
      vi.fn(),
      undefined,
      { deadline: Date.now() - 1, onExceeded },
    );
    expect(onExceeded).toHaveBeenCalledTimes(1);
  });

  it("enforces the budget between rules and stops the loop", () => {
    const onExceeded = vi.fn();
    const slowRule = ciRule(() => {
      const end = Date.now() + 15;
      while (Date.now() < end) {
        /* deliberate busy wait: the budget must trip on the NEXT rule */
      }
      return [];
    });
    githubActionsAdapter.runRules(
      [slowRule, ciRule(() => [])],
      wfFile,
      vi.fn(),
      undefined,
      { deadline: Date.now() + 5, onExceeded },
    );
    expect(onExceeded).toHaveBeenCalledTimes(1);
  });

  it("throws WorkflowParseSkipped for malformed YAML when a CI rule applies", () => {
    expect(() =>
      githubActionsAdapter.runRules(
        [ciRule(() => [])],
        { ...wfFile, text: "{{{ not yaml" },
        vi.fn(),
        undefined,
        undefined,
      ),
    ).toThrow(WorkflowParseSkipped);
  });

  it("isolates a crashing CI rule and keeps scanning the rest", () => {
    const onCrash = vi.fn();
    const emit = vi.fn();
    const crasher = ciRule(() => {
      throw new Error("boom");
    });
    const emitter: FindingPart = {
      severity: "warning",
      confidence: "high",
      findingType: "deterministic-defect",
      qaImpact: "HYGIENE",
      file: ".github/workflows/ci.yml",
      line: 1,
      column: 1,
      message: "probe",
      why: "why",
      fix: "fix",
    };
    githubActionsAdapter.runRules(
      [crasher, ciRule(() => [emitter])],
      wfFile,
      emit,
      onCrash,
      undefined,
    );
    expect(onCrash).toHaveBeenCalledWith("QA-CI-001", expect.any(Error));
    expect(emit).toHaveBeenCalledTimes(1);
  });
});
