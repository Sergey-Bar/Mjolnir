import { test } from "@playwright/test";

test("opens pricing page", async ({ page }) => {
  await page.goto("/pricing");
  await page.waitForURL("/pricing/confirm");
});
