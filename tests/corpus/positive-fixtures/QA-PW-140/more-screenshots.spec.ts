import { test, expect } from "@playwright/test";

test("visual: nav bar", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("nav")).toHaveScreenshot("nav.png");
});

test("visual: footer", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer")).toHaveScreenshot();
});

test("visual: empty state", async ({ page }) => {
  await page.goto("/inbox");
  await expect(page.locator(".empty")).toHaveScreenshot("empty.png");
});
