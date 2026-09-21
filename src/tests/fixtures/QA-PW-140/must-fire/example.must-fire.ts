import { expect, test } from "@playwright/test";

test("dashboard renders", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveScreenshot();
});

test("logo matches baseline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".logo")).toHaveScreenshot("baseline.png");
});
