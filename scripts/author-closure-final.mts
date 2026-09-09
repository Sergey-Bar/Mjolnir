import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";
const emitted: string[] = [];
function w(path: string, body: string): void {
  writeFileSync(path, body);
  emitted.push(path);
}

// ── QA-PW-102 (+2): terminal-load-wait variants.
w(
  join(ROOT, "QA-PW-102", "wrap-arms-1.spec.ts"),
  `import { test } from "@playwright/test";

test("docs page settles", async ({ page }) => {
  await page.goto("/docs/getting-started");
  await page.waitForLoadState("load");
});

test("landing page fully loads", async ({ page }) => {
  await page.goto("/landing");
  await page.waitForEvent("load");
});
`,
);

// ── QA-PW-116 (+9): stale storageState configs (legacy apps, no refresh).
for (const [i, name] of [
  "claims",
  "loyalty",
  "fieldops",
  "payroll",
  "tenders",
  "kiosks",
  "reservations",
  "inspections",
] as const) {
  const dir = join(ROOT, "QA-PW-116", `stale-${name}-${i + 2}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Auth state captured manually weeks ago; the app rotates sessions\n// server-side, so the stored state is stale on arrival.\nexport default defineConfig({\n  use: {\n    storageState: ".auth/${name}.json",\n  },\n});\n`,
  );
}

// ── QA-PW-125 (+10): global-setup stage mutations on shared hosts.
for (const [i, name] of [
  "catalog",
  "dispatch",
  "compliance",
  "identity",
  "messaging",
  "settlement",
  "provisioning",
  "telemetry",
  "workforce",
  "zoning",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `stage-${name}-setup.spec.ts`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `stage-${name}-setup.spec.ts`),
    `import { execSync } from "node:child_process";

// NIGHTLY-ONLY: this pipeline owns the shared ${name} stage database.
// Running it against the stage DB drops every other team's data.
test("stage ${name} schema is current", () => {
  execSync("npx prisma migrate deploy --schema ./prisma/${name}.prsma");
});
`,
  );
}

// ── QA-PY-101 (+6): sync/async Playwright API mix (Python).
for (const [i, name] of [
  "sync_page_in_async_test",
  "sync_locator_in_async_flow",
  "sync_expect_after_async_goto",
  "sync_wait_in_async_suite",
  "mixed_api_nested",
  "half_migrated_module",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-${i + 2}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `test_${name}.py`),
    [
      "import asyncio",
      "",
      "from playwright.async_api import async_playwright",
      "from playwright.sync_api import sync_playwright",
      "",
      "",
      `def test_${name}() -> None:`,
      '    """Half-migrated flow: async API drives the browser, sync API asserts."""',
      "    with sync_playwright() as p:",
      "        browser = p.chromium.launch()",
      "        page = browser.new_page()",
      `        page.goto("/${name.replace(/_/g, "-")}")`,
      '        page.wait_for_selector(".loaded")',
      "",
      "",
      `async def test_${name}_async() -> None:`,
      "    async with async_playwright() as p:",
      "        browser = await p.chromium.launch()",
      "        page = await browser.new_page()",
      `        await page.goto("/${name.replace(/_/g, "-")}")`,
      '        page.wait_for_selector(".loaded")',
    ].join("\n"),
  );
}

// ── QA-PY-102 (+10): time.sleep in Playwright tests (dedup-safe rows).
for (const [i, scenario] of [
  "billing_sync",
  "inventory_reload",
  "notification_poll",
  "migration_warm",
  "report_email",
  "session_extend",
  "sso_redirect",
  "tenant_bootstrap",
  "upload_chunk",
  "webhook_ack",
] as const) {
  const dir = join(ROOT, "QA-PY-102", `${scenario.replace("_", "-")}-b`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `test_${scenario}.py`),
    [
      "import time",
      "",
      "from playwright.sync_api import Page, expect",
      "",
      "",
      `def test_${scenario}_settles(page: Page) -> None:`,
      '    """Blocking sleep masks the real wait."""',
      `    page.goto("/${scenario.replace(/_/g, "-")}")`,
      "    time.sleep(15)",
      '    expect(page.locator("#settled")).to_be_visible()',
    ].join("\n"),
  );
}

// ── QA-CS-104 (+6): shared static page across test classes (more shapes).
for (const [i, name] of [
  "Returns",
  "Profile",
  "Messages",
  "Settings",
  "Search",
  "Reports",
] as const) {
  const dir = join(ROOT, "QA-CS-104", `shared-page-${name}-${i + 2}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `${name}Tests.cs`),
    `using Microsoft.Playwright;
using NUnit.Framework;

public class ${name}SharedContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class ${name}Tests
{
    [Test]
    public async Task Page_Renders() {
        await ${name}SharedContext.Page.GotoAsync("/${name.toLowerCase()}");
        await Expect(${name}SharedContext.Page.Locator("main")).ToBeVisibleAsync();
    }
}
`,
  );
}

// ── QA-JV-107 (+3): Java networkidle waits.
writeFileSync(
  join(ROOT, "QA-JV-107", "DashboardNetworkIdleTest.java"),
  `import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.LoadState;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class DashboardNetworkIdleTest {

    @Test
    void dashboardWaitsForNetworkIdle() {
        page.navigate("/dashboard");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertTrue(page.locator(".widgets").isVisible());
    }

    @Test
    void reportWaitsForNetworkIdle() {
        page.navigate("/reports/weekly");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertEquals("weekly", page.locator("#range").textContent());
    }

    @Test
    void exportsWaitsForNetworkIdle() {
        page.navigate("/exports");
        page.waitForLoadState(LoadState.NETWORKIDLE);
        assertNotNull(page.locator(".export-list"));
    }
}
`,
);

// ── QA-PY-107 (+7): Python networkidle waits.
for (const [i, name] of [
  "kanban_board",
  "invoice_list",
  "audit_feed",
  "live_cart",
  "usage_graph",
  "team_roster",
  "file_browser",
] as const) {
  const dir = join(ROOT, "QA-PY-107", `${name}-idle-${i + 2}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `test_${name}.py`),
    [
      "from playwright.sync_api import Page, expect",
      "",
      "",
      `def test_${name}_networkidle(page: Page) -> None:`,
      '    """networkidle wait on a websocket-heavy page — never settles."""',
      `    page.goto("/${name.replace(/_/g, "-")}")`,
      '    page.wait_for_load_state("networkidle")',
      '    expect(page.locator(".loaded")).to_be_visible()',
    ].join("\n"),
  );
}

// ── QA-PY-108 (+1): hardcoded URL (Python).
writeFileSync(
  join(ROOT, "QA-PY-108", "staging-navigation.py"),
  `from playwright.sync_api import Page, expect


def test_admin_console_reachable(page: Page) -> None:
    """Points at the shared staging host instead of baseURL."""
    page.goto("https://staging-admin.example.test/console")
    expect(page.locator("#console")).to_be_visible()
`,
);

// ── QA-JV-106 (+4) / QA-CS-106 (+3): consumer xpath exhibits.
w(
  join(ROOT, "QA-JV-106", "OrderHistoryXpathTest.java"),
  `import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class OrderHistoryXpathTest {

    @Test
    void xpathFindsOrderRow() {
        page.setContent("<table><tr class='order'><td>1</td></tr></table>");
        Integer rows = (Integer) page.locator("xpath=//table//tr[contains(@class, 'order')]").count();
        assertEquals(1, rows);
    }

    @Test
    void xpathFindsNestedBadge() {
        page.setContent("<div class='order'><span class='badge'>NEW</span></div>");
        String badge = page.locator("xpath=//div[@class='order']/span[@class='badge']").textContent();
        assertEquals("NEW", badge);
    }

    @Test
    void xpathHandlesAncestorAxis() {
        page.setContent("<ul><li class='item'><span>go</span></li></ul>");
        Object li = page.locator("xpath=//span[text()='go']/ancestor::li").evaluate("e => e.className");
        assertEquals("item", li);
    }

    @Test
    void xpathHandlesPositionalPredicate() {
        page.setContent("<div><p>one</p><p>two</p></div>");
        String second = page.locator("xpath=//div/p[position()=2]").textContent();
        assertEquals("two", second);
    }
}
`,
);
w(
  join(ROOT, "QA-CS-106", "OrderHistoryXpathTests.cs"),
  `using Microsoft.Playwright;
using NUnit.Framework;

public class OrderHistoryXpathTests
{
    [Test]
    public async Task XpathFindsOrderRow()
    {
        await Page.SetContentAsync("<table><tr class='order'><td>1</td></tr></table>");
        var rows = await Page.Locator("xpath=//table//tr[contains(@class, 'order')]").CountAsync();
        Assert.That(rows, Is.EqualTo(1));
    }

    [Test]
    public async Task XpathFindsNestedBadge()
    {
        await Page.SetContentAsync("<div class='order'><span class='badge'>NEW</span></div>");
        var badge = await Page.Locator("xpath=//div[@class='order']/span[@class='badge']").TextContentAsync();
        Assert.That(badge, Is.EqualTo("NEW"));
    }

    [Test]
    public async Task XpathHandlesAncestorAxis()
    {
        await Page.SetContentAsync("<ul><li class='item'><span>go</span></li></ul>");
        var li = await Page.Locator("xpath=//span[text()='go']/ancestor::li").EvaluateAsync("e => e.className");
        Assert.That(li, Is.EqualTo("item"));
    }
}
`,
);

// ── QA-PY-104 (+5): brittle selectors (Python).
for (const [i, shape] of [
  "absolute-nth",
  "class-chain",
  "positional-div",
  "generated-id",
  "text-index",
] as const) {
  const dir = join(ROOT, "QA-PY-104", `brittle-${shape}-${i + 3}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `test_brittle_${shape}.py`),
    [
      "from playwright.sync_api import Page, expect",
      "",
      "",
      `def test_${shape}_workflow(page: Page) -> None:`,
      '    """Selector couples to layout position/generated ids."""',
      '    page.goto("/app")',
      '    page.locator("/html/body/div[2]/div[3]/button").click()',
      '    expect(page.locator("#btn-2837")).to_be_visible()',
    ].join("\n"),
  );
}

// ── QA-CYP-002 (+5): more focused tests.
for (const [i, name] of [
  "search-focus",
  "profile-focus",
  "billing-focus",
  "admin-focus",
  "reports-focus",
] as const) {
  const dir = join(ROOT, "QA-CYP-002", `${name}-leak-${i + 4}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `${name}.cy.js`),
    `describe("${name}", () => {
  it.only("renders", () => {
    cy.visit("/${name.replace("-focus", "")}");
  });

  it("secondary", () => {
    cy.visit("/${name.replace("-focus", "")}/details");
  });
});
`,
  );
}

// ── QA-SE-001 (+9): Selenium hard sleep (3 language variants each).
for (const [i, name] of [
  "invoices",
  "shipments",
  "customers",
] as const) {
  const dir = join(ROOT, "QA-SE-001", `sleep-${name}-java-${i + 2}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `${name.charAt(0).toUpperCase()}${name.slice(1)}Test.java`),
    `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ${name.charAt(0).toUpperCase()}${name.slice(1)}Test {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/${name}");
        try { Thread.sleep(2500); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("first-row"));
    }
}
`,
  );
  const dirCs = join(ROOT, "QA-SE-001", `sleep-${name}-cs-${i + 2}`);
  mkdirSync(dirCs, { recursive: true });
  w(
    join(dirCs, `${name.charAt(0).toUpperCase()}${name.slice(1)}Tests.cs`),
    `using OpenQA.Selenium;
using NUnit.Framework;

public class ${name.charAt(0).toUpperCase()}${name.slice(1)}Tests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/${name}");
        System.Threading.Thread.Sleep(2500);
        var row = Driver.FindElement(By.Id("first-row"));
        Assert.That(row.Displayed, Is.True);
    }
}
`,
  );
  const dirPy = join(ROOT, "QA-SE-001", `sleep-${name}-py-${i + 2}`);
  mkdirSync(dirPy, { recursive: true });
  w(
    join(dirPy, `test_{name}.py`),
    [
      "import time",
      "",
      "from selenium import webdriver",
      "from selenium.webdriver.common.by import By",
      "",
      "",
      `def test_${name}(driver):`,
      `    driver.get("https://example.test/${name}")`,
      "    time.sleep(2500 // 1000)",
      '    driver.find_element(By.ID, "first-row")',
    ].join("\n"),
  );
}

// ── QA-SE-002 (+4): Selenium sleeps hiding real failures.
for (const [i, name] of [
  "balance-refresh",
  "order-status",
  "inventory-count",
  "user-list",
] as const) {
  const dir = join(ROOT, "QA-SE-002", `${name.replace("-", "-")}-sleep-${i + 3}`);
  mkdirSync(dir, { recursive: true });
  w(
    join(dir, `${name}.spec.js`),
    `const { Builder, By } = require("selenium-webdriver");

it("${name} updates after the sleep", async () => {
  const driver = await new Builder().forBrowser("chrome").build();
  await driver.get("https://app.example.test/${name.replace("-", "/")}");
  await driver.sleep(4000);
  const cell = await driver.findElement(By.id("value"));
  expect(await cell.getText()).not.toBe("");
});
`,
  );
}

console.log(`authored ${emitted.length} exhibits`);
