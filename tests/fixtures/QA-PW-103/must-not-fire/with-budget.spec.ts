import { test } from "@playwright/test";

test("opens pricing page", async ({ page }) => {
  await page.goto("/pricing", { timeout: 15_000 });
  await page.waitForURL("/pricing/confirm", { timeout: 10_000 });
});
