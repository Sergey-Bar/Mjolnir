import { test, expect } from "@playwright/test";

test("visual: homepage hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toHaveScreenshot("hero.png");
});

test("visual: pricing table", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.locator("table")).toHaveScreenshot();
});

test("visual: settings modal", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Open preferences" }).click();
  await expect(page.getByRole("dialog")).toHaveScreenshot("settings.png", { timeout: 5000 });
});
