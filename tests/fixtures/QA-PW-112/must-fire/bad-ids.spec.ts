import { expect, test } from "@playwright/test";

test("open cart", async ({ page }) => {
  await page.goto("/shop");
  await page.getByTestId("cartIcon").click();
  await page.getByTestId("Checkout Button").click();
  await expect(page).toHaveURL(/checkout/);
});
