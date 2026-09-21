import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/e.json" });

test("e page renders authenticated", async ({ page }) => {
  await page.goto("/e");
  await expect(page.locator("main")).toBeVisible();
});

test("e list loads", async ({ page }) => {
  await page.goto("/e/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
