import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-101 (+3): sync/async mix — final scenarios.
for (const [i, name] of [
  "checkout_split",
  "profile_half",
  "search_partial",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-m-${i + 3}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `test_${name}.py`),
    [
      "from playwright.sync_api import sync_playwright",
      "",
      "",
      `def test_${name}() -> None:`,
      '    """Sync wrapper around what the module elsewhere drives async."""',
      "    with sync_playwright() as p:",
      "        page = p.chromium.launch().new_page()",
      `        page.goto("/${name.replace("_", "-")}")`,
      '        page.wait_for_selector(".ready")',
    ].join("\n"),
  );
}

// ── QA-CS-104 (+1): one more shared-static-page class pair.
writeFileSync(
  join(ROOT, "QA-CS-104", "NotificationsSharedContextTests.cs"),
  `using Microsoft.Playwright;
using NUnit.Framework;

public class NotificationsSharedContext
{
    public static readonly IPage Page = Playwright.CreateAsync().Result;
}

public class NotificationsTests
{
    [Test]
    public async Task ShowsUnreadBadge()
    {
        await NotificationsSharedContext.Page.GotoAsync("/notifications");
        await Expect(NotificationsSharedContext.Page.Locator(".unread")).ToBeVisibleAsync();
    }
}
`,
);

// ── QA-PY-108 (+1): another hardcoded-URL variant.
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-origin.py"),
  `from playwright.sync_api import Page, expect


def test_settings_page(page: Page) -> None:
    """Hardcoded origin: breaks when environments change."""
    page.goto("https://app.example.test/settings")
    expect(page.locator("#settings")).to_be_visible()
`,
);

// ── QA-SE-001 (+3): Selenium sleep — one scenario per language.
{
  const dirJ = join(ROOT, "QA-SE-001", "sleep-escalations-java-8");
  mkdirSync(dirJ, { recursive: true });
  writeFileSync(
    join(dirJ, "EscalationsPageTest.java"),
    `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsPageTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations");
        try { Thread.sleep(2800); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("queue"));
    }
}
`,
  );
  const dirC = join(ROOT, "QA-SE-001", "sleep-escalations-cs-8");
  mkdirSync(dirC, { recursive: true });
  writeFileSync(
    join(dirC, "EscalationsPageTests.cs"),
    `using OpenQA.Selenium;
using NUnit.Framework;

public class EscalationsPageTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/escalations");
        System.Threading.Thread.Sleep(2800);
        Driver.FindElement(By.Id("queue"));
    }
}
`,
  );
  const dirP = join(ROOT, "QA-SE-001", "sleep-escalations-py-8");
  mkdirSync(dirP, { recursive: true });
  writeFileSync(
    join(dirP, "test_escalations.py"),
    [
      "import time",
      "",
      "from selenium import webdriver",
      "from selenium.webdriver.common.by import By",
      "",
      "",
      "def test_escalations(driver):",
      '    driver.get("https://example.test/escalations")',
      "    time.sleep(2.8)",
      '    driver.find_element(By.ID, "queue")',
    ].join("\n"),
  );
}

// ── QA-PW-116 (+9): more stale storageState configs — different shapes.
for (const [i, name] of [
  "renewals",
  "approvals",
  "audits",
  "backups",
  "clusters",
  "deployments",
  "endpoints",
  "firewalls",
  "gateways",
] as const) {
  const dir = join(ROOT, "QA-PW-116", `noauth-${name}-${i + 3}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Session state exported by a manual QA run; nothing refreshes it.\nexport default defineConfig({\n  use: {\n    storageState: "e2e/.auth/${name}.json",\n  },\n});\n`,
  );
}

// ── QA-PW-125 (+10): more global-setup shared-host mutations.
for (const [i, name] of [
  "billing-stage",
  "catalog-stage",
  "crm-stage",
  "docs-stage",
  "erp-stage",
  "forms-stage",
  "graphs-stage",
  "hooks-stage",
  "integrations-stage",
  "jobs-stage",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `${name}-mutate-${i + 13}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "global-setup.ts"),
    `import { execSync } from "node:child_process";

export default async function globalSetup(): Promise<void> {
  // Seeds the shared ${name} stage DB before every run.
  execSync("npx prisma db seed --schema ./prisma/${name}.prisma", { stdio: "inherit" });
}
`,
  );
}

// ── QA-PY-102 (+10): time.sleep in Playwright tests — final wave.
for (const [i, scenario] of [
  "alerts_fanout",
  "budget_recalc",
  "cache_invalidate",
  "doc_preview",
  "export_zip",
  "feed_backfill",
  "geo_route",
  "import_dedupe",
  "journal_post",
  "key_rotation",
] as const) {
  const dir = join(ROOT, "QA-PY-102", `${scenario.replace("_", "-")}-c`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `test_${scenario}.py`),
    [
      "import time",
      "",
      "from playwright.sync_api import Page, expect",
      "",
      "",
      `def test_${scenario}(page: Page) -> None:`,
      '    """Blocking sleep hides the real wait."""',
      `    page.goto("/${scenario.replace("_", "-")}")`,
      "    time.sleep(12)",
      '    expect(page.get_by_test_id("done")).to_be_visible()',
    ].join("\n"),
  );
}

console.log("wave-3 authored");
