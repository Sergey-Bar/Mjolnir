import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PW-116 (9 new exhibits): storageState with NO freshness mechanism.
// Each variant is a distinct, realistic app shape — the fixture corpus
// contract needs every exhibit to MUST-fire under the current detector
// (storageState path config, no refresh/setup/dependencies/globalSetup
// marker anywhere in the file).
for (const [i, shape] of [
  ["spa-admin", "admin"],
  ["spa-crm", "crm"],
  ["spa-billing", "billing"],
  ["spa-helpdesk", "helpdesk"],
  ["spa-inventory", "inventory"],
  ["spa-lms", "lms"],
  ["spa-hr", "hr"],
  ["spa-logistics", "logistics"],
  ["spa-marketing", "marketing"],
] as const) {
  const dir = join(ROOT, "QA-PW-116", `legacy-${shape[0]}-${i + 1}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\n// Legacy ${shape[1]} app: auth state captured once by an external script\n// (not a Playwright setup project — nothing regenerates it per run).\nexport default defineConfig({\n  use: {\n    storageState: ".auth/${shape[1]}-state.json",\n    baseURL: "https://${shape[0]}.internal.example",\n  },\n});\n`,
  );
}

// ── QA-PW-125 (10 new exhibits): globalSetup mutating module state that
// test files import — the shared-mutable-state anti-pattern across
// distinct app shapes. Each app has a global setup writing a shared
// singleton and a spec reading it.
for (const [i, name] of [
  "analytics",
  "warehouse",
  "booking",
  "pos",
  "portal",
  "vault",
  "ledger",
  "scheduler",
  "tracking",
  "gaming",
] as const) {
  const dir = join(ROOT, "QA-PW-125", `${name}-app-${i + 1}`);
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(
    join(dir, "global-setup.ts"),
    `import { fullPlatformState } from "./tests/shared-state";\n\nexport default async function globalSetup(): Promise<void> {\n  // Auth fixture mutation: seeds the SHARED singleton every run.\n  fullPlatformState.session = { user: "${name}-bot", seededAt: Date.now() };\n}\n`,
  );
  writeFileSync(
    join(dir, "playwright.config.ts"),
    `import { defineConfig } from "@playwright/test";\n\nexport default defineConfig({\n  globalSetup: "./global-setup.ts",\n});\n`,
  );
  writeFileSync(
    join(dir, "tests", "shared-state.ts"),
    `// Shared mutable module state — written by globalSetup, read by tests.\nexport const fullPlatformState = {\n  session: null as null | { user: string; seededAt: number },\n};\n`,
  );
  writeFileSync(
    join(dir, "tests", "${name}.spec.ts".replace("${name}", name)),
    `import { test, expect } from "@playwright/test";\nimport { fullPlatformState } from "./shared-state";\n\ntest("${name} dashboard renders seeded state", async ({ page }) => {\n  expect(fullPlatformState.session?.user).toBe("${name}-bot");\n});\n`,
  );
}

// ── QA-PY-102 (10 new exhibits): Python: blocking time.sleep inside an
// async-flow Playwright test — distinct realistic scenarios.
for (const [i, scenario] of [
  "login_rate_limit",
  "export_generation",
  "email_otp",
  "report_build",
  "webhook_settle",
  "cache_warm",
  "queue_drain",
  "session_refresh",
  "pdf_render",
  "search_index",
] as const) {
  const dir = join(ROOT, "QA-PY-102", `${scenario.replace(/_/g, "-")}-${i + 1}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `test_${scenario}.py`),
    `import time

from playwright.sync_api import Page, expect


def test_${scenario}(page: Page) -> None:
    """Blocking sleep inside the test body — hangs the runner, masks races."""
    page.goto("/${scenario.replace("_", "-")}")
    time.sleep(10)
    expect(page.get_by_test_id("done")).to_be_visible()
`,
  );
}
console.log("fixtures authored");
