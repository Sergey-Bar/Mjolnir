import { test, expect } from "@playwright/test";

test("test", async ({ page }) => {
  await page.goto("https://shop.example.com/");
  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
});
