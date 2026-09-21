import { expect, test } from "@playwright/test";

test("welcome text", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero h1")).toHaveText("Welcome to Acme");
});
