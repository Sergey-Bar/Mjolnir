import { test, expect } from "@playwright/test";

test("debugging checkout", async ({ page }) => {
  await page.goto("/checkout");
  page.pause();
});

test.only("focused flow", async ({ page }) => {
  await expect(page.getByText("ready")).toBeVisible();
});
