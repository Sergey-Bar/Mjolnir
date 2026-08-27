/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Branch coverage for the Java and C# rule families (Master-Stabilization-
 * Plan Sprint 3, real gap found while running `npm run test:coverage` for
 * the first time this session — see .planning/STATE.md's Sprint 0 "not
 * done" note, "coverage thresholds are unverified", finally measured).
 *
 * These 9 rules previously had no dedicated unit tests — only the
 * fixture-firewall completeness check (which proves a must-fire/
 * must-not-fire pair exists per rule, not that every branch runs) and
 * the registry contract test exercised them at all, leaving each rule
 * at roughly 18-25% line coverage. This file calls each rule's `run()`
 * directly against varied inputs to cover:
 *   - the non-Java/non-C# early return (wrong extension)
 *   - each regex pattern's match arm
 *   - the has-check / no-check branch for the two assertion-detection
 *     rules (QA-JV-103, QA-CS-103), including the malformed-brace
 *     (`matchBrace` returns -1) early-continue path
 *   - zero matches (must-not-fire shape) alongside must-fire shape
 */

import { describe, expect, it } from "vitest";
import { jvDisabledTest } from "../src/rules/java/qa-jv-101-disabled-test.js";
import { hardSleepFamily } from "../src/rules/families/hard-sleep.js";
import { jvNoAssertions } from "../src/rules/java/qa-jv-103-no-assertions.js";
import { sharedPageFamily } from "../src/rules/families/shared-page.js";
import { jvWaitForTimeout } from "../src/rules/java/qa-jv-105-wait-for-timeout.js";
import { csSkippedTest } from "../src/rules/csharp/qa-cs-101-skipped-test.js";
import { csNoAssertions } from "../src/rules/csharp/qa-cs-103-no-assertions.js";
describe("QA-JV-101 disabled test", () => {
  it("ignores non-.java files", () => {
    expect(jvDisabledTest.run({ path: "Test.cs", text: "@Disabled" })).toEqual(
      [],
    );
  });

  it("fires on @Disabled", () => {
    const findings = jvDisabledTest.run({
      path: "LoginTest.java",
      text: "@Disabled\n@Test\nvoid t() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("@Disabled");
  });

  it("fires on @Ignore (TestNG/JUnit4)", () => {
    const findings = jvDisabledTest.run({
      path: "LoginTest.java",
      text: "@Ignore\n@Test\nvoid t() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("@Ignore");
  });

  it("finds both patterns across multiple methods", () => {
    const findings = jvDisabledTest.run({
      path: "T.java",
      text: "@Disabled\nvoid a(){}\n@Ignore\nvoid b(){}\n",
    });
    expect(findings).toHaveLength(2);
  });

  it("stays silent on a clean file", () => {
    expect(
      jvDisabledTest.run({ path: "T.java", text: "@Test\nvoid t() {}\n" }),
    ).toEqual([]);
  });
});

describe("QA-JV-102 Thread.sleep", () => {
  it("ignores non-.java files", () => {
    expect(
      hardSleepFamily
        .find((r) => r.id === "QA-JV-102")!
        .run({ path: "T.cs", text: "Thread.sleep(1000);" }),
    ).toEqual([]);
  });

  it("fires on Thread.sleep(...)", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-JV-102")!
      .run({
        path: "T.java",
        text: "Thread.sleep(3000);\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Thread.sleep()");
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-JV-102")!
      .run({
        path: "T.java",
        text: "class T {\n  void t() {\n    Thread.sleep(3000);\n  }\n}\n",
      });
    expect(findings[0]?.line).toBe(3);
  });

  it("stays silent without Thread.sleep", () => {
    expect(
      hardSleepFamily
        .find((r) => r.id === "QA-JV-102")!
        .run({ path: "T.java", text: 'page.click("#btn");\n' }),
    ).toEqual([]);
  });
});

describe("QA-JV-103 no assertions", () => {
  it("ignores non-.java files", () => {
    expect(
      jvNoAssertions.run({
        path: "T.cs",
        text: "@Test\nvoid t() {\n}\n",
      }),
    ).toEqual([]);
  });

  it("fires when the @Test method body has no assertion/fail/verify call", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: "@Test\npublic void shouldWork() {\n  int x = 1 + 1;\n}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("shouldWork");
  });

  it("stays silent when the body calls assertThat/assertEquals", () => {
    expect(
      jvNoAssertions.run({
        path: "T.java",
        text: "@Test\npublic void shouldWork() {\n  assertEquals(1, 1);\n}\n",
      }),
    ).toEqual([]);
  });

  it("stays silent when the body calls fail(...)", () => {
    expect(
      jvNoAssertions.run({
        path: "T.java",
        text: '@Test\npublic void shouldWork() {\n  fail("not implemented");\n}\n',
      }),
    ).toEqual([]);
  });

  it("stays silent when the body calls verify(...)", () => {
    expect(
      jvNoAssertions.run({
        path: "T.java",
        text: "@Test\npublic void shouldWork() {\n  verify(mock).doThing();\n}\n",
      }),
    ).toEqual([]);
  });

  it("does not throw and does not report on an unterminated brace (matchBrace returns -1)", () => {
    const text = "@Test\npublic void broken() {\n  int x = 1;\n";
    expect(() => jvNoAssertions.run({ path: "T.java", text })).not.toThrow();
    expect(jvNoAssertions.run({ path: "T.java", text })).toEqual([]);
  });

  it("correctly skips braces inside a string literal when matching the method body", () => {
    // The body contains a "{" and "}" inside a string — matchBrace must
    // not count them, and must correctly find the real closing brace.
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: '@Test\npublic void formats() {\n  String s = "{not a brace}";\n}\n',
    });
    expect(findings).toHaveLength(1); // no real assertion call — still fires
  });

  it("correctly handles an escaped quote inside a string literal in the method body", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: '@Test\npublic void escaped() {\n  String s = "a \\"quoted\\" value";\n  assertEquals(s, s);\n}\n',
    });
    expect(findings).toEqual([]); // has a real assertion, and parsed past the escape correctly
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: "class T {\n  @Test\n  public void bad() {\n    int x = 1;\n  }\n}\n",
    });
    expect(findings[0]?.line).toBe(2);
  });

  it("handles multiple @Test methods independently", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text:
        "@Test\npublic void bad() {\n  int x = 1;\n}\n" +
        "@Test\npublic void good() {\n  assertTrue(true);\n}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("bad");
  });
});

describe("QA-JV-104 static shared page", () => {
  it("ignores non-.java files", () => {
    expect(
      sharedPageFamily
        .find((r) => r.id === "QA-JV-104")!
        .run({ path: "T.cs", text: "static Page page;" }),
    ).toEqual([]);
  });

  it.each(["Page", "Browser", "BrowserContext", "Playwright"])(
    "fires on static %s field",
    (type) => {
      const findings = sharedPageFamily
        .find((r) => r.id === "QA-JV-104")!
        .run({
          path: "T.java",
          text: `private static ${type} instance;\n`,
        });
      expect(findings).toHaveLength(1);
      expect(findings[0]?.message).toContain(type);
    },
  );

  it("fires on static final variant", () => {
    const findings = sharedPageFamily
      .find((r) => r.id === "QA-JV-104")!
      .run({
        path: "T.java",
        text: "public static final Page SHARED = null;\n",
      });
    expect(findings).toHaveLength(1);
  });

  it("stays silent on an instance (non-static) field", () => {
    expect(
      sharedPageFamily
        .find((r) => r.id === "QA-JV-104")!
        .run({ path: "T.java", text: "private Page page;\n" }),
    ).toEqual([]);
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = sharedPageFamily
      .find((r) => r.id === "QA-JV-104")!
      .run({
        path: "T.java",
        text: "class T {\n  private static Page page;\n}\n",
      });
    expect(findings[0]?.line).toBe(2);
  });
});

describe("QA-JV-105 waitForTimeout", () => {
  it("ignores non-.java files", () => {
    expect(
      jvWaitForTimeout.run({
        path: "T.cs",
        text: "page.waitForTimeout(1000);",
      }),
    ).toEqual([]);
  });

  it("fires on .waitForTimeout(", () => {
    const findings = jvWaitForTimeout.run({
      path: "T.java",
      text: "page.waitForTimeout(2000);\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = jvWaitForTimeout.run({
      path: "T.java",
      text: "class T {\n  void t() {\n    page.waitForTimeout(2000);\n  }\n}\n",
    });
    expect(findings[0]?.line).toBe(3);
  });

  it("stays silent without waitForTimeout", () => {
    expect(
      jvWaitForTimeout.run({ path: "T.java", text: 'page.click("#x");\n' }),
    ).toEqual([]);
  });
});

describe("QA-CS-101 skipped test", () => {
  it("ignores non-.cs files", () => {
    expect(csSkippedTest.run({ path: "T.java", text: "[Ignore]" })).toEqual([]);
  });

  it("fires on [Ignore]", () => {
    const findings = csSkippedTest.run({
      path: "T.cs",
      text: "[Ignore]\n[Test]\npublic void T() {}\n",
    });
    expect(findings.some((f) => f.message.includes("[Ignore]"))).toBe(true);
  });

  it('fires on [Ignore("reason")]', () => {
    const findings = csSkippedTest.run({
      path: "T.cs",
      text: '[Ignore("flaky")]\n[Test]\npublic void T() {}\n',
    });
    expect(findings).toHaveLength(1);
  });

  it("fires on [Skip...]", () => {
    const findings = csSkippedTest.run({
      path: "T.cs",
      text: '[Skip("reason")]\npublic void T() {}\n',
    });
    expect(findings.some((f) => f.message.includes("[Skip]"))).toBe(true);
  });

  it("fires on [Fact(Skip=...)]", () => {
    const findings = csSkippedTest.run({
      path: "T.cs",
      text: '[Fact(Skip = "reason")]\npublic void T() {}\n',
    });
    expect(findings.some((f) => f.message.includes("Fact(Skip="))).toBe(true);
  });

  it("stays silent on a clean file", () => {
    expect(
      csSkippedTest.run({ path: "T.cs", text: "[Test]\npublic void T() {}\n" }),
    ).toEqual([]);
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = csSkippedTest.run({
      path: "T.cs",
      text: "class T {\n  [Ignore]\n  public void T() {}\n}\n",
    });
    expect(findings[0]?.line).toBe(2);
  });
});

describe("QA-CS-102 hard sleep", () => {
  it("ignores non-.cs files", () => {
    expect(
      hardSleepFamily
        .find((r) => r.id === "QA-CS-102")!
        .run({ path: "T.java", text: "Thread.Sleep(1000);" }),
    ).toEqual([]);
  });

  it("fires on Thread.Sleep(", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-CS-102")!
      .run({
        path: "T.cs",
        text: "Thread.Sleep(1000);\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Thread.Sleep");
  });

  it("fires on Task.Delay(", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-CS-102")!
      .run({
        path: "T.cs",
        text: "await Task.Delay(500);\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("Task.Delay");
  });

  it("stays silent without a sleep/delay call", () => {
    expect(
      hardSleepFamily
        .find((r) => r.id === "QA-CS-102")!
        .run({ path: "T.cs", text: 'await page.ClickAsync("#x");\n' }),
    ).toEqual([]);
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = hardSleepFamily
      .find((r) => r.id === "QA-CS-102")!
      .run({
        path: "T.cs",
        text: "class T {\n  void M() {\n    Thread.Sleep(1000);\n  }\n}\n",
      });
    expect(findings[0]?.line).toBe(3);
  });
});

describe("QA-CS-103 no assertions", () => {
  it("ignores non-.cs files", () => {
    expect(
      csNoAssertions.run({
        path: "T.java",
        text: "[Test]\npublic void T() {\n}\n",
      }),
    ).toEqual([]);
  });

  it("fires when a [Test] method body has no assertion", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "[Test]\npublic void ShouldWork() {\n  var x = 1 + 1;\n}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("ShouldWork");
  });

  it("fires when a [Fact] async Task method body has no assertion", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "[Fact]\npublic async Task ShouldWork() {\n  var x = 1;\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("fires when a [TestMethod] body has no assertion", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "[TestMethod]\npublic void ShouldWork() {\n  var x = 1;\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("stays silent when the body calls Assert.X(", () => {
    expect(
      csNoAssertions.run({
        path: "T.cs",
        text: "[Test]\npublic void T() {\n  Assert.AreEqual(1, 1);\n}\n",
      }),
    ).toEqual([]);
  });

  it("stays silent when the body calls Expect(", () => {
    expect(
      csNoAssertions.run({
        path: "T.cs",
        text: "[Test]\npublic void T() {\n  Expect(1).ToBe(1);\n}\n",
      }),
    ).toEqual([]);
  });

  it("stays silent when the body calls .Should(", () => {
    expect(
      csNoAssertions.run({
        path: "T.cs",
        text: "[Test]\npublic void T() {\n  result.Should().BeTrue();\n}\n",
      }),
    ).toEqual([]);
  });

  it("stays silent when the body calls Verify(/VerifyAll(", () => {
    expect(
      csNoAssertions.run({
        path: "T.cs",
        text: "[Test]\npublic void T() {\n  mock.VerifyAll();\n}\n",
      }),
    ).toEqual([]);
  });

  it("does not throw and does not report on an unterminated brace", () => {
    const text = "[Test]\npublic void Broken() {\n  var x = 1;\n";
    expect(() => csNoAssertions.run({ path: "T.cs", text })).not.toThrow();
    expect(csNoAssertions.run({ path: "T.cs", text })).toEqual([]);
  });

  it("correctly skips braces inside a string literal when matching the method body", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: '[Test]\npublic void Formats() {\n  var s = "{not a brace}";\n}\n',
    });
    expect(findings).toHaveLength(1);
  });

  it("correctly handles an escaped quote inside a string literal in the method body", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: '[Test]\npublic void Escaped() {\n  var s = "a \\"quoted\\" value";\n  Assert.AreEqual(s, s);\n}\n',
    });
    expect(findings).toEqual([]);
  });

  it("reports the correct line number when the match is past line 1", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "class T {\n  [Test]\n  public void Bad() {\n    var x = 1;\n  }\n}\n",
    });
    expect(findings[0]?.line).toBe(2);
  });
});

describe("QA-CS-104 static shared page", () => {
  it("ignores non-.cs files", () => {
    expect(
      sharedPageFamily
        .find((r) => r.id === "QA-CS-104")!
        .run({ path: "T.java", text: "static IPage page;" }),
    ).toEqual([]);
  });

  it("fires on static IPage field", () => {
    const findings = sharedPageFamily
      .find((r) => r.id === "QA-CS-104")!
      .run({
        path: "T.cs",
        text: "private static IPage Page;\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("static IPage");
  });

  it("fires on static readonly IPage field", () => {
    const findings = sharedPageFamily
      .find((r) => r.id === "QA-CS-104")!
      .run({
        path: "T.cs",
        text: "public static readonly IPage Shared;\n",
      });
    expect(findings).toHaveLength(1);
  });

  it("fires on internal static IPage field", () => {
    const findings = sharedPageFamily
      .find((r) => r.id === "QA-CS-104")!
      .run({
        path: "T.cs",
        text: "internal static IPage Shared;\n",
      });
    expect(findings).toHaveLength(1);
  });

  it("stays silent on an instance (non-static) IPage field", () => {
    expect(
      sharedPageFamily
        .find((r) => r.id === "QA-CS-104")!
        .run({ path: "T.cs", text: "private IPage page;\n" }),
    ).toEqual([]);
  });
});
