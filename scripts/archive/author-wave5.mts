import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-101 (+3): sync/async mix — last scenarios.
for (const [i, name] of [
  "admin_half",
  "orders_half",
  "reports_half",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-m-${i + 4}`);
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

// ── QA-PY-108 (+1): hardcoded URL — one more exhibit.
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-admin.py"),
  `from playwright.sync_api import Page, expect


def test_admin_dashboard(page: Page) -> None:
    """Hardcoded origin: breaks when environments change."""
    page.goto("https://admin.example.test/dashboard")
    expect(page.locator("#dashboard")).to_be_visible()
`,
);

// ── QA-SE-001 (+1): Selenium sleep — one more Java exhibit.
{
  const dirJ = join(ROOT, "QA-SE-001", "sleep-escalations-java-10");
  mkdirSync(dirJ, { recursive: true });
  writeFileSync(
    join(dirJ, "EscalationsGridTest.java"),
    `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsGridTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations/grid");
        try { Thread.sleep(2700); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("grid"));
    }
}
`,
  );
}

// ── QA-PW-116 (+9): stale storageState — MORE shapes, no marker words.
for (const [i, name] of [
  "invoicing",
  "journeys",
  "knowledge",
  "licensing",
  "meetings",
  "networking",
  "oncall",
  "payouts",
  "quotas",
] as const) {
  const dir = join(ROOT, "QA-PW-116", `plainauth-${name}-${i + 4}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Auth state captured by an external script; the config carries no\n// freshness marker of any kind.\nexport default defineConfig({\n  use: {\n    storageState: ".auth/${name}.json",\n  },\n});\n`,
  );
}

// ── QA-PW-125 (+10): more config-inline shared-host mutations.
for (const [i, name] of [
  "kyc",
  "ledger",
  "messaging",
  "notices",
  "orders",
  "pricing",
  "quotas",
  "reconcile",
  "shipments",
  "tenants",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `${name}-cfg-mutate-${i + 37}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\nimport { execSync } from "node:child_process";\n\n// The stage database is seeded right here so every run shares one env.\nexecSync("npx prisma migrate deploy --schema ./prisma/${name}.prisma", { stdio: "inherit" });\n\nexport default defineConfig({\n  globalSetup: "./global-setup.ts",\n});\n`,
  );
}

console.log("wave-5 authored");
