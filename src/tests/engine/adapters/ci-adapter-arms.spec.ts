/**
 * CI adapter arms coverage (azure-pipelines + jenkins) — the honest
 * accounting contract at every edge: deadline, fixture-dir skip, ignore
 * matcher, file cap, oversize accounting, and the rule-runner's budget +
 * crash-isolation arms. The happy paths run through the adapters' own
 * suites; this file pins the degraded contexts.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ScanContext } from "../../../src/engine/adapter.js";
import {
  azurePipelinesAdapter,
  AzureParseSkipped,
} from "../../../src/adapters/azure-pipelines.js";
import { jenkinsAdapter } from "../../../src/adapters/jenkins.js";

const tmpRoots: string[] = [];
function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-ci-adapter-arms-"));
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
    workspace: { root, name: "ci", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Date.now() + 5_000,
    maxFiles: 100,
    ignoreMatcher: { isIgnored: () => false },
    onSkippedFile: vi.fn(),
    onDiscoveryTruncated: vi.fn(),
    ...over,
  };
}

interface RuleShape {
  id: string;
  category: string;
  appliesTo: string[];
  run: (ctx: {
    path: string;
    text: string;
    ast?: unknown;
  }) => Array<Record<string, unknown>>;
}

function ruleFor(
  adapterId: string,
  behavior: "emit" | "throw" | "busy",
): RuleShape {
  return {
    id: `QA-TEST-${adapterId}`,
    category: "QA-TEST",
    appliesTo: [adapterId],
    run: (ctx) => {
      if (behavior === "throw") throw new Error("rule exploded");
      if (behavior === "busy") {
        const start = Date.now();
        while (Date.now() - start < 15) {
          /* burn the per-file budget */
        }
      }
      return [
        {
          severity: "warning",
          confidence: "high",
          findingType: "deterministic-defect",
          qaImpact: "FALSE-GREEN",
          file: ctx.path,
          line: 1,
          column: 1,
          message: "hit",
          why: "why",
          fix: "fix",
        },
      ];
    },
  };
}

describe.each([
  [
    "azure",
    azurePipelinesAdapter,
    "azure-pipelines.yml",
    "file-cap:azure-pipelines",
  ],
  ["jenkins", jenkinsAdapter, "Jenkinsfile", "file-cap:jenkins"],
] as const)(
  "%s adapter discovery arms",
  (_name, adapter, fileName, capLabel) => {
    it("a past deadline truncates discovery with accounting", () => {
      const root = makeRoot({ [fileName]: "steps: []\n" });
      const ctx = ctxFor(root, { deadline: Date.now() - 1 });
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(0);
      expect(ctx.onDiscoveryTruncated).toHaveBeenCalledWith("deadline");
    });

    it("a pipeline that IS a fixture dir (must-fire/must-not-fire) is skipped silently", () => {
      const root = makeRoot({});
      const dir = join(root, fileName);
      mkdirSync(join(dir, "must-fire"), { recursive: true });
      mkdirSync(join(dir, "must-not-fire"), { recursive: true });
      const ctx = ctxFor(root);
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(0);
      expect(ctx.onSkippedFile).not.toHaveBeenCalled();
    });

    it("an ignored pipeline is skipped without accounting noise", () => {
      const root = makeRoot({ [fileName]: "steps: []\n" });
      const ctx = ctxFor(root, {
        ignoreMatcher: { isIgnored: () => true },
      });
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(0);
      expect(ctx.onSkippedFile).not.toHaveBeenCalled();
    });

    it("the file cap truncates with the adapter-specific label", () => {
      const root = makeRoot({ [fileName]: "steps: []\n" });
      const ctx = ctxFor(root, { maxFiles: 0 });
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(0);
      expect(ctx.onDiscoveryTruncated).toHaveBeenCalledWith(capLabel);
    });

    it("an oversized pipeline vanishes with file-too-large accounting", () => {
      const big = "x".repeat(1024 * 1024 + 1);
      const root = makeRoot({ [fileName]: big });
      const ctx = ctxFor(root);
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(0);
      expect(ctx.onSkippedFile).toHaveBeenCalledWith("file-too-large");
    });
  },
);

describe("runRules arms", () => {
  const azureFile = {
    path: "azure-pipelines.yml",
    text: "steps:\n  - script: npm test\n",
  };
  const jenkinsFile = { path: "Jenkinsfile", text: "pipeline {\n}\n" };

  it("rules for other adapters are filtered out before any work", () => {
    const emit = vi.fn();
    azurePipelinesAdapter.runRules(
      [ruleFor("jenkins", "emit") as never],
      azureFile,
      emit,
      undefined,
      undefined,
    );
    expect(emit).not.toHaveBeenCalled();
  });

  it("a budget already spent before the parse is reported once and stops everything", () => {
    const emit = vi.fn();
    const onExceeded = vi.fn();
    azurePipelinesAdapter.runRules(
      [ruleFor("azure-pipelines", "emit") as never],
      azureFile,
      emit,
      undefined,
      { deadline: Date.now() - 1, onExceeded },
    );
    expect(onExceeded).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it("hostile pipeline YAML becomes a counted parse-skip (AzureParseSkipped), never a crash", () => {
    const emit = vi.fn();
    expect(() =>
      azurePipelinesAdapter.runRules(
        [ruleFor("azure-pipelines", "emit") as never],
        { path: "azure-pipelines.yml", text: "42\n" },
        emit,
        undefined,
        undefined,
      ),
    ).toThrow(AzureParseSkipped);
    expect(emit).not.toHaveBeenCalled();
  });

  it("a budget spent mid-run stops LATER rules but lets earlier ones emit (deterministic via fake clock)", () => {
    vi.useFakeTimers();
    try {
      const start = Date.now();
      vi.setSystemTime(start);
      const emit = vi.fn();
      const onExceeded = vi.fn();
      // Rule A advances the FAKE clock during its run — the per-rule
      // budget check for rule B then sees an expired deadline without
      // any wall-clock racing under parallel load.
      const ruleA: RuleShape = {
        id: "QA-TEST-azure",
        category: "QA-TEST",
        appliesTo: ["azure-pipelines"],
        run: (ctx) => {
          vi.setSystemTime(start + 10);
          return [
            {
              severity: "warning",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              file: ctx.path,
              line: 1,
              column: 1,
              message: "hit",
              why: "why",
              fix: "fix",
            },
          ];
        },
      };
      azurePipelinesAdapter.runRules(
        [ruleA as never, ruleFor("azure-pipelines", "emit") as never],
        azureFile,
        emit,
        undefined,
        { deadline: start + 5, onExceeded },
      );
      expect(emit).toHaveBeenCalledTimes(1);
      expect(onExceeded).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a crashing rule is isolated through onCrash while other rules keep running", () => {
    const emit = vi.fn();
    const onCrash = vi.fn();
    azurePipelinesAdapter.runRules(
      [
        ruleFor("azure-pipelines", "throw") as never,
        ruleFor("azure-pipelines", "emit") as never,
      ],
      azureFile,
      emit,
      onCrash,
      undefined,
    );
    expect(onCrash).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it("jenkins runRules: emit, per-rule budget, and crash isolation (no parse stage)", () => {
    const emit = vi.fn();
    const onExceeded = vi.fn();
    jenkinsAdapter.runRules(
      [ruleFor("jenkins", "emit") as never],
      jenkinsFile,
      emit,
      undefined,
      undefined,
    );
    expect(emit).toHaveBeenCalledTimes(1);

    const emit2 = vi.fn();
    vi.useFakeTimers();
    try {
      const start = Date.now();
      vi.setSystemTime(start);
      // Rule B advances the FAKE clock during its run — the per-rule
      // budget check for the next rule sees an expired deadline without
      // any wall-clock racing under parallel load.
      const ruleB: RuleShape = {
        id: "QA-TEST-jenkins",
        category: "QA-TEST",
        appliesTo: ["jenkins"],
        run: (ctx) => {
          vi.setSystemTime(start + 10);
          return [
            {
              severity: "warning",
              confidence: "high",
              findingType: "deterministic-defect",
              qaImpact: "FLAKY-RISK",
              file: ctx.path,
              line: 1,
              column: 1,
              message: "hit",
              why: "why",
              fix: "fix",
            },
          ];
        },
      };
      jenkinsAdapter.runRules(
        [ruleB as never, ruleFor("jenkins", "emit") as never],
        jenkinsFile,
        emit2,
        undefined,
        { deadline: start + 5, onExceeded },
      );
      expect(emit2).toHaveBeenCalledTimes(1);
      expect(onExceeded).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }

    const emit3 = vi.fn();
    const onCrash = vi.fn();
    jenkinsAdapter.runRules(
      [ruleFor("jenkins", "throw") as never],
      jenkinsFile,
      emit3,
      onCrash,
      undefined,
    );
    expect(onCrash).toHaveBeenCalledTimes(1);
    expect(emit3).not.toHaveBeenCalled();
  });
});
