import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/d.json" });

test("d page renders authenticated", async ({ page }) => {
  await page.goto("/d");
  await expect(page.locator("main")).toBeVisible();
});

test("d list loads", async ({ page }) => {
  await page.goto("/d/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
