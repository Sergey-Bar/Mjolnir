import { test, expect } from "@playwright/test";

test("completes checkout with saved card", async ({ page }) => {
  await page.goto("/checkout");
  await page.locator(".btn.btn-primary > div:nth-child(2)").click();
  await page.waitForTimeout(3000);
  await expect(page.getByText("Order confirmed")).toBeVisible();
});

test("shows saved shipping address", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Shipping" })).toBeVisible();
  await expect(page.locator('[data-testid="address-card"]')).toBeVisible();
});
