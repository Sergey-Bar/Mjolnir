import { expect, test } from "@playwright/test";

test("adds item", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("widget")).toBeVisible();
});

test("shows cart count", async ({ page }) => {
  await page.goto("/shop");
  await page.getByRole("button", { name: "Add" }).click();
  await page.goto("/cart");
  await expect(page.getByText("1")).toBeVisible();
});
