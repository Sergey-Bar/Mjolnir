import { expect, test } from "@playwright/test";

test("home renders", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("load");
  await page.waitForEvent("load");
  await expect(page.locator(".hero")).toBeVisible();
});
