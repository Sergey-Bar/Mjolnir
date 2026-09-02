import { test, expect } from "@playwright/test";

test.only("debug login flow", async ({ page }) => {
  await page.goto("/login");
  await page.pause();
});

test("search products", async ({ page }) => {
  await page.goto("/search?q=shoes");
  await expect(page.getByRole("listitem")).toHaveCount(10);
});

test.only("debug checkout", async ({ page }) => {
  await page.goto("/checkout");
});

test("profile page", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test.only("debug payments", async ({ page }) => {
  await page.goto("/payments");
});

test("debug settings", async ({ page }) => {
  await page.pause();
});
