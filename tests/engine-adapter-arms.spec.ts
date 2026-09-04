/**
 * Phase 1 coverage: engine degraded paths and adapters' budget/cap arms.
 * - tree-sitter-ast: grammar-load failure and null-tree fallbacks.
 * - ts-ast: scanner/AST failures degrade to raw text, never fatal.
 * - python/java/csharp adapters: expired analysis budgets and the
 *   per-adapter file-cap reason remap.
 * - cross-file: duplicate-name sorting across files.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const existsSync = ((path: string) => {
    if (String(path).includes("tree-sitter-wasms")) return false;
    return (actual.existsSync as unknown as (p: string) => boolean)(path);
  }) as typeof actual.existsSync;
  return { ...actual, existsSync };
});

vi.mock("web-tree-sitter", () => {
  const state = {
    tree: null as null | object,
    loadError: null as null | Error,
  };
  class Language {
    // The adapter awaits Language.load, so the mock must return a real
    // promise — rejection here drives the grammar-load failure arms.
    static load(): Promise<never> {
      if (state.loadError) return Promise.reject(state.loadError);
      return Promise.resolve({ fake: true } as never);
    }
  }
  class Parser {
    static init(): Promise<void> {
      return Promise.resolve();
    }
    setLanguage(): void {}
    parse(): object | null {
      return state.tree;
    }
  }
  return { Parser, Language, __state: state };
});

import { csharpAdapter } from "../src/adapters/csharp.js";
import { javaAdapter } from "../src/adapters/java.js";
import { pythonAdapter } from "../src/adapters/python.js";
import { typescriptAdapter } from "../src/adapters/typescript.js";
import {
  _resetForTests,
  parseCSharpAst,
  parseJavaAst,
} from "../src/engine/tree-sitter-ast.js";
import {
  commentAndStringRanges,
  getCodeOnlyText,
} from "../src/engine/ts-ast.js";
import {
  collectTestNames,
  findDuplicateTestNames,
} from "../src/engine/cross-file.js";
import { createIgnoreMatcher } from "../src/discovery/ignores.js";
import type { ScanContext } from "../src/engine/adapter.js";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "mjolnir-engine-arms-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.clearAllMocks();
});

function makeCtx(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    workspace: { root, name: "probe", packageJson: {}, workspaceGlobs: [] },
    testFiles: [],
    deadline: Number.POSITIVE_INFINITY,
    maxFiles: 10_000,
    ignoreMatcher: createIgnoreMatcher(root),
    onSkippedFile: () => {},
    onDiscoveryTruncated: () => {},
    onRuleCrash: () => {},
    ...overrides,
  };
}

describe("tree-sitter-ast fallback discipline", () => {
  it("returns undefined when the grammar cannot load (no candidate on disk)", async () => {
    // existsSync is mocked false for tree-sitter-wasms paths, so the
    // fallback candidate is handed to Language.load; make the load fail
    // so the catch-and-degrade contract is exercised end to end.
    const wt = (await import("web-tree-sitter")) as unknown as {
      __state: { loadError: Error | null };
    };
    wt.__state.loadError = new Error("grammar load failed (simulated)");
    try {
      _resetForTests();
      await expect(parseJavaAst("class A {}")).resolves.toBeUndefined();
      _resetForTests();
      await expect(parseCSharpAst("class A {}")).resolves.toBeUndefined();
    } finally {
      wt.__state.loadError = null;
    }
  });

  it("returns undefined when the parser produces a null tree", async () => {
    // The mock's parse() returns null by default — the null-tree
    // fallback must degrade to undefined, never return null.
    _resetForTests();
    await expect(parseJavaAst("class A {}")).resolves.toBeUndefined();
    _resetForTests();
    await expect(parseCSharpAst("class A {}")).resolves.toBeUndefined();
  });
});

describe("ts-ast degraded paths", () => {
  it("returns no ranges when no AST is available", () => {
    const ranges = commentAndStringRanges({
      path: "a.spec.ts",
      text: "const s = 'x'; // c",
    });
    expect(ranges).toEqual([]);
  });

  it("returns no ranges when the compiler view itself fails", () => {
    const fakeAst = {
      getFilePath: () => "a.spec.ts",
      get compilerNode(): never {
        throw new Error("compiler exploded (simulated)");
      },
    };
    const ranges = commentAndStringRanges({
      path: "a.spec.ts",
      text: "const s = 'x';",
      ast: fakeAst,
    });
    expect(ranges).toEqual([]);
  });

  it("blanks template-head/middle/tail while keeping substitutions live", () => {
    const text = "const s = `head${a}mid${b}tail`;";
    const masked = getCodeOnlyText({ path: "t.spec.ts", text });
    // Static template parts are blanked...
    expect(masked).not.toContain("head");
    expect(masked).not.toContain("mid");
    expect(masked).not.toContain("tail");
    // ...while the interpolated expressions survive as live code.
    expect(masked.includes(" a ")).toBe(true);
    expect(masked.includes(" b ")).toBe(true);
  });
});

describe("cross-file duplicate ordering", () => {
  it("sorts duplicates by name and collects python names too", () => {
    expect(collectTestNames("a.py", "def test_b():\n    pass\n")).toEqual([
      "test_b",
    ]);
    expect(
      collectTestNames(
        "a.spec.ts",
        "it('alpha', () => {}); test('beta', () => {});",
      ),
    ).toEqual(["alpha", "beta"]);
    const dups = findDuplicateTestNames([
      {
        path: "b.spec.ts",
        text: "it('zeta', () => {}); it('alpha', () => {});",
      },
      {
        path: "a.spec.ts",
        text: "test('zeta', () => {}); test('alpha', () => {});",
      },
    ]);
    expect(dups).toEqual([
      { name: "alpha", files: ["a.spec.ts", "b.spec.ts"] },
      { name: "zeta", files: ["a.spec.ts", "b.spec.ts"] },
    ]);
  });
});

describe("adapters: expired analysis budgets", () => {
  const file = { path: "probe", text: "" };

  it.each([
    ["python", pythonAdapter],
    ["java", javaAdapter],
    ["csharp", csharpAdapter],
  ] as const)(
    "%s adapter reports the budget exceeded before parsing",
    (_id, adapter) => {
      const onExceeded = vi.fn();
      const emit = vi.fn();
      adapter.runRules(
        [{ id: "R", category: "C", appliesTo: [_id], run: () => [] }],
        file,
        emit,
        undefined,
        { deadline: Date.now() - 1, onExceeded },
      );
      expect(onExceeded).toHaveBeenCalledTimes(1);
      expect(emit).not.toHaveBeenCalled();
    },
  );
});

describe("adapters: per-adapter file-cap reason remap", () => {
  function gitRepo(): void {
    execFileSync("git", ["init", "-q", root], { stdio: "ignore" });
  }

  it.each([
    ["java", javaAdapter, "OneTest.java"],
    ["csharp", csharpAdapter, "OneTests.cs"],
  ] as const)(
    "%s adapter names itself in the truncation reason",
    (_id, adapter, name) => {
      gitRepo();
      mkdirSync(join(root, "a"), { recursive: true });
      mkdirSync(join(root, "b"), { recursive: true });
      writeFileSync(join(root, "a", name), "class A {}\n");
      writeFileSync(join(root, "b", name), "class B {}\n");
      const onDiscoveryTruncated = vi.fn();
      const ctx = makeCtx({ maxFiles: 1, onDiscoveryTruncated });
      adapter.discoverTestFiles(ctx);
      expect(ctx.testFiles).toHaveLength(1);
      expect(onDiscoveryTruncated).toHaveBeenCalledWith(`file-cap:${_id}`);
    },
  );
});

describe("adapters: framework detection metadata paths", () => {
  it("typescript adapter reads a package.json that declares its name", () => {
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "my-pkg", devDependencies: { vitest: "^2.0.0" } }),
    );
    const info = typescriptAdapter.detectFrameworks(root);
    expect(info.unknown).toBe(false);
    expect(info.frameworks).toContain("vitest");
  });

  it("csharp adapter skips non-csproj entries while scanning", () => {
    writeFileSync(join(root, "README.md"), "docs\n");
    const probe = csharpAdapter.detectFrameworks(root);
    expect(probe.frameworks).toEqual([]);
    expect(probe.unknown).toBe(true);
  });
});
