import { test, expect } from "@playwright/test";

test("order flow", async ({ page }) => {
  await page.goto("https://shop.example.com/cart");
  // String CSS selector — markup coupling the user never sees.
  await page.locator("#checkout-button").click();
  await page.waitForSelector(".order-summary");
  // Structural chain + engine prefix.
  await page.locator("css=div.order > span.total").click();
  await expect(page.locator("#confirmation")).toBeVisible();
});

test("raw handles bypass the locator standard", async ({ page }) => {
  await page.goto("https://shop.example.com");
  const el = await page.$("#search");
  const list = await page.$$(".result-item");
  expect(list.length).toBeGreaterThan(0);
});
