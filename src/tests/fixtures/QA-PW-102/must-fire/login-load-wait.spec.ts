import { test, expect } from "@playwright/test";

test("user can log in", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#username", "user");
  await page.fill("#password", "pass");
  await page.click("button[type=submit]");
  await page.waitForLoadState("load");
});
