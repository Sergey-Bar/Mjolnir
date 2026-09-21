import { test } from "@playwright/test";

test("docs page settles", async ({ page }) => {
  await page.goto("/docs/getting-started");
  await page.waitForLoadState("load");
});

test("landing page fully loads", async ({ page }) => {
  await page.goto("/landing");
  await page.waitForEvent("load");
});
