/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Grammar-guard coverage (Phase 5–8 defensive branches).
 *
 * web-tree-sitter's TypeScript declarations type child arrays as
 * nullable (`SyntaxNode | null`) because ERROR-node recovery can
 * produce them; the guard clauses that tolerate those nulls are
 * type-required but never exercised by well-formed fixtures. These
 * specs drive the guards DIRECTLY with minimal fake grammar nodes
 * (plain objects shaped like the tree-sitter API surface the modules
 * consume) — proving the guards behave correctly when the grammar
 * hands them nulls, without needing to synthesize malformed parses.
 */

import { describe, expect, it } from "vitest";
import type { Tree } from "web-tree-sitter";

import {
  callName,
  csharpTestMethods,
  firstAncestorCallNamed,
  getTreeSitterTree,
  isHelperIdiom,
  javaTestMethods,
  receiverText,
} from "../../../src/engine/jv-cs-ast.js";
import { extractQaModel } from "../../../src/engine/qa-model.js";

// ─── fake node factory ───────────────────────────────────────────────

type FakeNodeInit = {
  type: string;
  text?: string;
  children?: FakeNode[];
  namedChildren?: FakeNode[];
  fields?: Record<string, FakeNode | null>;
  startIndex?: number;
  parent?: FakeNode | null;
};

interface FakeNode {
  type: string;
  text: string;
  children: FakeNode[];
  namedChildren: FakeNode[];
  startPosition: { row: number; column: number };
  startIndex: number;
  endIndex: number;
  hasError: boolean;
  parent: FakeNode | null;
  childForFieldName: (name: string) => FakeNode | null;
  descendantsOfType: (type: string) => FakeNode[];
}

function fakeNode(init: FakeNodeInit): FakeNode {
  const node: FakeNode = {
    type: init.type,
    text: init.text ?? "",
    children: init.children ?? [],
    namedChildren: init.namedChildren ?? init.children ?? [],
    startPosition: { row: 0, column: 0 },
    startIndex: init.startIndex ?? 0,
    endIndex:
      init.startIndex !== undefined
        ? init.startIndex + (init.text ?? "").length
        : 0,
    hasError: false,
    parent: init.parent ?? null,
    childForFieldName: (name: string) => init.fields?.[name] ?? null,
    descendantsOfType: () => [],
  };
  for (const child of node.children) {
    if (child) child.parent = node;
  }
  return node;
}

function fakeTree(root: FakeNode): Tree {
  // getTreeSitterTree duck-checks `"rootNode" in ast` and
  // `"startPosition" in rootNode` — the wrapper carries both.
  return {
    rootNode: root,
    startPosition: { row: 0, column: 0 },
    hasError: false,
  } as unknown as Tree;
}

const idNode = (text: string): FakeNode =>
  fakeNode({ type: "identifier", text });

describe("getTreeSitterTree — narrowing guards", () => {
  it("rejects primitives, objects without rootNode, and rootNode without the tree API", () => {
    expect(getTreeSitterTree(undefined)).toBeUndefined();
    expect(getTreeSitterTree(42)).toBeUndefined();
    expect(getTreeSitterTree({})).toBeUndefined();
    expect(getTreeSitterTree({ rootNode: 1 })).toBeUndefined();
    expect(
      getTreeSitterTree({ rootNode: { hasError: false } }),
    ).toBeUndefined();
  });

  it("accepts a duck-typed tree (rootNode with startPosition + hasError)", () => {
    const tree = fakeTree(fakeNode({ type: "program" }));
    const narrowed = getTreeSitterTree(tree);
    expect(narrowed).toBeDefined();
  });
});

describe("javaTestMethods — null/annotation guards", () => {
  const annotation = (name: string): FakeNode =>
    fakeNode({
      type: "marker_annotation",
      children: [idNode(name)],
      fields: { name: idNode(name) },
    });

  it("null declaration in the child array → skipped (error-recovery shape)", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "modifiers", children: [annotation("Test")] }),
        idNode("m"),
        fakeNode({ type: "block", text: "{}" }),
      ],
      fields: {
        name: idNode("m"),
        body: fakeNode({ type: "block" }),
      },
    });
    const root = fakeNode({
      type: "program",
      children: [null as unknown as FakeNode, decl],
    });
    root.descendantsOfType = () => [null as unknown as FakeNode, decl];
    const tests = javaTestMethods(fakeTree(root));
    expect(tests.map((t) => t.name)).toEqual(["m"]);
  });

  it("non-annotation modifier children (public/static) hit the type guard", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({
          type: "modifiers",
          children: [fakeNode({ type: "public" }), annotation("Test")],
        }),
        fakeNode({ type: "block" }),
      ],
      fields: { name: idNode("m"), body: fakeNode({ type: "block" }) },
    });
    const root = fakeNode({ type: "program", children: [decl] });
    root.descendantsOfType = () => [decl];
    expect(javaTestMethods(fakeTree(root)).map((t) => t.name)).toEqual(["m"]);
  });

  it("a method whose modifiers carry no @Test → skipped (no annotation)", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({
          type: "modifiers",
          children: [annotation("Override"), fakeNode({ type: "public" })],
        }),
        fakeNode({ type: "block" }),
      ],
      fields: { name: idNode("helper"), body: fakeNode({ type: "block" }) },
    });
    const root = fakeNode({ type: "program", children: [decl] });
    root.descendantsOfType = () => [decl];
    expect(javaTestMethods(fakeTree(root))).toEqual([]);
  });

  it("a @Test method without a body (abstract) → skipped (no body)", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "modifiers", children: [annotation("Test")] }),
      ],
      fields: { name: idNode("noBody") },
    });
    const root = fakeNode({ type: "program", children: [decl] });
    root.descendantsOfType = () => [decl];
    expect(javaTestMethods(fakeTree(root))).toEqual([]);
  });
});

describe("csharpTestMethods — null/attribute guards", () => {
  const attribute = (name: string): FakeNode =>
    fakeNode({
      type: "attribute",
      children: [idNode(name)],
      fields: { name: idNode(name) },
    });

  it("null declaration → skipped; attribute without a name node → not a test attribute", () => {
    const unnamedAttrList = fakeNode({
      type: "attribute_list",
      children: [fakeNode({ type: "attribute" })],
    });
    const decl = fakeNode({
      type: "method_declaration",
      children: [unnamedAttrList, fakeNode({ type: "block" })],
      fields: { name: idNode("M"), body: fakeNode({ type: "block" }) },
    });
    const root = fakeNode({
      type: "program",
      children: [null as unknown as FakeNode, decl],
    });
    root.descendantsOfType = () => [null as unknown as FakeNode, decl];
    expect(csharpTestMethods(fakeTree(root))).toEqual([]);
  });

  it("a method with a [Test] attribute but no body → skipped", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "attribute_list", children: [attribute("Test")] }),
      ],
      fields: { name: idNode("M") },
    });
    const root = fakeNode({ type: "program", children: [decl] });
    root.descendantsOfType = () => [decl];
    expect(csharpTestMethods(fakeTree(root))).toEqual([]);
  });
});

describe("callName / receiverText — exotic callee shapes", () => {
  it("invocation without a function field → undefined", () => {
    const call = fakeNode({ type: "invocation_expression" });
    expect(callName(call as never)).toBeUndefined();
  });

  it("member_access without a name node → undefined", () => {
    const call = fakeNode({
      type: "invocation_expression",
      children: [
        fakeNode({
          type: "member_access_expression",
          children: [idNode("obj")],
        }),
      ],
      fields: {
        function: fakeNode({
          type: "member_access_expression",
          children: [idNode("obj")],
        }),
      },
    });
    expect(callName(call as never)).toBeUndefined();
  });

  it("parenthesized callee (IIFE shape) → undefined (exotic)", () => {
    const call = fakeNode({
      type: "invocation_expression",
      children: [
        fakeNode({
          type: "parenthesized_expression",
          children: [idNode("f")],
        }),
      ],
      fields: {
        function: fakeNode({
          type: "parenthesized_expression",
          children: [idNode("f")],
        }),
      },
    });
    expect(callName(call as never)).toBeUndefined();
  });

  it("non-invocation node → undefined (both helpers)", () => {
    expect(callName(idNode("x") as never)).toBeUndefined();
    expect(receiverText(idNode("x") as never)).toBeUndefined();
  });

  it("invocation with identifier function → receiverText undefined (bare call)", () => {
    const call = fakeNode({
      type: "invocation_expression",
      children: [idNode("DoIt")],
      fields: { function: idNode("DoIt") },
    });
    expect(callName(call as never)).toBe("DoIt");
    expect(receiverText(call as never)).toBeUndefined();
  });
});

describe("firstAncestorCallNamed — method boundary stops the walk", () => {
  it("a call directly inside a method body whose ancestors never match → false", () => {
    const inner = idNode("Delay");
    inner.parent = fakeNode({ type: "method_declaration" });
    expect(firstAncestorCallNamed(inner as never, "RouteAsync")).toBe(false);
  });
});

describe("isHelperIdiom — shared vocabulary guard (exported for rules)", () => {
  it("verify/VerifyAll/VerifyAnalyzerAsync match; checker/assertion do not", () => {
    expect(isHelperIdiom("Verify")).toBe(true);
    expect(isHelperIdiom("VerifyAll")).toBe(true);
    expect(isHelperIdiom("VerifyAnalyzerAsync")).toBe(true);
    expect(isHelperIdiom("assertThrows")).toBe(true);
    expect(isHelperIdiom("checker")).toBe(false);
    expect(isHelperIdiom("assertion")).toBe(false);
  });
});

// ─── extractJavaModel — annotation-name guards via fake tree ─────────

describe("extractJavaModel — javaAnnotationNames guards (fake tree)", () => {
  it("annotation without a name node → skipped (L268 guard); qualified name → last identifier (L271)", () => {
    // Build: class T { @BeforeEach void setup() {} @org.junit.AfterEach void bye() {} }
    const simpleAnn = fakeNode({
      type: "marker_annotation",
      children: [idNode("BeforeEach")],
      fields: { name: idNode("BeforeEach") },
    });
    // Qualified annotation: name node is a scoped identifier with TWO
    // identifier children — the loop keeps the LAST segment.
    const qualifiedName = fakeNode({
      type: "scoped_type_identifier",
      children: [idNode("org"), idNode("AfterEach")],
    });
    const qualifiedAnn = fakeNode({
      type: "marker_annotation",
      children: [qualifiedName],
      fields: { name: qualifiedName },
    });
    const setup = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "modifiers", children: [simpleAnn] }),
        fakeNode({ type: "block" }),
      ],
      fields: { name: idNode("setup"), body: fakeNode({ type: "block" }) },
    });
    const bye = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "modifiers", children: [qualifiedAnn] }),
        fakeNode({ type: "block" }),
      ],
      fields: { name: idNode("bye"), body: fakeNode({ type: "block" }) },
    });
    const namelessAnn = fakeNode({ type: "marker_annotation" });
    const nameless = fakeNode({
      type: "method_declaration",
      children: [
        fakeNode({ type: "modifiers", children: [namelessAnn] }),
        fakeNode({ type: "block" }),
      ],
      fields: { name: idNode("nameless"), body: fakeNode({ type: "block" }) },
    });
    const root = fakeNode({
      type: "program",
      children: [setup, bye, nameless],
    });
    root.descendantsOfType = () => [setup, bye, nameless];
    const model = extractQaModel({
      path: "T.java",
      text: "",
      ast: fakeTree(root),
    });
    const hooks = model!.nodes.filter(
      (n) => n.concept === "setup" || n.concept === "teardown",
    );
    // @BeforeEach → setup; @org.junit.AfterEach → last segment AfterEach → teardown.
    expect(hooks.map((n) => `${n.name}:${n.concept}`).sort()).toEqual([
      "bye:teardown",
      "setup:setup",
    ]);
    // The nameless annotation matched nothing — no node for it.
    expect(hooks.find((n) => n.name === "nameless")).toBeUndefined();
  });

  it("a method_declaration with no modifiers field → skipped entirely", () => {
    const decl = fakeNode({
      type: "method_declaration",
      children: [fakeNode({ type: "block" })],
      fields: { name: idNode("m"), body: fakeNode({ type: "block" }) },
    });
    const root = fakeNode({ type: "program", children: [decl] });
    root.descendantsOfType = () => [decl];
    const model = extractQaModel({
      path: "T.java",
      text: "",
      ast: fakeTree(root),
    });
    expect(model!.nodes).toEqual([]);
  });
});
