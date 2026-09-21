import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-108 (+2): hardcoded URLs — two more one-file exhibits.
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-rootnav.py"),
  `from playwright.sync_api import Page, expect


def test_root_navigation(page: Page) -> None:
    """Hardcoded origin in a smoke test."""
    page.goto("https://www.example.test/")
    expect(page.locator("header")).to_be_visible()
`,
);
writeFileSync(
  join(ROOT, "QA-PY-108", "hardcoded-apibase.py"),
  `from playwright.sync_api import Page, expect


def test_api_settings(page: Page) -> None:
    """API base hardcoded instead of the configured baseURL."""
    page.goto("https://api.example.test/ui/settings")
    expect(page.locator("#settings")).to_be_visible()
`,
);

// ── QA-PY-101 (+3): sync/async mix — three more half-migrated flows.
for (const [i, name] of [
  "ledger_half",
  "portal_half",
  "quests_half",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-m-${i + 5}`);
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

// ── QA-PY-106 (+6): single-file module-level page exhibits — six more
// scenario shapes (each a DIFFERENT file, so the sampler dedup key
// ruleId|file|line stays fresh).
for (const [i, name] of [
  "invoices_shared",
  "profile_shared",
  "reports_shared",
  "search_shared",
  "settings_shared",
  "team_shared",
] as const) {
  const dir = join(ROOT, "QA-PY-106", `module-${name}-${i + 4}`);
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
      `def test_${name}_renders() -> None:`,
      `    page.goto("/${name.replace("_shared", "")}")`,
      '    assert page.locator("main").is_visible()',
      "",
      "",
      `def test_${name}_rows() -> None:`,
      `    page.goto("/${name.replace("_shared", "")}/rows")`,
      '    assert page.locator(".row").first.is_visible()',
    ].join("\n"),
  );
}

console.log("wave-6 authored");
