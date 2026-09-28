/**
 * Python tree-sitter structural queries (product-gap master plan P6 —
 * the AST substrate for the QA-PY-007 rework).
 *
 * Depth contract — L2, honestly bounded (mirrors jv-cs-ast.ts): this
 * module consumes the tree-sitter tree the async parse stage already
 * produces (`parsePythonAst`, delivered via `ParsedFile.ast`) and exposes
 * STRUCTURAL queries only — with-statement shape and block statement
 * counts. It does NOT resolve types or imports. Every consumer rule must
 * fall back to its regex path when the tree is absent (parse-or-fallback,
 * §10.1).
 */

import type { Tree } from "web-tree-sitter";
import { getTreeSitterTree } from "./jv-cs-ast.js";

export function getPythonTree(ast: unknown): Tree | undefined {
  return getTreeSitterTree(ast);
}

export interface PythonRaisesBlock {
  /** Byte offset of the `with` statement node. */
  start: number;
  /** Byte offset one past the `with` statement node. */
  end: number;
  /** Byte offset of the `pytest.raises(...)` call node. */
  callStart: number;
  /** Byte offset one past the raises call node. */
  callEnd: number;
  /** Source text of the exception-type argument, e.g. `ValueError`. */
  exceptionText: string;
  /** True when the exception argument is a broad root type. */
  broadException: boolean;
  /** Number of statements in the with-block (the risk surface). */
  blockStatements: number;
  /** True when the raises call carries a `match=` keyword argument. */
  hasMatch: boolean;
}

const BROAD_EXC_RE =
  /^\s*(?:Exception|BaseException|BaseExceptionGroup|ExceptionGroup)\b/;

/** Minimal structural shape of a web-tree-sitter node (for the walks). */
interface TsNode {
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  children: TsNode[];
  namedChildren: TsNode[];
  childForFieldName(field: string): TsNode | null;
}

function walk(node: TsNode, visit: (n: TsNode) => void): void {
  visit(node);
  for (const child of node.children) walk(child, visit);
}

/**
 * The `pytest.raises` call that is a DIRECT context manager of `withNode`.
 *
 * Scopes the search to the with's own item list — `with_clause` for the
 * plain form, and `parenthesized_with_items` for `with (A, B):` — rather
 * than to the whole subtree. A call found deeper down belongs to an inner
 * `with_statement`, which the walk reaches in its own right and which owns
 * the block that actually gates it.
 */
function directRaisesItem(withNode: TsNode): TsNode | undefined {
  let found: TsNode | undefined;
  // Descend through the item wrappers rather than testing only the node it
  // is handed: the call lives at with_clause → with_item → call, so a scan
  // that returns on the first non-`call` node it sees returns on
  // `with_clause` itself and finds nothing.
  const scan = (n: TsNode) => {
    if (found) return;
    if (n.type === "call") {
      const fn = n.childForFieldName("function");
      if (fn && /(?:^|\.)raises$/.test(fn.text)) {
        found = n;
        return;
      }
    }
    for (const child of n.children) scan(child);
  };
  for (const child of withNode.children) {
    if (
      child.type === "with_clause" ||
      child.type === "parenthesized_with_items"
    ) {
      scan(child);
    }
  }
  return found;
}

/**
 * Every `with pytest.raises(...)` (optionally `... as exc`) statement in
 * the tree, with the structural facts the rework needs. Tree-sitter-
 * python grammar: a `with_statement` wraps `with_item`s and a `block`;
 * the raises call is a `call` whose function is an attribute chain
 * ending in `.raises`.
 *
 * 6.0. The raises call is now required to be a DIRECT context manager of the
 * `with_statement` being measured. It used to be found by walking the whole
 * subtree, so a `with pytest.raises(...)` nested inside another `with`
 * handed back the OUTER block's statement count — and `QA-PY-007`'s
 * single-statement gate, which exists precisely to suppress that shape,
 * could never fire for nested code.
 *
 * That is not a rare shape. In the pinned `pytest-dev/pytest` corpus, seven
 * of the eleven adjudicated findings were single-statement raises nested
 * inside `with saved_fd(1):`, and every one of them was counted as
 * multi-statement because the surrounding block has a dozen statements. The
 * rule measured the wrong block, which is why it measured 75% false
 * positives while its own unit fixtures passed.
 *
 * Requiring a direct context manager also fixes the shape by construction:
 * the outer `with` is examined, has no direct raises item, and is skipped;
 * the inner one is examined with its own block.
 */
export function pythonWithRaisesBlocks(tree: Tree): PythonRaisesBlock[] {
  const out: PythonRaisesBlock[] = [];
  const root = tree.rootNode as unknown as TsNode;
  walk(root, (node) => {
    if (node.type !== "with_statement") return;
    let blockNode: TsNode | undefined;
    for (const child of node.children) {
      if (child.type === "block") blockNode = child;
    }
    if (!blockNode) return;
    const raisesCall = directRaisesItem(node);
    if (!raisesCall) return;

    // Statement count of the with-block: named children are the parsed
    // statements (comments excluded — they carry no execution risk).
    const stmts = blockNode.namedChildren.filter((c) => c.type !== "comment");

    // Exception-type argument: first named child of the call's argument
    // list. (Keyword args like match=/…/ come later; the positional
    // exception class is first.)
    const args = raisesCall.childForFieldName("arguments");
    const firstArg = args?.namedChildren[0];
    const exceptionText = firstArg?.text ?? "";
    const broadException = BROAD_EXC_RE.test(exceptionText);

    out.push({
      start: node.startIndex,
      end: node.endIndex,
      callStart: raisesCall.startIndex,
      callEnd: raisesCall.endIndex,
      exceptionText,
      broadException,
      blockStatements: stmts.length,
      hasMatch: /(?:^|[([{,]\s*)match\s*=/.test(raisesCall.text),
    });
  });
  return out;
}
