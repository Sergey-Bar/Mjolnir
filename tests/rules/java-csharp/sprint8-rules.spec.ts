/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * Unit tests for the Sprint 8 Java/.NET Playwright-parity rules
 * (Master-Stabilization-Plan Sprint 8, Task 32/33): QA-JV-106/107
 * and QA-CS-105/106/107. (The JV/CS-108 hardcoded-URL variants and the
 * no-a11y/blanket-route families were RETIRED by the Phase 2 triage and
 * unregistered per the owner ruling of 2026-09-08 — their blocks were
 * removed with them.) Idiom mapping verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md before any of these regexes were
 * written.
 */

import { describe, expect, it } from "vitest";
import { brittleSelectorsFamily } from "../../../src/rules/families/brittle-selectors.js";
import { retryMaskingFamily } from "../../../src/rules/families/retry-masking.js";
import { csWaitForTimeout } from "../../../src/rules/csharp/qa-cs-105-wait-for-timeout.js";
import { networkIdleFamily } from "../../../src/rules/families/network-idle.js";
import { jvNoAssertions } from "../../../src/rules/java/qa-jv-103-no-assertions.js";
import { csNoAssertions } from "../../../src/rules/csharp/qa-cs-103-no-assertions.js";
describe("QA-JV-106 brittle selectors", () => {
  it("ignores non-.java files", () => {
    expect(
      brittleSelectorsFamily
        .find((r) => r.id === "QA-JV-106")!
        .run({ path: "T.cs", text: '.locator("xpath=//x")' }),
    ).toEqual([]);
  });

  it("fires on xpath= selector", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-JV-106")!
      .run({
        path: "T.java",
        text: 'page.locator("xpath=//button").click();',
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("xpath=");
  });

  it("fires on nth-child CSS chain", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-JV-106")!
      .run({
        path: "T.java",
        text: 'page.locator(".btn:nth-child(2)").click();',
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("nth-child");
  });

  it("fires on absolute XPath bare // shorthand", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-JV-106")!
      .run({
        path: "T.java",
        text: 'page.locator("//div/section").click();',
      });
    expect(findings).toHaveLength(1);
  });

  it("no longer fires on id via querySelector (M-06 narrowing)", () => {
    // Bug Map M-06: the `id via querySelector` pattern was REMOVED —
    // every measured FP for QA-JV-106 (playwright-java, 100% FP n=20,
    // zero TPs) was ElementHandle-API self-tests calling
    // querySelector('#source') on their own fixtures.
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-JV-106")!
      .run({
        path: "T.java",
        text: 'page.querySelector("#submit");',
      });
    expect(findings).toHaveLength(0);
  });

  it("does not fire on role-based/testId locators", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-JV-106")!
      .run({
        path: "T.java",
        text: 'page.getByRole(AriaRole.BUTTON).click(); page.getByTestId("submit").click();',
      });
    expect(findings).toEqual([]);
  });
});

describe("QA-JV-107 networkidle wait", () => {
  it("ignores non-.java files", () => {
    expect(
      networkIdleFamily
        .find((r) => r.id === "QA-JV-107")!
        .run({
          path: "T.cs",
          text: "page.waitForLoadState(LoadState.NETWORKIDLE);",
        }),
    ).toEqual([]);
  });

  it("fires on waitForLoadState(LoadState.NETWORKIDLE)", () => {
    const findings = networkIdleFamily
      .find((r) => r.id === "QA-JV-107")!
      .run({
        path: "T.java",
        text: "page.waitForLoadState(LoadState.NETWORKIDLE);",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("NETWORKIDLE");
  });

  it("does not fire on LOAD or DOMCONTENTLOADED", () => {
    const findings = networkIdleFamily
      .find((r) => r.id === "QA-JV-107")!
      .run({
        path: "T.java",
        text: "page.waitForLoadState(LoadState.DOMCONTENTLOADED); page.waitForLoadState(LoadState.LOAD);",
      });
    expect(findings).toEqual([]);
  });
});

describe("QA-CS-105 WaitForTimeoutAsync", () => {
  it("ignores non-.cs files", () => {
    expect(
      csWaitForTimeout.run({
        path: "T.java",
        text: "WaitForTimeoutAsync(2000)",
      }),
    ).toEqual([]);
  });

  it("fires on WaitForTimeoutAsync(", () => {
    const findings = csWaitForTimeout.run({
      path: "T.cs",
      text: "await Page.WaitForTimeoutAsync(2000);",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("WaitForTimeoutAsync");
  });

  it("does not fire without it", () => {
    expect(
      csWaitForTimeout.run({
        path: "T.cs",
        text: 'await Expect(Page.GetByText("x")).ToBeVisibleAsync();',
      }),
    ).toEqual([]);
  });
});

describe("QA-CS-106 brittle selectors", () => {
  it("ignores non-.cs files", () => {
    expect(
      brittleSelectorsFamily
        .find((r) => r.id === "QA-CS-106")!
        .run({ path: "T.java", text: '.Locator("xpath=//x")' }),
    ).toEqual([]);
  });

  it("fires on xpath= selector", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-CS-106")!
      .run({
        path: "T.cs",
        text: 'Page.Locator("xpath=//button").ClickAsync();',
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("xpath=");
  });

  it("fires on nth-child CSS chain", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-CS-106")!
      .run({
        path: "T.cs",
        text: 'Page.Locator(".btn:nth-child(2)").ClickAsync();',
      });
    expect(findings).toHaveLength(1);
  });

  it("fires on absolute XPath bare // shorthand", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-CS-106")!
      .run({
        path: "T.cs",
        text: 'Page.Locator("//div/section").ClickAsync();',
      });
    expect(findings).toHaveLength(1);
  });

  it("no longer fires on id via QuerySelectorAsync (M-06 narrowing)", () => {
    // Bug Map M-06: same evidence class as QA-JV-106 — the
    // QuerySelectorAsync id-lookup pattern was removed.
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-CS-106")!
      .run({
        path: "T.cs",
        text: 'Page.QuerySelectorAsync("#submit");',
      });
    expect(findings).toHaveLength(0);
  });

  it("does not fire on role-based/testId locators", () => {
    const findings = brittleSelectorsFamily
      .find((r) => r.id === "QA-CS-106")!
      .run({
        path: "T.cs",
        text: 'Page.GetByRole(AriaRole.Button).ClickAsync(); Page.GetByTestId("submit").ClickAsync();',
      });
    expect(findings).toEqual([]);
  });
});

describe("QA-CS-107 networkidle wait", () => {
  it("ignores non-.cs files", () => {
    expect(
      networkIdleFamily
        .find((r) => r.id === "QA-CS-107")!
        .run({
          path: "T.java",
          text: "WaitForLoadStateAsync(LoadState.NetworkIdle)",
        }),
    ).toEqual([]);
  });

  it("fires on WaitForLoadStateAsync(LoadState.NetworkIdle)", () => {
    const findings = networkIdleFamily
      .find((r) => r.id === "QA-CS-107")!
      .run({
        path: "T.cs",
        text: "await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("NetworkIdle");
  });

  it("does not fire on Load or DOMContentLoaded", () => {
    const findings = networkIdleFamily
      .find((r) => r.id === "QA-CS-107")!
      .run({
        path: "T.cs",
        text: "await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded); await Page.WaitForLoadStateAsync(LoadState.Load);",
      });
    expect(findings).toEqual([]);
  });
});

describe("QA-JV-103 no assertions", () => {
  it("ignores non-.java files", () => {
    expect(
      jvNoAssertions.run({ path: "T.cs", text: "@Test\nvoid t(){}" }),
    ).toEqual([]);
  });

  it("fires on a @Test method with no assertion call", () => {
    const findings = jvNoAssertions.run({
      path: "T.java",
      text: "@Test\nvoid shouldWork() {\n  doSomething();\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it.each([
    "assertEquals(1, 2);",
    "assertArrayEquals(a, b);",
    "assertNotEquals(1, 2);",
    "assertNull(x);",
    "assertSame(a, b);",
    "assertJsonEquals(expected, actual);",
    "assertWebp(bytes);",
  ])(
    "does not fire when the body calls %s — real corpus false-positive found against microsoft/playwright-java (Sprint 8 Task 37)",
    (assertCall) => {
      const findings = jvNoAssertions.run({
        path: "T.java",
        text: `@Test\nvoid shouldWork() {\n  ${assertCall}\n}\n`,
      });
      expect(findings).toEqual([]);
    },
  );
});

describe("QA-CS-103 no assertions", () => {
  it("does not fire on [TestInitialize]/[TestCleanup] setup/teardown methods — real corpus false-positive found against microsoft/playwright-dotnet (Sprint 8 Task 37)", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "[TestInitialize]\npublic async Task Setup() {\n  await DoSomething();\n}\n",
    });
    expect(findings).toEqual([]);
  });

  it("still fires on a real [Test] method with no assertion", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: "[Test]\npublic void ShouldWork() {\n  DoSomething();\n}\n",
    });
    expect(findings).toHaveLength(1);
  });

  it("recognizes [TestCleanup] as non-test (no finding) while a same-file real [Test] method is still flagged", () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text:
        "[TestCleanup]\npublic void Cleanup() {\n  Dispose();\n}\n\n" +
        "[Test]\npublic void ShouldWork() {\n  DoSomething();\n}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("ShouldWork");
  });

  it('still recognizes [Test(Description = "...")] with constructor arguments as a real test', () => {
    const findings = csNoAssertions.run({
      path: "T.cs",
      text: '[Test(Description = "checks something")]\npublic void ShouldWork() {\n  DoSomething();\n}\n',
    });
    expect(findings).toHaveLength(1);
  });
});

describe("QA-JV-109 retry masking (Java)", () => {
  it("ignores non-.java files", () => {
    expect(
      retryMaskingFamily
        .find((r) => r.id === "QA-JV-109")!
        .run({
          path: "T.cs",
          text: "@Test(retryAnalyzer = X.class)",
        }),
    ).toEqual([]);
  });

  it("fires on TestNG retryAnalyzer with high confidence", () => {
    const findings = retryMaskingFamily
      .find((r) => r.id === "QA-JV-109")!
      .run({
        path: "T.java",
        text: "@Test(retryAnalyzer = FlakyRetry.class)\nvoid t() {}\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("high");
    expect(findings[0]?.message).toContain("FlakyRetry");
  });

  it("fires on JUnit @RetryingTest with medium confidence", () => {
    const findings = retryMaskingFamily
      .find((r) => r.id === "QA-JV-109")!
      .run({
        path: "T.java",
        text: "@RetryingTest(3)\nvoid t() {}\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("fires on JUnit @ExtendWith(...Retry...) with medium confidence", () => {
    const findings = retryMaskingFamily
      .find((r) => r.id === "QA-JV-109")!
      .run({
        path: "T.java",
        text: "@ExtendWith(RetryExtension.class)\nvoid t() {}\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("does not fire on a plain @Test with no retry mechanism", () => {
    expect(
      retryMaskingFamily
        .find((r) => r.id === "QA-JV-109")!
        .run({ path: "T.java", text: "@Test\nvoid t() {}\n" }),
    ).toEqual([]);
  });
});

describe("QA-CS-109 retry masking (C#)", () => {
  it("ignores non-.cs files", () => {
    expect(
      retryMaskingFamily
        .find((r) => r.id === "QA-CS-109")!
        .run({ path: "T.java", text: "[Retry(3)]" }),
    ).toEqual([]);
  });

  it("fires on NUnit [Retry(n)] with n > 1, high confidence", () => {
    const findings = retryMaskingFamily
      .find((r) => r.id === "QA-CS-109")!
      .run({
        path: "T.cs",
        text: "[Test]\n[Retry(3)]\npublic async Task T() {}\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("high");
  });

  it("does NOT fire on [Retry(1)] — documented no-op, not a real retry", () => {
    expect(
      retryMaskingFamily
        .find((r) => r.id === "QA-CS-109")!
        .run({
          path: "T.cs",
          text: "[Test]\n[Retry(1)]\npublic async Task T() {}\n",
        }),
    ).toEqual([]);
  });

  it("fires on xUnit [RetryFact]/[RetryTheory] with medium confidence", () => {
    const findings = retryMaskingFamily
      .find((r) => r.id === "QA-CS-109")!
      .run({
        path: "T.cs",
        text: "[RetryFact(3)]\npublic async Task T() {}\n",
      });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("does not fire on a plain [Test] with no retry attribute", () => {
    expect(
      retryMaskingFamily
        .find((r) => r.id === "QA-CS-109")!
        .run({
          path: "T.cs",
          text: "[Test]\npublic async Task T() {}\n",
        }),
    ).toEqual([]);
  });
});
