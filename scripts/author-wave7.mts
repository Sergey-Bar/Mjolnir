import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-108 (+2): hardcoded URLs — final exhibits.
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-checkout.py"),
  `from playwright.sync_api import Page, expect


def test_checkout_page(page: Page) -> None:
    """Hardcoded origin on the checkout flow."""
    page.goto("https://shop.example.test/checkout")
    expect(page.locator("#pay")).to_be_visible()
`,
);
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-profile.py"),
  `from playwright.sync_api import Page, expect


def test_profile_settings(page: Page) -> None:
    """Hardcoded origin on the profile flow."""
    page.goto("https://shop.example.test/profile")
    expect(page.locator("#profile")).to_be_visible()
`,
);

// ── QA-PY-101 (+3): sync/async mix — final exhibits.
for (const [i, name] of ["vault_half", "billing_mixed", "cron_half"] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-m-${i + 7}`);
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

console.log("wave-7 authored");
