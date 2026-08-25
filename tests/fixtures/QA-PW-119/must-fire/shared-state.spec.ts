import { expect, test } from "@playwright/test";

let sharedCart: string[];

test("adds item", async ({ page }) => {
  await page.goto("/shop");
  sharedCart = ["widget"];
  await expect(page.getByText("widget")).toBeVisible();
});

test("shows cart count", async ({ page }) => {
  await page.goto("/cart");
  await expect(page.getByText(String(sharedCart.length))).toBeVisible();
});
