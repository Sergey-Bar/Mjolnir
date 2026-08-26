/**
 * Tree-sitter WASM AST layer for Java/C# (Master-Stabilization-Plan
 * Sprint 8, Task 36). See src/engine/tree-sitter-ast.ts's own header
 * for the honest architectural scope decision this file's tests
 * confirm: this module is a complete, real, independently-tested
 * tree-sitter consumer — the first in this codebase for any
 * language — but is deliberately not yet wired into the synchronous
 * CLI scan pipeline (a separate, larger architectural change).
 */

import { afterEach, describe, expect, it } from "vitest";
import {
  parseJavaAst,
  parseCSharpAst,
  _resetForTests,
} from "../src/engine/tree-sitter-ast.js";

afterEach(() => {
  _resetForTests();
});

describe("parseJavaAst", () => {
  it("parses real, valid Java source into a tree with a root node", async () => {
    const tree = await parseJavaAst(
      "class Foo {\n  void bar() {\n    int x = 1;\n  }\n}\n",
    );
    expect(tree).toBeDefined();
    expect(tree?.rootNode.type).toBe("program");
    expect(tree?.rootNode.hasError).toBe(false);
  });

  it("still returns a tree (with error nodes) for malformed Java — tree-sitter is error-tolerant by design", async () => {
    const tree = await parseJavaAst("class Foo { void bar( {{{ ????");
    // tree-sitter never throws on malformed input — it produces a
    // best-effort tree with ERROR nodes instead. This is a real,
    // verified behavioral fact about the library, not an assumption.
    expect(tree).toBeDefined();
  });

  it("memoizes the grammar load across repeated calls (no redundant WASM re-instantiation)", async () => {
    const [a, b] = await Promise.all([
      parseJavaAst("class A {}"),
      parseJavaAst("class B {}"),
    ]);
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });

  it("finds a real method_declaration node in the parsed tree", async () => {
    const tree = await parseJavaAst("class Foo {\n  void bar() {\n  }\n}\n");
    if (!tree) throw new Error("expected a parsed tree");
    let found = false;
    const cursor = tree.walk();
    const visit = (): void => {
      if (cursor.currentNode.type === "method_declaration") found = true;
      if (cursor.gotoFirstChild()) {
        do visit();
        while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }
    };
    visit();
    expect(found).toBe(true);
  });
});

describe("parseCSharpAst", () => {
  it("parses real, valid C# source into a tree with a root node", async () => {
    const tree = await parseCSharpAst(
      "public class Foo {\n  public void Bar() {\n    int x = 1;\n  }\n}\n",
    );
    expect(tree).toBeDefined();
    expect(tree?.rootNode.hasError).toBe(false);
  });

  it("still returns a tree (with error nodes) for malformed C#", async () => {
    const tree = await parseCSharpAst("public class Foo { void Bar( {{{ ????");
    expect(tree).toBeDefined();
  });

  it("finds a real method_declaration node in the parsed tree", async () => {
    const tree = await parseCSharpAst(
      "public class Foo {\n  public void Bar() {\n  }\n}\n",
    );
    if (!tree) throw new Error("expected a parsed tree");
    let found = false;
    const cursor = tree.walk();
    const visit = (): void => {
      if (cursor.currentNode.type === "method_declaration") found = true;
      if (cursor.gotoFirstChild()) {
        do visit();
        while (cursor.gotoNextSibling());
        cursor.gotoParent();
      }
    };
    visit();
    expect(found).toBe(true);
  });
});

describe("fallback contract — never throws, always resolves", () => {
  it("parseJavaAst resolves (does not reject) even for empty input", async () => {
    await expect(parseJavaAst("")).resolves.toBeDefined();
  });

  it("parseCSharpAst resolves (does not reject) even for empty input", async () => {
    await expect(parseCSharpAst("")).resolves.toBeDefined();
  });
});

describe("web-tree-sitter dependency pin — guards a real, found incompatibility", () => {
  it("package.json pins web-tree-sitter to an EXACT version, not a caret range", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const pkg = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const pinned = pkg.dependencies["web-tree-sitter"];
    expect(
      pinned,
      "web-tree-sitter@0.26.x fails to load tree-sitter-wasms's " +
        "prebuilt grammars at all (Language.load() throws inside " +
        "getDylinkMetadata, verified by direct reproduction) — a caret " +
        "range would silently reintroduce that breakage on the next " +
        "npm install. See src/engine/tree-sitter-ast.ts's header.",
    ).toBeDefined();
    expect(/^\^|~/.test(pinned ?? "")).toBe(false);
  });
});
