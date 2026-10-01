import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-101 (final 3): sync/async mix exhibits — distinct app shapes.
for (const [i, name] of [
  "warehouse_sync",
  "portal_sync",
  "vault_sync",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-final-${i + 11}`);
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

console.log("wave-9 authored");
