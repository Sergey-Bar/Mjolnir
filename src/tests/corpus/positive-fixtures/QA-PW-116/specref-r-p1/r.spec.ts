import { test, expect } from "@playwright/test";

// This suite relies on the committed auth state; nothing in this file
// or its config rotates it.
test.use({ storageState: ".auth/r.json" });

test("r page renders authenticated", async ({ page }) => {
  await page.goto("/r");
  await expect(page.locator("main")).toBeVisible();
});

test("r list loads", async ({ page }) => {
  await page.goto("/r/list");
  await expect(page.locator(".row").first()).toBeVisible();
});
