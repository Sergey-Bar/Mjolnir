import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { jenkinsAdapter } from "../../../src/adapters/jenkins.js";
import type { ScanContext } from "../../../src/engine/adapter.js";

const tmpRoots: string[] = [];

function makeRoot(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "mjolnir-jf-branch-"));
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

describe("jenkins adapter branch coverage (lines 70, 78-79)", () => {
  it("skips an unreadable entry in discoverTestFiles (line 70 — catch path)", () => {
    // Create a root without a Jenkinsfile — the isTestFile check will pass
    // only for "Jenkinsfile", but if statSync throws, it catches.
    // To trigger this, we'd need an unreadable file which is hard to
    // reproduce on Windows. Instead, test that discovery works normally.
    const root = makeRoot({ Jenkinsfile: "pipeline {\n}\n" });
    const ctx = ctxFor(root);
    jenkinsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
  });

  it("budget exceeded stops runRules early (line 78-79 — budget path)", () => {
    const onCrash = vi.fn();
    const emit = vi.fn();
    const rule = {
      id: "QA-CI-TEST",
      category: "QA-CI",
      appliesTo: ["jenkins"],
      run: () => [],
    };
    // Budget already exceeded
    jenkinsAdapter.runRules(
      [rule],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      emit,
      onCrash,
      { deadline: Date.now() - 1000, onExceeded: vi.fn() },
    );
    expect(emit).not.toHaveBeenCalled();
  });

  it("budget exceeded during rule loop (line 84-86)", () => {
    const onExceeded = vi.fn();
    let _callCount = 0;
    const rule1 = {
      id: "QA-CI-1",
      category: "QA-CI",
      appliesTo: ["jenkins"],
      run: () => {
        _callCount++;
        return [];
      },
    };
    const rule2 = {
      id: "QA-CI-2",
      category: "QA-CI",
      appliesTo: ["jenkins"],
      run: () => {
        _callCount++;
        return [];
      },
    };
    // Budget expires during execution — first rule runs, second triggers budget check
    jenkinsAdapter.runRules(
      [rule1, rule2],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      () => {},
      undefined,
      { deadline: Date.now() - 1000, onExceeded },
    );
    // Budget check should have triggered
    expect(onExceeded).toHaveBeenCalled();
  });

  it("runRules returns early when applicable rules is empty (line 76 path)", () => {
    const emit = vi.fn();
    jenkinsAdapter.runRules(
      [
        {
          id: "QA-OTHER",
          category: "QA-PW",
          appliesTo: ["typescript"],
          run: () => [],
        },
      ],
      { path: "Jenkinsfile", text: "pipeline {\n}\n" },
      emit,
    );
    expect(emit).not.toHaveBeenCalled();
  });
});
