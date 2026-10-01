import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-JV-106 (4): xpath-support SELF-TEST exhibits (the same pattern
// that produced the rev-3 FPs, on consumer code: a test-utility helper
// class verifying its own selector portability) — every fire is the
// anti-pattern (real xpath in a test).
{
  const dir = join(ROOT, "QA-JV-106");
  writeFileSync(
    join(dir, "SelectorPortabilityTest.java"),
    `import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

// Consumer-side portability check for a screenshot-diff helper: the
// helper accepts both css and xpath selectors, and these tests pin the
// xpath behavior on a synthetic DOM.
class SelectorPortabilityTest {

    @Test
    void xpathFindsNestedWidget() {
        page.setContent("<div class='panel'><span class='widget'>A</span></div>");
        Object first = page.locator("xpath=//span[contains(@class, 'widget')]").evaluate("e => e.textContent");
        assertEquals("A", first);
    }

    @Test
    void xpathHandlesDeepChains() {
        page.setContent("<main><section><div class='row'><button>Go</button></div></section></main>");
        Integer count = (Integer) page.locator("xpath=//main//section//div[@class='row']/button").count();
        assertEquals(1, count);
    }
}
`,
  );
}

// ── QA-CS-106 (3): same consumer-side self-test exhibits for .NET.
{
  const dir = join(ROOT, "QA-CS-106");
  writeFileSync(
    join(dir, "SelectorPortabilityTests.cs"),
    `using Microsoft.Playwright;
using NUnit.Framework;

// Consumer-side portability check: the diff helper accepts xpath
// selectors, and these tests pin the behavior on a synthetic DOM.
public class SelectorPortabilityTests
{
    [Test]
    public async Task XpathFindsNestedWidget()
    {
        await Page.SetContentAsync("<div class='panel'><span class='widget'>A</span></div>");
        var first = await Page.Locator("xpath=//span[contains(@class, 'widget')]").TextContentAsync();
        Assert.That(first, Is.EqualTo("A"));
    }

    [Test]
    public async Task XpathHandlesDeepChains()
    {
        await Page.SetContentAsync("<main><section><div class='row'><button>Go</button></div></section></main>");
        var count = await Page.Locator("xpath=//main//section//div[@class='row']/button").CountAsync();
        Assert.That(count, Is.EqualTo(1));
    }
}
`,
  );
}

// ── QA-CS-109 (1): retry masking the real failure — pytest-style
// NUnit Retry attribute hiding a genuine flaky assertion.
writeFileSync(
  join(ROOT, "QA-CS-109", "RetryMaskedFailureTests.cs"),
  `using NUnit.Framework;

// The Retry attribute silently re-runs the flaky timing assertion —
// the underlying race (no await on the polling task) is never fixed.
[Retry(5)]
public class RetryMaskedFailureTests
{
    [Test]
    public async Task PollingTaskEventuallySucceeds()
    {
        var result = await StartBackgroundJobAsync();
        Assert.That(result, Is.EqualTo("done"));
    }
}
`,
);

// ── QA-CS-104 (6 more would exceed need — n=4 now, needs 6): shared
// page/browser fixture across test classes in one file (2 exhibits).
writeFileSync(
  join(ROOT, "QA-CS-104", "CrossClassSharedContextTests.cs"),
  `using Microsoft.Playwright;
using NUnit.Framework;

// Two test classes share ONE static browser/page pair — parallel test
// classes race on the same page instance.
public class SharedPlaywrightContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class InventoryTests
{
    [Test]
    public async Task ListsWarehouseRows() {
        await SharedPlaywrightContext.Page.GotoAsync("/inventory");
        await Expect(SharedPlaywrightContext.Page.Locator(".row")).ToHaveCountAsync(3);
    }
}

public class AuditTests
{
    [Test]
    public async Task ShowsAuditTrail() {
        await SharedPlaywrightContext.Page.GotoAsync("/audit");
        await Expect(SharedPlaywrightContext.Page.Locator(".trail")).ToBeVisibleAsync();
    }
}
`,
);

// ── QA-CYP-002 (7): focused tests (it.only / context.only) exhibits.
writeFileSync(
  join(ROOT, "QA-CYP-002", "committed-focus.spec.ts"),
  `describe("checkout focus leaks", () => {
  it.only("renders the cart", () => {
    cy.visit("/cart");
  });

  it("applies a coupon", () => {
    cy.visit("/checkout");
  });

  it("confirms the order", () => {
    cy.visit("/confirm");
  });
});
`,
);
writeFileSync(
  join(ROOT, "QA-CYP-002", "debug-focus-leak.spec.ts"),
  `context.only("mobile viewport debug", () => {
  it("shows the hamburger menu", () => {
    cy.viewport("iphone-6");
  });

  it("shows the search bar", () => {
    cy.get("#search");
  });

  it("shows the nav drawer", () => {
    cy.get("#drawer");
  });

  it("shows the footer links", () => {
    cy.get("#footer");
  });

  it("shows the promo banner", () => {
    cy.get("#promo");
  });

  it("shows the cart badge", () => {
    cy.get("#cart-badge");
  });

  it("shows the login link", () => {
    cy.get("#login-link");
  });
});
`,
);

// ── QA-CYP-003 (8): chromeWebSecurity: false exhibits — distinct
// realistic app shapes.
for (const [i, name] of [
  "partner-portal",
  "admin-console",
  "legacy-migration",
  "embed-preview",
  "iframe-dashboard",
  "cross-origin-tool",
  "staging-proxy",
  "vendor-widget",
] as const) {
  const dir = join(ROOT, "QA-CYP-003", `${name}-${i + 1}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "cypress.config.js"),
    `const { defineConfig } = require("cypress");

module.exports = defineConfig({
  chromeWebSecurity: false,
  e2e: {
    baseUrl: "https://${name}.example.test",
  },
});
`,
  );
}

// ── QA-SE-001 (9): Selenium hard sleep before lookup — Java/C#/Py
// variants per the rule's language coverage.
writeFileSync(
  join(ROOT, "QA-SE-001", "SleepBeforeLookup.java"),
  `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class SleepBeforeLookup {
    public void openReports(WebDriver driver) {
        driver.get("https://reports.example.test/daily");
        try { Thread.sleep(3000); } catch (InterruptedException ignored) {}
        WebElement table = driver.findElement(By.id("daily-table"));
        assert table.isDisplayed();
    }
}
`,
);
writeFileSync(
  join(ROOT, "QA-SE-001", "SleepBeforeLookup.cs"),
  `using OpenQA.Selenium;

public class SleepBeforeLookup
{
    public void OpenReports(IWebDriver driver)
    {
        driver.Navigate().GoToUrl("https://reports.example.test/daily");
        Thread.Sleep(3000);
        var table = driver.FindElement(By.Id("daily-table"));
        Assert.IsTrue(table.Displayed);
    }
}
`,
);
writeFileSync(
  join(ROOT, "QA-SE-001", "SleepBeforeLookup.py"),
  `import time

from selenium import webdriver
from selenium.webdriver.common.by import By


def test_daily_report(driver):
    driver.get("https://reports.example.test/daily")
    time.sleep(3)
    table = driver.find_element(By.ID, "daily-table")
    assert table.is_displayed()
`,
);

// ── QA-SE-002 (4): Selenium + JS sleeps hiding a real failure.
writeFileSync(
  join(ROOT, "QA-SE-002", "SleepThenAssert.js"),
  `const { Builder, By, until } = require("selenium-webdriver");

// The explicit sleep papers over a missing explicit-wait; when the
// backend is slower the assert fails anyway, and the sleep just adds
// 5s to every run before the failure.
it("submits the ledger entry", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://ledger.example.test/new");
  await driver.sleep(5000);
  const cell = await driver.findElement(By.id("balance"));
  expect(await cell.getText()).toBe("1,000.00");
});
`,
);
writeFileSync(
  join(ROOT, "QA-SE-002", "RetrySleepLoop.js"),
  `const { Builder, By } = require("selenium-webdriver");

// A retry loop with sleeps instead of an explicit wait — the flake is
// "fixed" by luck, never diagnosed.
it("eventually sees the updated balance", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  for (let i = 0; i < 3; i++) {
    await driver.sleep(2000);
    const cell = await driver.findElement(By.id("balance"));
    if ((await cell.getText()) !== "1,000.00") continue;
    return;
  }
  throw new Error("balance never updated");
});
`,
);
writeFileSync(
  join(ROOT, "QA-SE-002", "SleepBeforeScreenshot.java"),
  `import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;

public class SleepBeforeScreenshot {
    public void capture(WebDriver driver) throws Exception {
        driver.get("https://portal.example.test/summary");
        Thread.sleep(4000);
        ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
    }
}
`,
);
writeFileSync(
  join(ROOT, "QA-SE-002", "SleepBeforeScreenshot.cs"),
  `using OpenQA.Selenium;

public class SleepBeforeScreenshot
{
    public void Capture(IWebDriver driver)
    {
        driver.Navigate().GoToUrl("https://portal.example.test/summary");
        System.Threading.Thread.Sleep(4000);
        ((ITakesScreenshot)driver).GetScreenshot();
    }
}
`,
);

console.log("closure exhibits authored");
