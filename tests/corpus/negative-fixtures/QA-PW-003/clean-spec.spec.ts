import { test, expect } from "@playwright/test";

test("search products", async ({ page }) => {
  await page.goto("/search?q=shoes");
  await expect(page.getByRole("listitem")).toHaveCount(10);
});

test("profile page", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("checkout", async ({ page }) => {
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Pay" }).click();
});
