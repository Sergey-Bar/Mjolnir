/**
 * Unit tests for the Sprint 8 Java/.NET Playwright-parity rules
 * (Master-Stabilization-Plan Sprint 8, Task 32/33): QA-JV-106/107/108
 * and QA-CS-105/106/107/108. Idiom mapping verified in
 * docs/JAVA-CSHARP-IDIOM-MAPPING.md before any of these regexes were
 * written — in particular, QA-JV-108 tests specifically that
 * `.goto(` (the JS/Python idiom) does NOT trigger it, since Java's own
 * idiom is `.navigate(`.
 */

import { describe, expect, it } from "vitest";
import { jvBrittleSelectors } from "../src/rules/java/qa-jv-106-brittle-selectors.js";
import { jvNetworkIdle } from "../src/rules/java/qa-jv-107-network-idle.js";
import { jvHardcodedUrl } from "../src/rules/java/qa-jv-108-hardcoded-url.js";
import { jvRetryMasking } from "../src/rules/java/qa-jv-109-retry-masking.js";
import { jvNoA11yAssertions } from "../src/rules/java/qa-jv-110-no-a11y.js";
import { jvBlanketRouteMock } from "../src/rules/java/qa-jv-111-blanket-route.js";
import { csWaitForTimeout } from "../src/rules/csharp/qa-cs-105-wait-for-timeout.js";
import { csBrittleSelectors } from "../src/rules/csharp/qa-cs-106-brittle-selectors.js";
import { csNetworkIdle } from "../src/rules/csharp/qa-cs-107-network-idle.js";
import { csHardcodedUrl } from "../src/rules/csharp/qa-cs-108-hardcoded-url.js";
import { csRetryMasking } from "../src/rules/csharp/qa-cs-109-retry-masking.js";
import { csNoA11yAssertions } from "../src/rules/csharp/qa-cs-110-no-a11y.js";
import { csBlanketRouteMock } from "../src/rules/csharp/qa-cs-111-blanket-route.js";

describe("QA-JV-106 brittle selectors", () => {
  it("ignores non-.java files", () => {
    expect(
      jvBrittleSelectors.run({ path: "T.cs", text: '.locator("xpath=//x")' }),
    ).toEqual([]);
  });

  it("fires on xpath= selector", () => {
    const findings = jvBrittleSelectors.run({
      path: "T.java",
      text: 'page.locator("xpath=//button").click();',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("xpath=");
  });

  it("fires on nth-child CSS chain", () => {
    const findings = jvBrittleSelectors.run({
      path: "T.java",
      text: 'page.locator(".btn:nth-child(2)").click();',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("nth-child");
  });

  it("fires on absolute XPath bare // shorthand", () => {
    const findings = jvBrittleSelectors.run({
      path: "T.java",
      text: 'page.locator("//div/section").click();',
    });
    expect(findings).toHaveLength(1);
  });

  it("fires on id via querySelector", () => {
    const findings = jvBrittleSelectors.run({
      path: "T.java",
      text: 'page.querySelector("#submit");',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("querySelector");
  });

  it("does not fire on role-based/testId locators", () => {
    const findings = jvBrittleSelectors.run({
      path: "T.java",
      text: 'page.getByRole(AriaRole.BUTTON).click(); page.getByTestId("submit").click();',
    });
    expect(findings).toEqual([]);
  });
});

describe("QA-JV-107 networkidle wait", () => {
  it("ignores non-.java files", () => {
    expect(
      jvNetworkIdle.run({
        path: "T.cs",
        text: "page.waitForLoadState(LoadState.NETWORKIDLE);",
      }),
    ).toEqual([]);
  });

  it("fires on waitForLoadState(LoadState.NETWORKIDLE)", () => {
    const findings = jvNetworkIdle.run({
      path: "T.java",
      text: "page.waitForLoadState(LoadState.NETWORKIDLE);",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("NETWORKIDLE");
  });

  it("does not fire on LOAD or DOMCONTENTLOADED", () => {
    const findings = jvNetworkIdle.run({
      path: "T.java",
      text: "page.waitForLoadState(LoadState.DOMCONTENTLOADED); page.waitForLoadState(LoadState.LOAD);",
    });
    expect(findings).toEqual([]);
  });
});

describe("QA-JV-108 hardcoded URL", () => {
  it("ignores non-.java files", () => {
    expect(
      jvHardcodedUrl.run({
        path: "T.cs",
        text: '.navigate("https://example.com")',
      }),
    ).toEqual([]);
  });

  it('fires on page.navigate("https://...")', () => {
    const findings = jvHardcodedUrl.run({
      path: "T.java",
      text: 'page.navigate("https://staging.example.com/checkout");',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("staging.example.com");
  });

  it("does NOT fire on .goto( — the JS/Python idiom, deliberately not Java's", () => {
    const findings = jvHardcodedUrl.run({
      path: "T.java",
      text: 'page.goto("https://staging.example.com/checkout");',
    });
    expect(findings).toEqual([]);
  });

  it("does not fire on relative paths or localhost/127.0.0.1", () => {
    const findings = jvHardcodedUrl.run({
      path: "T.java",
      text: 'page.navigate("/checkout"); page.navigate("http://localhost:3000/checkout"); page.navigate("http://127.0.0.1:3000/checkout");',
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
      csBrittleSelectors.run({ path: "T.java", text: '.Locator("xpath=//x")' }),
    ).toEqual([]);
  });

  it("fires on xpath= selector", () => {
    const findings = csBrittleSelectors.run({
      path: "T.cs",
      text: 'Page.Locator("xpath=//button").ClickAsync();',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("xpath=");
  });

  it("fires on nth-child CSS chain", () => {
    const findings = csBrittleSelectors.run({
      path: "T.cs",
      text: 'Page.Locator(".btn:nth-child(2)").ClickAsync();',
    });
    expect(findings).toHaveLength(1);
  });

  it("fires on absolute XPath bare // shorthand", () => {
    const findings = csBrittleSelectors.run({
      path: "T.cs",
      text: 'Page.Locator("//div/section").ClickAsync();',
    });
    expect(findings).toHaveLength(1);
  });

  it("fires on id via QuerySelectorAsync", () => {
    const findings = csBrittleSelectors.run({
      path: "T.cs",
      text: 'Page.QuerySelectorAsync("#submit");',
    });
    expect(findings).toHaveLength(1);
  });

  it("does not fire on role-based/testId locators", () => {
    const findings = csBrittleSelectors.run({
      path: "T.cs",
      text: 'Page.GetByRole(AriaRole.Button).ClickAsync(); Page.GetByTestId("submit").ClickAsync();',
    });
    expect(findings).toEqual([]);
  });
});

describe("QA-CS-107 networkidle wait", () => {
  it("ignores non-.cs files", () => {
    expect(
      csNetworkIdle.run({
        path: "T.java",
        text: "WaitForLoadStateAsync(LoadState.NetworkIdle)",
      }),
    ).toEqual([]);
  });

  it("fires on WaitForLoadStateAsync(LoadState.NetworkIdle)", () => {
    const findings = csNetworkIdle.run({
      path: "T.cs",
      text: "await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("NetworkIdle");
  });

  it("does not fire on Load or DOMContentLoaded", () => {
    const findings = csNetworkIdle.run({
      path: "T.cs",
      text: "await Page.WaitForLoadStateAsync(LoadState.DOMContentLoaded); await Page.WaitForLoadStateAsync(LoadState.Load);",
    });
    expect(findings).toEqual([]);
  });
});

describe("QA-CS-108 hardcoded URL", () => {
  it("ignores non-.cs files", () => {
    expect(
      csHardcodedUrl.run({
        path: "T.java",
        text: '.GotoAsync("https://example.com")',
      }),
    ).toEqual([]);
  });

  it('fires on GotoAsync("https://...")', () => {
    const findings = csHardcodedUrl.run({
      path: "T.cs",
      text: 'await Page.GotoAsync("https://staging.example.com/checkout");',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("staging.example.com");
  });

  it("fires on GetAsync/PostAsync hardcoded URLs", () => {
    const findings = csHardcodedUrl.run({
      path: "T.cs",
      text: 'await Request.GetAsync("https://api.example.com/data"); await Request.PostAsync("https://api.example.com/data");',
    });
    expect(findings).toHaveLength(2);
  });

  it("does not fire on relative paths or localhost/127.0.0.1", () => {
    const findings = csHardcodedUrl.run({
      path: "T.cs",
      text: 'await Page.GotoAsync("/checkout"); await Page.GotoAsync("http://localhost:3000/checkout"); await Page.GotoAsync("http://127.0.0.1:3000/checkout");',
    });
    expect(findings).toEqual([]);
  });
});

describe("QA-JV-109 retry masking (Java)", () => {
  it("ignores non-.java files", () => {
    expect(
      jvRetryMasking.run({
        path: "T.cs",
        text: "@Test(retryAnalyzer = X.class)",
      }),
    ).toEqual([]);
  });

  it("fires on TestNG retryAnalyzer with high confidence", () => {
    const findings = jvRetryMasking.run({
      path: "T.java",
      text: "@Test(retryAnalyzer = FlakyRetry.class)\nvoid t() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("high");
    expect(findings[0]?.message).toContain("FlakyRetry");
  });

  it("fires on JUnit @RetryingTest with medium confidence", () => {
    const findings = jvRetryMasking.run({
      path: "T.java",
      text: "@RetryingTest(3)\nvoid t() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("fires on JUnit @ExtendWith(...Retry...) with medium confidence", () => {
    const findings = jvRetryMasking.run({
      path: "T.java",
      text: "@ExtendWith(RetryExtension.class)\nvoid t() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("does not fire on a plain @Test with no retry mechanism", () => {
    expect(
      jvRetryMasking.run({ path: "T.java", text: "@Test\nvoid t() {}\n" }),
    ).toEqual([]);
  });
});

describe("QA-CS-109 retry masking (C#)", () => {
  it("ignores non-.cs files", () => {
    expect(csRetryMasking.run({ path: "T.java", text: "[Retry(3)]" })).toEqual(
      [],
    );
  });

  it("fires on NUnit [Retry(n)] with n > 1, high confidence", () => {
    const findings = csRetryMasking.run({
      path: "T.cs",
      text: "[Test]\n[Retry(3)]\npublic async Task T() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("high");
  });

  it("does NOT fire on [Retry(1)] — documented no-op, not a real retry", () => {
    expect(
      csRetryMasking.run({
        path: "T.cs",
        text: "[Test]\n[Retry(1)]\npublic async Task T() {}\n",
      }),
    ).toEqual([]);
  });

  it("fires on xUnit [RetryFact]/[RetryTheory] with medium confidence", () => {
    const findings = csRetryMasking.run({
      path: "T.cs",
      text: "[RetryFact(3)]\npublic async Task T() {}\n",
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.confidence).toBe("medium");
  });

  it("does not fire on a plain [Test] with no retry attribute", () => {
    expect(
      csRetryMasking.run({
        path: "T.cs",
        text: "[Test]\npublic async Task T() {}\n",
      }),
    ).toEqual([]);
  });
});

describe("QA-JV-110 no a11y assertions", () => {
  it("ignores non-.java files", () => {
    expect(
      jvNoA11yAssertions.run({ path: "T.cs", text: "page.navigate" }),
    ).toEqual([]);
  });

  it("does not fire when there is no UI interaction at all", () => {
    expect(
      jvNoA11yAssertions.run({
        path: "T.java",
        text: "class T { void t() { int x = 1; } }",
      }),
    ).toEqual([]);
  });

  it("fires on a UI-interacting file with no a11y assertion", () => {
    const findings = jvNoA11yAssertions.run({
      path: "T.java",
      text: 'page.navigate("/login"); page.click("button");',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("does not fire when AxeBuilder/analyze is present", () => {
    expect(
      jvNoA11yAssertions.run({
        path: "T.java",
        text: 'page.navigate("/login"); new AxeBuilder(page).analyze();',
      }),
    ).toEqual([]);
  });
});

describe("QA-CS-110 no a11y assertions", () => {
  it("ignores non-.cs files", () => {
    expect(
      csNoA11yAssertions.run({ path: "T.java", text: "GotoAsync" }),
    ).toEqual([]);
  });

  it("does not fire when there is no UI interaction at all", () => {
    expect(
      csNoA11yAssertions.run({
        path: "T.cs",
        text: "public class T { public void M() { int x = 1; } }",
      }),
    ).toEqual([]);
  });

  it("fires on a UI-interacting file with no a11y assertion", () => {
    const findings = csNoA11yAssertions.run({
      path: "T.cs",
      text: 'await Page.GotoAsync("/login"); await Page.ClickAsync("button");',
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]?.severity).toBe("info");
  });

  it("does not fire when RunAxe is present", () => {
    expect(
      csNoA11yAssertions.run({
        path: "T.cs",
        text: 'await Page.GotoAsync("/login"); var r = await Page.RunAxe();',
      }),
    ).toEqual([]);
  });
});

describe("QA-JV-111 blanket route mock", () => {
  it("ignores non-.java files", () => {
    expect(
      jvBlanketRouteMock.run({ path: "T.cs", text: '.route("**/*")' }),
    ).toEqual([]);
  });

  it("fires on a catch-all route pattern", () => {
    const findings = jvBlanketRouteMock.run({
      path: "T.java",
      text: 'page.route("**/*", route -> route.fulfill());',
    });
    expect(findings).toHaveLength(1);
  });

  it("does not fire on a scoped route pattern", () => {
    expect(
      jvBlanketRouteMock.run({
        path: "T.java",
        text: 'page.route("**/api/orders", route -> route.fulfill());',
      }),
    ).toEqual([]);
  });
});

describe("QA-CS-111 blanket route mock", () => {
  it("ignores non-.cs files", () => {
    expect(
      csBlanketRouteMock.run({ path: "T.java", text: '.RouteAsync("**/*")' }),
    ).toEqual([]);
  });

  it("fires on a catch-all route pattern", () => {
    const findings = csBlanketRouteMock.run({
      path: "T.cs",
      text: 'await Page.RouteAsync("**/*", route => route.FulfillAsync());',
    });
    expect(findings).toHaveLength(1);
  });

  it("does not fire on a scoped route pattern", () => {
    expect(
      csBlanketRouteMock.run({
        path: "T.cs",
        text: 'await Page.RouteAsync("**/api/orders", route => route.FulfillAsync());',
      }),
    ).toEqual([]);
  });
});
