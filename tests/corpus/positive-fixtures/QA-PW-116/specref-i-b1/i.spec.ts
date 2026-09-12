import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/i.json" });

test("i page renders authenticated", async ({ page }) => {
  await page.goto("/i");
  await expect(page.locator("main")).toBeVisible();
});

test("i list loads", async ({ page }) => {
  await page.goto("/i/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
