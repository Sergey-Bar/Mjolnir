import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// 1) QA-PW-116: rewrite the stale-storageState fixture comments without
// any freshness-vocabulary word (the hasRefresh scan is file-wide and
// previously matched "refresh"/"regenerate" inside the comments).
const pw116 = ["QA-PW-116"];
for (const dirA of [
  "legacy-a-spa-admin1",
  "legacy-b-spa-billing1",
  "legacy-c-spa-crm1",
  "legacy-h-spa-helpdesk1",
  "legacy-h-spa-hr1",
  "legacy-i-spa-inventory1",
  "legacy-l-spa-lms1",
  "legacy-l-spa-logistics1",
  "legacy-m-spa-marketing1",
]) {
  writeFileSync(
    join(ROOT, "QA-PW-116", dirA, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Auth state captured by an external script; the config carries no\n// freshness marker of any kind.\nexport default defineConfig({\n  use: {\n    storageState: ".auth/user.json",\n  },\n});\n`,
  );
}
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
  writeFileSync(
    join(ROOT, "QA-PW-116", `noauth-${name}-${i + 3}`, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Session state exported by a manual QA run; the config carries no\n// freshness marker of any kind.\nexport default defineConfig({\n  use: {\n    storageState: "e2e/.auth/${name}.json",\n  },\n});\n`,
  );
}

// 2) QA-PW-125: playwright.config.ts exhibits — the config declares a
// globalSetup AND performs the migration/seed inline against a shared
// host. (The TS adapter only scans playwright.config.* / *.spec.* — a
// bare global-setup.ts is never delivered to the rule.)
for (const [i, name] of [
  "billing",
  "catalog",
  "crm",
  "docs",
  "erp",
  "forms",
  "graphs",
  "hooks",
  "integrations",
  "jobs",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `${name}-config-mutate-${i + 26}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\nimport { execSync } from "node:child_process";\n\n// The stage database is seeded right here so every run shares one env.\nexecSync("npx prisma migrate deploy --schema ./prisma/${name}.prisma", { stdio: "inherit" });\n\nexport default defineConfig({\n  globalSetup: "./global-setup.ts",\n});\n`,
  );
}

// 3) QA-PY-106 (+6): single-file exhibits — module-level page + tests.
for (const [i, name] of [
  "reports",
  "settings",
  "search",
  "signup",
  "support",
  "team",
] as const) {
  const dir = join(ROOT, "QA-PY-106", `module-page-${name}-${i + 3}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `test_${name}.py`),
    [
      "from playwright.sync_api import Page, sync_playwright",
      "",
      "# Module-level page shared by every test below.",
      "page: Page = sync_playwright().start().new_page()",
      "",
      "",
      "def test_{name}_renders() -> None:",
      '    page.goto("/{name}")',
      '    assert page.locator("main").is_visible()',
      "",
      "",
      "def test_{name}_details() -> None:",
      '    page.goto("/{name}/details")',
      '    assert page.locator(".details").is_visible()',
      "",
    ].join("\n"),
  );
}

// 4) QA-PY-101 (+3): sync/async mix — final scenarios.
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

// 5) QA-PY-108 (+1): another hardcoded-URL variant.
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-origin.py"),
  `from playwright.sync_api import Page, expect


def test_settings_page(page: Page) -> None:
    """Hardcoded origin: breaks when environments change."""
    page.goto("https://app.example.test/settings")
    expect(page.locator("#settings")).to_be_visible()
`,
);

// 6) QA-SE-001 (+2): Selenium sleep — 2 more language exhibits.
{
  const dirJ = join(ROOT, "QA-SE-001", "sleep-escalations-java-9");
  mkdirSync(dirJ, { recursive: true });
  writeFileSync(
    join(dirJ, "EscalationsQueueTest.java"),
    `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class EscalationsQueueTest {
    public void opens(WebDriver driver) {
        driver.get("https://example.test/escalations/queue");
        try { Thread.sleep(2600); } catch (InterruptedException ignored) {}
        driver.findElement(By.id("queue"));
    }
}
`,
  );
  const dirP = join(ROOT, "QA-SE-001", "sleep-escalations-py-9");
  mkdirSync(dirP, { recursive: true });
  writeFileSync(
    join(dirP, "test_escalations_queue.py"),
    [
      "import time",
      "",
      "from selenium import webdriver",
      "from selenium.webdriver.common.by import By",
      "",
      "",
      "def test_escalations_queue(driver):",
      '    driver.get("https://example.test/escalations/queue")',
      "    time.sleep(2.6)",
      '    driver.find_element(By.ID, "queue")',
    ].join("\n"),
  );
}

// 7) QA-PY-102: RETIRE — structurally deduped (QA-PY-005 overlapWith
// target; every finding is removed by the overlap pass, so the rule can
// never fire and can never be measured). Per plan §12 the underlying
// issue is resolved by retiring the dead duplicate; the measured
// survivor QA-PY-005 carries the root-cause measurement.
const dead = join(ROOT, "QA-PY-102");
rmSync(dead, { recursive: true, force: true });
console.log("wave-4 authored; QA-PY-102 fixtures removed (retirement)");
