import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "tests/corpus/positive-fixtures";

// ── QA-PW-116 (+9): storageState inside SPEC files (the rule scans
// test files too — a spec referencing storageState with no freshness
// marker anywhere in the file). Nine distinct flow shapes.
for (const [i, name] of [
  "orders-spec",
  "admin-spec",
  "billing-spec",
  "reports-spec",
  "profile-spec",
  "search-spec",
  "team-spec",
  "vault-spec",
  "workflow-spec",
] as const) {
  const dir = join(ROOT, "QA-PW-116", `specref-${name}-${i + 1}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${name}.spec.ts`),
    `import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/${name}.json" });

test("${name} page renders authenticated", async ({ page }) => {
  await page.goto("/${name.replace("-spec", "")}");
  await expect(page.locator("main")).toBeVisible();
});

test("${name} list loads", async ({ page }) => {
  await page.goto("/${name.replace("-spec", "")}/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
`,
  );
}

console.log("PW-116 spec exhibits authored");
