import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PY-101 (+3): sync/async mix — final three exhibits.
for (const [i, name] of [
  "audit_half",
  "billing_half",
  "catalog_half",
] as const) {
  const dir = join(ROOT, "QA-PY-101", `${name}-m-${i + 9}`);
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

// ── QA-PW-125 (+10): the rule RUNS on spec files too (isSetupLike
// matches the "globalSetup" text AND the path). Author spec-file
// exhibits that inline a global-setup-style migration against a shared
// stage host — the realistic "test file doubles as global setup" shape.
for (const [i, name] of [
  "assets",
  "backups",
  "compliance",
  "datasets",
  "email",
  "files",
  "graphs",
  "hooks",
  "integrations",
  "journal",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `inline-global-${name}-${i + 1}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `global-setup-inline.spec.ts`),
    `import { test, execSync } from "@playwright/test";

// This spec doubles as the global setup: it runs the ${name} migration
// against the shared stage database before the suite.
test.beforeAll(() => {
  execSync("npx prisma migrate deploy --schema ./prisma/${name}.prisma", { stdio: "inherit" });
});

test("${name} page loads", async ({ page }) => {
  await page.goto("/${name}");
});
`,
  );
}

console.log("wave-8 authored");
