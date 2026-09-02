import { test, expect } from "@playwright/test";

test.describe("notifications", () => {
  test("email digest toggle", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.getByLabel("Weekly digest").check();
    await expect(page.getByLabel("Weekly digest")).toBeChecked();
  });

  test("push notifications toggle", async ({ page }) => {
    await page.goto("/settings/notifications");
    await page.getByLabel("Push").check();
    await expect(page.getByLabel("Push")).toBeChecked();
  });
});

test.describe("appearance", () => {
  test("theme switch persists", async ({ page }) => {
    await page.goto("/settings/appearance");
    await page.getByLabel("Dark").check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
