import { expect, test } from "@playwright/test";

test("open cart", async ({ page }) => {
  await page.goto("/shop");
  await page.getByTestId("cart-icon").click();
  await expect(page).toHaveURL(/checkout/);
});
