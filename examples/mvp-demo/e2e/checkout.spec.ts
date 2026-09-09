import { test, expect } from "@playwright/test";

// CASE: real-product-failure (ACTIVE — "charges the card twice" fails in
// the committed run report with a real assertion failure: the coupon is
// applied after the charge, so the totals disagree).

test("charges the card exactly once", async ({ page }) => {
  await page.goto("https://shop.example.test/checkout");
  await page.locator("#pay-now").click();
  await expect(page.locator(".receipt-total")).toHaveText("$42.00");
});

test("declines an expired card", async ({ page }) => {
  await page.goto("https://shop.example.test/checkout");
  await page.locator("#card-number").fill("4000 0000 0000 0069");
  await expect(page.locator(".declined")).toBeVisible();
});
