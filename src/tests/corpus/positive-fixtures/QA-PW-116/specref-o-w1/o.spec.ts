import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/o.json" });

test("o page renders authenticated", async ({ page }) => {
  await page.goto("/o");
  await expect(page.locator("main")).toBeVisible();
});

test("o list loads", async ({ page }) => {
  await page.goto("/o/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
