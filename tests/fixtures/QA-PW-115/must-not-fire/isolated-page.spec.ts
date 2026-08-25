import { expect, test } from "@playwright/test";

test("first navigation", async ({ page }) => {
  await page.goto("/a");
  await expect(page.getByRole("heading")).toBeVisible();
});

test("second navigation", async ({ page }) => {
  await page.goto("/b");
  await expect(page.getByRole("heading")).toBeVisible();
});
