/**
 * Coverage arms batch 3: W4 grammar-contract null-guards in the QA
 * model (driven through synthetic tree-sitter node shapes — the guards
 * exist precisely for tree shapes real code cannot produce), plus the
 * remaining engine/command guard arms.
 */

import { describe, expect, it } from "vitest";

import { extractQaModel } from "../../src/engine/qa-model.js";
import { isValidFindingRecord } from "../../src/engine/scan-pipeline.js";
import { fieldNameOf } from "./helpers-synthetic-tree.js";

/** A synthetic node: duck-types web-tree-sitter's Node surface. */
function node(
  type: string,
  fields: Record<string, unknown> = {},
  children: unknown[] = [],
): unknown {
  return {
    type,
    text: type,
    startIndex: 0,
    endIndex: 1,
    startPosition: { row: 0, column: 0 },
    hasError: false,
    childForFieldName: (name: string) => fieldNameOf(fields, name) as never,
    children,
    namedChildren: children.filter((c) => c !== null),
    ...fields,
  };
}

function syntheticTree(rootChildren: unknown[]): Record<string, unknown> {
  return {
    rootNode: {
      type: "program",
      startPosition: { row: 0, column: 0 },
      startIndex: 0,
      hasError: false,
      children: rootChildren,
      namedChildren: rootChildren,
      descendantsOfType: (t: string) =>
        rootChildren.filter((c) => (c as { type: string }).type === t),
    },
  };
}

describe("qa-model W4 null-guards via synthetic grammar shapes", () => {
  it("java: a method_declaration without a name node is skipped, never dereferenced", () => {
    const decl = node(
      "method_declaration",
      { modifiers: node("modifiers"), body: node("block"), name: null },
      [],
    );
    const m = extractQaModel({
      path: "A.java",
      text: "class A {}",
      ast: syntheticTree([decl]),
    });
    // The model exists (tree is real-shaped) but asserts nothing about
    // the nameless declaration — zero derived nodes, zero crashes.
    expect(m?.nodes).toHaveLength(0);
  });

  it("csharp: a method_declaration without a name node is skipped", () => {
    const decl = node(
      "method_declaration",
      { body: node("block"), name: null },
      [],
    );
    const m = extractQaModel({
      path: "A.cs",
      text: "class A {}",
      ast: syntheticTree([decl]),
    });
    expect(m?.nodes).toHaveLength(0);
  });

  it("csharp: an attribute without a name node is skipped, named attributes still resolve", () => {
    const namelessAttr = node("attribute", { name: null });
    // A second declaration carries a REAL attribute — proving the walk
    // continues past the nameless one and classifies the named one.
    const goodAttr = node("attribute", {
      name: {
        type: "attribute",
        text: "SetUp",
        children: [{ type: "identifier", text: "SetUp" }],
        childForFieldName: () => null,
      },
    });
    const namelessDecl = node(
      "method_declaration",
      { body: node("block"), name: node("identifier", { text: "a" }) },
      [],
    ) as Record<string, unknown>;
    const attrList = node("attribute_list", {}, [namelessAttr, goodAttr]);
    const namedDecl = node(
      "method_declaration",
      {
        body: node("block"),
        name: node("identifier", { text: "b" }),
        attribute_list: attrList,
      },
      [attrList],
    ) as Record<string, unknown>;
    const m = extractQaModel({
      path: "A.cs",
      text: "class A {}",
      ast: syntheticTree([namelessDecl, namedDecl]),
    });
    expect(m?.nodes.some((n) => n.concept === "setup")).toBe(true);
  });

  it("csharp: a throw of an object_creation_expression without a type is skipped", () => {
    const throwStmt = node("throw_statement", {}, [
      {
        type: "object_creation_expression",
        text: "new",
        startIndex: 0,
        endIndex: 3,
        startPosition: { row: 0, column: 0 },
        hasError: false,
        children: [],
        namedChildren: [],
        childForFieldName: () => null,
      },
    ]);
    const m = extractQaModel({
      path: "A.cs",
      text: "class A {}",
      ast: syntheticTree([throwStmt]),
    });
    expect(m?.nodes).toHaveLength(0);
  });
});

describe("isValidFindingRecord boundary arms (audit W10)", () => {
  it("rejects every malformed shape and accepts a valid one", () => {
    expect(isValidFindingRecord(null)).toBe(false);
    expect(isValidFindingRecord(42)).toBe(false);
    expect(isValidFindingRecord({})).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "fatal",
        line: 1,
        message: "m",
        file: "f",
      }),
    ).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "error",
        line: 0,
        message: "m",
        file: "f",
      }),
    ).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "error",
        line: 1.5,
        message: "m",
        file: "f",
      }),
    ).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "error",
        line: 1,
        message: "",
        file: "f",
      }),
    ).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "error",
        line: 1,
        message: "m",
        file: "",
      }),
    ).toBe(false);
    expect(
      isValidFindingRecord({
        severity: "error",
        line: 1,
        message: "m",
        file: "a.ts",
      }),
    ).toBe(true);
  });
});
