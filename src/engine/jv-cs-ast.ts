/**
 * Java/C# L2 structural analysis over the Phase 0.5 parse stage
 * (Verification Trust Evolution Plan §13.1–§13.3).
 *
 * Depth contract — L2, honestly bounded: this module consumes the
 * tree-sitter trees the async parse stage already produces
 * (`parseJavaAst`/`parseCSharpAst`, delivered via `ParsedFile.ast`) and
 * exposes STRUCTURAL queries only — test-method scoping by annotation or
 * attribute, invocation structure, call/argument containment. It does
 * NOT promise type or symbol semantics: no Roslyn, no classpath, no
 * resolver. Semantic depth for every consumer rule is documented as L2
 * (plan §13.4).
 *
 * Node-shape note: the grammar node types used below
 * (`method_declaration`, `modifiers`/`marker_annotation` for Java;
 * `attribute_list`/`attribute`, `invocation_expression`/
 * `member_access_expression`, `lambda_expression` for C#) were verified
 * against real parses of both grammars (web-tree-sitter@0.25.6,
 * tree-sitter-wasms@0.1.13) before this layer shipped — the same
 * empirically-verified discipline as the WASM pin. The index-space of
 * `Node.startIndex` was verified the same way (see nodeLineCol).
 *
 * Parse-or-fallback discipline (§13.2): every rule that consumes this
 * layer via the `astQuery` hook MUST fall back to its regex path when no
 * tree is available (fixture harness, grammar load failure). `undefined`
 * from the hook means "no AST — use the fallback", never "no findings".
 */

import type { Node, Tree } from "web-tree-sitter";

/** Type re-export: consumers annotate their node params with this. */
export type { Node as TsNode } from "web-tree-sitter";

/** Narrow the loose `ast` seam back to a tree-sitter Tree. */
export function getTreeSitterTree(ast: unknown): Tree | undefined {
  if (!(ast instanceof Object) || !("rootNode" in ast)) return undefined;
  const root = (ast as { rootNode?: unknown }).rootNode;
  if (root instanceof Object && "startPosition" in root && "hasError" in root) {
    return ast as Tree;
  }
  return undefined;
}

// ─── Position conversion ─────────────────────────────────────────────

/**
 * 1-based line and 1-based column (UTF-16 code units, matching
 * lineAt/colAt semantics) for a node's `startIndex`. Empirically
 * verified: web-tree-sitter's JS binding exposes `startIndex` in
 * UTF-16 code units of the ORIGINAL string (`text.slice(startIndex)`
 * lands exactly on the node text), NOT in UTF-8 bytes — converting
 * through a byte map shifted every position backward on non-ASCII
 * source. The helper exists so this finding is pinned in one place.
 */
export function nodeLineCol(
  text: string,
  charIndex: number,
): { line: number; column: number } {
  let line = 1;
  for (let i = 0; i < charIndex; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  const lastBreak = charIndex <= 0 ? -1 : text.lastIndexOf("\n", charIndex - 1);
  return { line, column: charIndex - lastBreak };
}

// ─── Java: @Test method boundaries ───────────────────────────────────

export interface JavaTestMethod {
  /** Method name (the `identifier` under the declaration). */
  name: string;
  /** The `method_declaration` node. */
  decl: Node;
  /** The annotation node whose simple name is `Test` (position anchor). */
  annotation: Node;
  /** The method `block`. */
  body: Node;
}

function lastIdentifierText(node: Node): string | undefined {
  if (node.type === "identifier") return node.text;
  // Qualified names (`@org.junit.Test`): the last identifier segment.
  let last: string | undefined;
  for (const child of node.children) {
    if (child?.type === "identifier") last = child.text;
  }
  return last;
}

function isTestAnnotation(node: Node): boolean {
  if (node.type !== "marker_annotation" && node.type !== "annotation") {
    return false;
  }
  const nameNode = node.childForFieldName("name");
  return nameNode ? lastIdentifierText(nameNode) === "Test" : false;
}

/**
 * Every `@Test` method declaration in the tree (JUnit 4/5 and TestNG
 * share the simple name; qualified forms like `@org.junit.Test` resolve
 * by their last identifier segment). TestNG's `@Test` may carry
 * arguments — both `marker_annotation` and `annotation` are accepted.
 */
export function javaTestMethods(tree: Tree): JavaTestMethod[] {
  const out: JavaTestMethod[] = [];
  for (const decl of tree.rootNode.descendantsOfType("method_declaration")) {
    if (!decl) continue;
    const modifiers = decl.childForFieldName("modifiers") ?? decl.children[0];
    if (!modifiers || modifiers.type !== "modifiers") continue;
    let annotation: Node | undefined;
    for (const child of modifiers.children) {
      if (child && isTestAnnotation(child)) {
        annotation = child;
        break;
      }
    }
    if (!annotation) continue;
    const nameNode = decl.childForFieldName("name");
    const body = decl.childForFieldName("body");
    if (!nameNode || !body) continue;
    out.push({ name: nameNode.text, decl, annotation, body });
  }
  return out;
}

// ─── C#: [Test]/[Fact]/[TestMethod] method boundaries ────────────────

export interface CSharpTestMethod {
  /** Method name (the declaration's `name` field). */
  name: string;
  /** The `method_declaration` node. */
  decl: Node;
  /** The `attribute` node that marked this a test (position anchor). */
  attribute: Node;
  /** The method `block`. */
  body: Node;
}

const CS_TEST_ATTRIBUTES = new Set(["Test", "Fact", "TestMethod"]);

function isCsTestAttribute(node: Node): boolean {
  if (node.type !== "attribute") return false;
  const nameNode = node.childForFieldName("name");
  if (!nameNode) return false;
  return CS_TEST_ATTRIBUTES.has(lastIdentifierText(nameNode) ?? "");
}

/**
 * Every method declaration carrying a `[Test]`/`[Fact]`/`[TestMethod]`
 * attribute (NUnit/xUnit/MSTest; qualified forms resolve by last
 * identifier segment; constructor arguments like
 * `[Test(Description = "…")]` do not disqualify). Setup/teardown
 * attributes ([TestInitialize], [TestCleanup], …) are excluded by the
 * exact-name set — the boundary defect the pre-AST regex had to patch
 * by hand (Sprint 8 Task 37).
 */
export function csharpTestMethods(tree: Tree): CSharpTestMethod[] {
  const out: CSharpTestMethod[] = [];
  for (const decl of tree.rootNode.descendantsOfType("method_declaration")) {
    if (!decl) continue;
    let attribute: Node | undefined;
    for (const child of decl.children) {
      if (child?.type !== "attribute_list") continue;
      for (const grand of child.children) {
        if (grand && isCsTestAttribute(grand)) {
          attribute = grand;
          break;
        }
      }
      if (attribute) break;
    }
    if (!attribute) continue;
    const nameNode = decl.childForFieldName("name");
    const body = decl.childForFieldName("body");
    if (!nameNode || !body) continue;
    out.push({ name: nameNode.text, decl, attribute, body });
  }
  return out;
}

// ─── Invocation structure ────────────────────────────────────────────

const INVOCATION_TYPES = new Set([
  "method_invocation",
  "invocation_expression",
]);

/** True for either grammar's invocation node. */
export function isInvocation(node: Node): boolean {
  return INVOCATION_TYPES.has(node.type);
}

/**
 * The callee's simple name for an invocation node in either grammar:
 * Java `method_invocation.name`, C# `invocation_expression.function` →
 * `member_access_expression.name` (generic calls resolve through the
 * `generic_name`'s identifier). Undefined when the shape is exotic
 * (dynamic/element access) — callers treat that as "not a match".
 */
export function callName(node: Node): string | undefined {
  if (node.type === "method_invocation") {
    const nameNode = node.childForFieldName("name");
    return nameNode ? lastIdentifierText(nameNode) : undefined;
  }
  if (node.type === "invocation_expression") {
    const fn = node.childForFieldName("function");
    if (!fn) return undefined;
    if (fn.type === "identifier") return fn.text;
    if (fn.type === "generic_name") {
      return fn.namedChildren.find((c) => c?.type === "identifier")?.text;
    }
    if (fn.type === "member_access_expression") {
      const nameNode = fn.childForFieldName("name");
      if (!nameNode) return undefined;
      if (nameNode.type === "generic_name") {
        return nameNode.namedChildren.find((c) => c?.type === "identifier")
          ?.text;
      }
      return nameNode.text;
    }
    return undefined;
  }
  return undefined;
}

/**
 * The invocation's receiver text, if any: Java `method_invocation.object`,
 * C# `member_access_expression`'s left operand. Undefined for bare calls
 * (`fail(...)`). Used for `Assert.`-style receiver-oracle matching.
 */
export function receiverText(node: Node): string | undefined {
  if (node.type === "method_invocation") {
    return node.childForFieldName("object")?.text;
  }
  if (node.type === "invocation_expression") {
    const fn = node.childForFieldName("function");
    if (fn?.type === "member_access_expression") {
      return fn.namedChildren[0]?.text;
    }
    return undefined;
  }
  return undefined;
}

/** All invocation nodes within (and including) the given node. */
export function invocationsWithin(node: Node): Node[] {
  const out: Node[] = [];
  const visit = (n: Node): void => {
    if (isInvocation(n)) out.push(n);
    for (const child of n.namedChildren) {
      if (child) visit(child);
    }
  };
  visit(node);
  return out;
}

/**
 * Walks UP from a node and returns true when the FIRST invocation
 * ancestor (before the enclosing method boundary) has the given callee
 * name — i.e. "is this call lexically nested inside (an argument chain
 * of) that API?". Anonymous functions do NOT stop the walk (a
 * `Task.Delay` inside a route-handler lambda is still inside
 * `RouteAsync`); a method_declaration does.
 */
export function firstAncestorCallNamed(node: Node, name: string): boolean {
  let current: Node | null = node.parent;
  while (current) {
    if (
      current.type === "method_declaration" ||
      current.type === "constructor_declaration"
    ) {
      return false;
    }
    if (isInvocation(current) && callName(current) === name) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Helper/verification idiom — the QA-CS-103 oracle's shared vocabulary
 * (verify/VerifyAll/VerifyAnalyzerAsync/CheckState/Assert.Throws and
 * camelCase helpers), case-aware so English-word false friends
 * (checker, assertion, verified) do NOT match: prefix + uppercase
 * boundary. Lives here so the rule and the §14 semantic model share
 * one implementation (No False Proof: one vocabulary, one source).
 */
const HELPER_PREFIXES = ["verify", "check", "assert"];

export function isHelperIdiom(name: string): boolean {
  if (name.toLowerCase() === "verifyall") return true;
  for (const prefix of HELPER_PREFIXES) {
    if (!name.toLowerCase().startsWith(prefix)) continue;
    const rest = name.slice(prefix.length);
    if (rest.length === 0) return true; // bare Verify/check/assert
    const first = rest.charCodeAt(0);
    if (first >= 65 && first <= 90) return true; // PascalCase suffix
  }
  return false;
}
