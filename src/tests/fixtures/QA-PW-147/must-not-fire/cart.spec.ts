import { test, expect } from "@playwright/test";

test("adding a product to the cart shows the cart badge", async ({ page }) => {
  await page.goto("https://shop.example.com/");
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-badge")).toHaveText("1");
});
