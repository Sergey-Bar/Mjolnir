import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  githubActionsAdapter,
  readWorkflowSafe,
  WorkflowParseSkipped,
} from "../src/adapters/github-actions.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import type {
  LanguageAdapter,
  ScanContext,
  UniversalRule,
} from "../src/engine/adapter.js";
import type { Finding } from "../src/types.js";

/** Minimal-but-complete mock finding for adapter unit tests. */
function mockFinding(
  overrides: Partial<Omit<Finding, "ruleId" | "category">> = {},
): Omit<Finding, "ruleId" | "category"> {
  return {
    severity: "error",
    confidence: "high",
    findingType: "deterministic-defect",
    qaImpact: "HYGIENE",
    file: "x.test.ts",
    line: 1,
    column: 1,
    message: "m",
    why: "test",
    fix: "test",
    ...overrides,
  };
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "qa-doctor-adapter-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeCtx(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    workspace: { root: dir, name: "t", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Date.now() + 10_000,
    onSkippedFile: () => {},
    ...overrides,
  };
}

const noopRule: UniversalRule = {
  id: "NOOP",
  category: "test",
  appliesTo: ["typescript", "python", "github-actions"],
  run: () => [],
};

async function expectRunRules(
  adapter: LanguageAdapter,
  file: { path: string; text: string },
): Promise<Array<{ f: unknown; ruleId: string; category: string }>> {
  const emitted: Array<{ f: unknown; ruleId: string; category: string }> = [];
  adapter.runRules([noopRule], file, (f, ruleId, category) =>
    emitted.push({ f, ruleId, category }),
  );
  return emitted;
}

describe("typescriptAdapter", () => {
  it("identifies test files by convention", () => {
    expect(typescriptAdapter.isTestFile("a/b.test.ts")).toBe(true);
    expect(typescriptAdapter.isTestFile("a/b.spec.js")).toBe(true);
    expect(typescriptAdapter.isTestFile("a/src.ts")).toBe(false);
  });

  it("detects frameworks from workspace root", () => {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ devDependencies: { vitest: "^2.0.0" } }),
    );
    writeFileSync(join(dir, "vitest.config.ts"), "");
    const info = typescriptAdapter.detectFrameworks(dir);
    expect(info.frameworks).toContain("vitest");
    expect(info.unknown).toBe(false);
  });

  it("reports unknown when no package.json exists", () => {
    expect(typescriptAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("discovers test files recursively, skipping ignored dirs", () => {
    writeFileSync(join(dir, "a.test.ts"), "");
    mkdirSync(join(dir, "node_modules"), { recursive: true });
    writeFileSync(join(dir, "node_modules", "skip.test.ts"), "");
    const ctx = makeCtx();
    typescriptAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.testFiles[0]).toMatch(/a\.test\.ts$/);
  });

  it("discovers matching test files and reports no skips for a readable tree", () => {
    const onSkipped = vi.fn();
    const ctx = makeCtx({ onSkippedFile: onSkipped });
    const discoverable = join(dir, "gone.test.ts");
    writeFileSync(discoverable, "");
    // An extra directory in the tree — discovery must walk past it without
    // treating it as a file or reporting a skip.
    mkdirSync(join(dir, "locked"), { recursive: true });

    typescriptAdapter.discoverTestFiles(ctx);

    // The real output of discoverTestFiles is testFiles. Asserting on it is
    // what makes this a behavior test; the previous version only checked the
    // skip callback, so it could not have detected discovery returning
    // nothing at all — and its name claimed to cover a stat failure it never
    // simulated. The genuine stat-failure branch is covered against the
    // GitHub Actions adapter in adapter-deep-branch-coverage.spec.ts, which
    // also documents why this adapter rarely reaches it (entry.isFile()
    // filters before statSync).
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.testFiles[0]).toMatch(/gone\.test\.ts$/);
    expect(onSkipped).not.toHaveBeenCalled();
  });

  it("runRules emits findings with rule metadata and isolates crashes", async () => {
    const boom: UniversalRule = {
      id: "BOOM",
      category: "test",
      appliesTo: ["typescript"],
      run: () => {
        throw new Error("kaboom");
      },
    };
    const good: UniversalRule = {
      id: "GOOD",
      category: "quality",
      appliesTo: ["typescript"],
      run: () => [mockFinding()],
    };
    const emitted = await expectRunRules.call(null, typescriptAdapter, {
      path: "x.test.ts",
      text: "",
    });
    void boom;
    void good;
    // Direct check with mixed rules:
    const out: Array<[string, string]> = [];
    typescriptAdapter.runRules(
      [boom, good],
      { path: "x.test.ts", text: "" },
      (f, ruleId, category) => {
        void f;
        out.push([ruleId, category]);
      },
    );
    expect(out).toEqual([["GOOD", "quality"]]);
    expect(emitted).toEqual([]);
  });

  it("skips rules for other adapters", () => {
    const pyOnly: UniversalRule = {
      id: "PY",
      category: "test",
      appliesTo: ["python"],
      run: () => [mockFinding()],
    };
    const out: unknown[] = [];
    typescriptAdapter.runRules([pyOnly], { path: "x", text: "" }, (f) =>
      out.push(f),
    );
    expect(out).toEqual([]);
  });
});

describe("pythonAdapter", () => {
  it("identifies pytest-convention files", () => {
    expect(pythonAdapter.isTestFile("tests/test_auth.py")).toBe(true);
    expect(pythonAdapter.isTestFile("auth_test.py")).toBe(true);
    expect(pythonAdapter.isTestFile("src/auth.py")).toBe(false);
  });

  it("detects pytest via pytest.ini / conftest.py / setup.cfg", () => {
    writeFileSync(join(dir, "pytest.ini"), "[pytest]");
    expect(pythonAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["pytest"],
      unknown: false,
    });
  });

  it("detects pytest via pyproject [tool.pytest]", () => {
    writeFileSync(join(dir, "pyproject.toml"), "[tool.pytest.ini_options]\n");
    expect(pythonAdapter.detectFrameworks(dir)).toEqual({
      frameworks: ["pytest"],
      unknown: false,
    });
  });

  it("reports unknown without config evidence", () => {
    expect(pythonAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: true,
    });
  });

  it("discovers python test files, skipping venv dirs", () => {
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, "tests", "test_a.py"), "");
    mkdirSync(join(dir, ".venv"), { recursive: true });
    writeFileSync(join(dir, ".venv", "test_skip.py"), "");
    const ctx = makeCtx();
    pythonAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
    expect(ctx.testFiles[0]).toMatch(/test_a\.py$/);
  });

  it("runRules dispatches and isolates crashes", () => {
    const boom: UniversalRule = {
      id: "B",
      category: "test",
      appliesTo: ["python"],
      run: () => {
        throw new Error("x");
      },
    };
    const good: UniversalRule = {
      id: "G",
      category: "test",
      appliesTo: ["python"],
      run: () => [mockFinding({ line: 2, severity: "warning", message: "y" })],
    };
    const ids: string[] = [];
    pythonAdapter.runRules([boom, good], { path: "t.py", text: "" }, (_f, id) =>
      ids.push(id),
    );
    expect(ids).toEqual(["G"]);
  });
});

describe("githubActionsAdapter", () => {
  it("identifies workflow files", () => {
    expect(githubActionsAdapter.isTestFile(".github/workflows/ci.yml")).toBe(
      true,
    );
    expect(githubActionsAdapter.isTestFile(".github/workflows/ci.yaml")).toBe(
      true,
    );
    expect(githubActionsAdapter.isTestFile("ci.yml")).toBe(false);
  });

  it("reports no frameworks", () => {
    expect(githubActionsAdapter.detectFrameworks(dir)).toEqual({
      frameworks: [],
      unknown: false,
    });
  });

  it("discovers workflow files only from .github/workflows", () => {
    mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
    writeFileSync(join(dir, ".github", "workflows", "ci.yml"), "on: push");
    writeFileSync(join(dir, "other.yml"), "on: push");
    const ctx = makeCtx();
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toHaveLength(1);
  });

  it("tolerates missing workflows dir", () => {
    const ctx = makeCtx();
    githubActionsAdapter.discoverTestFiles(ctx);
    expect(ctx.testFiles).toEqual([]);
  });

  it("throws WorkflowParseSkipped on malformed YAML", () => {
    expect(() =>
      githubActionsAdapter.runRules(
        [noopRule],
        { path: "ci.yml", text: "foo: [unclosed" },
        () => {},
      ),
    ).toThrow(WorkflowParseSkipped);
  });

  it("passes parsed doc via ast slot to rules", () => {
    let seenAst: unknown;
    const spy: UniversalRule = {
      id: "SPY",
      category: "ci",
      appliesTo: ["github-actions"],
      run: (file) => {
        seenAst = file.ast;
        return [];
      },
    };
    githubActionsAdapter.runRules(
      [spy],
      { path: "ci.yml", text: "jobs:\n  j:\n    steps: []\n" },
      () => {},
    );
    expect(seenAst).toEqual({ jobs: { j: { steps: [] } } });
  });

  it("readWorkflowSafe returns null on unreadable file", () => {
    expect(readWorkflowSafe(join(dir, "missing.yml"))).toBeNull();
    const p = join(dir, "ok.yml");
    writeFileSync(p, "on: push");
    expect(readWorkflowSafe(p)).toBe("on: push");
  });
});
