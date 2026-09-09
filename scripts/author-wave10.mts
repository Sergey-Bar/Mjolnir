import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-101 (final 3): sync-import + async def test — the mix the
// detector targets. Three distinct app shapes.
for (const [i, name] of [
  "warehouse",
  "portal",
  "vault",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-mix-${i + 21}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `test_${name}_mix.py`),
    [
      "import pytest",
      "from playwright.sync_api import sync_playwright",
      "",
      "",
      "def launch_sync():",
      "    with sync_playwright() as p:",
      "        yield p.chromium.launch().new_page()",
      "",
      "",
      "@pytest.fixture",
      "def page_fixture():",
      "    yield from launch_sync()",
      "",
      "",
      `async def test_${name}_dashboard(page_fixture):`,
      `    await page_fixture.goto("/${name}")`,
      '    assert await page_fixture.locator(".ready").is_visible()',
    ].join("\n"),
  );
}

console.log("wave-10 authored");
