import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";
const emitted = 0;

// ── QA-PY-106 (+6): shared page fixture across test files (Python).
for (const [i, name] of [
  "onboarding",
  "pricing",
  "signup",
  "newsletter",
  "support",
  "gallery",
] as const) {
  const dir = join(ROOT, "QA-PY-106", `shared-page-${name}-${i + 2}`);
  mkdirSync(join(dir), { recursive: true });
  writeFileSync(
    join(dir, "conftest.py"),
    `import pytest
from playwright.sync_api import Page, sync_playwright


@pytest.fixture(scope="module")
def shared_page() -> Page:
    """MODULE-scoped page: every test in this module mutates the same page."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        yield page
        browser.close()
`,
  );
  writeFileSync(
    join(dir, `test_${name}.py`),
    [
      "from playwright.sync_api import expect",
      "",
      "",
      `def test_${name}_renders(shared_page) -> None:`,
      `    shared_page.goto("/${name}")`,
      '    expect(shared_page.locator("main")).to_be_visible()',
      "",
      "",
      `def test_${name}_details(shared_page) -> None:`,
      `    shared_page.goto("/${name}/details")`,
      '    expect(shared_page.locator(".details")).to_be_visible()',
    ].join("\n"),
  );
}

// ── QA-SE-001 (+6): Selenium hard sleeps — 2 more scenario sets across
// the three languages the rule covers.
for (const [i, name] of ["leads", "tickets", "vendors"] as const) {
  const dirJ = join(ROOT, "QA-SE-001", `sleep-${name}-java-${i + 5}`);
  mkdirSync(dirJ, { recursive: true });
  writeFileSync(
    join(dirJ, `${name.charAt(0).toUpperCase()}${name.slice(1)}PageTest.java`),
    `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ${name.charAt(0).toUpperCase()}${name.slice(1)}PageTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/${name}");
        try { Thread.sleep(3500); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("grid"));
    }
}
`,
  );
  const dirC = join(ROOT, "QA-SE-001", `sleep-${name}-cs-${i + 5}`);
  mkdirSync(dirC, { recursive: true });
  writeFileSync(
    join(dirC, `${name.charAt(0).toUpperCase()}${name.slice(1)}PageTests.cs`),
    `using OpenQA.Selenium;
using NUnit.Framework;

public class ${name.charAt(0).toUpperCase()}${name.slice(1)}PageTests
{
    [Test]
    public void Opens()
    {
        Driver.Navigate().GoToUrl("https://example.test/${name}");
        System.Threading.Thread.Sleep(3500);
        Driver.FindElement(By.Id("grid"));
    }
}
`,
  );
  const dirP = join(ROOT, "QA-SE-001", `sleep-${name}-py-${i + 5}`);
  mkdirSync(dirP, { recursive: true });
  writeFileSync(
    join(dirP, `test_${name}.py`),
    [
      "import time",
      "",
      "from selenium import webdriver",
      "from selenium.webdriver.common.by import By",
      "",
      "",
      `def test_${name}(driver):`,
      `    driver.get("https://example.test/${name}")`,
      "    time.sleep(3.5)",
      '    driver.find_element(By.ID, "grid")',
    ].join("\n"),
  );
}

console.log("wave-2 authored");
