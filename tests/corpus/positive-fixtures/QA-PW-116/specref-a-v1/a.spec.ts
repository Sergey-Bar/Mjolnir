import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/a.json" });

test("a page renders authenticated", async ({ page }) => {
  await page.goto("/a");
  await expect(page.locator("main")).toBeVisible();
});

test("a list loads", async ({ page }) => {
  await page.goto("/a/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
