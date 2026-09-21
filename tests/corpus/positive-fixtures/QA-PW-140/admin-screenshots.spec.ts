import { test, expect } from "@playwright/test";

test("visual: invoice pdf", async ({ page }) => {
  await page.goto("/invoices/1");
  await expect(page.locator(".invoice")).toHaveScreenshot("invoice.png");
});

test("visual: chart widget", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.locator("canvas")).toHaveScreenshot("chart.png", { animations: "disabled" });
});

test("visual: nav drawer", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.locator("aside")).toHaveScreenshot("drawer.png");
});

test("visual: table row hover", async ({ page }) => {
  await page.goto("/table");
  await page.locator("tbody tr").first().hover();
  await expect(page.locator("tbody tr").first()).toHaveScreenshot();
});
