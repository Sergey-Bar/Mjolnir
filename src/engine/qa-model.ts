/**
 * Common QA Semantic Model (Verification Trust Evolution Plan §14).
 *
 * A normalized concept IR — Test, TestBoundary (the anchor), Setup/
 * Teardown, Fixture, Action, Locator, Wait, Assertion, Mock,
 * NetworkInteraction, Retry, Navigation, Interaction, Lifecycle — that
 * per-language extractors produce from the ALREADY-existing parse stage
 * (ts-morph SourceFile for TS, tree-sitter Tree for Java/C#, regex
 * boundaries for Python) and that rules can consume instead of re-walking
 * grammars.
 *
 * EXTRACTED, NOT INVENTED: every classification table below cites the
 * rule whose measured vocabulary it copies — the model is the union of
 * what the migrated TS/JV/CS rules already query, normalized. Nothing
 * here changes scan behavior: NOTHING in the scan pipeline imports this
 * module (BEHAVIOR-NEUTRAL by construction; golden/corpus locks are
 * untouched). Adoption is additive per the plan — new rules may consume
 * `extractQaModel`; legacy rules migrate only per measured value.
 * tests/qa-model.spec.ts proves the model covers the concept nodes used
 * by the migrated rules by re-expressing the QA-JV-103 / QA-CS-102 /
 * QA-CS-103 oracles over the model and asserting finding-identical
 * results against the rules themselves.
 *
 * Position contract: all indexes are UTF-16 char offsets into the file
 * text (ts-morph getStart, tree-sitter startIndex — empirically
 * verified char-space, see nodeLineCol — and regex match.index all
 * agree). Line/column are 1-based, matching lineAt/colAt.
 *
 * Honesty boundary (No False Proof): a concept with no extractor for a
 * language is a VISIBLE GAP, documented in EXTRACTOR_COVERAGE — never
 * silently claimed. The type system models the plan's full concept
 * vocabulary; extraction coverage is per-language and cited.
 */

import type { ParsedFile } from "./adapter.js";
import { parseTsFile } from "./ts-ast.js";
import {
  getTreeSitterTree,
  javaTestMethods,
  csharpTestMethods,
  invocationsWithin,
  callName,
  receiverText,
  nodeLineCol,
  isInvocation,
  isHelperIdiom,
  type TsNode,
} from "./jv-cs-ast.js";
import { lineAt, colAt } from "../rules/shared/positions.js";
import { SyntaxKind, type CallExpression, type SourceFile } from "ts-morph";

// ─── Model types (plan §14 vocabulary, verbatim) ─────────────────────

/** The normalized concept vocabulary from plan §14. */
export type QaConcept =
  | "test" // Test — a runnable test with a body
  | "setup" // Setup — before-each/all hook
  | "teardown" // Teardown — after-each/all hook
  | "fixture" // Fixture — shared context provider (pytest fixture, …)
  | "assertion" // Assertion — verification call/throw
  | "wait" // Wait — synchronization call (sleep, waitFor*)
  | "mock" // Mock — test-double construction
  | "action" // Action — user-driven UI interaction (click, fill, …)
  | "navigation" // Navigation — page/document navigation
  | "network-interaction" // NetworkInteraction — route/intercept/expose
  | "retry" // Retry — retry policy anchor
  | "locator" // Locator — element query construction
  | "interaction" // Interaction — programmatic page evaluation/binding
  | "lifecycle"; // Lifecycle — suite-level grouping/lifecycle anchors

export interface QaPosition {
  /** UTF-16 char offset into the file text. */
  index: number;
  /** 1-based line. */
  line: number;
  /** 1-based column (UTF-16 units). */
  column: number;
}

export interface QaNode {
  concept: QaConcept;
  /** Anchor position (annotation/attribute/call start). */
  start: QaPosition;
  /** End of the node's span (body end for tests/hooks; call end for calls). */
  end?: QaPosition;
  /** Primary identifier: test/hook method name, callee name for calls. */
  name?: string;
  /** Callee simple name for call-classified nodes. */
  callee?: string;
  /** Receiver text for receiver-qualified calls (`Assert`, `Thread`, …). */
  receiver?: string;
  /** Full source text of a call node (argument inspection without re-parse). */
  text?: string;
  /**
   * Callee simple names of the enclosing invocation chain, outer→inner,
   * up to the method boundary (the firstAncestorCallNamed
   * generalization) — lets consumers express delegate/argument
   * containment without re-walking the tree.
   */
  ancestors?: string[];
  /**
   * Test/hook body parse was truncated (tree-sitter ERROR node) — the
   * QA-JV-103/QA-CS-103 grammar-error guard, carried on the node.
   */
  truncated?: boolean;
  /**
   * TS-only: a AwaitExpression/ReturnStatement ancestor consumes this
   * call's promise (qa-pw-002's consumption oracle). Undefined for
   * non-promise grammar calls.
   */
  awaited?: boolean;
}

export interface QaSemanticModel {
  /** Language the nodes were extracted from. */
  language: "typescript" | "javascript" | "java" | "csharp" | "python";
  nodes: QaNode[];
}

/** Per-language extractor coverage of the plan vocabulary (visible gaps). */
export const EXTRACTOR_COVERAGE: Record<
  QaSemanticModel["language"],
  { extracted: QaConcept[]; "not-extracted": QaConcept[]; note: string }
> = {
  typescript: {
    extracted: [
      "test",
      "setup",
      "teardown",
      "assertion",
      "wait",
      "mock",
      "action",
      "navigation",
      "network-interaction",
      "retry",
      "locator",
      "interaction",
      "lifecycle",
    ],
    "not-extracted": ["fixture"],
    note: "call/enum vocabularies from qa-pw-002/004/005/101/102/103/104/112/113/114/117/119/123/142, qa-test-001/003/004/006, qa-tqual-001; test boundaries via ts-morph CallExpressions (scorer's it/test vocabulary, describe excluded by the same design)",
  },
  javascript: {
    extracted: [
      "test",
      "setup",
      "teardown",
      "assertion",
      "wait",
      "mock",
      "action",
      "navigation",
      "network-interaction",
      "retry",
      "locator",
      "interaction",
      "lifecycle",
    ],
    "not-extracted": ["fixture"],
    note: "same extractor as typescript (parseTsFile allowJs)",
  },
  java: {
    extracted: [
      "test",
      "setup",
      "teardown",
      "assertion",
      "wait",
      "mock",
      "action",
      "navigation",
      "network-interaction",
      "retry",
      "locator",
    ],
    "not-extracted": ["fixture", "interaction", "lifecycle"],
    note: "boundaries via javaTestMethods (QA-JV-103); call vocabularies from QA-JV-102/103/105, the JV retry-masking family, shared-page/hardcoded-url families",
  },
  csharp: {
    extracted: [
      "test",
      "setup",
      "teardown",
      "assertion",
      "wait",
      "action",
      "navigation",
      "network-interaction",
      "retry",
      "locator",
      "interaction",
    ],
    "not-extracted": ["fixture", "mock", "lifecycle"],
    note: "boundaries via csharpTestMethods (QA-CS-103); call vocabularies from QA-CS-101/102/103, the CS retry-masking family, shared-page/hardcoded-url families",
  },
  python: {
    extracted: ["test", "fixture", "assertion", "wait"],
    "not-extracted": [
      "setup",
      "teardown",
      "mock",
      "action",
      "navigation",
      "network-interaction",
      "retry",
      "locator",
      "interaction",
      "lifecycle",
    ],
    note: "boundaries via qa-py-003's def test_ vocabulary, fixtures via qa-py-011's @pytest.fixture, waits via qa-py-005/102, assertions via the qa-py-003 oracle vocabulary; the Python adapter is regex-layer by design (no AST seam)",
  },
};

// ─── Entry point ─────────────────────────────────────────────────────

/**
 * Extract the semantic model for one parsed file. Resolves undefined
 * when the language has no extractor or the parse stage produced no
 * tree (the astQuery discipline: undefined = no model, never an empty
 * claim). Python needs no AST — regex boundaries over the text.
 */
export function extractQaModel(file: ParsedFile): QaSemanticModel | undefined {
  if (file.path.endsWith(".java")) return extractJavaModel(file);
  if (file.path.endsWith(".cs")) return extractCSharpModel(file);
  if (file.path.endsWith(".py")) return extractPythonModel(file);
  if (/\.[cm]?[jt]sx?$/.test(file.path)) {
    // ts-morph's in-memory project cannot fail on a real scanned path
    // (it is error-tolerant; empty text parses to an empty source
    // file) — the undefined-seam is exercised only by java/csharp
    // trees above.
    // ts-morph's in-memory project cannot fail on a real scanned path
    // (it is error-tolerant; empty text parses to an empty source
    // file) — the undefined-seam is exercised only by java/csharp
    // trees above. A failed parse means "no model", never a crash.
    return extractTsModel(file, parseTsFile(file) as SourceFile);
  }
  return undefined;
}

function pos(text: string, index: number): QaPosition {
  return { index, ...nodeLineCol(text, index) };
}

// ─── Java extractor ──────────────────────────────────────────────────

/** JUnit 4/5, TestNG setup/teardown annotation simple names. */
const JAVA_HOOK_ANNOTATIONS = new Set([
  "BeforeEach",
  "AfterEach",
  "BeforeAll",
  "AfterAll",
  "Before",
  "After",
  "BeforeClass",
  "AfterClass",
  "BeforeMethod",
  "AfterMethod",
  "BeforeSuite",
  "AfterSuite",
]);

/** Retry annotation simple names (JV retry-masking family: @RetryingTest). */
const JAVA_RETRY_ANNOTATIONS = new Set(["RetryingTest"]);

/** All annotation simple names on a Java modifiers node. */
function javaAnnotationNames(modifiers: TsNode): string[] {
  const names: string[] = [];
  for (const child of modifiers.children) {
    if (child?.type !== "marker_annotation" && child?.type !== "annotation") {
      continue;
    }
    const nameNode = child.childForFieldName("name");
    if (!nameNode) continue;
    let last: string | undefined;
    for (const part of nameNode.children) {
      if (part?.type === "identifier") last = part.text;
    }
    names.push(last ?? nameNode.text);
  }
  return names;
}

function extractJavaModel(file: ParsedFile): QaSemanticModel | undefined {
  const tree = getTreeSitterTree(file.ast);
  if (!tree) return undefined;
  const text = file.text;
  const nodes: QaNode[] = [];

  // Test boundaries come from the SAME extractor the rule uses
  // (javaTestMethods — QA-JV-103's boundary oracle, reused verbatim so
  // the model cannot drift from the rule's scoping).
  for (const test of javaTestMethods(tree)) {
    nodes.push({
      concept: "test",
      name: test.name,
      start: pos(text, test.annotation.startIndex),
      end: pos(text, test.body.endIndex),
      truncated: test.body.hasError,
    });
  }

  // Hooks + retry annotations (JUnit4/5 + TestNG vocabulary; retry from
  // the JV retry-masking family). descendantsOfType is typed
  // (Node | null)[] but never yields null at runtime — iterate as Node.
  // A method_declaration always carries a name field; bodyless shapes
  // (interface/abstract methods) are filtered by the body guard.
  for (const decl of tree.rootNode.descendantsOfType(
    "method_declaration",
  ) as TsNode[]) {
    const modifiers = decl.childForFieldName("modifiers") ?? decl.children[0];
    if (!modifiers || modifiers.type !== "modifiers") continue;
    const body = decl.childForFieldName("body");
    if (!body) continue;
    const nameNode = decl.childForFieldName("name") as TsNode;
    for (const annotation of javaAnnotationNames(modifiers)) {
      if (JAVA_HOOK_ANNOTATIONS.has(annotation)) {
        let concept: QaConcept = "setup";
        if (annotation.startsWith("After")) concept = "teardown";
        nodes.push({
          concept,
          name: nameNode.text,
          start: pos(text, decl.startIndex),
          end: pos(text, body.endIndex),
          truncated: body.hasError,
        });
        break;
      }
      if (JAVA_RETRY_ANNOTATIONS.has(annotation)) {
        nodes.push({
          concept: "retry",
          name: nameNode.text,
          start: pos(text, decl.startIndex),
          end: pos(text, body.endIndex),
          truncated: body.hasError,
        });
        break;
      }
    }
  }

  nodes.push(...javaCSharpCallNodes(tree, text, JAVA_CALLEE_CONCEPTS));
  return { language: "java", nodes };
}

// ─── C# extractor ────────────────────────────────────────────────────

/** MSTest/NUnit setup/teardown attribute simple names. */
const CS_HOOK_ATTRIBUTES = new Set([
  "TestInitialize",
  "TestCleanup",
  "SetUp",
  "TearDown",
  "OneTimeSetUp",
  "OneTimeTearDown",
  "ClassInitialize",
  "ClassCleanup",
  "AssemblyInitialize",
  "AssemblyCleanup",
  "FixtureSetUp",
  "FixtureTearDown",
]);

/** Retry attribute simple names (CS retry-masking family: [Retry(n)]). */
const CS_RETRY_ATTRIBUTES = new Set(["Retry", "RetryFact", "RetryTheory"]);

function extractCSharpModel(file: ParsedFile): QaSemanticModel | undefined {
  const tree = getTreeSitterTree(file.ast);
  if (!tree) return undefined;
  const text = file.text;
  const nodes: QaNode[] = [];

  // Test boundaries come from the SAME extractor the rule uses
  // (csharpTestMethods — QA-CS-103's boundary oracle, reused verbatim).
  for (const test of csharpTestMethods(tree)) {
    nodes.push({
      concept: "test",
      name: test.name,
      start: pos(text, test.attribute.startIndex),
      end: pos(text, test.body.endIndex),
      truncated: test.body.hasError,
    });
  }

  // Setup/teardown + retry attributes (MSTest/NUnit vocabulary; retry
  // from the CS retry-masking family). Iterate as Node (see above).
  // A method_declaration always carries a name field; bodyless shapes
  // (abstract methods) are filtered by the body guard.
  for (const decl of tree.rootNode.descendantsOfType(
    "method_declaration",
  ) as TsNode[]) {
    const body = decl.childForFieldName("body");
    if (!body) continue;
    const nameNode = decl.childForFieldName("name") as TsNode;
    let attr: string | undefined;
    for (const child of decl.children) {
      if (child?.type !== "attribute_list") continue;
      for (const grand of child.children) {
        if (grand?.type !== "attribute") continue;
        // The attribute grammar always carries a name field.
        const attrName = grand.childForFieldName("name") as TsNode;
        let last: string | undefined;
        for (const part of attrName.children) {
          if (part?.type === "identifier") last = part.text;
        }
        const simple = last ?? attrName.text;
        if (CS_HOOK_ATTRIBUTES.has(simple) || CS_RETRY_ATTRIBUTES.has(simple)) {
          attr = simple;
          break;
        }
      }
      if (attr) break;
    }
    if (!attr) continue;
    let concept: QaConcept;
    if (attr.includes("TearDown") || attr.includes("Cleanup")) {
      concept = "teardown";
    } else if (CS_RETRY_ATTRIBUTES.has(attr)) {
      concept = "retry";
    } else {
      concept = "setup";
    }
    nodes.push({
      concept,
      name: nameNode.text,
      start: pos(text, decl.startIndex),
      end: pos(text, body.endIndex),
      truncated: body.hasError,
    });
  }

  nodes.push(...javaCSharpCallNodes(tree, text, CS_CALLEE_CONCEPTS));
  // Conditional assertion-exception throws (QA-CS-103's
  // throwsAssertionException): `throw new *Assertion*Exception(...)`
  // verifies its condition by failing the test.
  for (const throwStmt of tree.rootNode.descendantsOfType(
    "throw_statement",
  ) as TsNode[]) {
    const creation = throwStmt.namedChildren.find(
      (c) => c?.type === "object_creation_expression",
    );
    if (!creation) continue;
    // Every object_creation_expression in the C# grammar carries a
    // type field (verified against real parses) — the cast trusts the
    // shape; a rethrow is filtered by the `creation` guard above.
    const typeName = (creation.childForFieldName("type") as TsNode).text;
    if (/assert/i.test(typeName) && /exception/i.test(typeName)) {
      nodes.push({
        concept: "assertion",
        name: typeName,
        callee: typeName,
        start: pos(text, creation.startIndex),
        end: pos(text, creation.endIndex),
        text: creation.text,
        ancestors: ancestorCallNames(creation),
      });
    }
  }
  return { language: "csharp", nodes };
}

// ─── Shared Java/C# call classification ──────────────────────────────

interface CallConceptTable {
  /** Callee simple name → concept (exact/regex matchers below). */
  exact: Record<string, QaConcept>;
  /** Receiver-qualified: callee only counts with this receiver text. */
  receiverQualified: Record<string, Record<string, QaConcept>>;
  /** Prefix matchers (checked in order after exact). */
  prefixes: Array<{ test: (name: string) => boolean; concept: QaConcept }>;
}

/**
 * Java callee vocabulary — copied from the rules that measured it:
 * assert-prefix/bare fail/verify + helper idiom (QA-JV-103's oracle),
 * waitFor* (QA-JV-103 isThrowingWait + QA-JV-105), Thread.sleep
 * (QA-JV-102/hard-sleep family), navigate/goto (hardcoded-url JV),
 * querySelector/locator (shared-page/brittle-selectors JV), route/
 * exposeFunction/setRoute (blanket-route JV + QA-CS-102's environment
 * delegates), mock/spy (QA-JV fixture practice: Mockito mock/spy).
 */
const JAVA_CALLEE_CONCEPTS: CallConceptTable = {
  exact: {
    fail: "assertion",
    verify: "assertion",
    navigate: "navigation",
    goto: "navigation",
    querySelector: "locator",
    querySelectorAll: "locator",
    locator: "locator",
    frameLocator: "locator",
    route: "network-interaction",
    setRoute: "network-interaction",
    exposeFunction: "interaction",
    mock: "mock",
    spy: "mock",
  },
  receiverQualified: {
    sleep: { Thread: "wait" },
  },
  prefixes: [
    { test: (n) => /^assert[A-Z]/.test(n), concept: "assertion" },
    // The Java helper idiom (QA-JV-103's HELPER_IDIOM_RE) — camelCase.
    {
      test: (n) => isHelperIdiom(n) && /^[vca]/.test(n),
      concept: "assertion",
    },
    { test: (n) => n.startsWith("waitFor"), concept: "wait" },
    {
      test: (n) =>
        /^(?:click|fill|tap|hover|dblclick|press|check|selectOption|type|focus)$/.test(
          n,
        ),
      concept: "action",
    },
  ],
};

/**
 * C# callee vocabulary — copied from the rules that measured it:
 * Assert receiver + Shouldly + Expect + Verify + helper idiom +
 * WaitFor*Async≠WaitForTimeoutAsync (QA-CS-103), Thread/Task Sleep/Delay
 * (QA-CS-102), GotoAsync (hardcoded-url CS), RouteAsync/SetRoute/
 * RouteFromHARAsync/ExposeFunctionAsync/AddLocatorHandlerAsync
 * (QA-CS-102's ENVIRONMENT_DELEGATE_APIS), ClickAsync/FillAsync…,
 * Locator/FrameLocator/GetBy*.
 */
const CS_CALLEE_CONCEPTS: CallConceptTable = {
  exact: {
    expect: "assertion",
    Expect: "assertion",
    GotoAsync: "navigation",
    GoToAsync: "navigation",
    RouteAsync: "network-interaction",
    RouteFromHARAsync: "network-interaction",
    RouteFromHAR: "network-interaction",
    SetRoute: "network-interaction",
    SetRouteHandler: "network-interaction",
    UnrouteAllAsync: "network-interaction",
    AddLocatorHandlerAsync: "interaction",
    ExposeFunctionAsync: "interaction",
    ExposeFunction: "interaction",
    ExposeBindingAsync: "interaction",
    RunAxe: "assertion",
    Locator: "locator",
    FrameLocator: "locator",
    GetByTestId: "locator",
    GetByRole: "locator",
    GetByText: "locator",
    GetByLabel: "locator",
    GetByPlaceholder: "locator",
    GetByAltText: "locator",
    GetByTitle: "locator",
    QuerySelector: "locator",
    QuerySelectorAll: "locator",
  },
  receiverQualified: {
    Sleep: { Thread: "wait" },
    Delay: { Task: "wait" },
  },
  prefixes: [
    {
      test: (n) => n === "Should" || /^Should[A-Z]/.test(n),
      concept: "assertion",
    },
    {
      test: isHelperIdiom,
      concept: "assertion",
    },
    {
      test: (n) =>
        n.startsWith("WaitFor") &&
        n.endsWith("Async") &&
        n !== "WaitForTimeoutAsync",
      concept: "wait",
    },
    { test: (n) => n === "WaitForTimeoutAsync", concept: "wait" },
    {
      test: (n) =>
        /^(?:ClickAsync|FillAsync|TapAsync|HoverAsync|DblClickAsync|PressAsync|CheckAsync|UncheckAsync|SelectOptionAsync|FocusAsync|TypeAsync)$/.test(
          n,
        ),
      concept: "action",
    },
  ],
};

/**
 * Classify every invocation in the tree against a table, carrying
 * callee/receiver/text/ancestors. Ancestors are the enclosing invocation
 * callee names up to the method boundary (outer→inner) — the
 * firstAncestorCallNamed generalization, so containment decisions
 * (route delegates, WhenAny races) are expressible over the model.
 */
function javaCSharpCallNodes(
  tree: NonNullable<ReturnType<typeof getTreeSitterTree>>,
  text: string,
  table: CallConceptTable,
): QaNode[] {
  const nodes: QaNode[] = [];
  for (const call of invocationsWithin(tree.rootNode)) {
    const callee = callName(call);
    if (callee === undefined) continue;
    const receiver = receiverText(call);
    let concept: QaConcept | undefined = table.exact[callee];
    if (concept === undefined && receiver !== undefined) {
      concept = table.receiverQualified[callee]?.[receiver];
    }
    if (concept === undefined) {
      for (const p of table.prefixes) {
        if (p.test(callee)) {
          concept = p.concept;
          break;
        }
      }
    }
    if (concept === undefined) continue;
    const node: QaNode = {
      concept,
      name: callee,
      callee,
      start: pos(text, call.startIndex),
      end: pos(text, call.endIndex),
      text: call.text,
      ancestors: ancestorCallNames(call),
    };
    if (receiver !== undefined) node.receiver = receiver;
    nodes.push(node);
  }
  return nodes;
}

/** Enclosing invocation callee names, outer→inner, to the method boundary. */
function ancestorCallNames(node: TsNode): string[] {
  const names: string[] = [];
  let current: TsNode | null = node.parent;
  while (current) {
    if (
      current.type === "method_declaration" ||
      current.type === "constructor_declaration"
    ) {
      break;
    }
    if (isInvocation(current)) {
      const name = callName(current);
      if (name !== undefined) names.unshift(name);
    }
    current = current.parent;
  }
  return names;
}

// ─── TypeScript extractor ────────────────────────────────────────────

/**
 * TS callee vocabulary — copied from the rules that measured it:
 * expect/assert (qa-pw-002, qa-test-003), waitFor + goto/route families
 * (qa-pw-101/102/103/118/123/142), evaluate/exposeFunction (qa-pw-005),
 * click/fill and the locator family (qa-pw-004/104/112/113/114/145),
 * jest/vi mock+retryTimes (qa-test-006, qa-tqual-001), delay/sleep/pause
 * helper idioms (qa-test-004), describe.serial (qa-pw-117).
 */
const TS_CALLEE_CONCEPTS: CallConceptTable = {
  exact: {
    expect: "assertion",
    assert: "assertion",
    goto: "navigation",
    route: "network-interaction",
    unroute: "network-interaction",
    routeFromHAR: "network-interaction",
    evaluate: "interaction",
    evaluateHandle: "interaction",
    exposeFunction: "interaction",
    addInitScript: "interaction",
    addLocatorHandler: "interaction",
    locator: "locator",
    frameLocator: "locator",
    getByTestId: "locator",
    getByRole: "locator",
    getByText: "locator",
    getByLabel: "locator",
    getByPlaceholder: "locator",
    getByAltText: "locator",
    getByTitle: "locator",
    $: "locator",
    $$: "locator",
  },
  receiverQualified: {},
  prefixes: [
    { test: (n) => n.startsWith("waitFor"), concept: "wait" },
    {
      test: (n) => /^(?:delay|sleep|pause|wait|timeout)$/.test(n),
      concept: "wait",
    },
    {
      test: (n) =>
        /^(?:click|dblclick|fill|hover|tap|check|uncheck|selectOption|press|type|focus|dragTo)$/.test(
          n,
        ),
      concept: "action",
    },
    { test: (n) => n === "retryTimes", concept: "retry" },
    {
      test: (n) => n === "mock" || n === "fn" || n === "spyOn",
      concept: "mock",
    },
  ],
};

const TS_TEST_CALLEE_RE = /^(?:it|test)(?:\.\w+)*$/;
const TS_HOOK_CONCEPTS: Record<string, QaConcept> = {
  beforeEach: "setup",
  beforeAll: "setup",
  afterEach: "teardown",
  afterAll: "teardown",
};

function calleeChainText(expr: TsNodeMorph): string {
  return expr.getText().replace(/\s+/g, "");
}

type TsNodeMorph = import("ts-morph").Node;

function extractTsModel(file: ParsedFile, sf: SourceFile): QaSemanticModel {
  const text = file.text;
  const nodes: QaNode[] = [];
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression();
    const chain = calleeChainText(expr);
    const parts = chain.split(".");
    const base: string = parts[parts.length - 1] as string;
    const start = pos(text, call.getStart());
    const end = pos(text, call.getEnd());

    // Test boundaries (scorer vocabulary: it/test with .modifier chains;
    // describe excluded by the same design as countTestDeclarations).
    if (TS_TEST_CALLEE_RE.test(chain)) {
      const callback = call
        .getArguments()
        .find((a) => a.getKindName().includes("Function"));
      if (callback) {
        nodes.push({
          concept: "test",
          name: chain,
          start,
          end: pos(text, callback.getEnd()),
        });
        continue;
      }
    }
    // Hooks (qa-pw-119's beforeEach/afterEach/beforeAll/afterAll).
    const hook: QaConcept | undefined = TS_HOOK_CONCEPTS[base];
    if (
      hook &&
      /(?:^|\.)(?:beforeEach|beforeAll|afterEach|afterAll)$/.test(chain)
    ) {
      const callback = call
        .getArguments()
        .find((a) => a.getKindName().includes("Function"));
      const node: QaNode = { concept: hook, name: chain, start };
      if (callback) node.end = pos(text, callback.getEnd());
      nodes.push(node);
      continue;
    }
    // Suite lifecycle (qa-pw-117: test.describe.serial).
    if (
      /^describe(?:\.\w+)*\.serial$/.test(chain) ||
      /\.describe\.serial/.test(chain)
    ) {
      nodes.push({ concept: "lifecycle", name: chain, start, end });
      continue;
    }

    // Call classification.
    const receiverParts = chain.split(".");
    const name: string = receiverParts[receiverParts.length - 1] as string;
    let receiver: string | undefined;
    if (receiverParts.length > 1) {
      receiver = receiverParts.slice(0, -1).join(".");
    }
    let concept: QaConcept | undefined = TS_CALLEE_CONCEPTS.exact[name];
    if (concept === undefined) {
      for (const p of TS_CALLEE_CONCEPTS.prefixes) {
        if (p.test(name)) {
          concept = p.concept;
          break;
        }
      }
    }
    if (concept === undefined) continue;
    const node: QaNode = {
      concept,
      name,
      callee: name,
      start,
      end,
      text: call.getText(),
      awaited: isAwaitedTsCall(call),
    };
    if (receiver !== undefined) node.receiver = receiver;
    nodes.push(node);
  }
  let language: QaSemanticModel["language"] = "javascript";
  if (/\.[cm]?ts$/.test(file.path) || /\.tsx$/.test(file.path)) {
    language = "typescript";
  }
  return { language, nodes };
}

/**
 * Awaitedness (qa-pw-002's consumption oracle: an AwaitExpression or
 * ReturnStatement ancestor consumes the promise). Carried as an extra
 * field on TS call nodes — the model stays grammar-agnostic, consumers
 * narrow.
 */
function isAwaitedTsCall(call: CallExpression): boolean {
  let parent = call.getParent();
  while (parent) {
    const kind = parent.getKindName();
    if (kind === "AwaitExpression" || kind === "ReturnStatement") return true;
    if (
      kind === "ArrowFunction" ||
      kind === "FunctionDeclaration" ||
      kind === "FunctionExpression"
    ) {
      return false;
    }
    parent = parent.getParent();
  }
  return false;
}

// ─── Python extractor (regex boundaries — adapter has no AST seam) ───

/**
 * Python vocabularies copied from the rules that measured them:
 * def test_ (qa-py-003), @pytest.fixture (qa-py-011), time.sleep/
 * wait_for_timeout (qa-py-005/qa-py-102/qa-py-103), assert/self.assert*
 * (qa-py-003's oracle vocabulary).
 */
const PY_TEST_RE = /^([ \t]*)(?:async\s+)?def\s+(test_\w+)\s*\([^)]*\)\s*:/gm;
const PY_FIXTURE_RE = /@pytest\.fixture\b/g;
const PY_WAIT_RE = /\btime\.sleep\s*\(|\.wait_for_timeout\s*\(/g;
const PY_ASSERT_RE = /^([ \t]*)assert\b/gm;
const PY_SELF_ASSERT_RE = /self\.assert[A-Z]\w*\s*\(/g;

function extractPythonModel(file: ParsedFile): QaSemanticModel {
  const text = file.text;
  const nodes: QaNode[] = [];
  const push = (
    concept: QaConcept,
    m: RegExpExecArray,
    name?: string,
  ): void => {
    const node: QaNode = {
      concept,
      start: {
        index: m.index,
        line: lineAt(text, m.index),
        column: colAt(text, m.index),
      },
      end: {
        index: m.index + m[0].length,
        line: lineAt(text, m.index + m[0].length),
        column: colAt(text, m.index + m[0].length),
      },
      text: m[0],
    };
    if (name !== undefined) node.name = name;
    nodes.push(node);
  };
  for (const re of [
    PY_TEST_RE,
    PY_FIXTURE_RE,
    PY_WAIT_RE,
    PY_ASSERT_RE,
    PY_SELF_ASSERT_RE,
  ]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      let concept: QaConcept = "assertion";
      if (re === PY_TEST_RE) concept = "test";
      else if (re === PY_FIXTURE_RE) concept = "fixture";
      else if (re === PY_WAIT_RE) concept = "wait";
      push(concept, m, re === PY_TEST_RE ? m[2] : undefined);
    }
  }
  return { language: "python", nodes };
}

// ─── Consumer helpers ────────────────────────────────────────────────

/** True when `node`'s start lies within `[span.start, span.end]`. */
export function nodeContainedIn(node: QaNode, span: QaNode): boolean {
  if (span.start.index === undefined || span.end === undefined) return false;
  return (
    node.start.index >= span.start.index && node.start.index <= span.end.index
  );
}

/** Tests extracted from the model (concept === "test"). */
export function testsIn(model: QaSemanticModel): QaNode[] {
  return model.nodes.filter((n) => n.concept === "test");
}

/**
 * The assertion oracle of QA-JV-103/QA-CS-103 expressed over the model:
 * a test verifies when it contains an assertion node, or a throwing-wait
 * node (`waitFor*` Java / `WaitFor*Async`≠`WaitForTimeoutAsync` C# — the
 * rules' own vocabulary, cited there). Truncated bodies prove nothing.
 */
export function testVerifies(model: QaSemanticModel, test: QaNode): boolean {
  if (test.truncated) return true;
  for (const n of model.nodes) {
    if (!nodeContainedIn(n, test)) continue;
    if (n.concept === "assertion") return true;
    if (n.concept === "wait") {
      const callee = n.callee;
      if (callee !== undefined && isThrowingWaitName(model.language, callee)) {
        return true;
      }
    }
  }
  return false;
}

function isThrowingWaitName(
  language: QaSemanticModel["language"],
  callee: string,
): boolean {
  if (language === "java") {
    return callee.startsWith("waitFor") && callee !== "waitForTimeout";
  }
  if (language === "csharp") {
    return (
      callee.startsWith("WaitFor") &&
      callee.endsWith("Async") &&
      callee !== "WaitForTimeoutAsync"
    );
  }
  return false;
}
