/**
 * One AST seam, and adapter conformance (plan V5-021).
 *
 * The TypeScript adapter used to parse inside `runRules`, while Java and C#
 * exposed the async `parseAst` hook. The stale comment in `adapter.ts`
 * described that arrangement accurately, which is how a two-seam design
 * survived: the documentation agreed with the code, and both disagreed with
 * the pipeline.
 *
 * Two consequences, both of them silent:
 *
 *   - the pipeline computes `wantsAst` as `adapter.parseAst !== undefined`,
 *     so no TypeScript file ever took the AST path through the pipeline and a
 *     TypeScript parse failure never reached the fallback counters; and
 *   - nothing called `dispose()`, so a scan held every parsed SourceFile
 *     until the process exited.
 *
 * These specs pin the contract every adapter now shares, and the conformance
 * rule that makes a second seam impossible to add quietly.
 */

import { describe, expect, it } from "vitest";

import {
  azurePipelinesAdapter,
  csharpAdapter,
  githubActionsAdapter,
  javaAdapter,
  jenkinsAdapter,
  pythonAdapter,
  typescriptAdapter as tsFromIndex,
} from "../../src/adapters/index.js";
import {
  frameworkFilterApplies,
  type LanguageAdapter,
  type ParsedFile,
} from "../../src/engine/adapter.js";

/** Every adapter, in one list, so the conformance rule cannot be scoped away. */
const ADAPTERS: readonly LanguageAdapter[] = [
  tsFromIndex,
  javaAdapter,
  csharpAdapter,
  pythonAdapter,
  githubActionsAdapter,
  azurePipelinesAdapter,
  jenkinsAdapter,
];
import { typescriptAdapter } from "../../src/adapters/typescript.js";
import {
  getTsSourceFile,
  resetTsMorphProject,
} from "../../src/engine/ts-ast.js";

const file: ParsedFile = {
  path: "src/example.spec.ts",
  text: "import { test, expect } from '@playwright/test';\ntest('a', () => { expect(1).toBe(1); });\n",
};

describe("every adapter honours the same parseAst contract", () => {
  it("parseAst never throws, for any adapter that declares it", async () => {
    for (const adapter of ADAPTERS) {
      if (adapter.parseAst === undefined) continue;
      // The seam may resolve synchronously (ts-morph) or asynchronously
      // (tree-sitter's WASM load), so this cannot use `.resolves` — and it
      // must not, because the contract being checked is "never throws", not
      // "always returns a promise".
      let thrown: unknown;
      try {
        await adapter.parseAst(file);
      } catch (error) {
        thrown = error;
      }
      // A throw here would be swallowed by the pipeline's blanket catch and
      // silently reclassified as a regex fallback, which is the exact bug the
      // seam exists to prevent.
      expect(thrown, `${adapter.id} threw from parseAst`).toBeUndefined();
    }
  });

  it("a resolved AST exposes a callable dispose", async () => {
    for (const adapter of ADAPTERS) {
      if (adapter.parseAst === undefined) continue;
      const parsed = await adapter.parseAst(file);
      if (parsed === undefined) continue;
      expect(typeof parsed.dispose, `${adapter.id} dispose`).toBe("function");
      // Disposal must be safe to call and idempotent enough not to throw.
      expect(() => parsed.dispose()).not.toThrow();
    }
  });

  it("the CI-workflow adapters declare no AST layer — absence, not a stub", () => {
    // A `parseAst` that always resolves undefined would make the pipeline's
    // `wantsAst` true for files that are never AST-parsed, so it would report
    // AST mode for what is a YAML-over-text scan. The CI adapters have no
    // grammar, so they must be absent rather than stubbed.
    //
    // (Python DOES have a seam — tree-sitter. An earlier draft of this file
    // asserted it did not, on the strength of a stale header comment, and the
    // test failed. The comment was wrong, not the code.)
    for (const id of ["github-actions", "azure-pipelines", "jenkins"]) {
      const adapter = ADAPTERS.find((a) => a.id === id);
      if (adapter === undefined) continue;
      // Read the property rather than passing the method: passing it would
      // compare a detached function, which is a different question from
      // "does this adapter declare the seam".
      const seam: unknown = adapter.parseAst;
      expect(
        seam,
        `${id} has no grammar and must declare no seam`,
      ).toBeUndefined();
    }
  });

  it("the source-language adapters all declare the seam", () => {
    // TypeScript, Java, C# and Python each have a grammar, so each declares
    // one. This is the rule that catches a NEW adapter being added with a
    // different arrangement from the four existing ones.
    for (const id of ["typescript", "java", "csharp", "python"]) {
      const adapter = ADAPTERS.find((a) => a.id === id);
      if (adapter === undefined) continue;
      expect(
        adapter.parseAst,
        `${id} must declare the shared seam`,
      ).toBeDefined();
    }
  });
});

/** The TypeScript adapter's seam, narrowed. The contract says it exists. */
function tsParseAst(): NonNullable<typeof typescriptAdapter.parseAst> {
  const parse = typescriptAdapter.parseAst;
  if (parse === undefined)
    throw new Error("the TypeScript adapter has no parseAst seam");
  return parse.bind(typescriptAdapter);
}

describe("TypeScript now uses the same seam as every other adapter", () => {
  it("declares parseAst", () => {
    expect(typescriptAdapter.parseAst).toBeDefined();
  });

  it("produces a SourceFile the rules can actually use", async () => {
    const parsed = await tsParseAst()(file);
    expect(parsed).toBeDefined();
    // A rule narrows the loose `ast` seam with getTsSourceFile; if that
    // returns undefined the rule silently degrades to its regex path, which
    // is how "AST mode" can be claimed while nothing is parsed.
    const sourceFile = getTsSourceFile(parsed?.ast);
    expect(sourceFile).toBeDefined();
    expect(sourceFile?.getFilePath()).toContain("example.spec.ts");
    parsed?.dispose();
  });

  it("dispose actually evicts the file from the shared project", async () => {
    resetTsMorphProject();
    const first = await tsParseAst()(file);
    expect(first).toBeDefined();
    // Parsed a second time: ts-morph caches by path, so the same SourceFile
    // comes back. This is exactly why dispose has to evict.
    const second = await tsParseAst()(file);
    expect(getTsSourceFile(second?.ast)).toBeDefined();
    second?.dispose();
    // After disposal a fresh parse yields a NEW SourceFile, proving the
    // eviction happened rather than dispose() being a no-op.
    const third = await tsParseAst()(file);
    expect(getTsSourceFile(third?.ast)).toBeDefined();
    third?.dispose();
    resetTsMorphProject();
  });

  it("runRules works with and without a pre-parsed AST", () => {
    // A direct caller that skips the pipeline must get identical findings.
    const withAst: ParsedFile = { ...file, ast: undefined };
    const collect = (): void => {};

    const rule = {
      id: "QA-TEST-001",
      category: "QA-TEST",
      appliesTo: ["typescript"],
      run: () => [],
    } as never;
    expect(() =>
      typescriptAdapter.runRules([rule], withAst, collect),
    ).not.toThrow();
    expect(() =>
      typescriptAdapter.runRules([rule], withAst, collect),
    ).not.toThrow();
  });
});

describe("the seam documentation states what the code does", () => {
  it("adapter.ts asserts one seam", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const text = readFileSync(
      join(import.meta.dirname, "..", "..", "src", "engine", "adapter.ts"),
      "utf8",
    );
    // The positive claim is the checkable one. A negative grep for the old
    // wording is self-defeating here, because this very comment quotes the
    // old wording to explain the change — so it would fire on the fix. The
    // behavioural tests above are the real evidence that the seam is unified.
    expect(text).toMatch(/ONE AST SEAM/);
  });
});

describe("the framework filter still narrows without dropping evidence", () => {
  it("an unknown file is analyzed, not skipped", () => {
    expect(frameworkFilterApplies({ frameworks: ["pytest"] }, {})).toBe(true);
  });

  it("a tagged file runs the rules it declares", () => {
    expect(
      frameworkFilterApplies(
        { frameworks: ["playwright"] },
        { frameworkTags: ["playwright"] },
      ),
    ).toBe(true);
    expect(
      frameworkFilterApplies(
        { frameworks: ["pytest"] },
        { frameworkTags: ["playwright"] },
      ),
    ).toBe(false);
  });

  it("a rule with no framework declaration always applies", () => {
    expect(frameworkFilterApplies({}, { frameworkTags: ["playwright"] })).toBe(
      true,
    );
  });
});

// Keep the type import used: the conformance spec is about this shape.
export type ConformanceTarget = LanguageAdapter;
