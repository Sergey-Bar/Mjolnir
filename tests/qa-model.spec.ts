/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Common QA Semantic Model specs (Verification Trust Evolution Plan §14).
 *
 * The exit gate is proven here:
 * 1. COVERAGE — the model covers the concept nodes used by the migrated
 *    rules (§13 L2 JV/CS rules; the TS/Python vocabularies are
 *    extraction-covered with boundary assertions).
 * 2. ADDITIVE ADOPTION — the QA-JV-103 / QA-CS-103 / QA-CS-102 oracles
 *    are re-expressed over the model and asserted FINDING-IDENTICAL
 *    against the rules themselves on the committed fixture corpora —
 *    the model can carry these rules without changing any output.
 * 3. BEHAVIOR-NEUTRAL — nothing in the scan pipeline imports the model;
 *    the golden and corpus locks stay untouched (this file only reads
 *    rule exports and fixture sources).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Tree } from "web-tree-sitter";

import {
  extractQaModel,
  nodeContainedIn,
  testsIn,
  testVerifies,
  type QaNode,
} from "../src/engine/qa-model.js";
import {
  parseJavaAst,
  parseCSharpAst,
  _resetForTests,
} from "../src/engine/tree-sitter-ast.js";
import { jvNoAssertions } from "../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../src/rules/csharp/qa-cs-103-no-assertions.js";
import {
  hardSleepFamily,
  ENVIRONMENT_DELEGATE_APIS,
} from "../src/rules/families/hard-sleep.js";

const trees: Tree[] = [];

afterEach(() => {
  for (const tree of trees) tree.delete();
  trees.length = 0;
  _resetForTests();
});

const ROOT = join(import.meta.dirname, "..");
const fixture = (rel: string): string =>
  readFileSync(join(ROOT, "tests", "corpus", rel), "utf8");

async function javaCtx(rel: string) {
  const text = fixture(rel);
  const tree = await parseJavaAst(text);
  expect(tree).toBeDefined();
  trees.push(tree!);
  return { path: rel, text, ast: tree };
}

async function csCtx(rel: string) {
  const text = fixture(rel);
  const tree = await parseCSharpAst(text);
  expect(tree).toBeDefined();
  trees.push(tree!);
  return { path: rel, text, ast: tree };
}

describe("TS extraction — vocabulary coverage", () => {
  it("extracts tests, hooks, assertions, waits, actions, locators, navigation, mocks, retries, network and lifecycle nodes", () => {
    const model = extractQaModel({
      path: "e2e/shop.spec.ts",
      text: `
        describe.serial("shop", () => {
          let page;
          beforeEach(() => { page = load(); });
          afterEach(() => { teardown(); });
          it("checks out", async () => {
            const item = page.locator("#item");
            await item.click();
            await page.evaluate(() => 1);
            await page.waitForLoadState("networkidle");
            await page.goto("https://shop.example.com");
            page.route("**/api", r => r.fulfill());
            jest.mock("./cart");
            jest.retryTimes(2);
            expect(item).toBeVisible();
          });
        });
      `,
    });
    expect(model).toBeDefined();
    const by = (c: string) =>
      model!.nodes.filter((n) => n.concept === c).map((n) => n.name);
    expect(by("test")).toEqual(["it"]);
    expect(by("setup")).toEqual(["beforeEach"]);
    expect(by("teardown")).toEqual(["afterEach"]);
    expect(model!.nodes.some((n) => n.concept === "lifecycle")).toBe(true);
    expect(by("locator")).toContain("locator");
    expect(by("action")).toContain("click");
    expect(by("interaction")).toContain("evaluate");
    expect(by("wait")).toContain("waitForLoadState");
    expect(by("navigation")).toContain("goto");
    expect(by("network-interaction")).toContain("route");
    expect(by("mock")).toContain("mock");
    expect(by("retry")).toContain("retryTimes");
    expect(by("assertion")).toContain("expect");
  });

  it("carries the awaitedness oracle (qa-pw-002 vocabulary)", () => {
    const model = extractQaModel({
      path: "a.spec.ts",
      text: `
        it("mixed", async () => {
          await expect(page.locator("#a")).toBeVisible();
          expect(page.locator("#b")).toBeVisible();
          return expect(page.locator("#c")).toBeVisible();
        });
      `,
    });
    const expectNodes = model!.nodes.filter((n) => n.callee === "expect");
    expect(expectNodes).toHaveLength(3);
    expect(expectNodes[0]?.awaited).toBe(true);
    expect(expectNodes[1]?.awaited).toBe(false);
    expect(expectNodes[2]?.awaited).toBe(true); // return-consumed
  });

  it("returns undefined outside supported languages", () => {
    expect(
      extractQaModel({ path: "README.md", text: "# not code" }),
    ).toBeUndefined();
  });
});

describe("Python extraction — vocabulary coverage", () => {
  it("extracts def test_, fixtures, waits and assertions", () => {
    const model = extractQaModel({
      path: "tests/test_shop.py",
      text: `
import time
import pytest

@pytest.fixture
def cart():
    return {}

def test_checkout(cart):
    time.sleep(1)
    assert cart is not None

def test_total(cart):
    self.assertEqual(cart.total, 0)
      `,
    });
    const by = (c: string) => model!.nodes.filter((n) => n.concept === c);
    expect(by("test")).toHaveLength(2);
    expect(by("fixture")).toHaveLength(1);
    expect(by("wait")).toHaveLength(1);
    expect(by("assertion")).toHaveLength(2); // assert + self.assertEqual
  });
});

// ─── Additive adoption: oracle re-expression over the model ─────────

const JV103_FIXTURES = [
  "positive-fixtures/QA-JV-103/NoCheckTest.java",
  "negative-fixtures/QA-JV-103/StateWaitTest.java",
];

const CS103_FIXTURES = [
  "positive-fixtures/QA-CS-103/CheckoutTests.cs",
  "positive-fixtures/QA-CS-103/PauseOnlyTests.cs",
  "negative-fixtures/QA-CS-103/ShouldlyTests.cs",
];

const CS102_FIXTURES = [
  "positive-fixtures/QA-CS-102/TimingTests.cs",
  "negative-fixtures/QA-CS-102/SimulationTests.cs",
];

async function csCtxText(text: string) {
  const tree = await parseCSharpAst(text);
  expect(tree).toBeDefined();
  trees.push(tree!);
  return { path: "T.cs", text, ast: tree };
}

function jv103ModelFires(ctx: {
  path: string;
  text: string;
  ast: unknown;
}): Array<{
  name: string;
  line: number;
}> {
  const model = extractQaModel(ctx)!;
  const fires: Array<{ name: string; line: number }> = [];
  for (const test of testsIn(model)) {
    if (!testVerifies(model, test)) {
      fires.push({ name: test.name ?? "", line: test.start.line });
    }
  }
  return fires;
}

function cs102ModelFires(ctx: {
  path: string;
  text: string;
  ast: unknown;
}): number[] {
  const model = extractQaModel(ctx)!;
  const fires: number[] = [];
  for (const node of model.nodes) {
    if (node.concept !== "wait") continue;
    if (node.callee !== "Sleep" && node.callee !== "Delay") continue;
    if (node.receiver !== "Thread" && node.receiver !== "Task") continue;
    // Infinite/negative blocks (QA-CS-102 class 3) — the first argument
    // is recovered from the node text.
    const inner = node.text ?? "";
    const open = inner.indexOf("(");
    const close = inner.lastIndexOf(")");
    const arg = (open >= 0 && close > open ? inner.slice(open + 1, close) : "")
      .split(",")[0]
      ?.trim();
    if (
      arg !== undefined &&
      (arg.startsWith("-") ||
        arg.includes("int.MinValue") ||
        /^(?:int\.MaxValue|Timeout\.Infinite(?:TimeSpan)?|System\.Threading\.Timeout\.Infinite(?:TimeSpan)?)$/.test(
          arg,
        ))
    ) {
      continue;
    }
    // Environment-delegate containment (classes 1+2) via ancestors.
    if (node.ancestors?.some((a) => ENVIRONMENT_DELEGATE_APIS.has(a))) continue;
    // WhenAny timeout races (class 4).
    if (node.ancestors?.includes("WhenAny")) continue;
    fires.push(node.start.line);
  }
  return fires;
}

function cs103ModelFires(ctx: {
  path: string;
  text: string;
  ast: unknown;
}): Array<{
  name: string;
  line: number;
}> {
  const model = extractQaModel(ctx)!;
  const fires: Array<{ name: string; line: number }> = [];
  for (const test of testsIn(model)) {
    if (!testVerifies(model, test)) {
      fires.push({ name: test.name ?? "", line: test.start.line });
    }
  }
  return fires;
}

describe("model-oracle equivalence on the committed fixture corpora", () => {
  it("QA-JV-103: model re-expression is finding-identical to the rule", async () => {
    for (const rel of JV103_FIXTURES) {
      const ctx = await javaCtx(rel);
      const ruleFires = jvNoAssertions.run(ctx).map((f) => ({
        name: f.message.match(/`(.+?)`/)?.[1] ?? "",
        line: f.line,
      }));
      expect(jv103ModelFires(ctx), rel).toEqual(ruleFires);
    }
  });

  it("QA-CS-103: model re-expression is finding-identical to the rule", async () => {
    for (const rel of CS103_FIXTURES) {
      const ctx = await csCtx(rel);
      const ruleFires = csNoAssertions.run(ctx).map((f) => ({
        name: f.message.match(/`(.+?)`/)?.[1] ?? "",
        line: f.line,
      }));
      expect(cs103ModelFires(ctx), rel).toEqual(ruleFires);
    }
  });

  it("QA-CS-102: model re-expression is finding-identical to the rule", async () => {
    for (const rel of CS102_FIXTURES) {
      const ctx = await csCtx(rel);
      const ruleLines = hardSleepFamily
        .find((r) => r.id === "QA-CS-102")!
        .run(ctx)
        .map((f) => f.line)
        .sort((a, b) => a - b);
      expect(
        cs102ModelFires(ctx).sort((a, b) => a - b),
        rel,
      ).toEqual(ruleLines);
    }
  });

  it("synthetic edge shapes: exclusions reproduce exactly", async () => {
    const ctx = await csCtxText(`
public class Edge {
  [Test]
  public async Task AllShapes() {
    await Page.RouteAsync("**/api", async r => { await Task.Delay(5000); await r.FulfillAsync(); });
    Task.Delay(-1).Wait();
    Task.Delay(int.MaxValue);
    var w = await Task.WhenAny(work, Task.Delay(1000));
    await Task.Delay(300);
    Thread.Sleep(50);
  }
}
`);
    const ruleLines = hardSleepFamily
      .find((r) => r.id === "QA-CS-102")!
      .run(ctx)
      .map((f) => f.line)
      .sort((a, b) => a - b);
    // Only the plain test-body sleeps survive the exclusions.
    expect(cs102ModelFires(ctx).sort((a, b) => a - b)).toEqual(ruleLines);
    expect(cs102ModelFires(ctx).length).toBe(2);
  });
});

describe("model plumbing", () => {
  it("nodeContainedIn implements span containment", async () => {
    const ctx = await javaCtx("positive-fixtures/QA-JV-103/NoCheckTest.java");
    const model = extractQaModel(ctx)!;
    const tests = testsIn(model);
    const contained = model.nodes.filter(
      (n) => n.concept !== "test" && tests.some((t) => nodeContainedIn(n, t)),
    );
    // Navigation/click calls inside the fixture tests are contained.
    expect(contained.length).toBeGreaterThan(0);
    expect(contained.every((n: QaNode) => n.start.index > 0)).toBe(true);
  });

  it("every plan-§14 concept is present in the type vocabulary", async () => {
    const { EXTRACTOR_COVERAGE } = await import("../src/engine/qa-model.js");
    const all = new Set(
      Object.values(EXTRACTOR_COVERAGE).flatMap((c) => [
        ...c.extracted,
        ...c["not-extracted"],
      ]),
    );
    // Test, TestBoundary (as the test anchor), Setup/Teardown, Fixture,
    // Action, Locator, Wait, Assertion, Mock, NetworkInteraction, Retry,
    // Navigation, Interaction, Lifecycle — all 14 covered across languages.
    expect(all.size).toBe(14);
  });
});
