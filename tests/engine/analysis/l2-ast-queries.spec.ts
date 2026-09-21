/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Phase 3 L2 structural-analysis specs (Verification Trust Evolution
 * Plan §13.1–§13.3): QA-JV-103, QA-CS-103 and QA-CS-102 run through
 * their `astQuery` path against REAL tree-sitter parses, with the
 * regex fallback exercised by the no-AST unit specs
 * (rule-sprint8-java-csharp.spec.ts / rule-branch-coverage-java-csharp.spec.ts).
 *
 * The AST path is the detector; the fallback is documented degraded
 * detection — the divergence tests at the bottom pin exactly WHERE the
 * fallback may disagree (its rev-1 oracle), so a fallback "improvement"
 * that reopens a measured FP class fails here.
 */

import { afterEach, describe, expect, it } from "vitest";
import type { Tree } from "web-tree-sitter";

import { jvNoAssertions } from "../../../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../../../src/rules/csharp/qa-cs-103-no-assertions.js";
import { hardSleepFamily } from "../../../src/rules/families/hard-sleep.js";
import {
  parseJavaAst,
  parseCSharpAst,
  _resetForTests,
} from "../../../src/engine/tree-sitter-ast.js";

const trees: Tree[] = [];

afterEach(() => {
  for (const tree of trees) tree.delete();
  trees.length = 0;
  _resetForTests();
});

async function javaCtx(
  path: string,
  text: string,
): Promise<Parameters<typeof jvNoAssertions.run>[0]> {
  const tree = await parseJavaAst(text);
  expect(tree, "grammar must parse for L2 specs").toBeDefined();
  trees.push(tree!);
  return { path, text, ast: tree };
}

async function csCtx(
  path: string,
  text: string,
): Promise<Parameters<typeof csNoAssertions.run>[0]> {
  const tree = await parseCSharpAst(text);
  expect(tree, "grammar must parse for L2 specs").toBeDefined();
  trees.push(tree!);
  return { path, text, ast: tree };
}

describe("QA-JV-103 L2 (astQuery path)", () => {
  it("fires on a @Test method with no assertion call, anchored at the annotation", async () => {
    const ctx = await javaCtx(
      "T.java",
      'class T {\n  @Test\n  public void bad() {\n    page.navigate("/x");\n    page.close();\n  }\n}\n',
    );
    const findings = jvNoAssertions.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("bad");
    expect(findings[0]?.line).toBe(2);
  });

  it("stays silent on JUnit/AssertJ assertions", async () => {
    const ctx = await javaCtx(
      "T.java",
      'class T {\n  @Test\n  public void ok() {\n    assertEquals(1, 2);\n    assertThat(page.locator("#x")).isVisible();\n  }\n}\n',
    );
    expect(jvNoAssertions.run(ctx)).toEqual([]);
  });

  it("stays silent on fail(...) and Mockito verify(...)", async () => {
    const ctx = await javaCtx(
      "T.java",
      'class T {\n  @Test\n  public void ok() {\n    verify(mock).doThing();\n    fail("unreachable");\n  }\n}\n',
    );
    expect(jvNoAssertions.run(ctx)).toEqual([]);
  });

  it("counts waitForElementState as the verification — the 6-FP rev-1 class", async () => {
    const ctx = await javaCtx(
      "T.java",
      "class T {\n  @Test\n  public void waits() {\n    handle.waitForElementState(ElementState.VISIBLE);\n  }\n}\n",
    );
    expect(jvNoAssertions.run(ctx)).toEqual([]);
  });

  it("counts verifyViewport-style assertion helpers as checks — the helper-idiom FP class", async () => {
    const ctx = await javaCtx(
      "T.java",
      "class T {\n  @Test\n  public void viewport() {\n    verifyViewport(page);\n    checkState(x);\n  }\n}\n",
    );
    expect(jvNoAssertions.run(ctx)).toEqual([]);
  });

  it("resolves a qualified @org.junit.Test annotation", async () => {
    const ctx = await javaCtx(
      "T.java",
      "class T {\n  @org.junit.Test\n  public void bad() {\n    page.close();\n  }\n}\n",
    );
    expect(jvNoAssertions.run(ctx)).toHaveLength(1);
  });

  it("skips methods without a body (abstract) and non-Test annotations", async () => {
    const ctx = await javaCtx(
      "T.java",
      "abstract class T {\n  @Test\n  public abstract void noBody();\n\n  @Disabled\n  @Test\n  public void real() {\n    assertEquals(1, 1);\n  }\n}\n",
    );
    expect(jvNoAssertions.run(ctx)).toEqual([]);
  });

  it("handles multiple @Test methods independently", async () => {
    const ctx = await javaCtx(
      "T.java",
      "class T {\n  @Test\n  public void bad() {\n    int x = 1;\n  }\n\n  @Test\n  public void good() {\n    assertTrue(true);\n  }\n}\n",
    );
    const findings = jvNoAssertions.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("bad");
  });
});

describe("QA-CS-103 L2 (astQuery path)", () => {
  it("fires on a [Test] method with no assertion call, anchored at the attribute", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public async Task Bad() {\n    await Page.ClickAsync("#submit");\n  }\n}\n',
    );
    const findings = csNoAssertions.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Bad");
    expect(findings[0]?.line).toBe(2);
  });

  it("fires on [Fact] and [TestMethod] alike", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Fact]\n  public async Task F() {\n    await Page.GotoAsync("/home");\n  }\n\n  [TestMethod]\n  public void M() {\n    DoSomething();\n  }\n}\n',
    );
    const findings = csNoAssertions.run(ctx);
    expect(findings).toHaveLength(2);
  });

  it("stays silent on Assert receiver calls (Assert.That/Throws/Equal)", async () => {
    const ctx = await csCtx(
      "T.cs",
      "public class T {\n  [Test]\n  public void Ok() {\n    Assert.That(value, Is.EqualTo(1));\n    Assert.ThrowsException<InvalidOperationException>(() => Run());\n  }\n}\n",
    );
    expect(csNoAssertions.run(ctx)).toEqual([]);
  });

  it("stays silent on Playwright .NET Expect chains", async () => {
    const ctx = await csCtx(
      "T.cs",
      "public class T {\n  [Test]\n  public async Task Ok() {\n    await Assertions.Expect(locator).ToBeVisibleAsync();\n  }\n}\n",
    );
    expect(csNoAssertions.run(ctx)).toEqual([]);
  });

  it("counts Shouldly extension chains as assertions — the 17-FP rev-1 class", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public void Ok() {\n    var ex = Record.Exception(() => Run());\n    ex.ShouldBeOfType<InvalidOperationException>().Message.ShouldBe("boom");\n    fixture.Output.ShouldBe("out");\n    value.ShouldNotBe(3);\n  }\n}\n',
    );
    expect(csNoAssertions.run(ctx)).toEqual([]);
  });

  it("stays silent on Verify/VerifyAll mock checks", async () => {
    const ctx = await csCtx(
      "T.cs",
      "public class T {\n  [Test]\n  public void Ok() {\n    repo.Verify(x => x.Save(it));\n    uow.VerifyAll();\n  }\n}\n",
    );
    expect(csNoAssertions.run(ctx)).toEqual([]);
  });

  it("excludes [TestInitialize]/[TestCleanup] and accepts [Test(Description = ...)]", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [TestInitialize]\n  public async Task Setup() {\n    await InitAsync();\n  }\n\n  [TestCleanup]\n  public void Bye() {\n    Dispose();\n  }\n\n  [Test(Description = "checks something")]\n  public void Bad() {\n    DoSomething();\n  }\n}\n',
    );
    const findings = csNoAssertions.run(ctx);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Bad");
  });
});

describe("QA-CS-102 L2 (astQuery path)", () => {
  const rule = () => hardSleepFamily.find((r) => r.id === "QA-CS-102")!;

  it("fires on a test-body Task.Delay and Thread.Sleep", async () => {
    const ctx = await csCtx(
      "T.cs",
      "public class T {\n  [Test]\n  public async Task Flaky() {\n    await Task.Delay(500);\n    Thread.Sleep(100);\n  }\n}\n",
    );
    const findings = rule().run(ctx);
    expect(findings).toHaveLength(2);
    expect(findings[0]?.message).toContain("Task.Delay");
  });

  it("excludes delays inside RouteAsync server-simulation delegates — the 10-FP rev-1 class", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public async Task Sim() {\n    await Page.RouteAsync("**/api", async route => {\n      await Task.Delay(5000);\n      await route.FulfillAsync();\n    });\n  }\n}\n',
    );
    expect(rule().run(ctx)).toEqual([]);
  });

  it("excludes delays inside ExposeFunctionAsync delegates", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public async Task Exposed() {\n    await Page.ExposeFunctionAsync("calc", async (int n) => {\n      await Task.Delay(100);\n      return n;\n    });\n  }\n}\n',
    );
    expect(rule().run(ctx)).toEqual([]);
  });

  it("excludes deliberate infinite/negative blocks (-1, int.MaxValue, Timeout.Infinite)", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public async Task Blocks() {\n    await Page.RouteAsync("**/x", r => r.FulfillAsync());\n    Task.Delay(-1).Wait();\n    Task.Delay(int.MaxValue);\n    await Task.Delay(Timeout.InfiniteTimeSpan);\n  }\n}\n',
    );
    expect(rule().run(ctx)).toEqual([]);
  });

  it("excludes Task.WhenAny timeout races", async () => {
    const ctx = await csCtx(
      "T.cs",
      "public class T {\n  [Test]\n  public async Task Race() {\n    var work = Task.Run(DoIt);\n    var winner = await Task.WhenAny(work, Task.Delay(1000));\n    Assert.That(winner, Is.Not.EqualTo(work));\n  }\n}\n",
    );
    expect(rule().run(ctx)).toEqual([]);
  });

  it("still fires on real artificial-timing sleeps outside delegates", async () => {
    const ctx = await csCtx(
      "T.cs",
      'public class T {\n  [Test]\n  public async Task Timing() {\n    await Task.Delay(300);\n    await FrameLocator.NavigateAsync("/x");\n    await Task.Delay(500);\n  }\n}\n',
    );
    expect(rule().run(ctx)).toHaveLength(2);
  });
});

describe("mandatory fallback discipline (§13.2) — documented divergences", () => {
  it("JV-103 fallback keeps the rev-1 oracle: waitForElementState is NOT a fallback check", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: "class T {\n  @Test\n  public void waits() {\n    handle.waitForElementState(ElementState.VISIBLE);\n  }\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("CS-103 fallback keeps the rev-1 oracle: Shouldly chains are NOT fallback checks", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "public class T {\n  [Test]\n  public void Ok() {\n    value.ShouldBe(1);\n  }\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("CS-102 fallback keeps the rev-1 oracle: route-lambda delays still fire without a parse", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-CS-102")!
      .run({
        path: "T.cs",
        text: 'await Page.RouteAsync("**/api", async route => { await Task.Delay(5000); await route.FulfillAsync(); });',
      });
    expect(findings).toHaveLength(1);
  });
});
